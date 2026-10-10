/* Sea-area range worker: shortest water distance over the depth/land grid, and along fairways.
   Grid: Web Mercator, row 0 = north edge. Values: 0 land, 1..254 depth dm, 255 water unknown depth. */
'use strict';
const R = 6378137;
let G = null;      // grid
let FW = null;     // fairway graph
let W = null;      // last water search {dist, dir, start, maxM, draftDm}
let F = null;      // last fairway search {nd, prev, src}
let C = null;      // connector water search used by the fairway search

const lonOf = (x) => (x / R) * 180 / Math.PI;
const latOf = (y) => (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * 180 / Math.PI;
const mx = (lon) => R * lon * Math.PI / 180;
const my = (lat) => R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));

function load(m) {
  const meta = m.meta, Wd = meta.W, H = meta.H;
  const scale = new Float32Array(H);
  for (let r = 0; r < H; r++) { const lat = latOf(meta.y1 - (r + 0.5) * meta.cell); scale[r] = meta.cell * Math.cos(lat * Math.PI / 180); }
  G = { meta, W: Wd, H, cell: meta.cell, x0: meta.x0, y1: meta.y1, g: new Uint8Array(m.grid), scale };
  const fw = m.fairways;
  if (fw && fw.nodes) {
    const n = fw.nodes.length / 2, e = fw.edges.length / 4;
    const lon = new Float64Array(n), lat = new Float64Array(n), cellIdx = new Int32Array(n);
    for (let i = 0; i < n; i++) { lon[i] = fw.nodes[2 * i] / 1e5; lat[i] = fw.nodes[2 * i + 1] / 1e5; cellIdx[i] = cellOf(lat[i], lon[i]); }
    const deg = new Int32Array(n + 1);
    for (let k = 0; k < e; k++) { deg[fw.edges[4 * k]]++; deg[fw.edges[4 * k + 1]]++; }
    const start = new Int32Array(n + 1); for (let i = 0; i < n; i++) start[i + 1] = start[i] + deg[i];
    const fill = start.slice(0, n), to = new Int32Array(2 * e), len = new Float32Array(2 * e), dep = new Int16Array(2 * e), eid = new Int32Array(2 * e);
    for (let k = 0; k < e; k++) {
      const a = fw.edges[4 * k], b = fw.edges[4 * k + 1], L = fw.edges[4 * k + 2], d = fw.edges[4 * k + 3];
      let p = fill[a]++; to[p] = b; len[p] = L; dep[p] = d; eid[p] = k;
      p = fill[b]++; to[p] = a; len[p] = L; dep[p] = d; eid[p] = k;
    }
    FW = { n, e, lon, lat, cellIdx, start, to, len, dep, eid, edges: fw.edges };
  } else FW = null;
  return { ok: true, W: Wd, H, nodes: FW ? FW.n : 0, edges: FW ? FW.e : 0 };
}

function cellOf(lat, lon) {
  const c = Math.floor((mx(lon) - G.x0) / G.cell), r = Math.floor((G.y1 - my(lat)) / G.cell);
  if (c < 0 || r < 0 || c >= G.W || r >= G.H) return -1;
  return r * G.W + c;
}
function centre(idx) {
  const r = Math.floor(idx / G.W), c = idx - r * G.W;
  return [latOf(G.y1 - (r + 0.5) * G.cell), lonOf(G.x0 + (c + 0.5) * G.cell)];
}
const passable = (v, draftDm) => v !== 0 && (v === 255 || v >= draftDm);

// ---- binary min-heap of (key, idx) ----
class Heap {
  constructor(cap) { this.k = new Float32Array(cap); this.v = new Int32Array(cap); this.n = 0; }
  push(key, val) {
    if (this.n === this.k.length) { const k = new Float32Array(this.n * 2); k.set(this.k); this.k = k; const v = new Int32Array(this.n * 2); v.set(this.v); this.v = v; }
    let i = this.n++; const K = this.k, V = this.v;
    while (i > 0) { const p = (i - 1) >> 1; if (K[p] <= key) break; K[i] = K[p]; V[i] = V[p]; i = p; }
    K[i] = key; V[i] = val;
  }
  pop() { // returns index of value in this.v after moving it to slot n (caller reads popK/popV)
    const K = this.k, V = this.v; this.popK = K[0]; this.popV = V[0];
    const key = K[--this.n], val = V[this.n]; let i = 0;
    for (;;) { let c = 2 * i + 1; if (c >= this.n) break; if (c + 1 < this.n && K[c + 1] < K[c]) c++; if (K[c] >= key) break; K[i] = K[c]; V[i] = V[c]; i = c; }
    K[i] = key; V[i] = val;
  }
}

// 8 directions: dc, dr
const DC = [1, -1, 0, 0, 1, 1, -1, -1], DR = [0, 0, 1, -1, 1, -1, 1, -1];

function snapStart(lat, lon, draftDm) {
  const s = cellOf(lat, lon);
  if (s < 0) return { idx: -1, snapM: 0 };
  if (passable(G.g[s], draftDm)) return { idx: s, snapM: 0 };
  const r0 = Math.floor(s / G.W), c0 = s - r0 * G.W;
  let best = -1, bd = Infinity;
  for (let dr = -15; dr <= 15; dr++) for (let dc = -15; dc <= 15; dc++) {
    const r = r0 + dr, c = c0 + dc; if (r < 0 || c < 0 || r >= G.H || c >= G.W) continue;
    const i = r * G.W + c; const d = dr * dr + dc * dc;
    if (d < bd && passable(G.g[i], draftDm)) { bd = d; best = i; }
  }
  return best < 0 ? { idx: -1, snapM: 0 } : { idx: best, snapM: Math.sqrt(bd) * G.scale[r0] };
}

function waterSearch(lat, lon, maxM, draftDm) {
  // Dial's bucket queue: buckets 5 m wide (steps are ~100-145 m), ordering error < 5 m.
  const N = G.W * G.H;
  const dist = new Float32Array(N).fill(Infinity), dir = new Uint8Array(N).fill(255);
  const st = snapStart(lat, lon, draftDm);
  if (st.idx < 0) return { dist, dir, start: -1, snapM: 0, maxM, draftDm, reached: 0 };
  const BW = 5, NBK = 64;
  const bk = [], bn = new Int32Array(NBK);
  for (let k = 0; k < NBK; k++) bk.push(new Int32Array(1024));
  const put = (b, v) => { const q = b & (NBK - 1); if (bn[q] === bk[q].length) { const a = new Int32Array(bk[q].length * 2); a.set(bk[q]); bk[q] = a; } bk[q][bn[q]++] = v; };
  const done = new Uint8Array(N);
  const g = G.g, Wd = G.W, H = G.H, sc = G.scale;
  dist[st.idx] = st.snapM; dir[st.idx] = 8;
  let cur = Math.floor(st.snapM / BW), pending = 1, reached = 0;
  put(cur, st.idx);
  const lastB = Math.floor(maxM / BW);
  while (pending > 0 && cur <= lastB) {
    const q = cur & (NBK - 1);
    while (bn[q] > 0) {
      const i = bk[q][--bn[q]]; pending--;
      if (done[i]) continue;
      done[i] = 1; reached++;
      const d = dist[i];
      const r = (i / Wd) | 0, c = i - r * Wd;
      for (let k = 0; k < 8; k++) {
        const nc = c + DC[k], nr = r + DR[k];
        if (nc < 0 || nr < 0 || nc >= Wd || nr >= H) continue;
        const j = nr * Wd + nc;
        if (done[j]) continue;
        const v = g[j]; if (v === 0 || (v !== 255 && v < draftDm)) continue;
        if (k >= 4) { const a = g[r * Wd + nc], b = g[nr * Wd + c]; if (a === 0 || (a !== 255 && a < draftDm) || b === 0 || (b !== 255 && b < draftDm)) continue; }
        const nd = Math.fround(d + (sc[r] + sc[nr]) * 0.5 * (k >= 4 ? Math.SQRT2 : 1));
        if (nd < dist[j] && nd <= maxM) { dist[j] = nd; dir[j] = k; put(Math.floor(nd / BW), j); pending++; }
      }
    }
    cur++;
  }
  return { dist, dir, start: st.idx, snapM: st.snapM, maxM, draftDm, reached };
}

function waterPath(S, idx) { // back from idx to start
  const out = []; let i = idx, guard = 0;
  while (i >= 0 && guard++ < 2e6) {
    out.push(i);
    const k = S.dir[i]; if (k === 8 || k === 255) break;
    const r = (i / G.W) | 0, c = i - r * G.W;
    i = (r - DR[k]) * G.W + (c - DC[k]);
  }
  return out.reverse();
}

// water distance from a connector search S to fairway node i (the node can sit on a "land" cell at 100 m resolution: look around)
function nodeCellDist(S, i) {
  const ci = FW.cellIdx[i]; if (ci < 0) return [Infinity, -1];
  let best = S.dist[ci], bestCell = ci;
  if (!isFinite(best)) {
    const r0 = (ci / G.W) | 0, c0 = ci - r0 * G.W;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      const r = r0 + dr, c = c0 + dc; if (r < 0 || c < 0 || r >= G.H || c >= G.W) continue;
      const j = r * G.W + c, dd = S.dist[j] + Math.hypot(dr, dc) * G.scale[r0];
      if (dd < best) { best = dd; bestCell = j; }
    }
  }
  return [best, bestCell];
}

function fairwaySearch(lat, lon, maxM, draftDm, connectM) {
  C = waterSearch(lat, lon, Math.min(maxM, connectM), draftDm);
  const nd = new Float32Array(FW.n).fill(Infinity), prev = new Int32Array(FW.n).fill(-1), src = new Int8Array(FW.n);
  const h = new Heap(1 << 12);
  if (C.start >= 0) for (let i = 0; i < FW.n; i++) {
    const [best, bestCell] = nodeCellDist(C, i);
    if (isFinite(best) && best <= connectM) { nd[i] = best; src[i] = 1; prev[i] = -2 - bestCell; h.push(best, i); }
  }
  const done = new Uint8Array(FW.n);
  while (h.n) {
    h.pop(); const d = h.popK, i = h.popV;
    if (done[i]) continue;
    if (d > maxM) break;
    done[i] = 1;
    for (let p = FW.start[i]; p < FW.start[i + 1]; p++) {
      const dep = FW.dep[p]; if (dep >= 0 && dep < draftDm) continue;
      const j = FW.to[p], v = Math.fround(d + FW.len[p]);
      if (v < nd[j]) { nd[j] = v; prev[j] = i; src[j] = 0; h.push(v, j); }
    }
  }
  F = { nd, prev, src };
  let reached = 0; for (let i = 0; i < FW.n; i++) if (nd[i] <= maxM) reached++;
  return reached;
}

function paintWater(r1, r2) {
  const S = W; const lo = Math.min(r1, r2), hi = Math.max(r1, r2);
  let c0 = G.W, c1 = -1, r0 = G.H, rr1 = -1;
  const d = S.dist, Wd = G.W;
  for (let i = 0; i < d.length; i++) if (d[i] <= hi) { const r = (i / Wd) | 0, c = i - r * Wd; if (c < c0) c0 = c; if (c > c1) c1 = c; if (r < r0) r0 = r; if (r > rr1) rr1 = r; }
  if (c1 < 0) return null;
  const w = c1 - c0 + 1, h = rr1 - r0 + 1, buf = new Uint8ClampedArray(w * h * 4);
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const v = d[(r0 + r) * Wd + c0 + c], o = (r * w + c) * 4;
    if (v <= lo) { buf[o] = 31; buf[o + 1] = 86; buf[o + 2] = 117; buf[o + 3] = 110; }
    else if (v <= hi) { buf[o] = 31; buf[o + 1] = 86; buf[o + 2] = 117; buf[o + 3] = 45; }
  }
  const north = latOf(G.y1 - r0 * G.cell), south = latOf(G.y1 - (rr1 + 1) * G.cell);
  const west = lonOf(G.x0 + c0 * G.cell), east = lonOf(G.x0 + (c1 + 1) * G.cell);
  return { w, h, buf, bounds: [[south, west], [north, east]] };
}

function paintFairways(r1, r2) {
  const lo = Math.min(r1, r2), hi = Math.max(r1, r2), near = [], far = [];
  const E = FW.edges;
  for (let k = 0; k < FW.e; k++) {
    const a = E[4 * k], b = E[4 * k + 1]; const m = Math.max(F.nd[a], F.nd[b]);
    if (!(m <= hi)) continue;
    const seg = [FW.lat[a], FW.lon[a], FW.lat[b], FW.lon[b]];
    (m <= lo ? near : far).push(seg);
  }
  return { near, far };
}

function route(lat, lon, mode) {
  if (mode === 'water') {
    const t = cellOf(lat, lon); if (t < 0 || !W) return null;
    let best = t;
    if (!isFinite(W.dist[t])) { // tapped on land: nearest reached water cell nearby
      const r0 = (t / G.W) | 0, c0 = t - r0 * G.W; let bd = Infinity;
      for (let dr = -10; dr <= 10; dr++) for (let dc = -10; dc <= 10; dc++) { const r = r0 + dr, c = c0 + dc; if (r < 0 || c < 0 || r >= G.H || c >= G.W) continue; const j = r * G.W + c; const q = dr * dr + dc * dc; if (isFinite(W.dist[j]) && q < bd) { bd = q; best = j; } }
      if (!isFinite(bd)) return null;
    }
    const cells = waterPath(W, best);
    const pts = cells.filter((_, i) => i % 3 === 0 || i === cells.length - 1).map(centre);
    return { m: W.dist[best], pts };
  }
  if (!F) return null;
  // nearest reached fairway node to the tap
  let bi = -1, bd = Infinity; const cl = Math.cos(lat * Math.PI / 180);
  for (let i = 0; i < FW.n; i++) { if (!isFinite(F.nd[i])) continue; const dx = (FW.lon[i] - lon) * cl, dy = FW.lat[i] - lat, q = dx * dx + dy * dy; if (q < bd) { bd = q; bi = i; } }
  if (bi < 0 || Math.sqrt(bd) * 111320 > 3000) return null;
  const nodes = []; let i = bi, guard = 0;
  while (i >= 0 && guard++ < 1e6) { nodes.push(i); i = F.prev[i]; }
  nodes.reverse();
  const first = nodes[0]; const entryCell = -2 - F.prev[first];
  const conn = entryCell >= 0 ? waterPath(C, entryCell).filter((_, k) => k % 3 === 0).map(centre) : [];
  const pts = conn.concat(nodes.map((n) => [FW.lat[n], FW.lon[n]]));
  return { m: F.nd[bi], pts };
}

// ---- planner support: distances between many points, and leg geometry ----
// In fairway mode each end of a leg may be up to PLAN_CONNECT metres of water away from the fairway network.
const PLAN_CONNECT = 9260;
function nearestReached(dist, lat, lon, radCells) {
  const t = cellOf(lat, lon); if (t < 0) return [Infinity, -1];
  const r0 = (t / G.W) | 0, c0 = t - r0 * G.W; let best = Infinity, bc = -1;
  for (let dr = -radCells; dr <= radCells; dr++) for (let dc = -radCells; dc <= radCells; dc++) {
    const r = r0 + dr, c = c0 + dc; if (r < 0 || c < 0 || r >= G.H || c >= G.W) continue;
    const j = r * G.W + c, v = dist[j]; if (!isFinite(v)) continue;
    const d = v + Math.hypot(dr, dc) * G.scale[r0]; if (d < best) { best = d; bc = j; }
  }
  return [best, bc];
}
// fairway nodes reachable over water from a point: [{ node, d }]
function endConnector(p, draftDm) {
  const S = waterSearch(p.lat, p.lon, PLAN_CONNECT, draftDm), out = [];
  if (S.start < 0) return { S, out };
  for (let i = 0; i < FW.n; i++) { const [d] = nodeCellDist(S, i); if (isFinite(d) && d <= PLAN_CONNECT) out.push({ node: i, d }); }
  return { S, out };
}
function matrix(points, mode, draftDm, maxM, onRow) {
  const n = points.length, D = [];
  const ends = mode === 'water' || !FW ? null : points.map((p) => endConnector(p, draftDm).out);
  for (let i = 0; i < n; i++) {
    const p = points[i], row = new Array(n).fill(Infinity);
    if (mode === 'water' || !FW) {
      const S = waterSearch(p.lat, p.lon, maxM, draftDm);
      if (S.start >= 0) for (let j = 0; j < n; j++) row[j] = i === j ? 0 : nearestReached(S.dist, points[j].lat, points[j].lon, 10)[0];
    } else {
      fairwaySearch(p.lat, p.lon, maxM, draftDm, PLAN_CONNECT);
      if (C.start >= 0) for (let j = 0; j < n; j++) {
        if (i === j) { row[j] = 0; continue; }
        let best = nearestReached(C.dist, points[j].lat, points[j].lon, 10)[0];   // short hop over water
        for (const e of ends[j]) { const v = F.nd[e.node] + e.d; if (v < best) best = v; }
        row[j] = best;
      }
    }
    D.push(row); onRow && onRow(i + 1, n);
  }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const m = Math.min(D[i][j], D[j][i]); D[i][j] = D[j][i] = m; }
  return D;
}
function leg(a, b, mode, draftDm, maxM) {
  if (mode === 'water' || !FW) { W = waterSearch(a.lat, a.lon, maxM, draftDm); if (W.start < 0) return null; return route(b.lat, b.lon, 'water'); }
  fairwaySearch(a.lat, a.lon, maxM, draftDm, PLAN_CONNECT); if (C.start < 0) return null;
  const Cs = C, Fs = F;
  const [direct, dCell] = nearestReached(Cs.dist, b.lat, b.lon, 10);
  const E = endConnector(b, draftDm);
  let best = direct, bn = -1, bd = 0;
  for (const e of E.out) { const v = Fs.nd[e.node] + e.d; if (v < best) { best = v; bn = e.node; bd = e.d; } }
  if (!isFinite(best)) return null;
  const thin = (arr) => arr.filter((_, k) => k % 3 === 0 || k === arr.length - 1).map(centre);
  if (bn < 0) return { m: best, pts: thin(waterPath(Cs, dCell)).concat([[b.lat, b.lon]]) };
  const nodes = []; let i = bn, guard = 0;
  while (i >= 0 && guard++ < 1e6) { nodes.push(i); i = Fs.prev[i]; }
  nodes.reverse();
  const entryCell = -2 - Fs.prev[nodes[0]];
  const head = entryCell >= 0 ? thin(waterPath(Cs, entryCell)) : [];
  const [, exitCell] = nodeCellDist(E.S, bn);
  const tail = exitCell >= 0 ? thin(waterPath(E.S, exitCell).reverse()) : [];   // from the fairway on to b
  return { m: best, pts: [[a.lat, a.lon]].concat(head, nodes.map((n) => [FW.lat[n], FW.lon[n]]), tail, [[b.lat, b.lon]]) };
}

onmessage = (e) => {
  const m = e.data, id = m.id;
  try {
    let res;
    if (m.cmd === 'load') res = load(m);
    else if (m.cmd === 'inside') res = { inside: !!G && cellOf(m.lat, m.lon) >= 0 };
    else if (m.cmd === 'water') {
      const t0 = Date.now();
      W = waterSearch(m.lat, m.lon, m.maxM, m.draftDm);
      res = { start: W.start, reached: W.reached, ms: Date.now() - t0, snapM: W.snapM };
    } else if (m.cmd === 'fairway') {
      if (!FW) res = { error: 'no fairway data' };
      else { const t0 = Date.now(); const n = fairwaySearch(m.lat, m.lon, m.maxM, m.draftDm, m.connectM); res = { reached: n, start: C.start, ms: Date.now() - t0 }; }
    } else if (m.cmd === 'paintWater') { res = paintWater(m.r1, m.r2); if (res) { postMessage({ id, res }, [res.buf.buffer]); return; } }
    else if (m.cmd === 'paintFairways') res = paintFairways(m.r1, m.r2);
    else if (m.cmd === 'route') res = route(m.lat, m.lon, m.mode);
    else if (m.cmd === 'matrix') res = { D: matrix(m.points, m.mode, m.draftDm, m.maxM, (k, n) => postMessage({ id, progress: [k, n] })) };
    else if (m.cmd === 'leg') res = leg(m.a, m.b, m.mode, m.draftDm, m.maxM);
    postMessage({ id, res });
  } catch (err) { postMessage({ id, error: String(err && err.message || err) }); }
};
