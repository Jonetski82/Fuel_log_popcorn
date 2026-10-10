/* Sea-area data: download, offline storage (IndexedDB via Core) and the range worker. */
'use strict';

const Sea = (() => {
  let worker = null, seq = 0, meta = null, loading = null;
  const pending = new Map();

  function ensureWorker() {
    if (worker) return worker;
    worker = new Worker('sea-worker.js');
    worker.onmessage = (e) => { const p = pending.get(e.data.id); if (!p) return; pending.delete(e.data.id); e.data.error ? p.rej(new Error(e.data.error)) : p.res(e.data.res); };
    worker.onerror = (e) => { pending.forEach((p) => p.rej(new Error(e.message || 'worker error'))); pending.clear(); };
    return worker;
  }
  function call(cmd, args = {}, transfer = []) {
    ensureWorker();
    const id = ++seq;
    return new Promise((res, rej) => { pending.set(id, { res, rej }); worker.postMessage({ id, cmd, ...args }, transfer); });
  }

  async function gunzip(buf) {
    const b = new Uint8Array(buf);
    if (b[0] !== 0x1f || b[1] !== 0x8b) return b;            // already decompressed by the server
    const ds = new DecompressionStream('gzip');
    return new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(ds)).arrayBuffer());
  }

  async function loadFromStore() {
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

  return { init, download, compute, route, get meta() { return meta; } };
})();
