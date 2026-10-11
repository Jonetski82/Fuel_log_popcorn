/* Tank volume fit from a table of (ruler depth, litres) readings.
   Pure functions (no DOM) so the maths can be tested on its own.
   Depth x is in mm, litres y. A model has 1–3 depth areas ("segments"); each area has its own method:
     linear  – straight lines between the points
     spline  – smooth curve through the points that never falls (monotone cubic, Fritsch–Carlson)
     polyN   – least-squares polynomial of degree N (2–4)
   Areas join without a jump: area k > 0 is forced through the value of area k-1 at the boundary.
   Outside the measured depths the curve continues along the end slope. */
'use strict';

const TankFit = (() => {
  const METHODS = ['linear', 'spline', 'poly2', 'poly3', 'poly4'];
  const degOf = (m) => (m && m.startsWith('poly') ? +m.slice(4) : 0);
  const minPts = (m) => (m === 'linear' ? 2 : m === 'spline' ? 3 : degOf(m) + 2);

  function solve(A, y) {
    const n = A.length, M = A.map((r, i) => r.concat([y[i]]));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      const d = M[c][c]; if (Math.abs(d) < 1e-14) return null;
      for (let j = c; j <= n; j++) M[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f) for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j]; }
    }
    return M.map((r) => r[n]);
  }

  // sorted, de-duplicated points (equal depths are averaged)
  function clean(points) {
    const p = points.filter((q) => isFinite(q[0]) && isFinite(q[1])).map((q) => [+q[0], +q[1]]).sort((a, b) => a[0] - b[0]);
    const out = [];
    p.forEach((q) => { const l = out[out.length - 1]; if (l && Math.abs(l[0] - q[0]) < 1e-6) { l[1] = (l[1] * l.n + q[1]) / (l.n + 1); l.n++; } else { const r = [q[0], q[1]]; r.n = 1; out.push(r); } });
    return out.map((q) => [q[0], q[1]]);
  }

  // ---- node-based segments (linear, spline) ----
  function pchipSlopes(xs, ys) {
    const n = xs.length, h = [], dl = [], d = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) { h.push(xs[i + 1] - xs[i]); dl.push((ys[i + 1] - ys[i]) / h[i]); }
    if (n === 2) return [dl[0], dl[0]];
    for (let i = 1; i < n - 1; i++) {
      if (dl[i - 1] * dl[i] <= 0) d[i] = 0;
      else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; d[i] = (w1 + w2) / (w1 / dl[i - 1] + w2 / dl[i]); }
    }
    const end = (h0, h1, d0, d1) => { let v = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1); if (Math.sign(v) !== Math.sign(d0)) v = 0; else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(v) > Math.abs(3 * d0)) v = 3 * d0; return v; };
    d[0] = end(h[0], h[1], dl[0], dl[1]);
    d[n - 1] = end(h[n - 2], h[n - 3], dl[n - 2], dl[n - 3]);
    return d;
  }
  function evalNodes(s, x) {
    const xs = s.xs, ys = s.ys, n = xs.length;
    if (x <= xs[0]) return ys[0] + s.d[0] * (x - xs[0]);
    if (x >= xs[n - 1]) return ys[n - 1] + s.d[n - 1] * (x - xs[n - 1]);
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; }
    const h = xs[hi] - xs[lo], t = (x - xs[lo]) / h;
    if (s.kind === 'linear') return ys[lo] + t * (ys[hi] - ys[lo]);
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[lo] + (t3 - 2 * t2 + t) * h * s.d[lo] + (-2 * t3 + 3 * t2) * ys[hi] + (t3 - t2) * h * s.d[hi];
  }

  function fitSegment(pts, method, anchor, scale) {
    let nodes = pts.slice();
    if (anchor) nodes = [anchor].concat(nodes.filter((p) => Math.abs(p[0] - anchor[0]) > 1e-6));
    if (nodes.length < minPts(method)) return null;
    if (method === 'linear' || method === 'spline') {
      const xs = nodes.map((p) => p[0]), ys = nodes.map((p) => p[1]);
      let d;
      if (method === 'linear') { const n = xs.length; d = new Array(n).fill(0); d[0] = (ys[1] - ys[0]) / (xs[1] - xs[0]); d[n - 1] = (ys[n - 1] - ys[n - 2]) / (xs[n - 1] - xs[n - 2]); }
      else d = pchipSlopes(xs, ys);
      return { kind: method, xs, ys, d };
    }
    const N = degOf(method), u = (x) => x / scale;
    if (anchor) {   // y = y0 + sum_{k=1..N} c_k (u - u0)^k  → passes through the anchor exactly
      const u0 = u(anchor[0]), y0 = anchor[1], data = nodes.slice(1);
      const A = Array.from({ length: N }, () => new Array(N).fill(0)), g = new Array(N).fill(0);
      data.forEach(([x, y]) => { const b = []; for (let k = 1; k <= N; k++) b.push(Math.pow(u(x) - u0, k)); for (let i = 0; i < N; i++) { g[i] += b[i] * (y - y0); for (let j = 0; j < N; j++) A[i][j] += b[i] * b[j]; } });
      for (let i = 0; i < N; i++) A[i][i] += 1e-12;
      const c = solve(A, g); if (!c) return null;
      return { kind: method, N, c, u0, y0, scale, anchored: true };
    }
    const A = Array.from({ length: N + 1 }, () => new Array(N + 1).fill(0)), g = new Array(N + 1).fill(0);
    nodes.forEach(([x, y]) => { const b = []; for (let k = 0; k <= N; k++) b.push(Math.pow(u(x), k)); for (let i = 0; i <= N; i++) { g[i] += b[i] * y; for (let j = 0; j <= N; j++) A[i][j] += b[i] * b[j]; } });
    for (let i = 0; i <= N; i++) A[i][i] += 1e-12;
    const c = solve(A, g); if (!c) return null;
    return { kind: method, N, c, scale, anchored: false };
  }
  function evalSeg(s, x) {
    if (s.kind === 'linear' || s.kind === 'spline') return evalNodes(s, x);
    const u = x / s.scale;
    if (s.anchored) { let y = s.y0; for (let k = 1; k <= s.N; k++) y += s.c[k - 1] * Math.pow(u - s.u0, k); return y; }
    let y = 0; for (let k = 0; k <= s.N; k++) y += s.c[k] * Math.pow(u, k); return y;
  }
  function evalRaw(model, x) {
    const segs = model.segs; let i = 0;
    while (i < segs.length - 1 && x > segs[i].hi) i++;
    return evalSeg(segs[i], x);
  }
  const deriv = (model, x) => (evalRaw(model, x + 0.5) - evalRaw(model, x - 0.5));
  // value at depth x (mm); straight continuation outside the measured depths
  function evalModel(model, x) {
    if (!model || !isFinite(x)) return NaN;
    if (x < model.xmin) return model.ylo + model.dlo * (x - model.xmin);
    if (x > model.xmax) return model.yhi + model.dhi * (x - model.xmax);
    return evalRaw(model, x);
  }

  // bounds: ascending depths (mm) between areas; methods: one per area
  function fit(points, bounds, methods, scale) {
    const pts = clean(points), K = (bounds || []).length + 1;
    if (pts.length < 2) return { ok: false, area: 0, reason: 'points' };
    const segs = [];
    for (let k = 0; k < K; k++) {
      const lo = k ? bounds[k - 1] : -Infinity, hi = k < K - 1 ? bounds[k] : Infinity;
      const sp = pts.filter((p) => (k === 0 || p[0] > lo) && (k === K - 1 || p[0] <= hi));
      const anchor = k ? [lo, evalSeg(segs[k - 1], lo)] : null;
      const s = fitSegment(sp, methods[k] || 'linear', anchor, scale);
      if (!s) return { ok: false, area: k, reason: 'points' };
      s.lo = lo; s.hi = hi; segs.push(s);
    }
    const model = { segs, xmin: pts[0][0], xmax: pts[pts.length - 1][0], scale };
    model.ylo = evalRaw(model, model.xmin); model.yhi = evalRaw(model, model.xmax);
    model.dlo = Math.max(0, (evalRaw(model, model.xmin + 1) - model.ylo));
    model.dhi = Math.max(0, (model.yhi - evalRaw(model, model.xmax - 1)));
    return { ok: true, model };
  }

  function monotonic(model, x0, x1) {
    let prev = -Infinity;
    for (let i = 0; i <= 240; i++) { const y = evalModel(model, x0 + ((x1 - x0) * i) / 240); if (y < prev - 0.05) return false; prev = y; }
    return true;
  }
  const areaOf = (x, bounds) => { let k = 0; while (k < bounds.length && x > bounds[k]) k++; return k; };
  const rmsOf = (a) => { const v = a.filter(isFinite); return v.length ? Math.sqrt(v.reduce((s, r) => s + r * r, 0) / v.length) : NaN; };

  // leave-one-out: each reading predicted from all the others
  function loo(points, bounds, methods, scale) {
    const pts = clean(points);
    return pts.map((p, i) => {
      const f = fit(pts.filter((_, j) => j !== i), bounds, methods, scale);
      return f.ok ? evalModel(f.model, p[0]) - p[1] : NaN;
    });
  }

  // full evaluation for one choice of methods
  function evaluate(points, bounds, methods, scale, range) {
    const pts = clean(points), b = bounds || [];
    const f = fit(pts, b, methods, scale);
    if (!f.ok) return { ok: false, area: f.area, reason: f.reason };
    const mono = monotonic(f.model, range[0], range[1]);
    const res = loo(pts, b, methods, scale);
    const perArea = Array.from({ length: b.length + 1 }, (_, k) => {
      const r = res.filter((_, i) => areaOf(pts[i][0], b) === k);
      return { rms: rmsOf(r), n: r.length, complete: r.every(isFinite) };
    });
    const fitRes = pts.map((p) => evalModel(f.model, p[0]) - p[1]);
    return { ok: true, model: f.model, mono, rms: rmsOf(res), complete: res.every(isFinite), perArea, fitRms: rmsOf(fitRes), res };
  }

  // every method for one area, others fixed
  function options(points, bounds, methods, area, scale, range) {
    return METHODS.map((m) => {
      const ms = methods.slice(); ms[area] = m;
      const e = evaluate(points, bounds, ms, scale, range);
      if (!e.ok) return { method: m, ok: false, reason: e.area === area ? 'points' : 'other' };
      const a = e.perArea[area];
      return { method: m, ok: true, mono: e.mono, rms: a.rms, complete: a.complete, total: e.rms };
    });
  }
  const score = (o) => (!o.ok || !o.mono ? Infinity : o.complete && isFinite(o.rms) ? o.rms : 1e6 + METHODS.indexOf(o.method));
  // best method per area (left to right, simplest wins ties within 0.1 L)
  function recommend(points, bounds, scale, range) {
    const K = (bounds || []).length + 1, ms = new Array(K).fill('linear');
    for (let k = 0; k < K; k++) {
      const o = options(points, bounds, ms, k, scale, range);
      let best = o[0]; o.forEach((x) => { if (score(x) < score(best) - 0.1) best = x; });
      ms[k] = best.method;
    }
    return ms;
  }
  // boundaries with the smallest total leave-one-out error (each area needs at least 2 readings)
  function suggestBounds(points, nAreas, scale, range) {
    const pts = clean(points), xs = pts.map((p) => p[0]);
    if (nAreas <= 1) return [];
    let cand = []; for (let i = 1; i < xs.length - 2; i++) cand.push(Math.round((xs[i] + xs[i + 1]) / 2 / 5) * 5);
    cand = [...new Set(cand)];
    if (cand.length > 14) { const step = (cand.length - 1) / 13; cand = [...new Set(Array.from({ length: 14 }, (_, i) => cand[Math.round(i * step)]))]; }   // keep it quick on a phone
    let best = null;
    const tryB = (b) => {
      const counts = b.concat([Infinity]).map((hi, k) => xs.filter((x) => x > (k ? b[k - 1] : -Infinity) && x <= hi).length);
      if (counts.some((c) => c < 2)) return;
      const ms = recommend(pts, b, scale, range), e = evaluate(pts, b, ms, scale, range);
      if (!e.ok || !e.mono || !isFinite(e.rms)) return;
      if (!best || e.rms < best.rms - 1e-9) best = { bounds: b, methods: ms, rms: e.rms };
    };
    if (nAreas === 2) cand.forEach((c) => tryB([c]));
    else for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) if (cand[j] > cand[i]) tryB([cand[i], cand[j]]);
    return best;
  }

  return { METHODS, minPts, clean, fit, evalModel, monotonic, loo, evaluate, options, recommend, suggestBounds };
})();

if (typeof module !== 'undefined') module.exports = TankFit;
