/* Sea-area data: download, offline storage (IndexedDB via Core) and the range worker. */
'use strict';

const Sea = (() => {
  let worker = null, seq = 0, meta = null, loading = null, stations = [];
  const pending = new Map();

  function ensureWorker() {
    if (worker) return worker;
    worker = new Worker('sea-worker.js');
    worker.onmessage = (e) => { const p = pending.get(e.data.id); if (!p) return; if (e.data.progress) { if (p.onProgress) p.onProgress(e.data.progress); return; } pending.delete(e.data.id); e.data.error ? p.rej(new Error(e.data.error)) : p.res(e.data.res); };
    worker.onerror = (e) => { pending.forEach((p) => p.rej(new Error(e.message || 'worker error'))); pending.clear(); };
    return worker;
  }
  function call(cmd, args = {}, transfer = [], onProgress) {
    ensureWorker();
    const id = ++seq;
    return new Promise((res, rej) => { pending.set(id, { res, rej, onProgress }); worker.postMessage({ id, cmd, ...args }, transfer); });
  }

  async function gunzip(buf) {
    const b = new Uint8Array(buf);
    if (b[0] !== 0x1f || b[1] !== 0x8b) return b;            // already decompressed by the server
    const ds = new DecompressionStream('gzip');
    return new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(ds)).arrayBuffer());
  }

  async function loadFromStore() {
    const fj = await Core.kvGet('sea-fuel');
    stations = (fj && fj.stations) || [];
    const m = await Core.kvGet('sea-meta');
    if (!m) return false;
    const g = await Core.kvGet('sea-grid'), f = await Core.kvGet('sea-fw');
    if (!g) return false;
    const grid = await gunzip(g);
    const fw = f ? JSON.parse(new TextDecoder().decode(await gunzip(f))) : null;
    if (grid.length !== m.W * m.H) throw new Error('sea grid size mismatch');
    await call('load', { meta: m, grid: grid.buffer, fairways: fw }, [grid.buffer]);
    meta = m;
    return true;
  }
  function init() { if (!loading) loading = loadFromStore().catch((e) => { console.warn('sea data', e); return false; }); return loading; }

  async function download(base, onStep) {
    const u = (n) => base.replace(/\/?$/, '/') + n + '?t=' + Date.now();
    onStep && onStep('Downloading description…');
    const mres = await fetch(u('meta.json'));
    if (!mres.ok) throw new Error('meta.json: HTTP ' + mres.status + ' (has the "Build sea data" workflow been run?)');
    const m = await mres.json();
    onStep && onStep('Downloading depth & land grid…');
    const g = await fetch(u('grid.bin.gz')); if (!g.ok) throw new Error('grid.bin.gz: HTTP ' + g.status);
    const gb = await g.arrayBuffer();
    onStep && onStep('Downloading fairways…');
    const f = await fetch(u('fairways.json.gz')); const fb = f.ok ? await f.arrayBuffer() : null;
    onStep && onStep('Downloading fuel stations…');
    try {   // an empty list from the workflow must not wipe stations fetched on the phone
      const fr = await fetch(u('fuel.json'));
      if (fr.ok) { const j = await fr.json(); if (j && j.stations && j.stations.length) await Core.kvSet('sea-fuel', j); }
    } catch (e) { /* optional */ }
    await Core.kvSet('sea-grid', gb); if (fb) await Core.kvSet('sea-fw', fb);
    m.downloaded = Date.now(); m.bytes = gb.byteLength + (fb ? fb.byteLength : 0);
    await Core.kvSet('sea-meta', m);
    onStep && onStep('Preparing…');
    loading = null; meta = null;
    if (!(await init())) throw new Error('could not load the downloaded data');
    return meta;
  }

  // compute: mode 'water' | 'fairway'; r1/r2 metres; returns overlay data
  async function compute(mode, lat, lon, r1, r2, draftM) {
    await init();
    if (!meta) return { error: 'nodata' };
    const inside = await call('inside', { lat, lon });
    if (!inside.inside) return { error: 'outside' };
    const maxM = Math.max(r1, r2) * 1.001, draftDm = Math.round(draftM * 10);
    if (mode === 'water') {
      const s = await call('water', { lat, lon, maxM, draftDm });
      if (s.start < 0) return { error: 'land' };
      const img = await call('paintWater', { r1, r2 });
      return { mode, ms: s.ms, snapM: s.snapM, img };
    }
    const s = await call('fairway', { lat, lon, maxM, draftDm, connectM: 3704 });
    if (s.error) return { error: s.error };
    if (s.start < 0) return { error: 'land' };
    const segs = await call('paintFairways', { r1, r2 });
    return { mode, ms: s.ms, reached: s.reached, segs };
  }
  const route = (lat, lon, mode) => call('route', { lat, lon, mode });
  async function matrix(points, mode, draftM, maxM, onProgress) { await init(); return call('matrix', { points, mode, draftDm: Math.round(draftM * 10), maxM }, [], onProgress); }
  const leg = (a, b, mode, draftM, maxM) => call('leg', { a, b, mode, draftDm: Math.round(draftM * 10), maxM });
  const inside = (lat, lon) => call('inside', { lat, lon });

  // Fuel stations straight from OpenStreetMap (the phone asks Overpass; no GitHub workflow needed).
  // Marine-tagged stations are kept; ordinary fuel stations only when they lie within ~200 m of water (marked "near").
  const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  const DEFAULT_BBOX = [19.4, 59.2, 28.0, 61.0];
  async function fetchStations(onStep) {
    await init();
    const bb = (meta && meta.bbox) || DEFAULT_BBOX, b = `(${bb[1]},${bb[0]},${bb[3]},${bb[2]})`;
    const q = `[out:json][timeout:120];(nwr["waterway"="fuel"]${b};nwr["seamark:small_craft_facility:category"~"fuel"]${b};nwr["amenity"="fuel"]${b};);out center tags;`;
    let els = null, last = null;
    for (const u of OVERPASS) {
      try {
        onStep && onStep('Asking OpenStreetMap…');
        const r = await fetch(u, { method: 'POST', body: new URLSearchParams({ data: q }) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        els = (await r.json()).elements || []; break;
      } catch (e) { last = e; }
    }
    if (!els) throw last || new Error('no answer');
    const marine = (t) => t.waterway === 'fuel' || /fuel/.test(t['seamark:small_craft_facility:category'] || '') || t.boat === 'yes' || 'fuel:marine_diesel' in t;
    const seen = new Set(), sure = [], cand = [];
    els.forEach((e) => {
      const lat = e.lat ?? (e.center && e.center.lat), lon = e.lon ?? (e.center && e.center.lon);
      if (lat == null || lon == null) return;
      const k = lat.toFixed(4) + ',' + lon.toFixed(4); if (seen.has(k)) return; seen.add(k);
      const t = e.tags || {};
      const st = { id: 'osm:' + e.type[0] + e.id, lat: +lat.toFixed(6), lon: +lon.toFixed(6), name: t.name || t['seamark:name'] || t.brand || t.operator || 'Fuel station',
        operator: t.operator || t.brand || '', fuels: Object.keys(t).filter((x) => x.startsWith('fuel:') && t[x] !== 'no').map((x) => x.slice(5)).sort(),
        hours: t.opening_hours || '', phone: t.phone || t['contact:phone'] || '', website: t.website || t['contact:website'] || '' };
      (marine(t) ? sure : cand).push(st);
    });
    let near = [];
    if (cand.length && meta) {
      onStep && onStep('Checking which stations are by the water…');
      const ok = await call('nearWater', { points: cand.map((c) => ({ lat: c.lat, lon: c.lon })), rad: 2 });
      near = cand.filter((_, i) => ok[i]).map((c) => ({ ...c, near: true }));
    }
    stations = sure.concat(near);
    await Core.kvSet('sea-fuel', { built: new Date().toISOString(), source: 'OpenStreetMap contributors (ODbL)', stations });
    return { total: stations.length, marine: sure.length, near: near.length, checked: !!meta };
  }

  return { init, download, compute, route, matrix, leg, inside, fetchStations, get meta() { return meta; }, get stations() { return stations; } };
})();
