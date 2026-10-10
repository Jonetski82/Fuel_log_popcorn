/* Popcorn Fuel Log v2 — core: storage, maths, GPS tracking.
   No UI code here; app.js renders screens from the state kept in Core. */
'use strict';

const Core = (() => {
  // ---------- constants ----------
  const MAX_KN = 20;              // bands: 0 = idle (<1 kn), 1..MAX_KN = 1-kn bands, MAX_KN+1 = above
  const NB = MAX_KN + 2;
  const KN = 1.943844;            // m/s -> kn
  const NM = 1852;                // m
  const DB_NAME = 'fuellog';
  const DB_VER = 1;
  const ENG = ['port', 'stbd'];
  const MODES = ['both', 'port', 'stbd'];

  const bandOf = (kn) => (kn < 1 ? 0 : Math.min(NB - 1, Math.floor(kn)));
  const bandMid = (b) => (b === 0 ? 0 : b === NB - 1 ? MAX_KN + 1.5 : b + 0.5);
  const bandLabel = (b) => (b === 0 ? '< 1 kn' : b === NB - 1 ? '> ' + MAX_KN + ' kn' : b + '–' + (b + 1) + ' kn');
  const zeros = () => new Array(NB).fill(0);
  const emptyBands = () => ({ both: zeros(), port: zeros(), stbd: zeros() });

  // ---------- helpers ----------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const num = (v) => {
    if (v === null || v === undefined) return NaN;
    const s = String(v).trim().replace(/\s/g, '').replace(',', '.');
    if (s === '') return NaN;
    return Number(s);
  };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const median = (a) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  function haversine(a, b) {
    const R = 6371008.8, r = Math.PI / 180;
    const dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  const polyEval = (c, x) => c.reduce((acc, ci, i) => acc + ci * Math.pow(x, i), 0);
  function interp(xs, ys, x) { // linear, clamped; xs ascending
    if (!xs.length) return NaN;
    if (x <= xs[0]) return ys[0];
    for (let i = 1; i < xs.length; i++) if (x <= xs[i]) { const u = (x - xs[i - 1]) / (xs[i] - xs[i - 1] || 1); return ys[i - 1] + u * (ys[i] - ys[i - 1]); }
    return ys[ys.length - 1];
  }
  function solve(A, y) { // Gauss-Jordan with partial pivoting; returns {x, inv}
    const n = A.length;
    const M = A.map((r, i) => r.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)), [y[i]]));
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      const d = M[c][c] || 1e-12;
      for (let j = 0; j < M[c].length; j++) M[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c) {
        const f = M[r][c];
        if (f) for (let j = 0; j < M[r].length; j++) M[r][j] -= f * M[c][j];
      }
    }
    return { x: M.map((r) => r[2 * n]), inv: M.map((r) => r.slice(n, 2 * n)) };
  }

  // ---------- defaults ----------
  function samplePoly(cap, maxMm) {
    const m = maxMm;
    return [0, cap * 0.35 / m, cap * 0.65 * 3 / (m * m), -cap * 0.65 * 2 / (m * m * m), 0];
  }
  const zeroCorr = () => ({ shared: [0, 0, 0, 0, 0], port: [0, 0, 0, 0, 0], stbd: [0, 0, 0, 0, 0] });
  function defaultState() {
    return {
      version: 2,
      settings: {
        reservePct: 15, minCruiseKn: 6, effMarginPct: 10,
        base: 'traficom', seamarks: true,
        traficomLayer: 'Traficom:Merikarttasarjat public', traficomMatrix: 'WGS84_Pseudo-Mercator:', traficomFormat: 'image/png', traficomCustom: '',
        nlsKey: '', price: '', rpmStep: 50, draftM: 2.0, rangeArea: 'water', seaUrl: 'sea/'
      },
      curve: { unit: 'mm', base: samplePoly(395, 600), sample: true, active: zeroCorr(), history: [], pending: null },
      tanks: [
        { id: 'port', name: 'Port', color: '#A63A2A', capacity: 395, maxMm: 600, pipeMm: 30, pipeL: null },
        { id: 'stbd', name: 'Stbd', color: '#1F6E5A', capacity: 395, maxMm: 600, pipeMm: 30, pipeL: null }
      ],
      anchors: [],      // known (mm, litres) points: {id,tank,mm,L,t}
      events: [],       // {id,t,type:'dip'|'refuel',tank,mm,rough, pumped,afterMm,brim,group,price}
      trips: [],
      active: null,
      hull: { clean: [[1000, 5.0], [1200, 6.0], [1400, 7.0], [1600, 7.8], [1800, 8.5], [2000, 9.5]], cleanSample: true, cleanings: [] },
      fit: null
    };
  }
  function migrate(s) {
    const d = defaultState();
    if (!s) return d;
    if ((s.version || 1) < 2) {
      const port = (s.tanks || [])[0] || {};
      d.curve.base = port.poly || d.curve.base;
      d.curve.sample = !!(s.settings && s.settings.sampleCurves !== false);
      d.tanks.forEach((t, i) => { const o = (s.tanks || [])[i]; if (o) { t.name = o.name; t.capacity = o.capacity; t.maxMm = o.maxMm; } });
      (s.tanks || []).forEach((o) => (o.cal || []).filter((p) => p.src === 'manual').forEach((p) => d.anchors.push({ id: uid(), tank: o.id, mm: p.mm, L: p.L, t: p.t })));
      d.events = (s.events || []).map((e) => ({ id: e.id, t: e.t, type: e.type, tank: e.tank, mm: e.mm, rough: false, pumped: e.pumped, afterMm: e.afterMm, brim: false, group: null, price: e.price }));
      d.trips = (s.trips || []).map((tr) => ({ ...tr, bandsBy: { both: tr.bands || zeros(), port: zeros(), stbd: zeros() }, samples: [], modeLog: [], rpmLog: [] }));
      ['reservePct', 'base', 'seamarks', 'traficomLayer', 'traficomMatrix', 'traficomFormat', 'traficomCustom', 'nlsKey', 'price'].forEach((k) => { if (s.settings && k in s.settings) d.settings[k] = s.settings[k]; });
      d.active = null;
      return d;
    }
    s.settings = Object.assign(d.settings, s.settings || {});
    ['curve', 'hull'].forEach((k) => { if (!s[k]) s[k] = d[k]; });
    s.anchors = s.anchors || []; s.events = s.events || []; s.trips = s.trips || [];
    return s;
  }

  // ---------- IndexedDB ----------
  let db = null;
  function openDb() {
    return new Promise((res, rej) => {
      const rq = indexedDB.open(DB_NAME, DB_VER);
      rq.onupgradeneeded = () => {
        const d = rq.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('tracks')) d.createObjectStore('tracks');
      };
      rq.onsuccess = () => { db = rq.result; res(db); };
      rq.onerror = () => rej(rq.error);
    });
  }
  function idb(store, mode, fn) {
    return new Promise((res, rej) => {
      const tx = db.transaction(store, mode);
      const r = fn(tx.objectStore(store));
      tx.oncomplete = () => res(r && 'result' in r ? r.result : undefined);
      tx.onerror = () => rej(tx.error);
    });
  }
  const kvGet = (k) => idb('kv', 'readonly', (s) => s.get(k));
  const kvSet = (k, v) => idb('kv', 'readwrite', (s) => s.put(v, k));
  const trackGet = (id) => idb('tracks', 'readonly', (s) => s.get(id));
  const trackSet = (id, pts) => idb('tracks', 'readwrite', (s) => s.put(pts, id));
  const trackDel = (id) => idb('tracks', 'readwrite', (s) => s.delete(id));
  const trackAll = () => new Promise((res, rej) => {
    const out = {};
    const tx = db.transaction('tracks', 'readonly');
    const rq = tx.objectStore('tracks').openCursor();
    rq.onsuccess = () => { const c = rq.result; if (c) { out[c.key] = c.value; c.continue(); } };
    tx.oncomplete = () => res(out);
    tx.onerror = () => rej(tx.error);
  });

  let S = null, saveTimer = null;
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => kvSet('state', S).catch(() => {}), 150); }
  function saveNow() { clearTimeout(saveTimer); return kvSet('state', S); }

  async function init() {
    await openDb();
    S = migrate(await kvGet('state'));
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    refit();
    return S;
  }

  // =====================================================================
  // TANK CURVE: shared base polynomial + fitted corrections (shared + per tank)
  // =====================================================================
  const tank = (id) => S.tanks.find((t) => t.id === id);
  const phi = (tk, mm, k) => Math.pow(mm / tk.maxMm, k);
  const baseL = (mm) => polyEval(S.curve.base, S.curve.unit === 'cm' ? mm / 10 : mm);
  function litresWith(corr, tk, mm) {
    if (!isFinite(mm)) return NaN;
    let L = baseL(mm);
    for (let k = 0; k < 5; k++) L += (corr.shared[k] + corr[tk.id][k]) * phi(tk, mm, k);
    return clamp(L, 0, tk.capacity * 1.1);
  }
  function litres(tk, mm) { const t = typeof tk === 'string' ? tank(tk) : tk; return litresWith(S.curve.active, t, mm); }
  function unusableL(tk) { const t = typeof tk === 'string' ? tank(tk) : tk; return t.pipeL !== null && t.pipeL !== undefined && isFinite(t.pipeL) ? t.pipeL : (isFinite(t.pipeMm) ? litres(t, t.pipeMm) : 0); }

  const eventsFor = (tid) => S.events.filter((e) => e.tank === tid).sort((a, b) => a.t - b.t);
  const groupOf = (e) => (e.group ? S.events.filter((x) => x.group === e.group) : [e]);
  function levelAfter(e) {
    if (e.type !== 'refuel') return litres(e.tank, e.mm);
    if (e.brim) return tank(e.tank).capacity;
    if (e.group && isFinite(e.afterMm)) return litres(e.tank, e.afterMm);
    return litres(e.tank, e.mm) + (e.pumped || 0);
  }

  // Equations for the curve fit. Each: {terms:[{tk, mm, sign}], rhs, sigma}
  //   sum(sign * L(tk, mm)) = rhs
  function curveEquations() {
    const eqs = [];
    const seen = new Set();
    S.events.filter((e) => e.type === 'refuel').forEach((e) => {
      const g = e.group || e.id; if (seen.has(g)) return; seen.add(g);
      const mem = groupOf(e);
      if (mem.some((m) => !isFinite(m.afterMm))) return;
      const terms = []; let rhs = 0, rough = false;
      mem.forEach((m) => { const tk = tank(m.tank); terms.push({ tk, mm: m.afterMm, sign: 1 }, { tk, mm: m.mm, sign: -1 }); rhs += m.pumped || 0; rough = rough || m.rough; });
      eqs.push({ terms, rhs, sigma: rough ? 6 : 2, kind: 'refuel', t: e.t, ids: mem.map((m) => m.id) });
      mem.filter((m) => m.brim).forEach((m) => eqs.push({ terms: [{ tk: tank(m.tank), mm: m.afterMm, sign: 1 }], rhs: tank(m.tank).capacity, sigma: m.rough ? 9 : 3, kind: 'brim', t: m.t }));
    });
    S.anchors.forEach((a) => eqs.push({ terms: [{ tk: tank(a.tank), mm: a.mm, sign: 1 }], rhs: a.L, sigma: 2, kind: 'anchor', t: a.t }));
    return eqs;
  }
  function residuals(corr, eqs) { return eqs.map((q) => q.terms.reduce((s, tm) => s + tm.sign * litresWith(corr, tm.tk, tm.mm), 0) - q.rhs); }
  const rms = (r) => (r.length ? Math.sqrt(r.reduce((s, x) => s + x * x, 0) / r.length) : NaN);

  function fitCurve() {
    const eqs = curveEquations();
    if (!eqs.length) return null;
    const N = 15; // shared c0..c4, port c0..c4, stbd c0..c4
    const H = Array.from({ length: N }, () => new Array(N).fill(0)), g = new Array(N).fill(0);
    const off = { port: 5, stbd: 10 };
    eqs.forEach((q) => {
      const a = new Array(N).fill(0); let y = q.rhs;
      q.terms.forEach((tm) => {
        y -= tm.sign * baseL(tm.mm);
        for (let k = 0; k < 5; k++) { const v = tm.sign * phi(tm.tk, tm.mm, k); a[k] += v; a[off[tm.tk.id] + k] += v; }
      });
      const w = 1 / (q.sigma * q.sigma);
      for (let i = 0; i < N; i++) { if (!a[i]) continue; g[i] += w * a[i] * y; for (let j = 0; j < N; j++) H[i][j] += w * a[i] * a[j]; }
    });
    // priors: corrections should stay small over the tank depth (shared ~15 L, per tank ~4 L)
    const addPrior = (o, sig) => {
      for (let gi = 0; gi <= 10; gi++) {
        const u = gi / 10, a = [1, u, u * u, u ** 3, u ** 4], w = 1 / (sig * sig);
        for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) H[o + i][o + j] += w * a[i] * a[j];
      }
    };
    addPrior(0, 15); addPrior(5, 4); addPrior(10, 4);
    for (let i = 0; i < N; i++) H[i][i] += 1e-9;
    const x = solve(H, g).x;
    const corr = { shared: x.slice(0, 5), port: x.slice(5, 10), stbd: x.slice(10, 15) };
    // monotonic check
    let monotonic = true;
    S.tanks.forEach((tk) => { let prev = -Infinity; for (let i = 0; i <= 60; i++) { const L = litresWith(corr, tk, (tk.maxMm * i) / 60); if (L < prev - 0.05) monotonic = false; prev = L; } });
    const before = residuals(S.curve.active, eqs), after = residuals(corr, eqs);
    const ownCurve = {}, levelChange = {}, maxShift = {};
    S.tanks.forEach((tk) => {
      let own = 0, shift = 0;
      for (let i = 0; i <= 20; i++) {
        const mm = (tk.maxMm * i) / 20, u = i / 20;
        own = Math.max(own, Math.abs(polyEval(corr[tk.id], u)));
        shift = Math.max(shift, Math.abs(litresWith(corr, tk, mm) - litresWith(S.curve.active, tk, mm)));
      }
      ownCurve[tk.id] = own > 3; maxShift[tk.id] = shift;
      const ev = eventsFor(tk.id); const last = ev[ev.length - 1];
      levelChange[tk.id] = last ? litresWith(corr, tk, last.mm) - litresWith(S.curve.active, tk, last.mm) : 0;
    });
    return { t: Date.now(), corr, monotonic, rmsBefore: rms(before), rmsAfter: rms(after), n: eqs.length, nRefuel: eqs.filter((q) => q.kind === 'refuel').length, ownCurve, levelChange, maxShift, residualsAfter: after, residualsBefore: before, eqs: eqs.map((q) => ({ kind: q.kind, t: q.t })) };
  }
  function proposeCurve() {
    const p = fitCurve();
    S.curve.pending = p && Math.max(...Object.values(p.maxShift)) > 0.5 ? p : null;
    save();
    return S.curve.pending;
  }
  function acceptCurve() {
    const p = S.curve.pending; if (!p || !p.monotonic) return false;
    S.curve.history.unshift({ t: Date.now(), corr: JSON.parse(JSON.stringify(S.curve.active)), note: 'replaced by fit of ' + p.n + ' readings' });
    S.curve.history = S.curve.history.slice(0, 20);
    S.curve.active = p.corr; S.curve.pending = null; refit(); save(); return true;
  }
  function rejectCurve() { S.curve.pending = null; save(); }
  function restoreCurve(i) {
    const h = S.curve.history[i]; if (!h) return;
    S.curve.history.splice(i, 1);
    S.curve.history.unshift({ t: Date.now(), corr: JSON.parse(JSON.stringify(S.curve.active)), note: 'before restore' });
    S.curve.active = h.corr; refit(); save();
  }
  function setBase(coeffs, unit) {
    S.curve.history.unshift({ t: Date.now(), corr: JSON.parse(JSON.stringify(S.curve.active)), base: S.curve.base.slice(), unit: S.curve.unit, note: 'before new base polynomial' });
    S.curve.base = coeffs; S.curve.unit = unit; S.curve.sample = false; S.curve.active = zeroCorr(); S.curve.pending = null; refit(); save();
  }

  // =====================================================================
  // CONSUMPTION: per engine, both-engine mode and solo mode, L/h per speed band
  // =====================================================================
  const priorTot = (b) => (b === 0 ? 2 : 2 + 0.35 * Math.pow(bandMid(b), 2));
  const priorOf = (m, b) => (m === 'both' ? priorTot(b) / 2 : b === 0 ? 1.2 : priorTot(b) * 1.1);
  const IDX = (e, m, b) => ((ENG.indexOf(e) * 2) + (m === 'both' ? 0 : 1)) * NB + b;
  const NX = 4 * NB;
  const tripBands = (tr) => tr.bandsBy || { both: tr.bands || zeros(), port: zeros(), stbd: zeros() };

  function intervals() {
    const out = [];
    ENG.forEach((e) => {
      const ev = eventsFor(e);
      for (let i = 1; i < ev.length; i++) {
        const a = ev[i - 1], b = ev[i];
        const trips = S.trips.filter((tr) => tr.end > a.t && tr.end <= b.t);
        if (!trips.length) continue;
        const both = zeros(), solo = zeros();
        trips.forEach((tr) => { const bb = tripBands(tr); bb.both.forEach((h, k) => { both[k] += h; }); bb[e].forEach((h, k) => { solo[k] += h; }); });
        out.push({ tank: e, t0: a.t, t1: b.t, used: levelAfter(a) - litres(e, b.mm), rough: !!(a.rough || b.rough), trips: trips.map((t) => t.id), both, solo, dist: trips.reduce((s, t) => s + t.distNm, 0) });
      }
    });
    return out;
  }

  function refit() {
    const ints = intervals();
    const H = Array.from({ length: NX }, () => new Array(NX).fill(0)), g = new Array(NX).fill(0);
    ints.forEach((iv) => {
      const a = new Array(NX).fill(0);
      for (let b = 0; b < NB; b++) { a[IDX(iv.tank, 'both', b)] = iv.both[b]; a[IDX(iv.tank, 'solo', b)] = iv.solo[b]; }
      const sig = iv.rough ? 12 : 4, w = 1 / (sig * sig);
      const nz = []; for (let i = 0; i < NX; i++) if (a[i]) nz.push(i);
      nz.forEach((i) => { g[i] += w * a[i] * iv.used; nz.forEach((j) => { H[i][j] += w * a[i] * a[j]; }); });
    });
    ENG.forEach((e) => ['both', 'solo'].forEach((m) => {
      for (let b = 0; b < NB; b++) { // weak prior
        const p = priorOf(m, b), sp = 0.6 * p + 2, i = IDX(e, m, b);
        H[i][i] += 1 / (sp * sp); g[i] += p / (sp * sp);
      }
      const ls = 1 / Math.pow(m === 'both' ? 3 : 4, 2); // smoothness over moving bands
      for (let b = 2; b < NB - 1; b++) {
        const idx = [IDX(e, m, b - 1), IDX(e, m, b), IDX(e, m, b + 1)], cf = [1, -2, 1];
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) H[idx[i]][idx[j]] += ls * cf[i] * cf[j];
      }
    }));
    ['both', 'solo'].forEach((m) => { // link the two engines: similar unless data says otherwise
      for (let b = 0; b < NB; b++) {
        const sc = 0.15 * priorOf(m, b) + 0.5, w = 1 / (sc * sc), i = IDX('port', m, b), j = IDX('stbd', m, b);
        H[i][i] += w; H[j][j] += w; H[i][j] -= w; H[j][i] -= w;
      }
    });
    const r = solve(H, g);
    const x = r.x.map((v) => Math.max(0.1, v));
    const pick = (e, m) => Array.from({ length: NB }, (_, b) => x[IDX(e, m, b)]);
    const loggedH = emptyBands();
    S.trips.forEach((tr) => { const bb = tripBands(tr); MODES.forEach((m) => bb[m].forEach((h, b) => { loggedH[m][b] += h; })); });
    S.fit = {
      x: { port: { both: pick('port', 'both'), solo: pick('port', 'solo') }, stbd: { both: pick('stbd', 'both'), solo: pick('stbd', 'solo') } },
      inv: r.inv, loggedH, nIntervals: ints.length, nTrips: S.trips.length, updated: Date.now()
    };
    return S.fit;
  }
  const mids = Array.from({ length: NB - 1 }, (_, i) => bandMid(i + 1));
  function bandInterp(arr, kn) { if (kn < 1) return arr[0]; return interp(mids, arr.slice(1), kn); }
  // L/h of one engine in a mode ('both' | 'port' | 'stbd')
  function lphEng(e, mode, kn) {
    if (!S.fit) return NaN;
    if (mode === 'both') return bandInterp(S.fit.x[e].both, kn);
    if (mode === e) return bandInterp(S.fit.x[e].solo, kn);
    return 0;
  }
  const lphTotal = (mode, kn) => lphEng('port', mode, kn) + lphEng('stbd', mode, kn);
  const lpnm = (mode, kn) => (kn >= 1 ? lphTotal(mode, kn) / kn : NaN);
  function lphSigma(mode, kn) {
    if (!S.fit) return NaN;
    const b = bandOf(kn), I = S.fit.inv;
    if (mode === 'both') { const i = IDX('port', 'both', b), j = IDX('stbd', 'both', b); return Math.sqrt(Math.max(0, I[i][i] + I[j][j] + 2 * I[i][j])); }
    const i = IDX(mode, 'solo', b); return Math.sqrt(Math.max(0, I[i][i]));
  }
  const lpnmSigma = (mode, kn) => (kn >= 1 ? lphSigma(mode, kn) / kn : NaN);

  function tripFuel(tr, e) {
    const x = S.fit ? S.fit.x[e] : { both: Array.from({ length: NB }, (_, b) => priorOf('both', b)), solo: Array.from({ length: NB }, (_, b) => priorOf('solo', b)) };
    const bb = tripBands(tr);
    let L = 0; for (let b = 0; b < NB; b++) L += bb.both[b] * x.both[b] + bb[e][b] * x.solo[b];
    return L;
  }
  const tripFuelTotal = (tr) => tripFuel(tr, 'port') + tripFuel(tr, 'stbd');
  function tripMeasured(tr) {
    const ints = intervals().filter((iv) => iv.trips.includes(tr.id));
    if (new Set(ints.map((i) => i.tank)).size < 2) return null;
    let used = 0, dist = 0, shared = false;
    ENG.forEach((e) => { const iv = ints.find((i) => i.tank === e); used += iv.used; if (!dist) dist = iv.dist; if (iv.trips.length > 1) shared = true; });
    return dist ? { lpnm: used / dist, used, shared } : null;
  }

  // ---------- levels, usable fuel, range ----------
  function levelNow(tid) {
    const ev = eventsFor(tid);
    if (!ev.length) return { L: NaN, since: null, known: false };
    const last = ev[ev.length - 1];
    let used = 0;
    S.trips.filter((tr) => tr.end > last.t).forEach((tr) => { used += tripFuel(tr, tid); });
    if (S.active && S.active.start >= last.t) used += tripFuel(S.active, tid);
    return { L: Math.max(0, levelAfter(last) - used), since: last, known: true };
  }
  function usable(tid) {
    const tk = tank(tid), lv = levelNow(tid);
    const dead = unusableL(tk);
    const reserve = (S.settings.reservePct / 100) * Math.max(0, tk.capacity - dead);
    return { L: lv.L, dead, reserve, usable: Math.max(0, lv.L - dead - reserve), known: lv.known };
  }
  function range(mode, kn) {
    if (!(kn >= 1)) return null;
    const eng = mode === 'both' ? ENG : [mode];
    const r = eng.map((e) => { const u = usable(e); const rate = lphEng(e, mode, kn) / kn; return { e, known: u.known, nm: rate > 0 ? u.usable / rate : Infinity }; });
    if (r.some((x) => !x.known)) return null;
    r.sort((a, b) => a.nm - b.nm);
    const lp = lpnm(mode, kn);
    const out = { oneWay: r[0].nm, round: r[0].nm / 2, limit: r[0].e, lpnm: lp };
    if (r.length > 1) out.otherNm = r[1].nm;
    return out;
  }

  // ---------- economy proposals ----------
  function economy() {
    const f = S.fit; if (!f) return null;
    const minKn = S.settings.minCruiseKn, margin = S.settings.effMarginPct / 100;
    let cands = [];
    for (let b = 1; b < NB - 1; b++) if (bandMid(b) >= minKn) cands.push(b);
    const withData = cands.filter((b) => f.loggedH.both[b] >= 0.3);
    const useData = f.nIntervals > 0 && withData.length >= 1;
    if (useData) cands = withData;
    if (!cands.length) return null;
    const lp = (b) => (f.x.port.both[b] + f.x.stbd.both[b]) / bandMid(b);
    let best = cands[0]; cands.forEach((b) => { if (lp(b) < lp(best)) best = b; });
    let eff = best; cands.forEach((b) => { if (lp(b) <= lp(best) * (1 + margin) && bandMid(b) > bandMid(eff)) eff = b; });
    const mk = (b) => { const kn = bandMid(b); const r = rpmFor(kn); return { kn, lpnm: lp(b), sigma: lpnmSigma('both', kn), rpm: r.rpm, rpmSource: r.source }; };
    return { best: mk(best), efficient: mk(eff), fromData: useData };
  }

  // ---------- RPM & hull ----------
  const periodStart = () => (S.hull.cleanings.length ? Math.max(...S.hull.cleanings) : 0);
  function allSamples() {
    const out = [];
    S.trips.forEach((tr) => (tr.samples || []).forEach((s) => out.push(s)));
    if (S.active) (S.active.samples || []).forEach((s) => out.push(s));
    return out.sort((a, b) => a.t - b.t);
  }
  function seasonTable(from = periodStart(), to = Infinity) {
    const by = {};
    allSamples().filter((s) => s.mode === 'both' && s.t >= from && s.t < to).forEach((s) => { (by[s.rpm] = by[s.rpm] || []).push(s.kn); });
    return Object.keys(by).map(Number).sort((a, b) => a - b).map((rpm) => ({ rpm, kn: median(by[rpm]), n: by[rpm].length, clean: cleanKnAt(rpm) }));
  }
  function cleanKnAt(rpm) {
    const c = S.hull.clean.slice().sort((a, b) => a[0] - b[0]);
    if (c.length < 2 || rpm < c[0][0] || rpm > c[c.length - 1][0]) return NaN;
    return interp(c.map((r) => r[0]), c.map((r) => r[1]), rpm);
  }
  function rpmFor(kn) {
    const step = S.settings.rpmStep || 50;
    const round = (r) => Math.round(r / step) * step;
    const st = seasonTable().filter((r) => isFinite(r.kn));
    if (st.length >= 2) {
      const s = st.slice().sort((a, b) => a.kn - b.kn);
      if (kn >= s[0].kn - 0.5 && kn <= s[s.length - 1].kn + 0.5) return { rpm: round(interp(s.map((r) => r.kn), s.map((r) => r.rpm), kn)), source: 'season' };
    }
    const c = S.hull.clean.slice().sort((a, b) => a[1] - b[1]);
    if (c.length >= 2) {
      const loss = hullStatus().current; // speed loss % now: clean speed needed is higher
      const knClean = isFinite(loss) ? kn / (1 - loss / 100) : kn;
      return { rpm: round(interp(c.map((r) => r[1]), c.map((r) => r[0]), knClean)), source: 'clean-hull table' };
    }
    return { rpm: NaN, source: 'none' };
  }
  function lossSamples(from, to) {
    const minKn = S.settings.minCruiseKn;
    return allSamples().filter((s) => s.mode === 'both' && s.t >= from && s.t < to).map((s) => {
      const c = cleanKnAt(s.rpm);
      return isFinite(c) && c >= minKn ? { t: s.t, rpm: s.rpm, kn: s.kn, clean: c, loss: ((c - s.kn) / c) * 100 } : null;
    }).filter(Boolean);
  }
  function hullStatus(periodIdx) {
    const cuts = [0, ...S.hull.cleanings.slice().sort((a, b) => a - b), Infinity];
    const nP = cuts.length - 1;
    const pi = periodIdx === undefined ? nP - 1 : periodIdx;
    const from = cuts[pi], to = cuts[pi + 1];
    const ls = lossSamples(from, to);
    const weeks = {};
    ls.forEach((s) => { const d = new Date(s.t); const day = (d.getDay() + 6) % 7; const wk = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime(); (weeks[wk] = weeks[wk] || []).push(s.loss); });
    const weekly = Object.keys(weeks).map(Number).sort((a, b) => a - b).map((w) => ({ t: w, loss: median(weeks[w]), n: weeks[w].length }));
    const recent = ls.slice(-8).map((s) => s.loss);
    return { periods: nP, period: pi, from, to, samples: ls, weekly, current: ls.length >= 5 ? median(recent) : NaN, enough: ls.length >= 5 };
  }
  function addCleaning(t) { S.hull.cleanings.push(t || Date.now()); save(); }

  // ---------- events ----------
  function addDip(tid, mm, rough, t) {
    const e = { id: uid(), t: t || Date.now(), type: 'dip', tank: tid, mm, rough: !!rough };
    S.events.push(e); refit(); save(); return e;
  }
  // rows: [{tank, beforeMm, pumped, afterMm, brim}] ; one pump total for groups is already split by caller
  function addRefuel(rows, price, rough, t) {
    const tt = t || Date.now(), group = rows.length > 1 ? uid() : null;
    rows.forEach((r) => S.events.push({ id: uid(), t: tt, type: 'refuel', tank: r.tank, mm: r.beforeMm, pumped: r.pumped, afterMm: r.afterMm, brim: !!r.brim, rough: !!rough, group, price }));
    refit(); const p = proposeCurve(); save(); return p;
  }
  function deleteEvent(id) { S.events = S.events.filter((e) => e.id !== id); refit(); proposeCurve(); save(); }
  function addAnchor(tid, mm, L) { S.anchors.push({ id: uid(), tank: tid, mm, L, t: Date.now() }); const p = proposeCurve(); save(); return p; }
  function deleteAnchor(id) { S.anchors = S.anchors.filter((a) => a.id !== id); proposeCurve(); save(); }

  // =====================================================================
  // GPS trip tracking
  // =====================================================================
  let watchId = null, wake = null, buf = [], lastPersist = 0;
  const listeners = new Set();
  const live = { fix: null, sogKn: 0, sogAvg: 0, acc: null, gap: false, error: null };
  const emit = () => listeners.forEach((f) => f());

  async function keepAwake() { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { /* ignore */ } }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S && S.active) keepAwake(); });
  function startWatch() {
    if (watchId !== null || !('geolocation' in navigator)) return;
    watchId = navigator.geolocation.watchPosition(onFix, (err) => { live.error = err.message || 'GPS error'; emit(); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
  }
  function stopWatch() { if (watchId !== null) navigator.geolocation.clearWatch(watchId); watchId = null; }

  async function startTrip(mode) {
    if (S.active) return S.active;
    const t = Date.now();
    S.active = { id: uid(), start: t, end: null, distNm: 0, bandsBy: emptyBands(), last: null, paused: false, gaps: 0, name: '',
      mode: mode || 'both', rpm: null, modeLog: [[t, mode || 'both']], rpmLog: [], samples: [], stretch: null };
    buf = [];
    await trackSet(S.active.id, []);
    await saveNow();
    startWatch(); keepAwake(); emit();
    return S.active;
  }
  function resumeIfActive() { if (S.active) { startWatch(); keepAwake(); } }
  function setPaused(p) { if (S.active) { closeStretch(); S.active.paused = p; S.active.last = null; save(); emit(); } }
  function setMode(m) { const A = S.active; if (!A || A.mode === m) return; closeStretch(); A.mode = m; A.modeLog.push([Date.now(), m]); save(); emit(); }
  function setRpm(r) { const A = S.active; if (!A) return; closeStretch(); A.rpm = r; A.rpmLog.push([Date.now(), r]); save(); emit(); }

  // steady stretches: same RPM + mode, stable speed for >= 3 min
  function closeStretch() {
    const A = S.active; if (!A || !A.stretch) return;
    const st = A.stretch; A.stretch = null;
    const dur = (st.tl - st.t0) / 1000;
    if (st.rpm && dur >= 180 && st.n >= 5) {
      const mean = st.sum / st.n, sd = Math.sqrt(Math.max(0, st.sq / st.n - mean * mean));
      if (sd <= 0.5) A.samples.push({ t: Math.round((st.t0 + st.tl) / 2), rpm: st.rpm, mode: st.mode, kn: +mean.toFixed(2), dur: Math.round(dur) });
    }
  }
  function feedStretch(t, kn) {
    const A = S.active;
    let st = A.stretch;
    if (st && (st.rpm !== A.rpm || st.mode !== A.mode)) { closeStretch(); st = null; }
    if (st && st.n >= 5 && Math.abs(kn - st.sum / st.n) > 0.8) { closeStretch(); st = null; }
    if (st && t - st.t0 > 600000) { closeStretch(); st = null; }
    if (!st) { A.stretch = { t0: t, tl: t, rpm: A.rpm, mode: A.mode, n: 0, sum: 0, sq: 0 }; st = A.stretch; }
    st.n++; st.sum += kn; st.sq += kn * kn; st.tl = t;
  }

  function onFix(pos) {
    const c = pos.coords, t = pos.timestamp || Date.now();
    live.acc = c.accuracy; live.error = null;
    const p = [c.latitude, c.longitude];
    const gpsKn = (c.speed !== null && c.speed >= 0) ? c.speed * KN : null;
    live.fix = { lat: p[0], lon: p[1], t, heading: c.heading };
    const A = S.active;
    if (!A || A.paused) { live.sogKn = gpsKn || 0; emit(); return; }
    if (c.accuracy > 60) { emit(); return; }
    if (A.last) {
      const dt = (t - A.last.t) / 1000;
      if (dt <= 0) return;
      const d = haversine(A.last.p, p);
      let kn = gpsKn !== null ? gpsKn : (d / dt) * KN;
      let gap = false;
      if (dt > 120) { kn = (d / dt) * KN; A.gaps++; live.gap = true; gap = true; closeStretch(); }
      const moving = kn >= 0.8 || d > Math.max(15, c.accuracy);
      if (moving) A.distNm += d / NM;
      A.bandsBy[A.mode][bandOf(moving ? kn : 0)] += dt / 3600;
      live.sogKn = kn;
      live.sogAvg = live.sogAvg ? live.sogAvg * 0.9 + kn * 0.1 : kn;
      if (!gap) feedStretch(t, kn);
      if (moving || dt > 15) buf.push([+p[0].toFixed(6), +p[1].toFixed(6), t, +kn.toFixed(1)]);
    } else buf.push([+p[0].toFixed(6), +p[1].toFixed(6), t, 0]);
    A.last = { p, t };
    if (Date.now() - lastPersist > 20000 || buf.length > 30) persistTrack();
    save(); emit();
  }
  async function persistTrack() {
    if (!S.active || !buf.length) return;
    lastPersist = Date.now();
    const id = S.active.id, add = buf; buf = [];
    const pts = (await trackGet(id)) || [];
    await trackSet(id, pts.concat(add));
  }
  async function activeTrack() { if (!S.active) return []; const pts = (await trackGet(S.active.id)) || []; return pts.concat(buf); }
  async function stopTrip() {
    if (!S.active) return null;
    closeStretch();
    await persistTrack();
    stopWatch();
    try { if (wake) await wake.release(); } catch (e) { /* ignore */ }
    const A = S.active;
    const pts = (await trackGet(A.id)) || [];
    let hours = 0; MODES.forEach((m) => A.bandsBy[m].forEach((h) => { hours += h; }));
    const tr = { id: A.id, start: A.start, end: Date.now(), distNm: A.distNm, bandsBy: A.bandsBy, hours, gaps: A.gaps, name: A.name || autoName(pts), samples: A.samples, modeLog: A.modeLog, rpmLog: A.rpmLog };
    S.trips.push(tr);
    S.active = null; live.gap = false;
    refit(); await saveNow(); emit();
    return tr;
  }
  function autoName(pts) { if (!pts.length) return 'Trip'; return 'Trip ' + new Date(pts[0][2]).toLocaleDateString('fi-FI'); }
  async function deleteTrip(id) { S.trips = S.trips.filter((t) => t.id !== id); await trackDel(id); refit(); save(); }

  // ---------- backup ----------
  async function exportAll() { return { app: 'popcorn-fuel-log', exported: new Date().toISOString(), state: S, tracks: await trackAll() }; }
  async function importAll(obj) {
    if (!obj || obj.app !== 'popcorn-fuel-log' || !obj.state) throw new Error('Not a Fuel Log backup file');
    S = migrate(obj.state);
    for (const [k, v] of Object.entries(obj.tracks || {})) await trackSet(k, v);
    refit(); await saveNow(); emit();
  }

  return {
    NB, MAX_KN, ENG, MODES, bandOf, bandMid, bandLabel, num, haversine, uid, polyEval, median, tripBands,
    init, get state() { return S; }, save, saveNow, live, on: (f) => listeners.add(f),
    tank, litres, litresWith, baseL, unusableL, levelNow, usable, eventsFor, levelAfter, intervals, refit,
    lphEng, lphTotal, lpnm, lphSigma, lpnmSigma, economy, range, tripFuel, tripFuelTotal, tripMeasured,
    fitCurve, proposeCurve, acceptCurve, rejectCurve, restoreCurve, setBase, curveEquations,
    addDip, addRefuel, deleteEvent, addAnchor, deleteAnchor,
    seasonTable, cleanKnAt, rpmFor, hullStatus, addCleaning,
    startTrip, stopTrip, setPaused, setMode, setRpm, resumeIfActive, activeTrack, trackGet, deleteTrip,
    exportAll, importAll, kvGet, kvSet, _onFix: (p) => onFix(p)
  };
})();
