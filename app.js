/* Popcorn Fuel Log v2 — screens. Depends on Leaflet (L) and core.js (Core). */
'use strict';

(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f = (x, d = 1) => (isFinite(x) ? dec(Number(x).toFixed(d)) : '–');
  const dec = (s) => (typeof I18N !== 'undefined' && I18N.lang === 'fi' ? s.replace('.', ',') : s);   // Finnish decimal comma
  const dv = (x) => (x !== null && x !== undefined && isFinite(x) ? dec(String(x)) : '');   // number into an input, with the decimal comma
  const fi = (x) => (isFinite(x) ? Math.round(x).toString() : '–');
  const pm = (x, d = 0) => (isFinite(x) ? (x >= 0 ? '+' : '−') + dec(Math.abs(x).toFixed(d)) : '–');
  const dur = (h) => { if (!isFinite(h)) return '–'; const m = Math.round(h * 60); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'; };
  const clock = (ms) => { const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h + ':' + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0'); };
  const FIL = () => I18N.lang === 'fi';
  const dstr = (t) => new Date(t).toLocaleDateString(I18N.locale, FIL() ? { day: 'numeric', month: 'numeric' } : { day: 'numeric', month: 'short' });
  const dtstr = (t) => new Date(t).toLocaleString(I18N.locale, { day: 'numeric', month: FIL() ? 'numeric' : 'short', hour: '2-digit', minute: '2-digit' });
  const tstr = (t) => new Date(t).toLocaleTimeString(I18N.locale, { hour: '2-digit', minute: '2-digit' });
  const S = () => Core.state;
  // ruler unit: values are stored in mm, shown and typed in the chosen unit (default cm)
  const RUL = () => (S() && S().settings.rulerUnit) || 'cm';
  const rv = (v) => { const x = Core.num(v); return isFinite(x) ? (RUL() === 'cm' ? x * 10 : x) : NaN; };
  const rn = (mm) => (isFinite(mm) ? (RUL() === 'cm' ? dec((Math.round(mm / 5) * 5 / 10).toFixed(1).replace(/\.0$/, '')) : String(Math.round(mm))) : '');
  // date-time fields (entries can be logged afterwards)
  const p2 = (n) => String(n).padStart(2, '0');
  const localInput = (t) => { const d = new Date(t); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  // an untouched date field means "now" to the second, so entries made within the same minute keep their order
  const readWhen = (id) => { const el = document.getElementById(id); if (!el || !el.value || el.value === el.dataset.def) return Date.now(); const t = new Date(el.value).getTime(); return isFinite(t) ? t : Date.now(); };
  const whenField = (id, t) => `<div class="field"><label for="${id}">When<small>change if you log it afterwards</small></label><div class="inbox wide" style="width:58%"><input type="datetime-local" id="${id}" value="${localInput(t || Date.now())}" data-def="${t ? '' : localInput(Date.now())}"></div></div>`;
  // predicted ruler reading now (from the level estimate), shown light grey in the input until a value is typed
  function predDepth(t) {
    const lv = Core.levelNow(t.id); if (!lv.known || !isFinite(lv.L)) return '';
    let lo = 0, hi = t.maxMm * 1.05;
    if (lv.L <= Core.litres(t, 0)) return rn(0);
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (Core.litres(t, m) < lv.L) lo = m; else hi = m; }
    return rn((lo + hi) / 2);
  }
  const rs = (mm) => (isFinite(mm) ? rn(mm) + ' ' + RUL() : '–');
  const MODE_LABEL = { both: 'Both engines', port: 'Port only', stbd: 'Stbd only' };
  const MODE_SHORT = { both: 'Both', port: 'Port only', stbd: 'Stbd only' };
  const LOAD_LABEL = { light: 'Light', normal: 'Normal', full: 'Full' };
  const LOAD_HINT = { light: '2–3 people, little water and gear', normal: '4–5 people or half water tank, usual gear', full: '6 people, luggage, full water tank' };

  const IC = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
    center: '<svg viewBox="0 0 24 24" fill="none" stroke="#13212F" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="#13212F" stroke-width="2" stroke-linejoin="round"><path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="m2 16 10 5 10-5"/></svg>',
    ring: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 3"><circle cx="12" cy="12" r="9"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#4F5B66" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };

  // ---------- toast & sheet (no alert/confirm: they get blocked in app WebViews) ----------
  let toastT = null;
  function toast(msg, ms = 2800) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }
  function sheet(html) { $('#sheet-panel').innerHTML = html; $('#sheet').classList.add('show'); }
  function closeSheet() { $('#sheet').classList.remove('show'); }
  $('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });
  let confirmFn = null;
  function confirmSheet(title, text, okLabel, fn) {
    confirmFn = fn;
    sheet(`<h3>${esc(title)}</h3><p>${esc(text)}</p><div class="btnrow"><button class="btn grow" data-act="sheet-close">Cancel</button><button class="btn primary" data-act="confirm-ok">${esc(okLabel)}</button></div>`);
  }

  // ---------- maps ----------
  const TRAFICOM_LAYERS = ['Traficom:Merikarttasarjat public', 'Traficom:Rannikkokartat public', 'Traficom:Veneilykartat public', 'Traficom:Yleiskartat 100k public', 'Traficom:Yleiskartat 250k public'];
  function traficomUrl() {
    const s = S().settings;
    if (s.traficomCustom) return s.traficomCustom;
    return 'https://julkinen.traficom.fi/rasteripalvelu/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
      '&LAYER=' + encodeURIComponent(s.traficomLayer) + '&STYLE=default&TILEMATRIXSET=WGS84_Pseudo-Mercator' +
      '&TILEMATRIX=' + encodeURIComponent(s.traficomMatrix) + '{z}&TILEROW={y}&TILECOL={x}&FORMAT=' + encodeURIComponent(s.traficomFormat);
  }
  function baseLayerList() {
    const s = S().settings;
    const list = [];
    if (s.base === 'traficom') list.push(L.tileLayer(traficomUrl(), { maxZoom: 17, maxNativeZoom: 16, attribution: '© Traficom CC BY 4.0' }));
    else if (s.base === 'nls' && s.nlsKey) list.push(L.tileLayer('https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0/taustakartta/default/WGS84_Pseudo-Mercator/{z}/{y}/{x}.png?api-key=' + encodeURIComponent(s.nlsKey), { maxZoom: 17, maxNativeZoom: 16, attribution: '© Maanmittauslaitos' }));
    else list.push(L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap contributors' }));
    if (s.seamarks) list.push(L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', { maxZoom: 18, attribution: 'Seamarks © OpenSeaMap' }));
    return list;
  }
  const maps = {};
  function getMap(key) {
    if (maps[key]) return maps[key];
    const m = L.map('map-' + key, { zoomControl: false }).setView([60.03, 23.98], 11);
    m._base = baseLayerList(); m._base.forEach((l) => l.addTo(m));
    m._over = L.layerGroup().addTo(m);
    maps[key] = m;
    return m;
  }
  function refreshBaseLayers() { Object.values(maps).forEach((m) => { m._base.forEach((l) => m.removeLayer(l)); m._base = baseLayerList(); m._base.forEach((l) => l.addTo(m)); }); }
  const boatIcon = (deg) => L.divIcon({ className: 'boat-icon', iconSize: [26, 26], iconAnchor: [13, 13], html: `<svg width="26" height="26" viewBox="-13 -13 26 26"><g transform="rotate(${deg || 0})"><path d="M0 -11 L8 9 L0 4 L-8 9 Z" fill="#B8470F" stroke="#fff" stroke-width="1.6"/></g></svg>` });
  const RAMP = ['#E9B44C', '#D9822B', '#B8470F', '#7A2608'];
  function breaks(vals) { const v = vals.filter(isFinite).sort((a, b) => a - b); if (v.length < 4) return [2, 2.5, 3]; const q = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))]; return [q(0.25), q(0.5), q(0.75)]; }
  const rampColor = (x, br) => (x < br[0] ? RAMP[0] : x < br[1] ? RAMP[1] : x < br[2] ? RAMP[2] : RAMP[3]);

  // ---------- navigation ----------
  let current = 'helm', params = {};
  const NAV_OF = { tankfit: 'tanks', helm: 'helm', tripend: 'helm', predip: 'helm', range: 'helm', log: 'log', trips: 'trips', trip: 'trips', tripform: 'trips', curve: 'curve', tanks: 'tanks', refuel: 'tanks', more: 'more' };
  let backOf = {};   // view -> view it was opened from
  function go(v, p = {}) {
    if ((v === 'refuel' || v === 'tripform') && current !== v) backOf[v] = current;
    current = v; params = p;
    document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.id === 'v-' + v));
    document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === (v === 'refuel' && backOf.refuel === 'log' ? 'log' : NAV_OF[v])));
    try { const r = (R[v] || (() => {}))(); if (r && r.catch) r.catch(showViewError); } catch (e) { showViewError(e); }
    $('#v-' + v).scrollTop = 0;
    Object.values(maps).forEach((m) => setTimeout(() => m.invalidateSize(), 50));
  }

  function showViewError(e) {
    console.error(e);
    const el = $('#v-' + current); if (!el) return;
    el.insertAdjacentHTML('afterbegin', `<div class="warn" style="margin-top:16px"><b>This screen could not be shown.</b> ${esc(e && e.message || e)}. Upload all app files to GitHub again (the full zip), then Settings → Check for app update.</div>`);
  }
  // ---------- shared fragments ----------
  function tankBar(t) {
    const u = Core.usable(t.id);
    const pct = (x) => Math.max(0, Math.min(100, (x / t.capacity) * 100)).toFixed(1);
    return `<div class="tankrow"><div class="name" style="color:${t.color}">${esc(t.name)}</div>
      <div class="bar" style="position:relative;overflow:visible">
        <div style="width:${pct(u.L)}%;background:${t.color};border-radius:6px"></div>
        <div title="unusable" style="position:absolute;left:0;top:0;height:12px;border-radius:6px 0 0 6px;width:${pct(u.dead)}%;background:repeating-linear-gradient(135deg,rgba(19,33,47,.6) 0 3px,rgba(255,255,255,.3) 3px 6px)"></div>
      </div><div class="amt num">${fi(u.L)} L</div></div>`;
  }
  function tankBars() {
    const s = S();
    if (s.tanks.some((t) => !Core.levelNow(t.id).known)) {
      return `<div class="card"><div class="cardhead"><div class="h">Tanks</div></div><div class="sub">No dip recorded yet. Dip both tanks once (Tanks → Log dip) so the app can follow the levels.</div><button class="btn small" data-act="go" data-v="tanks">Go to Tanks</button></div>`;
    }
    const last = Math.max(...s.tanks.map((t) => Core.levelNow(t.id).since.t));
    return `<div class="card"><div class="cardhead"><div class="h">Tanks, estimated</div><div class="sub">Last reading ${dstr(last)}</div></div>
      ${s.tanks.map(tankBar).join('')}
      <div class="sub">Hatched = below suction pipe</div>
      <div class="sub" id="helm-range"></div>
      <button class="btn small dark" data-act="go" data-v="range">${IC.ring} Range &amp; fuel stations</button></div>`;
  }
  function bandsHtml(bb) {
    const rows = []; let max = 0;
    const tot = new Array(Core.NB).fill(0);
    Core.MODES.forEach((m) => bb[m].forEach((h, b) => { tot[b] += h; }));
    tot.forEach((h, b) => { if (h > 0.005) { rows.push([b, h]); max = Math.max(max, h); } });
    if (!rows.length) return '<div class="sub">No time logged.</div>';
    return rows.map(([b, h]) => `<div class="bandrow"><div class="l">${Core.bandLabel(b)}</div><div class="b"><div style="width:${((h / max) * 100).toFixed(0)}%"></div></div><div class="r">${dur(h)}</div></div>`).join('');
  }
  function modeTimes(bb) {
    return Core.MODES.map((m) => [m, bb[m].reduce((a, b) => a + b, 0)]).filter(([, h]) => h > 0.005).map(([m, h]) => `${MODE_LABEL[m]} ${dur(h)}`).join(' · ') || '–';
  }
  function ecoHtml(compact) {
    const e = Core.economy(); if (!e) return '';
    const rpm = (x) => (isFinite(x.rpm) ? ` @ ${x.rpm} rpm` : '');
    const src = e.best.rpmSource === 'clean-hull table' ? ' · RPM from clean-hull table' : '';
    if (compact) return `<div class="sub">Economy <b style="color:#13212F">${f(e.best.kn)} kn${rpm(e.best)}</b> · ${f(e.best.lpnm)} L/NM</div><div class="sub">Efficient <b style="color:#13212F">${f(e.efficient.kn)} kn${rpm(e.efficient)}</b> · ${f(e.efficient.lpnm)} L/NM${src}${e.fromData ? '' : ' · starting guess'}</div>`;
    return `<div class="grid2" style="padding-top:10px">
      <div class="tile dark"><div class="lbl">Most economical</div><div class="num mid">${f(e.best.kn)} kn</div><div class="hint">${isFinite(e.best.rpm) ? e.best.rpm + ' rpm · ' : ''}${f(e.best.lpnm)} L/NM</div></div>
      <div class="tile"><div class="lbl">Efficient cruise</div><div class="num mid">${f(e.efficient.kn)} kn</div><div class="hint">${e.efficient.kn === e.best.kn ? 'same — every faster speed costs over +' + S().settings.effMarginPct + '% per NM' : (isFinite(e.efficient.rpm) ? e.efficient.rpm + ' rpm · ' : '') + f(e.efficient.lpnm) + ' L/NM (≤ +' + S().settings.effMarginPct + '%)'}</div></div></div>
      <div class="note">${e.fromData ? 'From your logged trips' : 'Starting guess until you have trips with dips'} · cruising from ${f(S().settings.minCruiseKn)} kn${src}.</div>`;
  }
  const roughBox = (id) => `<div class="check"><input type="checkbox" id="${id}"><label for="${id}">Rough dip (heel, waves, poor trim) — counts less</label></div>`;

  // ---------- screens ----------
  const R = {};

  // HELM
  let helmBuilt = false, helmTrack = null, helmBoat = null, follow = true, trackCache = [];
  R.helm = () => {
    const v = $('#v-helm');
    if (!helmBuilt) {
      v.innerHTML = `
      <div class="top"><div><div class="title">Popcorn</div><div class="sub" id="helm-sub">Ready</div></div><div class="pill" id="helm-pill"><span class="dot"></span>GPS idle</div></div>
      <div class="mapbox" style="height:32vh;min-height:200px"><div id="map-helm" class="map"></div>
        <div class="mapbtns"><button class="mapbtn" aria-label="Centre on boat" data-act="center">${IC.center}</button><button class="mapbtn" aria-label="Map layers" data-act="go" data-v="more">${IC.layers}</button></div>
      </div>
      <div id="helm-dyn"></div>`;
      const m = getMap('helm');
      helmTrack = L.polyline([], { color: '#1F5675', weight: 4 }).addTo(m._over);
      helmBoat = L.marker([60.03, 23.98], { icon: boatIcon(0), interactive: false });
      m.on('dragstart', () => { follow = false; });
      helmBuilt = true;
    }
    renderHelmDyn();
    if (S().active) Core.activeTrack().then((pts) => { trackCache = pts.map((p) => [p[0], p[1]]); helmTrack.setLatLngs(trackCache); });
  };
  function renderHelmDyn() {
    const s = S(), A = s.active, lv = Core.live;
    const kn = lv.sogKn || 0, mode = A ? A.mode : 'both';
    const warn = `${lv.error ? `<div class="warn">GPS: ${esc(lv.error)}. Allow location for this app in Android settings.</div>` : ''}
      ${A && lv.gap ? '<div class="warn">GPS paused while the screen was off. The gap was filled with a straight line.</div>' : ''}`;
    const tiles = `<div class="grid2">
        <div class="tile"><div class="lbl">Speed (SOG)</div><div class="val"><span class="num big" id="h-sog">${f(kn)}</span><span class="unit">kn</span></div><div class="hint" id="h-sogavg">avg ${f(lv.sogAvg)} kn</div></div>
        <div class="tile dark"><div class="lbl">Fuel per mile</div><div class="val"><span class="num big" id="h-lpnm">${kn >= 1 ? f(Core.lpnm(mode, kn)) : '–'}</span><span class="unit">L/NM</span></div><div class="hint" id="h-lpnm-h"></div></div>
        <div class="tile"><div class="lbl">Distance</div><div class="val"><span class="num mid" id="h-dist">${A ? f(A.distNm) : '–'}</span><span class="unit">NM</span></div></div>
        <div class="tile"><div class="lbl">Used, est.</div><div class="val"><span class="num mid" id="h-used">${A ? fi(Core.tripFuelTotal(A)) : '–'}</span><span class="unit">L</span></div><div class="hint" id="h-used-split"></div></div>
      </div>`;
    $('#helm-dyn').innerHTML = A ? `${warn}
      <div class="ctl3"><button class="ctl" data-act="mode-sheet"><span>Engines</span><b id="h-mode">${MODE_SHORT[A.mode]}</b></button><button class="ctl dark" data-act="rpm-sheet"><span>RPM</span><b id="h-rpm">${A.rpm || 'set'}</b></button><button class="ctl" data-act="load-sheet"><span>Load</span><b>${LOAD_LABEL[A.load || 'normal']}</b></button></div>
      ${tiles}
      <div class="card" style="gap:4px">${ecoHtml(true)}</div>
      ${tankBars()}
      <div class="btnrow"><button class="btn" data-act="pause">${A.paused ? 'Resume' : 'Pause'}</button><button class="btn primary" data-act="end-trip">End trip &amp; dip tanks</button></div>
      <div class="note">Keep the app open on screen while under way: Android pauses GPS for web apps when the screen is off. Set RPM whenever you change throttle — steady stretches teach the app your speed–RPM table and hull condition.</div>`
    : `${warn}
      ${idleCard()}
      <div class="btnrow" style="padding-top:10px"><button class="btn primary grow" data-act="start-trip">Start trip</button>${S().idleRun ? '' : '<button class="btn" data-act="idle-start-sheet">Idle run</button>'}</div>
      ${tankBars()}
      <div class="card" style="gap:4px">${ecoHtml(true)}</div>
      <div class="sub" style="padding:4px 16px">Trips without GPS (logged afterwards) can be added on the Trips tab.</div>`;
    updateHelmLive();
  }
  function updateHelmLive() {
    if (current !== 'helm' || !helmBuilt) return;
    const s = S(), A = s.active, lv = Core.live;
    const kn = lv.sogKn || 0, mode = A ? A.mode : 'both';
    const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
    set('h-sog', f(kn)); set('h-sogavg', 'avg ' + f(lv.sogAvg) + ' kn');
    set('h-lpnm', kn >= 1 ? f(Core.lpnm(mode, kn)) : '–');
    set('h-lpnm-h', kn >= 1 ? (mode === 'both' ? 'both engines' : MODE_LABEL[mode].toLowerCase()) + ' ±' + f(Core.lpnmSigma(mode, kn)) : 'under 1 kn');
    if (A) {
      set('h-dist', f(A.distNm)); set('h-used', fi(Core.tripFuelTotal(A)));
      set('h-used-split', 'P ' + fi(Core.tripFuel(A, 'port')) + ' · S ' + fi(Core.tripFuel(A, 'stbd')) + ' L');
      set('h-mode', MODE_SHORT[A.mode]); set('h-rpm', A.rpm || 'set');
    }
    $('#helm-sub').textContent = A ? 'Trip ' + clock(Date.now() - A.start) + (A.paused ? ' · paused' : '') : 'Ready — start a trip to log it';
    $('#helm-pill').innerHTML = A ? (A.paused ? '<span class="dot"></span>Paused' : '<span class="dot rec"></span>Recording') : (lv.fix ? '<span class="dot"></span>GPS ' + fi(lv.acc) + ' m' : '<span class="dot"></span>GPS idle');
    const e = Core.economy();
    const rk = kn >= 2 ? kn : (e ? e.best.kn : 6.5);
    const rg = Core.range(mode, rk);
    const el = document.getElementById('helm-range');
    if (el) el.innerHTML = rg ? `Range at ${f(rk)} kn: <b style="color:#13212F">${fi(rg.oneWay)} NM</b> one way · ${fi(rg.round)} NM out &amp; back · ${esc(Core.tank(rg.limit).name)} limits` : '';
    if (lv.fix) {
      const m = maps.helm, ll = [lv.fix.lat, lv.fix.lon];
      if (!m.hasLayer(helmBoat)) helmBoat.addTo(m);
      helmBoat.setLatLng(ll); helmBoat.setIcon(boatIcon(lv.fix.heading || 0));
      if (A && !A.paused) { trackCache.push(ll); helmTrack.setLatLngs(trackCache); }
      if (follow) m.setView(ll, Math.max(m.getZoom(), 12), { animate: false });
    }
  }
  let liveTick = 0;
  Core.on(() => { const now = Date.now(); if (now - liveTick > 900) { liveTick = now; updateHelmLive(); } });
  setInterval(() => {
    const A = S() && S().active; if (A && current === 'helm') $('#helm-sub').textContent = 'Trip ' + clock(Date.now() - A.start) + (A.paused ? ' · paused' : '');
    const ir = S() && S().idleRun, el = document.getElementById('h-idle');
    if (ir && el) { el.textContent = clock(Date.now() - ir.start); const u = document.getElementById('h-idle-used'); if (u) u.textContent = '≈ ' + f(Core.tripFuelTotal(Core.idleNow())) + ' L'; }
  }, 1000);
  // idle runs: engine (car) on while standing, without GPS — battery charging, heating, air conditioning
  const idleModeLabel = (m) => MODE_LABEL[m] || MODE_LABEL.both;
  function idleCard() {
    const ir = S().idleRun; if (!ir) return '';
    return `<div class="card dark"><div class="cardhead"><div><div class="h">Idle run (e.g. charging batteries)</div><div class="sub">${esc(idleModeLabel(ir.mode)) + ' · ' + 'since ' + tstr(ir.start)}</div></div><div style="text-align:right"><div class="num" style="font-size:24px" id="h-idle">${clock(Date.now() - ir.start)}</div><div class="sub" id="h-idle-used"></div></div></div>
      <button class="btn small" style="background:#fff;color:#13212F" data-act="idle-stop">End idle run</button></div>`;
  }
  let idleEdit = null, idleMode = 'both';
  function idleSheet(tr) {
    idleEdit = tr ? tr.id : null; idleMode = tr ? tr.manual.mode : (S().settings.lastIdleMode || 'port');
    const h = tr ? Math.floor(tr.hours) : '', mi = tr ? Math.round((tr.hours - Math.floor(tr.hours)) * 60) : '';
    sheet(`<h3>${tr ? 'Edit idle run' : 'Add idle run'}</h3><p>Engine running at the dock or at anchor, e.g. to charge the batteries.</p>
      <div class="card">
        <div class="field"><label for="ir-start">Start<small>date and time</small></label><div class="inbox wide" style="width:58%"><input type="datetime-local" id="ir-start" value="${localInput(tr ? tr.start : Date.now() - 2 * 3600000)}"></div></div>
        <div class="field"><label for="ir-h">Duration<small>hours and minutes</small></label><div style="display:flex;gap:6px"><div class="inbox" style="width:76px"><input id="ir-h" inputmode="numeric" value="${h}"><span>h</span></div><div class="inbox" style="width:84px"><input id="ir-min" inputmode="numeric" value="${mi}"><span>min</span></div></div></div>
        <div class="seg" style="margin:0">${Core.MODES.map((m) => `<button class="${idleMode === m ? 'on' : ''}" data-act="ir-mode" data-m="${m}">${MODE_LABEL[m]}</button>`).join('')}</div>
      </div>
      <div class="btnrow"><button class="btn grow" data-act="sheet-close">Cancel</button>${tr ? '<button class="btn" data-act="ir-del">Delete</button>' : ''}<button class="btn primary" data-act="ir-save">${tr ? 'Save' : 'Add'}</button></div>`);
  }
  function idleLogCard(from, to) {
    const runs = S().trips.filter((t) => t.idle && t.start >= from && t.start < to).sort((a, b) => b.start - a.start);
    return `<div class="card" style="gap:0"><div class="cardhead"><div class="h">Idle runs</div><div class="sub">${runs.length} runs · ${dur(runs.reduce((a, t) => a + t.hours, 0))}</div></div>
      ${runs.length ? runs.map((t) => `<div class="logrow"><button class="main" data-act="ir-edit" data-id="${t.id}" style="border:0;background:transparent;text-align:left;padding:0;font:inherit;color:inherit;cursor:pointer"><b>${dtstr(t.start)}</b><span>${esc(idleModeLabel(t.manual.mode))} · ${dur(t.hours)}</span></button><div class="right"><span class="num">≈ ${f(Core.tripFuelTotal(t))} L</span></div><button class="iconbtn" aria-label="Delete idle run" data-act="ir-del-row" data-id="${t.id}">${IC.x}</button></div>`).join('') : '<div class="sub">No idle runs in this period.</div>'}
      <div class="btnrow" style="padding:8px 0 0 0"><button class="btn small grow" data-act="ir-add">Add idle run</button></div></div>`;
  }

  // END TRIP
  R.tripend = () => {
    const tr = S().trips.find((t) => t.id === params.id);
    if (!tr) return go('helm');
    const bb = Core.tripBands(tr);
    const moving = tr.hours - bb.both[0] - bb.port[0] - bb.stbd[0];
    $('#v-predip').innerHTML = '';
    $('#v-tripend').innerHTML = `
      <div class="top back"><button class="iconbtn" aria-label="Back" data-act="go" data-v="helm">${IC.back}</button><div><div class="title">Trip complete</div><div class="sub">${dstr(tr.start)} · ${tstr(tr.start)}–${tstr(tr.end)}</div></div></div>
      <div class="grid3" style="padding-top:0">
        <div class="tile"><div class="lbl">Distance</div><div class="num mid">${f(tr.distNm)} <span class="unit">NM</span></div></div>
        <div class="tile"><div class="lbl">Engine time</div><div class="num mid">${f(tr.hours)} <span class="unit">h</span></div></div>
        <div class="tile"><div class="lbl">Avg speed</div><div class="num mid">${f(tr.distNm / Math.max(0.01, moving))} <span class="unit">kn</span></div></div>
      </div>
      <div class="card"><div class="cardhead"><div class="h">Time at speed</div><div class="sub">${(tr.samples || []).length} RPM stretches</div></div>${bandsHtml(bb)}<div class="sub">${modeTimes(bb)}</div></div>
      <div class="card"><div class="cardhead"><div class="h">Dip tanks with ruler</div><div class="sub">est. used P ${fi(Core.tripFuel(tr, 'port'))} · S ${fi(Core.tripFuel(tr, 'stbd'))} L</div></div>
        ${S().tanks.map((t) => `<div class="field"><label for="dip-${t.id}" style="color:${t.color};font-weight:600;flex:0 0 48px">${esc(t.name)}</label>
          <div class="inbox"><input id="dip-${t.id}" inputmode="decimal" data-dip="${t.id}" placeholder="${predDepth(t)}"><span>${RUL()}</span></div>
          <div style="flex:1;text-align:right"><div class="num" style="font-size:20px" id="dipL-${t.id}">– L</div><div class="sub" id="dipU-${t.id}"></div></div></div>`).join('')}
        ${roughBox('dip-rough')}
        <div id="dip-sum"></div>
      </div>
      <div class="btnrow"><button class="btn" data-act="go" data-v="trips">Skip dip</button><button class="btn primary" data-act="save-dips" data-id="${tr.id}">Save</button></div>
      <div class="note">No dip now? The trip still counts: the next dip measures all trips since the previous one together.</div>`;
  };
  // DIP BEFORE A TRIP
  R.predip = () => {
    $('#v-tripend').innerHTML = '';
    $('#v-predip').innerHTML = `
      <div class="top back"><button class="iconbtn" aria-label="Back" data-act="go" data-v="helm">${IC.back}</button><div><div class="title">Dip before departure</div><div class="sub">${dtstr(Date.now())}</div></div></div>
      <div class="card"><div class="cardhead"><div class="h">Dip tanks with ruler</div></div>
        ${S().tanks.map((t) => `<div class="field"><label for="dip-${t.id}" style="color:${t.color};font-weight:600;flex:0 0 48px">${esc(t.name)}</label>
          <div class="inbox"><input id="dip-${t.id}" inputmode="decimal" data-dip="${t.id}" placeholder="${predDepth(t)}"><span>${RUL()}</span></div>
          <div style="flex:1;text-align:right"><div class="num" style="font-size:20px" id="dipL-${t.id}">– L</div><div class="sub" id="dipU-${t.id}"></div></div></div>`).join('')}
        ${roughBox('dip-rough')}
        <div id="dip-sum"></div>
      </div>
      <div class="btnrow"><button class="btn" data-act="predip-skip">Skip</button><button class="btn primary" data-act="save-predip">Save &amp; start trip</button></div>
      <div class="note">Marked "before trip" in the log. Then choose the load and the trip starts.</div>`;
  };
  function dipPreview() {
    let total = 0, n = 0;
    S().tanks.forEach((t) => {
      const mm = rv($('#dip-' + t.id)?.value);
      const Lv = Core.litres(t, mm), lv = Core.levelNow(t.id);
      $('#dipL-' + t.id).textContent = isFinite(Lv) ? fi(Lv) + ' L' : '– L';
      let msg = '';
      if (isFinite(mm) && mm < t.pipeMm) msg = 'below suction pipe!';
      else if (isFinite(Lv) && lv.known) {
        const ev = Core.eventsFor(t.id), last = ev[ev.length - 1];
        const used = Core.levelAfter(last) - Lv; total += used; n++;
        msg = 'used ' + fi(used) + ' L since ' + dstr(last.t);
      } else if (!lv.known) msg = 'first dip';
      const el = $('#dipU-' + t.id); el.textContent = msg; el.style.color = msg.startsWith('below') ? '#B8470F' : '';
    });
    const tr = S().trips.find((t) => t.id === params.id);
    if (n === 2 && tr) {
      const est = Core.tripFuelTotal(tr);
      $('#dip-sum').innerHTML = `<div class="card dark" style="margin:0"><div class="cardhead"><div><div class="sub">Measured since last dip</div><div class="num" style="font-size:24px">${fi(total)} L</div></div><div style="text-align:right"><div class="sub">Curve predicted this trip</div><div class="num" style="font-size:18px">${fi(est)} L · ${f(est / Math.max(0.1, tr.distNm))} L/NM</div></div></div></div>`;
    } else $('#dip-sum').innerHTML = '';
  }

  // TRIPS
  let tripsBuilt = false;
  R.trips = async () => {
    const v = $('#v-trips'), s = S();
    if (!tripsBuilt) {
      v.innerHTML = `<div class="top"><div><div class="title">Trips</div><div class="sub" id="trips-sub"></div></div><button class="btn small" data-act="manual-new">Add trip by hand</button></div>
        <div class="mapbox" style="height:38vh;min-height:220px"><div id="map-trips" class="map"></div><div class="maplegend" id="trips-legend" style="top:10px;bottom:auto"></div></div>
        <div id="trips-dyn"></div>`;
      getMap('trips'); tripsBuilt = true;
    }
    const trips = s.trips.filter((t) => !t.idle).sort((a, b) => b.start - a.start);
    const vals = trips.map((t) => { const m = Core.tripMeasured(t); return m ? m.lpnm : Core.tripFuelTotal(t) / Math.max(0.1, t.distNm); });
    const br = breaks(vals);
    const totNm = trips.reduce((a, t) => a + t.distNm, 0), totL = trips.reduce((a, t) => a + Core.tripFuelTotal(t), 0);
    $('#trips-sub').textContent = `${trips.length} trips · ${fi(totNm)} NM · ~${fi(totL)} L`;
    $('#trips-legend').innerHTML = `<div style="font-weight:600;color:#4F5B66">L/NM</div><div class="row"><span class="sw" style="background:${RAMP[0]}"></span>&lt;${f(br[0])}<span class="sw" style="background:${RAMP[1]}"></span>–${f(br[1])}<span class="sw" style="background:${RAMP[2]}"></span>–${f(br[2])}<span class="sw" style="background:${RAMP[3]}"></span>&gt;${f(br[2])}</div>`;
    $('#trips-dyn').innerHTML = trips.length ? `<div class="list">${trips.map((t, i) => {
      const m = Core.tripMeasured(t);
      return `<button class="item" data-act="open-trip" data-id="${t.id}"><span class="stripe" style="background:${rampColor(vals[i], br)}"></span>
        <span class="main"><b>${esc(t.name)}</b><span>${dstr(t.start)} · ${f(t.distNm)} NM · ${dur(t.hours)}</span></span>
        <span class="right"><span class="num">${f(vals[i])} L/NM</span><span>${t.manual ? 'by hand' : ''}${t.manual && m ? ' · ' : ''}${m ? (m.shared ? 'shared dip' : 'dipped') : t.manual ? '' : 'estimate'}</span></span></button>`;
    }).join('')}</div>` : '<div class="empty">No trips yet. Start one from the Helm screen, or add a trip by hand.</div>';
    const m = maps.trips; m._over.clearLayers();
    const all = [];
    for (let i = 0; i < trips.length; i++) {
      const pts = ((await Core.trackGet(trips[i].id)) || []).map((p) => [p[0], p[1]]);
      if (pts.length > 1) { L.polyline(pts, { color: rampColor(vals[i], br), weight: 3.5 }).on('click', () => go('trip', { id: trips[i].id })).addTo(m._over); all.push(...pts); }
    }
    m.invalidateSize(); if (all.length) m.fitBounds(L.latLngBounds(all), { padding: [20, 20] });
  };

  // ONE TRIP
  let tripBuilt = false;
  R.trip = async () => {
    const tr = S().trips.find((t) => t.id === params.id); if (!tr) return go('trips');
    const v = $('#v-trip');
    if (!tripBuilt) {
      v.innerHTML = `<div class="top back"><button class="iconbtn" aria-label="Back" data-act="go" data-v="trips">${IC.back}</button><div><div class="title" id="trip-title"></div><div class="sub" id="trip-sub"></div></div></div>
        <div class="mapbox" id="trip-mapbox" style="height:30vh;min-height:200px"><div id="map-trip" class="map"></div></div><div id="trip-dyn"></div>`;
      getMap('trip'); tripBuilt = true;
    }
    const est = Core.tripFuelTotal(tr), meas = Core.tripMeasured(tr), bb = Core.tripBands(tr);
    $('#trip-mapbox').style.display = tr.manual ? 'none' : '';
    $('#trip-title').textContent = tr.name; $('#trip-sub').textContent = dtstr(tr.start) + '–' + tstr(tr.end);
    const smp = tr.samples || [];
    $('#trip-dyn').innerHTML = `
      ${tr.manual ? `<div class="card"><div class="cardhead"><div><div class="h">Entered by hand</div><div class="sub">${MODE_LABEL[tr.manual.mode]} · average ${f(tr.distNm / Math.max(0.01, tr.hours))} kn · no GPS track</div></div><button class="btn small" data-act="manual-edit" data-id="${tr.id}">Edit</button></div></div>` : ''}
      <div class="grid3">
        <div class="tile"><div class="lbl">Distance</div><div class="num mid">${f(tr.distNm)}</div><div class="hint">NM</div></div>
        <div class="tile"><div class="lbl">Engine time</div><div class="num mid">${f(tr.hours)}</div><div class="hint">h</div></div>
        <div class="tile dark"><div class="lbl">${meas ? 'Measured' : 'Estimated'}</div><div class="num mid">${f(meas ? meas.lpnm : est / Math.max(0.1, tr.distNm))}</div><div class="hint">L/NM${meas && meas.shared ? ' · shared dip' : ''}</div></div>
      </div>
      <div class="card"><div class="cardhead"><div class="h">Time at speed</div><div class="sub">est. P ${fi(Core.tripFuel(tr, 'port'))} · S ${fi(Core.tripFuel(tr, 'stbd'))} L</div></div>${bandsHtml(bb)}<div class="sub">${modeTimes(bb)}</div></div>
      ${smp.length ? `<div class="card" style="gap:0"><div class="cardhead"><div class="h">Steady RPM stretches</div></div><div class="table">${smp.map((x) => `<div class="tr"><div>${tstr(x.t)}</div><div>${x.rpm} rpm</div><div>${f(x.kn)} kn</div><div>${MODE_LABEL[x.mode].split(' ')[0]}</div></div>`).join('')}</div></div>` : ''}
      ${tr.gaps ? `<div class="warn">${tr.gaps} GPS gap(s) in this trip were filled with straight lines.</div>` : ''}
      <div class="card"><div class="cardhead"><div class="h">Conditions</div><div class="sub">factor ×${f(Core.condFactor(tr), 2)}</div></div>
        <div class="sub">${!tr.wind ? 'Wind: not recorded (older trip)' : tr.wind.status === 'ok' ? `Wind ${f(tr.wind.ws)} m/s average · ${tr.wind.head >= 0 ? 'head' : 'tail'} wind ${f(Math.abs(tr.wind.head))} m/s along the route · ${tr.wind.stations} FMI station${tr.wind.stations > 1 ? 's' : ''}` : tr.wind.status === 'pending' ? 'Wind: fetched from FMI when the phone is online' : 'Wind: not available (' + esc(tr.wind.reason || 'no data') + ')'}</div>
        <div class="seg" style="margin:0">${['light', 'normal', 'full'].map((l) => `<button class="${(tr.load || 'normal') === l ? 'on' : ''}" data-act="trip-load" data-id="${tr.id}" data-l="${l}">${LOAD_LABEL[l]} load</button>`).join('')}</div></div>
      <div class="card"><div class="field"><label for="trip-name">Name</label><div class="inbox wide" style="width:60%"><input id="trip-name" value="${esc(tr.name)}"></div></div></div>
      <div class="btnrow"><button class="btn" data-act="del-trip" data-id="${tr.id}">Delete trip</button><button class="btn primary" data-act="rename-trip" data-id="${tr.id}">Save name</button></div>`;
    const m = maps.trip; m._over.clearLayers();
    const pts = (await Core.trackGet(tr.id)) || [];
    if (!tr.manual && pts.length > 1) {
      for (let i = 1; i < pts.length; i++) {
        const kn = pts[i][3];
        L.polyline([[pts[i - 1][0], pts[i - 1][1]], [pts[i][0], pts[i][1]]], { color: kn < 4 ? '#9CC3D5' : kn < 7 ? '#4F8FB0' : kn < 10 ? '#1F5675' : '#B8470F', weight: 4 }).addTo(m._over);
      }
      m.invalidateSize(); m.fitBounds(L.latLngBounds(pts.map((p) => [p[0], p[1]])), { padding: [20, 20] });
    }
  };


  // TRIP ENTERED BY HAND (distance + time, no GPS)
  let mtMode = 'both', mtLoad = 'normal';
  R.tripform = () => {
    const tr = params.id ? S().trips.find((t) => t.id === params.id) : null;
    mtMode = tr ? tr.manual.mode : 'both'; mtLoad = tr ? tr.load || 'normal' : S().settings.lastLoad || 'normal';
    const h = tr ? Math.floor(tr.hours) : '', mi = tr ? Math.round((tr.hours - Math.floor(tr.hours)) * 60) : '';
    const v = (id, def) => def;
    $('#v-tripform').innerHTML = `
      <div class="top back"><button class="iconbtn" aria-label="Back" data-act="go" data-v="${backOf.tripform || 'trips'}">${IC.back}</button><div><div class="title">${tr ? 'Edit trip' : 'Add trip by hand'}</div><div class="sub">For trips logged without GPS</div></div></div>
      <div class="card">
        <div class="field"><label for="mt-start">Start<small>date and time</small></label><div class="inbox wide" style="width:58%"><input type="datetime-local" id="mt-start" data-mt="1" value="${v('mt-start', localInput(tr ? tr.start : Date.now() - 3 * 3600000))}"></div></div>
        <div class="field"><label for="mt-nm">Distance</label><div class="inbox"><input id="mt-nm" inputmode="decimal" data-mt="1" value="${v('mt-nm', tr ? dec(String(+tr.distNm.toFixed(1))) : '')}"><span>NM</span></div></div>
        <div class="field"><label for="mt-h">Time under way<small>hours and minutes</small></label><div style="display:flex;gap:6px"><div class="inbox" style="width:76px"><input id="mt-h" inputmode="numeric" data-mt="1" value="${v('mt-h', h)}"><span>h</span></div><div class="inbox" style="width:84px"><input id="mt-min" inputmode="numeric" data-mt="1" value="${v('mt-min', mi)}"><span>min</span></div></div></div>
        <div class="sub" id="mt-avg"> </div>
      </div>
      <div class="card"><div class="cardhead"><div class="h">Engines running</div></div>
        <div class="seg" style="margin:0">${Core.MODES.map((m) => `<button class="${mtMode === m ? 'on' : ''}" data-act="mt-mode" data-m="${m}">${MODE_LABEL[m]}</button>`).join('')}</div>
        <div class="cardhead" style="padding-top:8px"><div class="h">Load on board</div></div>
        <div class="seg" style="margin:0">${['light', 'normal', 'full'].map((l) => `<button class="${mtLoad === l ? 'on' : ''}" data-act="mt-load" data-l="${l}">${LOAD_LABEL[l]}</button>`).join('')}</div>
      </div>
      <div class="card"><div class="field"><label for="mt-name">Name<small>optional</small></label><div class="inbox wide" style="width:60%"><input id="mt-name" value="${esc(v('mt-name', tr ? tr.name : ''))}"></div></div></div>
      <div class="btnrow"><button class="btn" data-act="go" data-v="${backOf.tripform || 'trips'}">Cancel</button><button class="btn primary" data-act="mt-save" data-id="${tr ? tr.id : ''}">${tr ? 'Save changes' : 'Add trip'}</button></div>
      <div class="note">The time counts as cruising at the average speed. The trip is included in the totals and, when there are dips before and after, in the consumption measurement.</div>`;
    mtCalc();
  };
  function mtCalc() {
    const nm = Core.num($('#mt-nm').value), h = (Core.num($('#mt-h').value) || 0) + (Core.num($('#mt-min').value) || 0) / 60;
    const ok = nm >= 0 && h > 0;
    $('#mt-avg').textContent = ok ? 'Average speed ' + f(nm / h) + ' kn · estimated fuel ' + fi(Core.tripFuelTotal({ bandsBy: (() => { const bb = { both: new Array(Core.NB).fill(0), port: new Array(Core.NB).fill(0), stbd: new Array(Core.NB).fill(0) }; bb[mtMode][Core.bandOf(nm / h)] = h; return bb; })(), load: mtLoad })) + ' L' : ' ';
    return { nm, h, ok };
  }
  const segOn = (el) => el.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el));

  // CHART helper
  // finger tracking on speed charts: opt.track = { step, y(x), tip(x) } — a vertical line, a dot on the curve in use and one info line
  const TRACK = new Map(); let trackSeq = 0, trackSvg = null;
  function trackAt(svg, clientX) {
    const t = TRACK.get(svg.dataset.track); if (!t) return;
    const o = t.opt, r = svg.getBoundingClientRect(); if (!r.width) return;
    let v = o.xMin + ((((clientX - r.left) / r.width) * 340 - 40) / 292) * (o.xMax - o.xMin);
    const st = o.track.step || 0.1; v = Math.round(Math.max(o.xMin, Math.min(o.xMax, v)) / st) * st;
    const X = 40 + ((v - o.xMin) / (o.xMax - o.xMin)) * 292, y = o.track.y(v);
    const Yv = 200 - ((Math.min(Math.max(y, o.yMin), o.yMax) - o.yMin) / (o.yMax - o.yMin)) * 190;
    const g = svg.querySelector('.trk'), tip = svg.parentNode.querySelector('.trk-tip');
    g.style.display = ''; g.querySelector('line').setAttribute('x1', X.toFixed(1)); g.querySelector('line').setAttribute('x2', X.toFixed(1));
    const c = g.querySelector('circle'); c.setAttribute('cx', X.toFixed(1)); c.setAttribute('cy', Yv.toFixed(1)); c.style.display = isFinite(y) ? '' : 'none';
    tip.textContent = o.track.tip(v); tip.style.display = 'block';
  }
  function trackHide() { document.querySelectorAll('.trk').forEach((g) => { g.style.display = 'none'; }); document.querySelectorAll('.trk-tip').forEach((t) => { t.style.display = 'none'; }); }
  document.addEventListener('pointerdown', (e) => {
    const svg = e.target.closest && e.target.closest('svg.chart[data-track]');
    trackHide(); trackSvg = svg || null;
    if (svg) trackAt(svg, e.clientX);
  });
  document.addEventListener('pointermove', (e) => { if (trackSvg && (e.pointerType !== 'mouse' || e.buttons)) trackAt(trackSvg, e.clientX); });
  ['pointerup', 'pointercancel'].forEach((ev) => document.addEventListener(ev, () => { trackSvg = null; }));
  const rangeTip = (mode, kn) => { const r = Core.range(mode, kn); return r ? (FIs() ? 'kantama ' : 'range ') + fi(r.oneWay) + ' NM' : (FIs() ? 'kantama: mittaa ensin' : 'range: dip first'); };
  const FIs = () => typeof I18N !== 'undefined' && I18N.lang === 'fi';
  function lineChart(series, opt) {
    if (opt.track) {
      if (TRACK.size > 40) [...TRACK.keys()].forEach((k) => { if (!document.querySelector(`[data-track="${k}"]`)) TRACK.delete(k); });
      const id = 'tk' + (++trackSeq); TRACK.set(id, { opt });
      return `<div class="chartwrap"><div class="trk-tip" data-noi18n></div>${lineChartSvg(series, opt, id)}</div>`;
    }
    return lineChartSvg(series, opt, null);
  }
  function lineChartSvg(series, opt, trackId) {
    const W = 340, H = 230, x0 = 40, x1 = 332, y0 = 200, y1 = 10;
    const X = (v) => x0 + ((v - opt.xMin) / (opt.xMax - opt.xMin)) * (x1 - x0);
    const Y = (v) => y0 - ((Math.min(Math.max(v, opt.yMin), opt.yMax) - opt.yMin) / (opt.yMax - opt.yMin)) * (y0 - y1);
    const path = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(opt.label)}"${trackId ? ` data-track="${trackId}"` : ''}>
      ${opt.yTicks.map((t) => `<line x1="${x0}" x2="${x1}" y1="${Y(t)}" y2="${Y(t)}" stroke="#ECE8DC"/><text x="${x0 - 6}" y="${Y(t) + 4}" font-size="11" fill="#4F5B66" text-anchor="end">${opt.yFmt(t)}</text>`).join('')}
      ${opt.xTicks.map((t) => `<text x="${X(t)}" y="216" font-size="11" fill="#4F5B66" text-anchor="middle">${opt.xFmt(t)}</text>`).join('')}
      <text x="${x1}" y="228" font-size="11" fill="#4F5B66" text-anchor="end">${esc(opt.xUnit)}</text>
      <line x1="${x0}" x2="${x1}" y1="${y0}" y2="${y0}" stroke="#4F5B66"/>
      ${(opt.vlines || []).map((v) => `<line x1="${X(v.x)}" x2="${X(v.x)}" y1="${y1}" y2="${y0}" stroke="${v.color}" stroke-width="2" stroke-dasharray="4 3"/>`).join('')}
      ${series.map((s) => (s.band ? `<path d="${s.band.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[2]).toFixed(1)).join(' ')} ${s.band.slice().reverse().map((p) => 'L' + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ')} Z" fill="${s.color}" opacity="0.16"/>` : '')).join('')}
      ${series.map((s) => (s.pts && s.pts.length ? `<path d="${path(s.pts)}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.5}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round"/>` : '')).join('')}
      ${series.map((s) => (s.dots || []).map((d) => `<circle cx="${X(d[0]).toFixed(1)}" cy="${Y(d[1]).toFixed(1)}" r="${d[2] || 4}" fill="${s.dotFill || s.color}" stroke="${s.dotStroke || '#fff'}" stroke-width="1.5"/>`).join('')).join('')}
      ${series.map((s) => (s.segs || []).map((g) => `<line x1="${X(g[0])}" y1="${Y(g[1])}" x2="${X(g[2])}" y2="${Y(g[3])}" stroke="${s.color}" stroke-width="1.5"/><circle cx="${X(g[2])}" cy="${Y(g[3])}" r="3.5" fill="#fff" stroke="${s.color}" stroke-width="1.5"/>`).join('')).join('')}
      ${trackId ? `<g class="trk" style="display:none"><line y1="${y1}" y2="${y0}" stroke="#B8470F" stroke-width="1.5"/><circle r="5" fill="#B8470F" stroke="#fff" stroke-width="2"/></g>` : ''}
    </svg>`;
  }
  const niceMax = (v) => { const p = Math.pow(10, Math.floor(Math.log10(v || 1))); const m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; };

  // CURVE (consumption + hull)
  let curveTab = 'fuel', curveMetric = 'nm', curveMode = 'both', hullPeriod, cpChart = false, consHistOpen = false, cpEdit = null;
  const CF_LABEL = { power: 'Power curve', spline: 'Smooth curve', poly2: 'Polynomial 2', linear: 'Straight lines' };
  const SERIES_LABEL = { both: 'Both engines (whole boat)', port: 'Port solo', stbd: 'Stbd solo' };
  const baseLabel = (series) => { const md = S().cons.base[series]; return md ? CF_LABEL[md.m] : (series === 'both' ? 'default formula' : 'both-engine base × 1.1'); };
  // estimate points (speed, L/NM) of the series shown, their suggested fits and the base in use
  function consPointsCard(series) {
    const C = S().cons, list = C.pts[series];
    const rows = list.map((q) => `<button class="item" data-act="cp-edit" data-id="${q.id}" style="padding:8px 12px;min-height:0"><span class="main"><b>${f(q.kn)} kn = ${f(q.lpnm, 2)} L/NM</b></span><span class="right"><span class="sub">${f(q.lpnm * q.kn)} L/h</span></span></button>`).join('');
    const sg = Core.consSuggestions(series);
    let sug = '';
    if (sg.list.length) {
      const best = sg.list[0], top = 17, val = (lph, kn) => (curveMetric === 'nm' ? lph / kn : lph), x0 = curveMetric === 'nm' ? 3 : 0;
      const sp = []; for (let k = x0; k <= top; k += 0.5) sp.push(k);
      const yMax = niceMax(Math.max(...sp.slice(0, 26).map((k) => Math.max(val(Core.baseLph(series, k), k), val(Core.cfEval(best.model, k), k)))) * 1.05);
      const chart = lineChart([
        { pts: sp.map((k) => [k, val(Core.baseLph(series, k), k)]), color: '#9AA5AE', width: 2 },
        { pts: sp.map((k) => [k, val(Math.max(Core.floorOf(series), Core.cfEval(best.model, k)), k)]), color: '#E07A2E', width: 2.5 },
        { color: '#13212F', dots: list.map((q) => [q.kn, curveMetric === 'nm' ? q.lpnm : q.lpnm * q.kn, 4]), dotFill: '#E9B44C', dotStroke: '#13212F' }],
        { track: { step: 0.1, y: (k) => val(Core.baseLph(series, k), k), tip: (k) => `${f(k)} kn · ${FIs() ? 'pohja' : 'base'} ${f(val(Core.baseLph(series, k), k), curveMetric === 'nm' ? 2 : 1)} ${curveMetric === 'nm' ? 'L/NM' : 'L/h'}` },
          label: 'Suggested fit', xMin: x0, xMax: top, yMin: 0, yMax, xTicks: x0 ? [3, 6, 9, 12, 15] : [0, 2, 4, 6, 8, 10, 12, 14, 16], yTicks: [0, 0.25, 0.5, 0.75, 1].map((q) => q * yMax), xFmt: (v) => v, yFmt: (v) => (yMax <= 10 ? f(v) : fi(v)), xUnit: 'kn' });
      sug = `<div class="cardhead" style="padding-top:10px"><div class="h">Suggested fits</div><div class="sub">${sg.loo ? 'error when a point is left out' : 'error at your points'}</div></div>
        ${sg.loo ? '' : '<div class="sub">With 2–3 points the fits cannot be compared reliably yet; the first is the most natural shape for fuel use. Add points to compare them by error.</div>'}
        ${sg.list.map((x, i) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #ECE8DC"><div><b>${CF_LABEL[x.m]}${i === 0 ? ' ★' : ''}</b><div class="sub">${x.m === 'power' ? 'exponent ' + f(x.model.n, 2) + ' · ' : ''}±${f(x.rms, 2)} L/NM</div></div><button class="btn small ${i === 0 ? 'primary' : ''}" data-act="cp-use" data-i="${i}">Use</button></div>`).join('')}
        ${cpChart ? `<div style="padding:6px 0 0 0">${chart}</div><div class="sub" style="padding-left:30px"><b style="color:#E07A2E">orange = best suggestion</b> · grey = base in use · dots = your points</div>` : ''}
        <div class="btnrow" style="padding:6px 0 0 0"><button class="btn small grow" data-act="cp-chart">${cpChart ? 'Hide chart' : 'Show chart'}</button></div>`;
    } else if (list.length < 2) sug = '<div class="sub" style="padding-top:8px">Add at least two points to get suggested fits.</div>';
    return `<div class="card" id="cp-card" style="gap:0"><div class="cardhead"><div class="h">Estimate points</div><div class="sub">${SERIES_LABEL[series]}</div></div>
      <div class="sub" style="padding-bottom:4px">Your estimate of fuel use at a few speeds. The fit you choose is the base curve; measured trips correct it. Tap a point to correct or delete it.</div>
      <div class="cardhead" style="padding-top:4px"><div class="h" style="font-size:14px">Idle use</div><div class="sub">per engine, under 1 kn</div></div>
      ${S().tanks.map((t) => `<div class="field" style="padding:4px 0"><label for="idle-${t.id}" style="color:${t.color};font-weight:600">${esc(t.name)}</label><div class="inbox"><input id="idle-${t.id}" inputmode="decimal" value="${dv(C.idle[t.id])}"><span>L/h</span></div></div>`).join('')}
      <div class="btnrow" style="padding:4px 0 10px 0"><button class="btn small grow" data-act="idle-save">Save idle use</button></div>
      <div class="cardhead" style="padding-bottom:4px"><div class="h" style="font-size:14px">Points</div></div>
      ${rows || '<div class="sub">No estimate points yet.</div>'}
      <div class="btnrow" style="padding:6px 0 0 0"><button class="btn small grow dark" data-act="cp-add">Add point</button></div>
      <div class="cardhead" style="padding-top:10px;align-items:center"><div class="sub">Base: <b style="color:#13212F">${baseLabel(series)}</b></div>${C.base[series] ? '<button class="btn small" data-act="cp-default">Use default formula</button>' : ''}</div>
      ${sug}</div>`;
  }
  function consHistoryCard() {
    const h = S().cons.history; if (!h.length) return '';
    return `<div class="card" style="gap:0"><button class="cardhead fold" data-act="cons-hist"><span class="h">Earlier consumption curves</span><span class="sub">${consHistOpen ? 'Hide' : 'Show ' + h.length}</span></button>${consHistOpen ? h.map((x, i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #ECE8DC;gap:8px"><span class="sub">${dtstr(x.t)} · ${esc(x.note || '')}</span><button class="btn small" data-act="cons-restore" data-i="${i}">Restore</button></div>`).join('') : ''}</div>`;
  }
  function consProposalCard() {
    const p = S().cons.pending; if (!p) return '';
    return `<div class="card dark"><div class="cardhead"><div><div class="h">Improved consumption curve available</div><div class="sub">From ${p.n} measured tank intervals · error ${f(p.errBefore)} → ${f(p.errAfter)} L</div></div><button class="btn small" style="background:#fff;color:#13212F" data-act="cons-review">Review</button></div></div>`;
  }
  function consProposalSheet() {
    const C = S().cons, p = C.pending; if (!p) return;
    const a = C.active, H = S().fit.loggedH;
    const kns = [6.5, 8.5, 10.5];
    const row = (label, fn) => `<div class="tr" style="grid-template-columns:1.4fr repeat(3,1fr)"><div>${label}</div>${kns.map((k) => { const u = fn(a.x, k) / k, v = fn(p.x, k) / k; return `<div>${f(u, 2)} → <b>${f(v, 2)}</b></div>`; }).join('')}</div>`;
    const tot = (x, k) => Core.lphX(x, 'port', 'both', k) + Core.lphX(x, 'stbd', 'both', k);
    const solo = (e) => (x, k) => Core.lphX(x, e, e, k);
    const anySolo = (e) => H[e].some((h) => h >= 0.25);
    const pc = (v) => (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(0) + ' %';
    const cRow = (label, u, v) => `<div class="tr" style="grid-template-columns:2fr 1fr 1fr"><div>${label}</div><div>${pc(u)}</div><div><b>${pc(v)}</b></div></div>`;
    const sp = []; for (let k = 3; k <= 17; k += 0.5) sp.push(k);
    const yMax = niceMax(Math.max(...sp.slice(0, 26).map((k) => Math.max(tot(a.x, k), tot(p.x, k)) / k)) * 1.05);
    const chart = lineChart([
      { pts: sp.map((k) => [k, Core.baseLph('both', k) / k]), color: '#9AA5AE', width: 1.5, dash: '5 4' },
      { pts: sp.map((k) => [k, tot(a.x, k) / k]), color: '#13212F' },
      { pts: sp.map((k) => [k, tot(p.x, k) / k]), color: '#E07A2E', width: 2.5, dash: '7 4' }],
      { track: { step: 0.1, y: (k) => tot(a.x, k) / k, tip: (k) => `${f(k)} kn · ${f(tot(a.x, k) / k, 2)} ± ${f(Core.lpnmSigma('both', k), 2)} L/NM · ${rangeTip('both', k)}` },
        label: 'Current and proposed consumption curve', xMin: 3, xMax: 17, yMin: 0, yMax, xTicks: [3, 6, 9, 12, 15], yTicks: [0, 0.25, 0.5, 0.75, 1].map((q) => q * yMax), xFmt: (v) => v, yFmt: (v) => f(v), xUnit: 'kn' });
    sheet(`<h3>Improved consumption curve</h3><p>Fitted to ${p.n} measured tank intervals. Nothing changes until you accept it.</p>
      <div class="card" style="gap:6px"><div class="cardhead"><div class="sub">Error vs measured intervals</div><div class="num" style="font-size:20px">${f(p.errBefore)} → ${f(p.errAfter)} L</div></div>
        <div class="table"><div class="tr head" style="grid-template-columns:1.4fr repeat(3,1fr)"><div>L/NM</div>${kns.map((k) => `<div>${f(k)} kn</div>`).join('')}</div>
        ${row('Both engines', tot)}${anySolo('port') ? row('Port solo', solo('port')) : ''}${anySolo('stbd') ? row('Stbd solo', solo('stbd')) : ''}</div>
        <div class="table" style="padding-top:6px"><div class="tr head" style="grid-template-columns:2fr 1fr 1fr"><div>Conditions effect</div><div>Now</div><div>New</div></div>
        ${cRow('Head wind 5 m/s', a.cond.a * 5, p.cond.a * 5)}${cRow('Light load', a.cond.bL, p.cond.bL)}${cRow('Full load', a.cond.bF, p.cond.bF)}</div>
        <div class="table" style="padding-top:6px"><div class="tr head" style="grid-template-columns:2fr 1fr 1fr"><div>Idle use, L/h</div><div>Now</div><div>New</div></div>
        ${S().tanks.map((t) => `<div class="tr" style="grid-template-columns:2fr 1fr 1fr"><div>${esc(t.name)}</div><div>${f(a.x[t.id].both[0])}</div><div><b>${f(p.x[t.id].both[0])}</b></div></div>`).join('')}</div>
      </div>
      <div class="card" style="padding:8px 4px 4px 0"><div class="sub" style="padding-left:12px">Both engines, L/NM: solid = current · orange dashed = proposed · grey dashed = base</div>${chart}</div>
      <div class="btnrow"><button class="btn grow" data-act="cons-reject">Keep current</button><button class="btn primary" data-act="cons-accept">Use new curve</button></div>`);
  }
  function consPointSheet(q) {
    const series = q ? Core.findConsPoint(q.id).series : curveMode;
    sheet(`<h3>Estimate point</h3><p>Your estimate of fuel use at one speed.</p><div class="sub" style="padding:0 2px 6px 2px">${SERIES_LABEL[series]}</div>
      <div class="card"><div class="field"><label for="cp-kn">Speed</label><div class="inbox"><input id="cp-kn" inputmode="decimal" value="${q ? dv(q.kn) : ''}"><span>kn</span></div></div>
      <div class="field"><label for="cp-l">Fuel use</label><div class="inbox"><input id="cp-l" inputmode="decimal" value="${q ? dv(q.lpnm) : ''}"><span>L/NM</span></div></div></div>
      <div class="btnrow"><button class="btn grow" data-act="sheet-close">Cancel</button>${q ? '<button class="btn" data-act="cp-del">Delete</button>' : ''}<button class="btn primary" data-act="cp-save">${q ? 'Save' : 'Add'}</button></div>`);
    if (!q) setTimeout(() => { const i = $('#cp-kn'); if (i) i.focus(); }, 100);
  }
  R.curve = () => {
    $('#v-curve').innerHTML = `
      <div class="top"><div><div class="title">${curveTab === 'fuel' ? 'Consumption curve' : 'Hull condition'}</div><div class="sub" id="curve-sub"></div></div></div>
      <div class="seg"><button class="${curveTab === 'fuel' ? 'on' : ''}" data-act="curve-tab" data-t="fuel">Consumption</button><button class="${curveTab === 'hull' ? 'on' : ''}" data-act="curve-tab" data-t="hull">Hull &amp; RPM</button></div>
      <div id="curve-body"></div>`;
    if (curveTab === 'fuel') renderFuelCurve(); else renderHull();
  };
  function renderFuelCurve() {
    const fit = S().fit, nm = curveMetric === 'nm', mode = curveMode;
    $('#curve-sub').textContent = `${fit.nTrips} trips · ${fit.nIntervals} measured tank intervals`;
    const x0 = nm ? 3 : 2;   // per mile: from 3 kn — below that idle use per mile grows without bound
    const mids = []; for (let b = 2; b <= 16; b++) if (Core.bandMid(b) >= x0) mids.push(Core.bandMid(b));
    const sp = (mids[0] > x0 ? [x0] : []).concat(mids);
    const val = (lph, kn) => (nm ? lph / kn : lph);
    const band = sp.map((kn) => { const y = val(Core.lphTotal(mode, kn), kn), e = val(Core.lphSigma(mode, kn), kn); return [kn, Math.max(0, y - e), y + e]; });
    const hrs = fit.loggedH[mode];
    const series = [{ pts: sp.map((kn) => [kn, val(Core.lphTotal(mode, kn), kn)]), color: '#13212F', band,
      dots: mids.map((kn) => { const b = Core.bandOf(kn); return hrs[b] > 0.02 ? [kn, val(Core.lphTotal(mode, kn), kn), 3 + Math.sqrt(hrs[b]) * 1.5] : null; }).filter(Boolean) }];
    series.unshift({ pts: sp.map((kn) => [kn, val(Core.baseLph(mode, kn), kn)]), color: '#9AA5AE', width: 1.5, dash: '5 4' });
    const cpts = S().cons.pts[mode];
    if (cpts.length) series.push({ color: '#13212F', dots: cpts.filter((q) => q.kn >= x0 && q.kn <= 17).map((q) => [q.kn, nm ? q.lpnm : q.lpnm * q.kn, 4.5]), dotFill: '#E9B44C', dotStroke: '#13212F' });
    if (mode === 'both') {
      series.push({ pts: sp.map((kn) => [kn, val(Core.lphEng('port', 'both', kn), kn)]), color: '#A63A2A', width: 2 });
      series.push({ pts: sp.map((kn) => [kn, val(Core.lphEng('stbd', 'both', kn), kn)]), color: '#1F6E5A', width: 2 });
    }
    const yMax = niceMax(Math.max(...band.slice(0, 12).map((p) => p[2])) * 1.05);
    const kn = Core.live.sogKn;
    const chart = lineChart(series, { track: { step: 0.1, y: (v) => val(Core.lphTotal(mode, v), v), tip: (v) => `${f(v)} kn · ${f(val(Core.lphTotal(mode, v), v), nm ? 2 : 1)} ± ${f(val(Core.lphSigma(mode, v), v), nm ? 2 : 1)} ${nm ? 'L/NM' : 'L/h'} · ${rangeTip(mode, v)}` },
      label: 'Fuel use against speed', xMin: x0, xMax: 17, yMin: 0, yMax, xTicks: nm ? [3, 6, 9, 12, 15] : [2, 4, 6, 8, 10, 12, 14, 16], yTicks: [0, 0.2, 0.4, 0.6, 0.8, 1].map((q) => q * yMax), xFmt: (v) => v, yFmt: (v) => (yMax <= 10 ? f(v) : fi(v)), xUnit: 'kn',
      vlines: [{ x: S().settings.minCruiseKn, color: '#C9C1AA' }].concat(kn >= 2 && kn <= 17 ? [{ x: kn, color: '#B8470F' }] : []) });
    const rows = []; for (let b = 1; b < Core.NB - 1; b++) if (hrs[b] > 0.02 || (b >= 4 && b <= 14)) rows.push(b);
    const xr = fit.x, cols = 'grid-template-columns:1.25fr 1fr 1fr 1fr .9fr .8fr';
    $('#curve-body').innerHTML = `
      <div class="chips" style="padding-top:10px">${Core.MODES.map((m) => `<button class="chip ${m === mode ? 'on' : ''}" data-act="curve-mode" data-m="${m}">${m === 'both' ? 'Both engines' : MODE_LABEL[m].replace(' only', ' solo')}</button>`).join('')}</div>
      <div class="seg" style="margin-top:10px"><button class="${nm ? 'on' : ''}" data-act="metric" data-m="nm">Litres per NM</button><button class="${nm ? '' : 'on'}" data-act="metric" data-m="h">Litres per hour</button></div>
      ${consProposalCard()}
      ${fit.nIntervals === 0 ? '<div class="warn">This is a starting guess, not your boat yet. It becomes your curve after a few trips with tank dips before and after.</div>' : ''}
      <div class="card" style="padding:12px 6px 8px 2px">${chart}
        <div class="sub" style="padding-left:30px">${mode === 'both' ? '<b style="color:#13212F">Total</b> · <b style="color:#A63A2A">port</b> · <b style="color:#1F6E5A">stbd</b> · ' : ''}grey dashed = base curve · shaded = uncertainty · dot size = hours${cpts.length ? ' · yellow = your estimate points' : ''} · grey line = cruising from ${f(S().settings.minCruiseKn)} kn</div>
      </div>
      ${consPointsCard(mode)}
      ${mode === 'both' ? ecoHtml(false) : ''}
      ${mode === 'both' ? condHtml() + accuracyHtml() : ''}
      <div class="card" style="gap:0"><div class="table">
        <div class="tr head" style="${cols}"><div>Speed</div><div>L/NM</div><div>P L/h</div><div>S L/h</div><div>S/P</div><div>h</div></div>
        ${rows.map((b) => {
          const v = Core.bandMid(b);
          const p = mode === 'stbd' ? 0 : (mode === 'both' ? xr.port.both[b] : xr.port.solo[b]);
          const s = mode === 'port' ? 0 : (mode === 'both' ? xr.stbd.both[b] : xr.stbd.solo[b]);
          return `<div class="tr ${hrs[b] < 0.1 ? 'dim' : ''}" style="${cols}"><div>${Core.bandLabel(b)}</div><div><b>${f((p + s) / v)}</b></div><div>${mode === 'stbd' ? '–' : f(p)}</div><div>${mode === 'port' ? '–' : f(s)}</div><div>${mode === 'both' ? fi((s / p) * 100) + '%' : '–'}</div><div>${f(hrs[b])}</div></div>`;
        }).join('')}
      </div></div>
      ${consHistoryCard()}
      <div class="note">Each tank feeds its own engine, so every pair of dips measures one engine. Both engines are fitted together; where one has little data it borrows the other's shape. Grey rows have little data. Rough dips count less.</div>`;
  }
  function condHtml() {
    const fit = S().fit, k = fit.cond || {}, sd = fit.condSd || [], n = fit.condN || { wind: 0, light: 0, full: 0 };
    const pc = (v) => (isFinite(v) ? (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(0) + ' %' : '–');
    const row = (label, v, e, cnt) => `<div class="tr" style="grid-template-columns:2fr 1fr 1fr"><div>${label}</div><div style="text-align:right"><b>${cnt ? pc(v) : '–'}</b></div><div style="text-align:right" class="sub">${cnt ? '±' + Math.abs(e * 100).toFixed(0) + ' %' : 'no data yet'}</div></div>`;
    return `<div class="card" style="gap:0"><div class="cardhead"><div class="h">Conditions effect</div><div class="sub">learned from your trips</div></div><div class="table">
      ${row('Head wind 5 m/s', (k.a || 0) * 5, (sd[0] || 0) * 5, n.wind)}
      ${row('Wind &amp; waves 10 m/s', (k.c || 0) * 6, (sd[1] || 0) * 6, n.wind)}
      ${row('Light load', k.bL || 0, sd[2] || 0, n.light)}
      ${row('Full load', k.bF || 0, sd[3] || 0, n.full)}
    </div><div class="sub" style="padding-top:6px">vs calm water and normal load · ${n.wind} measured intervals with FMI wind</div></div>`;
  }
  function accuracyHtml() {
    const acc = (S().accuracy || []).slice().sort((a, b) => a.t - b.t);
    if (!acc.length) return '<div class="card"><div class="cardhead"><div class="h">Prediction accuracy</div></div><div class="sub">Each dip is compared with what the app predicted before it. The first comparison appears after your second dip with trips in between.</div></div>';
    const err = (a) => ((a.pred - a.meas) / Math.max(1, Math.abs(a.meas))) * 100;
    const recent = acc.slice(-8).filter((a) => !a.rough).map((a) => Math.abs(err(a)));
    const typ = recent.length ? Core.median(recent) : NaN;
    const tMin = acc[0].t, tMax = Math.max(acc[acc.length - 1].t, tMin + 86400000);
    const yMax = Math.max(10, niceMax(Math.max(...acc.map((a) => Math.abs(err(a)))) * 1.1));
    const chart = lineChart([
      { color: '#A63A2A', dots: acc.filter((a) => a.tank === 'port').map((a) => [a.t, err(a), 4]), dotFill: '#A63A2A' },
      { color: '#1F6E5A', dots: acc.filter((a) => a.tank === 'stbd').map((a) => [a.t, err(a), 4]), dotFill: '#1F6E5A' }],
      { label: 'Prediction error over time', xMin: tMin, xMax: tMax, yMin: -yMax, yMax, xTicks: [tMin, tMax], yTicks: [-yMax, -yMax / 2, 0, yMax / 2, yMax], xFmt: (v) => dstr(v), yFmt: (v) => fi(v) + '%', xUnit: '' });
    return `<div class="card" style="padding:12px 6px 8px 2px"><div class="cardhead" style="padding-left:10px"><div><div class="h">Prediction accuracy</div><div class="sub">predicted before each dip vs measured</div></div><div style="text-align:right;padding-right:6px"><div class="num" style="font-size:22px">${isFinite(typ) ? '±' + fi(typ) + ' %' : '–'}</div><div class="sub">typical now</div></div></div>
      ${chart}<div class="sub" style="padding-left:30px"><b style="color:#A63A2A">port</b> · <b style="color:#1F6E5A">stbd</b> · above 0 = app predicted too much</div>
      <div class="table" style="padding:6px 6px 0 10px"><div class="tr head" style="grid-template-columns:1fr .7fr 1fr 1fr .8fr"><div>Date</div><div>Tank</div><div>Predicted</div><div>Measured</div><div>Diff</div></div>
      ${acc.slice(-6).reverse().map((a) => `<div class="tr" style="grid-template-columns:1fr .7fr 1fr 1fr .8fr"><div>${dstr(a.t)}</div><div>${a.tank === 'port' ? 'P' : 'S'}</div><div>${fi(a.pred)} L</div><div>${fi(a.meas)} L</div><div>${pm(err(a))}%</div></div>`).join('')}</div></div>`;
  }
  function renderHull() {
    const s = S(), hs = Core.hullStatus(hullPeriod);
    const sortedCl = s.hull.cleanings.slice().sort((a, b) => a - b);
    $('#curve-sub').textContent = hs.period > 0 ? 'Period from cleaning ' + dstr(sortedCl[hs.period - 1]) : (sortedCl.length ? 'Period before first cleaning' : 'This season');
    const st = Core.seasonTable(hs.from, hs.to);
    let chart = '';
    if (hs.samples.length) {
      const tMin = hs.samples[0].t, tMax = Math.max(hs.samples[hs.samples.length - 1].t, tMin + 86400000);
      const losses = hs.samples.map((x) => x.loss);
      const yMax = Math.max(5, niceMax(Math.max(...losses) * 1.1)), yMin = Math.min(0, Math.floor(Math.min(...losses)));
      chart = lineChart([{ color: '#9CC3D5', dots: hs.samples.map((x) => [x.t, x.loss, 3]), dotFill: '#9CC3D5' }, { color: '#B8470F', pts: hs.weekly.map((w) => [w.t, w.loss]), dots: hs.weekly.map((w) => [w.t, w.loss, 4.5]) }],
        { label: 'Speed loss over time', xMin: tMin, xMax: tMax, yMin, yMax, xTicks: [tMin, (tMin + tMax) / 2, tMax], yTicks: [yMin, 0, yMax / 2, yMax].filter((v, i, a) => a.indexOf(v) === i), xFmt: (v) => dstr(v), yFmt: (v) => fi(v) + '%', xUnit: '' });
    }
    $('#curve-body').innerHTML = `
      <div class="grid2" style="padding-top:12px">
        <div class="tile dark"><div class="lbl">Speed loss now</div><div class="num mid">${hs.enough ? f(hs.current) + ' %' : '–'}</div><div class="hint">${hs.enough ? 'vs clean hull, last 8 stretches' : 'needs ≥ 5 steady stretches (' + hs.samples.length + ')'}</div></div>
        <div class="tile"><div class="lbl">Steady stretches</div><div class="num mid">${hs.samples.length}</div><div class="hint">at cruise RPM, both engines</div></div>
      </div>
      ${hs.periods > 1 ? `<div class="chips" style="padding-top:10px">${Array.from({ length: hs.periods }, (_, i) => `<button class="chip ${i === hs.period ? 'on' : ''}" data-act="hull-period" data-i="${i}">${i === 0 ? 'Before ' + dstr(sortedCl[0]) : 'From ' + dstr(sortedCl[i - 1])}</button>`).join('')}</div>` : ''}
      <div class="card" style="padding:12px 6px 8px 2px"><div class="cardhead" style="padding-left:10px"><div class="h">Speed loss at cruise RPM</div></div>
        ${chart || '<div class="sub" style="padding:10px">No steady stretches yet. Set RPM on the Helm screen while under way.</div>'}
        <div class="sub" style="padding-left:30px">light dots = single stretches · orange = weekly median</div></div>
      <div class="btnrow"><button class="btn grow" data-act="hull-clean">Hull cleaned today</button></div>
      <div class="card" style="gap:0"><div class="cardhead"><div class="h">Speed at RPM, this period</div></div><div class="table">
        <div class="tr head" style="grid-template-columns:1fr 1fr 1fr 1fr .6fr"><div>RPM</div><div>Now</div><div>Clean</div><div>Loss</div><div>n</div></div>
        ${st.length ? st.map((r) => `<div class="tr" style="grid-template-columns:1fr 1fr 1fr 1fr .6fr"><div>${r.rpm}</div><div>${f(r.kn)} kn</div><div>${f(r.clean)} kn</div><div>${isFinite(r.clean) ? f(((r.clean - r.kn) / r.clean) * 100) + '%' : '–'}</div><div>${r.n}</div></div>`).join('') : '<div class="sub" style="padding:6px 0">Nothing logged yet.</div>'}
      </div></div>
      <div class="card"><div class="cardhead"><div class="h">Clean-hull table</div><div class="sub">${s.hull.cleanSample ? 'sample values' : 'your values'}</div></div>
        ${s.hull.clean.map((r, i) => `<div class="field"><div class="inbox"><input inputmode="decimal" id="ch-r${i}" value="${dv(r[0])}" aria-label="RPM row ${i + 1}"><span>rpm</span></div><div class="inbox"><input inputmode="decimal" id="ch-k${i}" value="${dv(r[1])}" aria-label="Speed row ${i + 1}"><span>kn</span></div><button class="iconbtn" aria-label="Delete row" data-act="ch-del" data-i="${i}">${IC.x}</button></div>`).join('')}
        <div class="btnrow" style="padding:0"><button class="btn small grow" data-act="ch-add">Add row</button><button class="btn small primary" data-act="ch-save">Save table</button></div>
        <div class="sub">Speed with a clean hull, both engines, calm water. Enter at the start of the season.</div>
      </div>
      <div class="note">Wind, current and load move single stretches by a few percent; the weekly median shows the trend. A rising speed loss at the same RPM means growth on the hull or propellers.</div>`;
  }


  // LOG: summary per engine, refuel log, dip log
  let logPeriod = new Date().getFullYear();
  const KIND_LABEL = { before: 'before trip', after: 'after trip', check: 'separate' };
  function logRange() {
    if (logPeriod === 'all') return [0, Infinity];
    return [new Date(logPeriod, 0, 1).getTime(), new Date(logPeriod + 1, 0, 1).getTime()];
  }
  function refuelGroups(from, to) {
    const by = new Map();
    S().events.filter((e) => e.type === 'refuel' && e.t >= from && e.t < to).forEach((e) => {
      const k = e.group || e.id;
      if (!by.has(k)) by.set(k, { key: k, t: e.t, src: e.src, price: e.price, port: 0, stbd: 0, ids: [] });
      const g = by.get(k); g[e.tank] += e.pumped || 0; g.ids.push(e.id);
    });
    return [...by.values()].sort((x, y) => y.t - x.t);
  }
  const srcText = (src) => (!src ? '' : src.type === 'canister' ? 'Canister' : (src.name || 'Fuel station'));
  // dips of both tanks taken together form one row
  const dipRows = (from, to) => {
    const out = [];
    S().events.filter((e) => e.type === 'dip' && e.t >= from && e.t < to).sort((x, y) => y.t - x.t).forEach((e) => {
      const g = out[out.length - 1];
      if (g && Math.abs(g.t - e.t) < 120000 && !g.list.some((x) => x.tank === e.tank) && Core.dipKind(g.list[0]) === Core.dipKind(e)) g.list.push(e);
      else out.push({ t: e.t, list: [e] });
    });
    out.forEach((g) => g.list.sort((x, y) => (x.tank === 'port' ? -1 : 1)));
    return out;
  };
  const LOG_N = 10;
  let logAll = { refuel: false, dip: false };
  R.log = () => {
    const [from, to] = logRange(), s = S(), sm = Core.summary(from, to);
    const years = Core.seasons(), thisYear = new Date().getFullYear();
    const groups = refuelGroups(from, to), dips = dipRows(from, to);
    const name = (e) => esc(Core.tank(e).name);
    const row = (label, x, strong) => `<div class="tr" style="grid-template-columns:1.3fr 1fr 1fr 1fr 1fr">${strong ? `<div><b>${label}</b></div>` : `<div>${label}</div>`}<div>${f(x.nm)}</div><div>${f(x.h)}</div><div>${x.Lest > 0.5 ? '~' : ''}${fi(x.L)}</div><div>${fi(x.eur)}</div></div>`;
    $('#v-log').innerHTML = `
      <div class="top"><div><div class="title">Log</div><div class="sub">${logPeriod === 'all' ? 'All seasons' : 'Season ' + logPeriod}</div></div></div>
      <div class="chips">${years.map((y) => `<button class="chip ${logPeriod === y ? 'on' : ''}" data-act="log-period" data-p="${y}">${y === thisYear ? 'This season' : y}</button>`).join('')}<button class="chip ${logPeriod === 'all' ? 'on' : ''}" data-act="log-period" data-p="all">All</button></div>
      <div class="card" style="gap:0"><div class="cardhead"><div class="h">Summary</div><div class="sub">${sm.trips} trips</div></div>
        <div class="table">
          <div class="tr head" style="grid-template-columns:1.3fr 1fr 1fr 1fr 1fr"><div></div><div>NM</div><div>h</div><div>L</div><div>€</div></div>
          ${row(name('port'), sm.port)}${row(name('stbd'), sm.stbd)}${row('Boat total', sm.boat, true)}
        </div>
        <div class="sub" style="padding-top:6px">Engine NM = distance with that engine running · h = engine running time, idling included (boat: trip time) · L = fuel used · € = refuels in the period</div>
        ${sm.idleH > 0.01 ? `<div class="sub">h includes ${dur(sm.idleH)} of idle runs (e.g. battery charging).</div>` : ''}
        ${sm.boat.Lest > 0.5 ? `<div class="sub">~ includes ${fi(sm.boat.Lest)} L estimated from the consumption model (trips without dips).</div>` : ''}
        <div class="btnrow" style="padding:8px 0 0 0"><button class="btn small grow" data-act="go" data-v="trips">Trips</button><button class="btn small grow" data-act="manual-new">Add trip by hand</button></div>
      </div>
      <div class="card" style="gap:0"><div class="cardhead"><div class="h">Refuel log</div><div class="sub">${groups.length} refuels</div></div>
        <div class="sub" style="padding-bottom:6px">${name('port')} ${fi(sm.port.bought)} L · ${fi(sm.port.eur)} € · ${name('stbd')} ${fi(sm.stbd.bought)} L · ${fi(sm.stbd.eur)} € · Total ${fi(sm.boat.bought)} L · ${fi(sm.boat.eur)} €</div>
        ${groups.length ? (logAll.refuel ? groups : groups.slice(0, LOG_N)).map((g) => { const L = g.port + g.stbd, pr = isFinite(g.price) && g.price > 0; return `<div class="logrow"><div class="main"><b>${dstr(g.t)}${srcText(g.src) ? ' · ' + esc(srcText(g.src)) : ''}</b><span>${['port', 'stbd'].filter((k) => g[k] > 0.5).map((k) => name(k) + ' ' + fi(g[k]) + ' L').join(' · ') || '0 L'}${pr ? ' · ' + f(g.price, 3) + ' €/L' : ''}</span></div><div class="right"><span class="num">${fi(L)} L</span><span>${pr ? f(L * g.price, 2) + ' €' : 'no price'}</span></div><button class="iconbtn" aria-label="Delete refuel" data-act="del-refuel" data-k="${g.key}">${IC.x}</button></div>`; }).join('') : '<div class="sub">No refuels in this period.</div>'}
        ${groups.length > LOG_N ? `<div class="btnrow" style="padding:6px 0 0 0"><button class="btn small grow" data-act="log-all" data-k="refuel">${logAll.refuel ? 'Show fewer' : 'Show all ' + groups.length}</button></div>` : ''}
        <div class="btnrow" style="padding:8px 0 0 0"><button class="btn small grow primary" data-act="go" data-v="refuel">Log refuel</button></div>
      </div>
      ${idleLogCard(from, to)}
      <div class="card" style="gap:0"><div class="cardhead"><div class="h">Dip log</div><div class="sub">${dips.length} dips</div></div>
        ${dips.length ? (logAll.dip ? dips : dips.slice(0, LOG_N)).map((g) => `<div class="logrow"><div class="main"><b>${dtstr(g.t)}</b><span>${KIND_LABEL[Core.dipKind(g.list[0])]}${g.list.some((e) => e.rough) ? ' · rough' : ''}</span></div><div class="right">${g.list.map((e) => `<span><span class="num" style="color:${Core.tank(e.tank).color}">${esc(Core.tank(e.tank).name)}</span> <span class="num">${rs(e.mm)}</span> · ${fi(Core.litres(Core.tank(e.tank), e.mm))} L</span>`).join('')}</div><button class="iconbtn" aria-label="Delete reading" data-act="del-dips" data-ids="${g.list.map((e) => e.id).join(',')}">${IC.x}</button></div>`).join('') : '<div class="sub">No dips in this period.</div>'}
        ${dips.length > LOG_N ? `<div class="btnrow" style="padding:6px 0 0 0"><button class="btn small grow" data-act="log-all" data-k="dip">${logAll.dip ? 'Show fewer' : 'Show all ' + dips.length}</button></div>` : ''}
        <div class="btnrow" style="padding:8px 0 0 0"><button class="btn small grow dark" data-act="dip-sheet">Log dip</button></div>
      </div>`;
  };

  // KNOWN POINTS: the one list of (depth, litres) readings; suggested fits computed from them
  let kpOpen = false, kpEdit = null, kpTank = 'both';
  const sugCache = new Map();
  const kpKeyFor = (t) => (S().anchors.some((x) => x.tank === t.id) ? t.id : 'shared');
  const fitReady = () => typeof TankFit !== 'undefined';
  const sugKey = (key, tk) => { const pts = Core.anchorsFor(key); return key + '#' + Core.pointsKey(key) + '#' + Math.max(tk.maxMm, ...pts.map((x) => x.mm)); };
  function fitSuggestions(key, tk) {
    const pts = Core.anchorsFor(key).map((x) => [x.mm, x.L]);
    if (pts.length < 2 || !fitReady()) return [];
    const top = Math.max(tk.maxMm, ...pts.map((p) => p[0])), range = [0, top];
    const ck = sugKey(key, tk);
    if (sugCache.has(ck)) return sugCache.get(ck);
    const saved = S().curve.sugCache && S().curve.sugCache[ck];   // kept between app starts
    if (saved) { sugCache.set(ck, saved); return saved; }
    const out = [];
    TankFit.METHODS.forEach((m) => { const e = TankFit.evaluate(pts, [], [m], top, range); if (e.ok && e.mono && isFinite(e.rms)) out.push({ methods: [m], bounds: [], rms: e.rms, model: e.model }); });
    if (pts.length >= 6) { const s = TankFit.suggestBounds(pts, 2, top, range); if (s) { const e = TankFit.evaluate(pts, s.bounds, s.methods, top, range); if (e.ok && e.mono && isFinite(e.rms)) out.push({ methods: s.methods, bounds: s.bounds, rms: e.rms, model: e.model }); } }
    out.sort((x, y) => x.rms - y.rms);
    sugCache.set(ck, out);
    const keep = {}; Object.entries(S().curve.sugCache || {}).slice(-3).forEach(([k, v]) => { keep[k] = v; }); keep[ck] = out;
    S().curve.sugCache = keep; Core.save();
    return out;
  }
  const curveRmsAt = (tk, pts) => Math.sqrt(pts.reduce((s, p) => s + (Core.litres(tk, p[0]) - p[1]) ** 2, 0) / Math.max(1, pts.length));
  function knownPointsCard(t) {
    const key = kpKeyFor(t), own = S().anchors.filter((x) => x.tank === t.id), both = S().anchors.filter((x) => x.tank === 'both');
    const list = Core.anchorsFor(t.id).slice().sort((x, y) => x.mm - y.mm);
    const shown = kpOpen ? list : list.slice(0, 6);
    const rows = shown.map((x) => `<button class="item" data-act="kp-edit" data-id="${x.id}" style="padding:8px 12px;min-height:0"><span class="main"><b>${rs(x.mm)} = ${f(x.L)} L</b></span><span class="right"><span class="sub">${x.tank === 'both' ? 'both tanks' : esc(t.name)}</span></span></button>`).join('');
    const pts = Core.anchorsFor(key).map((x) => [x.mm, x.L]);
    if (!fitReady()) return cardShell(t, rows, list, own, both, '<div class="warn" style="margin:8px 0 0 0">The fit calculation file (tankfit.js) is missing. Upload all app files to GitHub again.</div>');
    if (list.length >= 2 && !sugCache.has(sugKey(key, t)) && !(S().curve.sugCache && S().curve.sugCache[sugKey(key, t)])) {   // compute after the page is on screen
      setTimeout(() => { fitSuggestions(key, t); if (current === 'tanks' && tankSel === t.id) R.tanks(); }, 60);
      return cardShell(t, rows, list, own, both, '<div class="sub" style="padding-top:10px">Calculating suggested fits…</div>');
    }
    const sugg = fitSuggestions(key, t);
    let sugHtml = '';
    if (sugg.length) {
      const top = Math.max(t.maxMm, ...pts.map((p) => p[0])), yMax = Math.ceil((Math.max(t.capacity, ...pts.map((p) => p[1])) * 1.05) / 100) * 100;
      const cur = curveRmsAt(t, pts), best = sugg[0];
      const chart = lineChart([
        { pts: Array.from({ length: 61 }, (_, i) => [(top * i) / 60, Core.litres(t, (top * i) / 60)]), color: '#9AA5AE', width: 2 },
        { pts: Array.from({ length: 61 }, (_, i) => [(top * i) / 60, Math.max(0, TankFit.evalModel(best.model, (top * i) / 60))]), color: '#E07A2E', width: 2.5 },
        { color: '#13212F', dots: pts.map((p) => [p[0], p[1], 3.5]), dotFill: '#E9B44C', dotStroke: '#13212F' }],
        { label: 'Suggested fit', xMin: 0, xMax: top, yMin: 0, yMax, xTicks: [0.25, 0.5, 0.75, 1].map((q) => q * top), yTicks: Array.from({ length: yMax / 100 + 1 }, (_, i) => i * 100), xFmt: (v) => rn(v), yFmt: (v) => fi(v), xUnit: RUL(), vlines: best.bounds.map((b) => ({ x: b, color: '#4F5B66' })) });
      sugHtml = `<div class="cardhead" style="padding-top:10px"><div class="h">Suggested fits</div><div class="sub">${key === 'shared' ? 'both tanks' : esc(t.name) + ' only'}</div></div>
        <div class="sub">Curve in use: ±${f(cur)} L at these points</div>
        ${sugg.slice(0, 3).map((x, i) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #ECE8DC"><div><b>${x.methods.map((m) => TF_LABEL[m]).join(' + ')}${i === 0 ? ' ★' : ''}</b><div class="sub">${x.bounds.length ? '2 areas · boundary ' + rs(x.bounds[0]) + ' · ' : ''}±${f(x.rms)} L</div></div><button class="btn small ${i === 0 ? 'primary' : ''}" data-act="kp-use" data-k="${key}" data-i="${i}">Use</button></div>`).join('')}
        ${sugChart ? `<div style="padding:6px 0 0 0">${chart}</div><div class="sub" style="padding-left:30px"><b style="color:#E07A2E">orange = best suggestion</b> · grey = curve in use · dots = known points</div>` : ''}
        <div class="btnrow" style="padding:6px 0 0 0"><button class="btn small grow" data-act="sug-chart">${sugChart ? 'Hide chart' : 'Show chart'}</button><button class="btn small grow" data-act="go" data-v="tankfit">More options</button></div>`;
    } else if (list.length < 2) sugHtml = '<div class="sub" style="padding-top:8px">Add at least two points to get suggested fits.</div>';
    return cardShell(t, rows, list, own, both, sugHtml);
  }
  function cardShell(t, rows, list, own, both, sugHtml) {
    return `<div class="card" id="kp-card" style="gap:0"><div class="cardhead"><div class="h">Known points</div><div class="sub">${own.length} ${esc(t.name)} · ${both.length} both tanks</div></div>
      <div class="sub" style="padding-bottom:4px">Depths where the litres are known, e.g. from filling an empty tank in measured steps. Tap a point to correct or delete it.</div>
      ${rows || '<div class="sub">No known points yet.</div>'}
      ${list.length > 6 ? `<div class="btnrow" style="padding:6px 0 0 0"><button class="btn small grow" data-act="kp-more">${kpOpen ? 'Show fewer' : 'Show all ' + list.length}</button></div>` : ''}
      <div class="btnrow" style="padding:6px 0 0 0"><button class="btn small grow dark" data-act="add-anchor">Add point</button></div>
      ${sugHtml}</div>`;
  }
  function kpNotice(t) {
    const key = kpKeyFor(t);
    if (!fitReady() || !(sugCache.has(sugKey(key, t)) || (S().curve.sugCache && S().curve.sugCache[sugKey(key, t)]))) return '';
    const sugg = fitSuggestions(key, t); if (!sugg.length) return '';
    const pts = Core.anchorsFor(key).map((x) => [x.mm, x.L]), cur = curveRmsAt(t, pts), best = sugg[0];
    if (!(cur > best.rms + 1.5) || S().curve.kpDismissed === key + '#' + Core.pointsKey(key)) return '';
    return `<div class="card dark"><div class="cardhead"><div><div class="h">Better fit from known points</div><div class="sub">±${f(best.rms)} L instead of ±${f(cur)} L now</div></div><div style="display:flex;gap:6px"><button class="btn small" style="background:#fff;color:#13212F" data-act="kp-review">Review</button><button class="btn small" data-act="kp-dismiss" data-k="${key}">Later</button></div></div></div>`;
  }

  // TANKS
  let tankSel = 'port', histOpen = false, sugChart = false;
  const ZERO = { shared: [0, 0, 0, 0, 0], port: [0, 0, 0, 0, 0], stbd: [0, 0, 0, 0, 0] };
  function curveChart(t, opts = {}) {
    const s = S();
    const yMax = Math.ceil((t.capacity * 1.05) / 100) * 100;
    const steps = 60, mmAt = (i) => (t.maxMm * i) / steps;
    const pts = (corr) => Array.from({ length: steps + 1 }, (_, i) => [mmAt(i), Core.litresWith(corr, t, mmAt(i))]);
    const series = [{ pts: pts(ZERO), color: '#9AA5AE', width: 1.5, dash: '5 4' }, { pts: pts(s.curve.active), color: t.color }];
    if (opts.proposal) series.push({ pts: pts(opts.proposal.corr), color: '#E07A2E', width: 2.5, dash: '7 4' });
    const segs = s.events.filter((e) => e.tank === t.id && e.type === 'refuel' && !e.group && isFinite(e.afterMm)).map((e) => { const b = Core.litres(t, e.mm); return [e.mm, b, e.afterMm, b + e.pumped]; });
    series.push({ color: '#13212F', segs });
    series.push({ color: '#13212F', dots: s.anchors.filter((a) => a.tank === t.id || a.tank === 'both').map((a) => [a.mm, a.L, a.tank === 'both' ? 3 : 4.5]), dotFill: '#E9B44C', dotStroke: '#13212F' });
    return lineChart(series, { label: 'Litres against ruler depth', xMin: 0, xMax: t.maxMm, yMin: 0, yMax, xTicks: [0.25, 0.5, 0.75, 1].map((q) => q * t.maxMm), yTicks: Array.from({ length: yMax / 100 + 1 }, (_, i) => i * 100), xFmt: (v) => rn(v), yFmt: (v) => fi(v), xUnit: RUL(), vlines: [{ x: t.pipeMm || 0, color: '#13212F' }] });
  }
  R.tanks = () => {
    const s = S(), t = Core.tank(tankSel), u = Core.usable(t.id);
    const ev = Core.eventsFor(t.id).slice().reverse();
    const last = ev[0], p = s.curve.pending, eqs = Core.curveEquations();
    const byL = t.pipeL !== null && t.pipeL !== undefined;
    $('#v-tanks').innerHTML = `
      <div class="top"><div><div class="title">Tanks</div><div class="sub">Ruler depth → litres</div></div><button class="btn small" data-act="edit-tank">Edit tank</button></div>
      <div class="seg">${s.tanks.map((k) => `<button class="${k.id === tankSel ? 'on' : ''}" data-act="tank-sel" data-t="${k.id}">${esc(k.name)}</button>`).join('')}</div>
      <div class="grid3">
        <div class="tile"><div class="lbl">Now, est.</div><div class="num mid">${fi(u.L)} <span class="unit">L</span></div><div class="hint">${last ? 'dip ' + rs(last.mm) : 'no dip'}${last && Core.measuredRange(t) && last.mm > Core.measuredRange(t).maxMm + 5 ? '<br><b style="color:#B8470F">above measured depths — estimate</b>' : ''}</div></div>
        <div class="tile dark"><div class="lbl">Usable</div><div class="num mid">${fi(u.usable)} <span class="unit">L</span></div><div class="hint">above the suction pipe</div></div>
        <div class="tile"><div class="lbl">Unusable</div><div class="num mid">${fi(u.dead)} <span class="unit">L</span></div><div class="hint">${byL ? 'set in litres' : 'below ' + rs(t.pipeMm)}</div></div>
      </div>
      <div class="card" style="gap:6px">${tankBar(t)}</div>
      <div class="btnrow"><button class="btn dark grow" data-act="dip-sheet">Log dip</button><button class="btn primary" data-act="go" data-v="refuel">Log refuel</button></div>
      ${kpNotice(t)}
      ${p && (p.rmsBefore - p.rmsAfter >= 0.2) ? `<div class="card dark"><div class="cardhead"><div><div class="h">Improved tank curve available</div><div class="sub">From ${p.n} readings · error ${f(p.rmsBefore)} → ${f(p.rmsAfter)} L</div></div><button class="btn small" style="background:#fff;color:#13212F" data-act="proposal">Review</button></div></div>` : ''}
      <div class="card" style="padding:12px 6px 10px 2px">
        <div class="cardhead" style="padding-left:10px"><div class="h">Tank curve</div><div class="sub">${eqs.length} readings used</div></div>
        ${curveChart(t)}
        <div class="sub" style="padding-left:30px">grey dashed = base curve (table fit or polynomial) · solid = current curve · black ticks = refuels (before → after) · vertical = suction pipe</div>
        <div class="btnrow" style="padding:6px 10px 0 10px"><button class="btn small grow dark" data-act="go" data-v="tankfit">Volume fit</button><button class="btn small grow" data-act="kp-review">Known points</button></div>
      </div>
      ${knownPointsCard(t)}
      ${s.curve.history.length ? `<div class="card" style="gap:0"><button class="cardhead fold" data-act="hist-toggle"><span class="h">Earlier curves</span><span class="sub">${histOpen ? 'Hide' : 'Show ' + s.curve.history.length}</span></button>${histOpen ? s.curve.history.map((h, i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #ECE8DC;gap:8px"><span class="sub">${dtstr(h.t)} · ${esc(h.note || '')}</span><button class="btn small" data-act="restore-curve" data-i="${i}">Restore</button></div>`).join('') : ''}</div>` : ''}
      <div class="btnrow"><button class="btn small grow" data-act="go" data-v="log">Refuel and dip log</button></div>
      ${s.curve.sample ? '<div class="warn">The tank curve is a sample. Tap Volume fit to enter your readings or polynomial, and Edit tank for capacity and suction-pipe height.</div>' : ''}`;
  };
  function pointSheet(x) {
    sheet(`<h3>Known point</h3><p>A depth where you know the litres exactly, e.g. after filling an empty tank in measured steps.</p>
      <div class="card"><div class="field"><label for="ac-mm">Depth</label><div class="inbox"><input id="ac-mm" inputmode="decimal" value="${x ? rn(x.mm) : ''}"><span>${RUL()}</span></div></div>
      <div class="field"><label for="ac-L">Litres in tank</label><div class="inbox"><input id="ac-L" inputmode="decimal" value="${x ? dec(String(x.L)) : ''}"><span>L</span></div></div>
      <div class="seg" style="margin:0">${S().tanks.map((t) => `<button class="${kpTank === t.id ? 'on' : ''}" data-act="kp-tank" data-t="${t.id}">${esc(t.name)}</button>`).join('')}<button class="${kpTank === 'both' ? 'on' : ''}" data-act="kp-tank" data-t="both">Both tanks</button></div></div>
      <div class="btnrow"><button class="btn grow" data-act="sheet-close">Cancel</button>${x ? '<button class="btn" data-act="kp-del">Delete</button>' : ''}<button class="btn primary" data-act="save-anchor">${x ? 'Save' : 'Add'}</button></div>`);
    if (!x) setTimeout(() => { const i = $('#ac-mm'); if (i) i.focus(); }, 100);
  }
  function proposalSheet() {
    const p = S().curve.pending; if (!p) return;
    sheet(`<h3>Improved tank curve</h3><p>Fitted to ${p.n} readings (${p.nRefuel} refuels). It stays close to your base curve except where the refuels disagree.</p>
      <div class="card" style="gap:6px">
        <div class="cardhead"><div class="sub">Error vs readings</div><div class="num" style="font-size:20px">${f(p.rmsBefore)} → ${f(p.rmsAfter)} L</div></div>
        ${S().tanks.map((t) => `<div class="cardhead"><div class="sub" style="color:${t.color};font-weight:600">${esc(t.name)}</div><div style="font-size:14px;text-align:right">moves up to ${f(p.maxShift[t.id])} L · level now ${pm(p.levelChange[t.id], 1)} L${p.ownCurve[t.id] ? ' · <b>own curve</b>' : ''}</div></div>`).join('')}
        ${p.monotonic ? '' : '<div class="warn" style="margin:6px 0 0 0">This fit would make litres fall with depth somewhere, so it cannot be used. Check the latest readings.</div>'}
      </div>
      ${S().tanks.map((t) => `<div class="card" style="padding:8px 4px 4px 0"><div class="sub" style="padding-left:12px;color:${t.color}">${esc(t.name)}: solid = current · orange dashed = proposed</div>${curveChart(t, { proposal: p })}</div>`).join('')}
      <div class="btnrow"><button class="btn grow" data-act="reject-curve">Keep current</button><button class="btn primary" data-act="accept-curve" ${p.monotonic ? '' : 'disabled'}>Use new curve</button></div>`);
  }


  // TANK VOLUME FIT: readings table (depth → litres) with a fit method per depth area, or the polynomial
  let tfTab = 'table', tfTimer = null;
  const TF_LABEL = { linear: 'Straight lines', spline: 'Smooth curve', poly2: 'Polynomial 2', poly3: 'Polynomial 3', poly4: 'Polynomial 4' };
  const newSet = () => ({ rows: [], full: false, bounds: [], methods: ['spline'] });
  function tfState() {
    const c = S().curve;
    if (!c.table) c.table = { mode: 'shared', edit: 'port', sets: { shared: newSet(), port: newSet(), stbd: newSet() } };
    return c.table;
  }
  const tfKey = () => (tfState().mode === 'shared' ? 'shared' : tfState().edit);
  const tfSet = () => tfState().sets[tfKey()];
  const tfTank = () => Core.tank(tfKey() === 'shared' ? 'port' : tfKey());
  function tfPoints(set, tk) {
    const pts = Core.anchorsFor(tfKey()).map((x) => [x.mm, x.L]);
    if (set.full && !pts.some((p) => Math.abs(p[0] - tk.maxMm) < 1)) pts.push([tk.maxMm, tk.capacity]);
    return pts;
  }
  const tfBounds = (set) => set.bounds.filter(isFinite).slice().sort((x, y) => x - y);
  R.tankfit = () => {
    if (!fitReady()) { $('#v-tankfit').innerHTML = `<div class="top back"><button class="iconbtn" aria-label="Back" data-act="go" data-v="tanks">${IC.back}</button><div><div class="title">Tank volume fit</div></div></div><div class="warn">The fit calculation file (tankfit.js) is missing. Upload all app files to GitHub again.</div>`; return; }
    const T = tfState(), set = tfSet(), tk = tfTank(), c = S().curve;
    const nA = set.bounds.length + 1;
    const tabs = `<div class="seg"><button class="${tfTab === 'table' ? 'on' : ''}" data-act="tf-tab" data-t="table">From known points</button><button class="${tfTab === 'poly' ? 'on' : ''}" data-act="tf-tab" data-t="poly">Polynomial</button></div>`;
    const now = c.model ? (c.model.shared ? 'table fit (both tanks)' : 'table fit (' + Core.ENG.filter((e) => c.model[e]).map((e) => Core.tank(e).name).join(', ') + ')') : (c.sample ? 'sample polynomial' : 'polynomial');
    let body;
    if (tfTab === 'poly') {
      sheetUnit = c.unit;
      body = `<div class="card"><div class="sub">Shared by both tanks: litres = c0 + c1·x + c2·x² + c3·x³ + c4·x⁴, where x is the ruler depth. Paste values like 1.23e-5. Saving resets the refuel corrections; the old curve stays under Earlier curves.</div>
          <div class="seg" style="margin:0"><button class="${c.unit === 'mm' ? 'on' : ''}" data-act="base-unit" data-u="mm">x in mm</button><button class="${c.unit === 'cm' ? 'on' : ''}" data-act="base-unit" data-u="cm">x in cm</button></div>
          ${c.base.map((v, i) => `<div class="field"><label for="bc${i}">c${i}</label><div class="inbox wide" style="width:65%"><input id="bc${i}" inputmode="decimal" value="${v}"></div></div>`).join('')}
        </div>
        <div class="btnrow"><button class="btn primary grow" data-act="save-base">Save polynomial</button></div>`;
    } else {
      body = `
      <div class="card"><div class="cardhead"><div class="h">Applies to</div></div>
        <div class="seg" style="margin:0"><button class="${T.mode === 'shared' ? 'on' : ''}" data-act="tf-mode" data-m="shared">Both tanks (shared)</button><button class="${T.mode === 'separate' ? 'on' : ''}" data-act="tf-mode" data-m="separate">Each tank separately</button></div>
        ${T.mode === 'separate' ? `<div class="seg" style="margin:0">${S().tanks.map((t) => `<button class="${T.edit === t.id ? 'on' : ''}" data-act="tf-edit" data-t="${t.id}">${esc(t.name)}</button>`).join('')}</div>` : ''}
      </div>
      <div class="card"><div class="cardhead"><div class="h">Readings</div><div class="sub">${Core.anchorsFor(tfKey()).length} known points</div></div>
        <div class="sub">${tfKey() === 'shared' ? 'All known points are used.' : 'The known points of this tank and the both-tank points are used.'} Add, correct or delete them on the Tanks page.</div>
        <div class="btnrow" style="padding:0"><button class="btn small grow" data-act="go" data-v="tanks">Edit known points</button></div>
        <div class="check"><input type="checkbox" id="tf-full" ${set.full ? 'checked' : ''}><label for="tf-full">Full tank: ${rs(tk.maxMm)} = ${fi(tk.capacity)} L<small style="display:block;color:#4F5B66">only if you have measured it</small></label></div>
      </div>
      <div class="card"><div class="cardhead"><div class="h">Depth areas</div></div>
        <div class="sub">A tank with a narrow bottom often needs one method for the bottom and another for the straight upper part.</div>
        <div class="seg" style="margin:0">${[1, 2, 3].map((n) => `<button class="${nA === n ? 'on' : ''}" data-act="tf-areas" data-n="${n}">${n === 1 ? 'One area' : n + ' areas'}</button>`).join('')}</div>
        ${nA > 1 ? `${set.bounds.map((b, k) => `<div class="field"><label for="tf-b${k}">Boundary ${k + 1}</label><div class="inbox"><input inputmode="decimal" id="tf-b${k}" data-tfb="${k}" value="${isFinite(b) ? rn(b) : ''}"><span>${RUL()}</span></div></div>`).join('')}
          <div class="btnrow" style="padding:0"><button class="btn small grow" data-act="tf-suggest">Suggest boundaries</button></div>` : ''}
      </div>
      <div id="tf-res"></div>`;
    }
    $('#v-tankfit').innerHTML = `<div class="top back"><button class="iconbtn" aria-label="Back" data-act="go" data-v="tanks">${IC.back}</button><div><div class="title">Tank volume fit</div><div class="sub">In use: ${now}</div></div></div>${tabs}${body}`;
    if (tfTab === 'table') tfResults();
  };
  function tfResults() {
    const box = $('#tf-res'); if (!box) return;
    const set = tfSet(), tk = tfTank(), pts = tfPoints(set, tk), bounds = tfBounds(set), K = bounds.length + 1;
    const top = Math.max(tk.maxMm, ...pts.map((p) => p[0])), range = [0, top], scale = top;
    while (set.methods.length < K) set.methods.push('spline');
    set.methods.length = K;
    if (set.bounds.length && (bounds.length < set.bounds.length || new Set(bounds).size < bounds.length)) { box.innerHTML = '<div class="warn">Enter each boundary depth (they must differ), or press Suggest boundaries.</div>'; return; }
    if (pts.length < 2) { box.innerHTML = '<div class="warn">Enter at least two readings.</div>'; return; }
    const edges = [0].concat(bounds, [tk.maxMm]);
    const areas = Array.from({ length: K }, (_, k) => {
      const o = TankFit.options(pts, bounds, set.methods, k, scale, range);
      const good = o.filter((x) => x.ok && x.mono && x.complete && isFinite(x.rms));
      const best = good.length ? good.reduce((b, x) => (x.rms < b.rms - 0.1 ? x : b), good[0]).method : null;
      const chip = (x) => {
        const why = !x.ok ? (x.reason === 'points' ? 'too few readings' : 'fix the other area first') : !x.mono ? 'litres would fall' : x.complete && isFinite(x.rms) ? '±' + f(x.rms) + ' L' : 'error n/a';
        return `<button class="chip ${set.methods[k] === x.method ? 'on' : ''}" data-act="tf-method" data-k="${k}" data-m="${x.method}" ${x.ok && x.mono ? '' : 'disabled'} style="${x.ok && x.mono ? '' : 'opacity:.45'}">${TF_LABEL[x.method]}${x.method === best ? ' ★' : ''} · ${why}</button>`;
      };
      return `<div style="padding-top:6px"><b>${K > 1 ? 'Area ' + (k + 1) + ': ' : ''}${rs(edges[k])} – ${rs(edges[k + 1])}</b><div class="chips" style="padding:6px 0 0 0">${o.map(chip).join('')}</div></div>`;
    }).join('');
    const e = TankFit.evaluate(pts, bounds, set.methods, scale, range);
    let chart = '', summary = '', canUse = false;
    if (e.ok) {
      const steps = 80, mmAt = (i) => (top * i) / steps;
      const yMax = Math.ceil((tk.capacity * 1.05) / 100) * 100;
      chart = lineChart([
        { pts: Array.from({ length: steps + 1 }, (_, i) => [mmAt(i), Core.litres(tk, mmAt(i))]), color: '#9AA5AE', width: 2 },
        { pts: Array.from({ length: steps + 1 }, (_, i) => [mmAt(i), Math.max(0, TankFit.evalModel(e.model, mmAt(i)))]), color: '#E07A2E', width: 2.5 },
        { color: '#13212F', dots: pts.map((p) => [p[0], p[1], 4.5]), dotFill: '#E9B44C', dotStroke: '#13212F' }],
        { label: 'Tank volume fit', xMin: 0, xMax: top, yMin: 0, yMax, xTicks: [0.25, 0.5, 0.75, 1].map((q) => q * top), yTicks: Array.from({ length: yMax / 100 + 1 }, (_, i) => i * 100), xFmt: (v) => rn(v), yFmt: (v) => fi(v), xUnit: RUL(),
          vlines: bounds.map((b) => ({ x: b, color: '#4F5B66' })).concat(e.model.xmax < tk.maxMm - 5 ? [{ x: e.model.xmax, color: '#B8470F' }] : []) });
      let dev = 0; for (let i = 0; i <= 60; i++) { const x = (top * i) / 60; dev = Math.max(dev, Math.abs(Math.max(0, TankFit.evalModel(e.model, x)) - Core.litres(tk, x))); }
      summary = `Error when each reading is predicted from the others: ${isFinite(e.rms) ? '±' + f(e.rms) + ' L' : '–'} · differs from the curve in use by up to ${fi(dev)} L`;
      if (e.model.xmax < tk.maxMm - 5) summary += `<div class="warn" style="margin:8px 0 0 0">Measured up to ${rs(e.model.xmax)} (${fi(e.model.yhi)} L). Deeper than that the curve only continues the last slope — an estimate, shown right of the orange line.</div>`;
      canUse = e.mono;
    }
    box.innerHTML = `<div class="card"><div class="cardhead"><div class="h">Fit method</div><div class="sub">★ = most accurate</div></div>${areas}
        <div class="sub" style="padding-top:6px">Straight lines and Smooth curve go through every reading; a polynomial evens out reading errors. The error is measured by leaving out one reading at a time.</div></div>
      ${e.ok ? `<div class="card" style="padding:12px 6px 8px 2px">${chart}<div class="sub" style="padding-left:30px"><b style="color:#E07A2E">orange = new fit</b> · grey = curve in use · dots = your readings${bounds.length ? ' · grey vertical = area boundaries' : ''}${e.model.xmax < tk.maxMm - 5 ? ' · orange vertical = deepest reading' : ''}</div></div>
      <div class="sub" style="padding:0 16px">${summary}</div>` : `<div class="warn">${K > 1 ? 'An area has too few readings for its method.' : 'Too few readings for this method.'}</div>`}
      ${e.ok && !e.mono ? '<div class="warn">With this method the litres would fall as the depth grows somewhere. Choose another method.</div>' : ''}
      <div class="btnrow"><button class="btn primary grow" data-act="tf-apply" ${canUse ? '' : 'disabled'}>Use this curve${tfKey() === 'shared' ? ' for both tanks' : ' for ' + esc(tk.name)}</button></div>
      <div class="note">Using it makes this the base of the tank curve. Refuels keep refining it as before, and the old curve stays under Tanks → Earlier curves.</div>`;
  }
  function tfReadInputs() {
    const set = tfSet();
    set.bounds = set.bounds.map((b, k) => { const el = $('#tf-b' + k); return el ? rv(el.value) : b; });
  }

  // REFUEL
  let refuelSel = null, refuelSrc = 'station', refuelStName = '';
  // station names for the refuel form: nearest first when GPS is known, own stations and recently used names included
  function stationNames() {
    const fx = Core.live.fix, list = allStations().map((st) => ({ n: st.name, d: fx ? Core.haversine([fx.lat, fx.lon], [st.lat, st.lon]) : 0 }));
    list.sort((x, y) => x.d - y.d || x.n.localeCompare(y.n));
    const used = S().events.filter((e) => e.src && e.src.name).sort((x, y) => y.t - x.t).map((e) => e.src.name);
    return [...new Set(used.slice(0, 5).concat(list.map((x) => x.n)))].filter(Boolean);
  }
  R.refuel = () => {
    const s = S();
    if (!refuelSel) refuelSel = s.settings.lastRefuelSel || 'both';
    const tanks = refuelSel === 'both' ? s.tanks : [Core.tank(refuelSel)];
    const two = tanks.length > 1;
    $('#v-refuel').innerHTML = `
      <div class="top back"><button class="iconbtn" aria-label="Back" data-act="go" data-v="${backOf.refuel || 'tanks'}">${IC.back}</button><div><div class="title">Log refuel</div><div class="sub">Depths, pump litres and price</div></div></div>
      <div class="seg"><button class="${refuelSel === 'port' ? 'on' : ''}" data-act="refuel-sel" data-t="port">${esc(s.tanks[0].name)}</button><button class="${refuelSel === 'stbd' ? 'on' : ''}" data-act="refuel-sel" data-t="stbd">${esc(s.tanks[1].name)}</button><button class="${refuelSel === 'both' ? 'on' : ''}" data-act="refuel-sel" data-t="both">Both</button></div>
      <div class="card">
        ${tanks.map((t) => `<div class="field"><label for="rb-${t.id}">${two ? esc(t.name) + ': ' : ''}Depth before<small id="rbL-${t.id}">dip before filling</small></label><div class="inbox"><input id="rb-${t.id}" inputmode="decimal" data-rf="1" placeholder="${predDepth(t)}"><span>${RUL()}</span></div></div>`).join('')}
        <div class="field"><label for="rp">Litres from pump<small>${two ? 'one total, split by the dips' : 'from the pump display'}</small></label><div class="inbox"><input id="rp" inputmode="decimal" data-rf="1"><span>L</span></div></div>
        ${tanks.map((t) => `<div class="field"><label for="ra-${t.id}">${two ? esc(t.name) + ': ' : ''}Depth after<small id="raL-${t.id}">${two ? 'needed to split the total' : 'improves the tank curve'}</small></label><div class="inbox"><input id="ra-${t.id}" inputmode="decimal" data-rf="1"><span>${RUL()}</span></div></div>
          <div class="check"><input type="checkbox" id="rbrim-${t.id}" data-rf="1"><label for="rbrim-${t.id}">${two ? esc(t.name) + ' filled' : 'Filled'} to the brim (= ${fi(t.capacity)} L)</label></div>`).join('')}
        ${roughBox('rf-rough')}
      </div>
      <div class="card" id="rf-check"><div class="sub">Enter the readings to compare them with the tank curve.</div></div>
      <div class="card"><div class="cardhead"><div class="h">Fuel from</div></div>
        <div class="seg" style="margin:0"><button class="${refuelSrc === 'station' ? 'on' : ''}" data-act="refuel-src" data-s="station">Fuel station</button><button class="${refuelSrc === 'canister' ? 'on' : ''}" data-act="refuel-src" data-s="canister">Canister</button></div>
        ${refuelSrc === 'station' ? `<div class="field"><label for="rst">Station<small>optional — pick or type</small></label><div class="inbox wide" style="width:60%"><input id="rst" list="rst-list" value="${esc(refuelStName)}" autocomplete="off"></div></div>
        <datalist id="rst-list">${stationNames().map((n) => `<option value="${esc(n)}"></option>`).join('')}</datalist>` : ''}
      </div>
      <div class="card"><div class="field"><label for="rprice">Price<small>${refuelSrc === 'canister' ? 'what the canister fuel cost' : 'paid at the pump'}</small></label><div class="inbox"><input id="rprice" inputmode="decimal" value="${esc(dec(String(s.settings.price || '')))}" data-rf="1"><span>€/L</span></div></div><div class="sub" id="rtotal"></div>
        ${whenField('rwhen')}</div>
      <div class="btnrow"><button class="btn primary" data-act="save-refuel">Save refuel</button></div>`;
  };
  function refuelCalc() {
    const s = S();
    const tanks = refuelSel === 'both' ? s.tanks : [Core.tank(refuelSel)];
    const pumped = Core.num($('#rp').value);
    const rows = tanks.map((t) => {
      const brim = $('#rbrim-' + t.id).checked;
      const b = rv($('#rb-' + t.id).value);
      let a = rv($('#ra-' + t.id).value);
      if (brim && !isFinite(a)) a = t.maxMm;
      const bL = Core.litres(t, b), aL = brim ? t.capacity : Core.litres(t, a);
      $('#rbL-' + t.id).textContent = isFinite(bL) ? 'curve: ' + fi(bL) + ' L' + (b < t.pipeMm ? ' · below pipe' : '') : 'dip before filling';
      if (isFinite(aL)) $('#raL-' + t.id).textContent = (brim ? 'brim: ' : 'curve: ') + fi(aL) + ' L';
      return { t, b, a, bL, aL, brim };
    });
    if (rows.length > 1) {
      const d = rows.map((r) => (isFinite(r.aL) && isFinite(r.bL) ? Math.max(0, r.aL - r.bL) : NaN));
      const sum = d[0] + d[1];
      rows.forEach((r, i) => { r.p = isFinite(sum) && sum > 0 ? (pumped * d[i]) / sum : NaN; });
    } else rows[0].p = pumped;
    const ok = rows.every((r) => isFinite(r.bL) && isFinite(r.p)) && isFinite(pumped);
    if (ok) {
      $('#rf-check').innerHTML = rows.map((r) => {
        const exp = r.bL + r.p;
        return `<div class="cardhead"><div><div class="sub">${esc(r.t.name)}: before + pumped</div><div class="num" style="font-size:22px">${fi(exp)} L</div></div><div><div class="sub">${r.brim ? 'Brim' : 'Curve after'}</div><div class="num" style="font-size:22px">${isFinite(r.aL) ? fi(r.aL) + ' L' : '–'}</div></div><div style="text-align:right"><div class="sub">Difference</div><div class="num" style="font-size:22px;color:#F2B48C">${isFinite(r.aL) ? pm(r.aL - exp) + ' L' : '–'}</div></div></div>`;
      }).join('') + '<div class="sub">This difference is what the tank-curve fit learns from.</div>';
    } else if (rows.length > 1) $('#rf-check').innerHTML = '<div class="sub">For both tanks, enter the depth before and after for each tank and the pump total.</div>';
    const price = Core.num($('#rprice').value);
    $('#rtotal').textContent = isFinite(price) && isFinite(pumped) ? 'Total ' + f(price * pumped, 2) + ' €' : '';
    return { rows, pumped, price, ok };
  }

  // RANGE
  let rangeBuilt = false, rangeMode = 'round', rangeSpeed = 'now', rangeEng = null;
  R.range = () => {
    const v = $('#v-range');
    if (!rangeBuilt) {
      v.innerHTML = `<div class="top back"><button class="iconbtn" aria-label="Back" data-act="go" data-v="helm">${IC.back}</button><div><div class="title">Range &amp; fuel stations</div><div class="sub" id="range-sub"></div></div></div>
        <div id="range-dyn"></div>
        <div class="mapbox" style="height:40vh;min-height:240px;margin-top:10px"><div id="map-range" class="map"></div></div>
        <div class="note" id="range-status"></div>
        <div id="range-route"></div>
        <div class="card" id="range-opts" style="gap:10px"><div class="cardhead"><div class="h">Settings</div></div>
          <div class="optrow"><span class="lbl">Engines</span><div class="chips" id="range-eng"></div></div>
          <div class="optrow"><span class="lbl">Speed</span><div class="chips" id="range-spd"></div></div>
          <div class="optrow"><span class="lbl">Distance</span><div class="chips" id="range-seg"></div></div>
          <div class="optrow"><span class="lbl">Area</span><div class="chips" id="range-area"></div></div>
          <div class="optrow"><span class="lbl">Start</span><div class="chips" id="range-start"></div></div>
        </div>
        <div class="note" id="range-note"></div>`;
      getMap('range').on('click', rangeTap).on('contextmenu', (ev) => setRangeStart(ev.latlng.lat, ev.latlng.lng)); rangeBuilt = true;
    }
    if (!rangeEng) rangeEng = S().active ? S().active.mode : 'both';
    renderRange();
  };
  function renderRange() {
    const s = S(), lv = Core.live, eco = Core.economy();
    const nowKn = lv.sogAvg >= 2 && lv.sogAvg <= 40 ? lv.sogAvg : 7;
    const ecoKn = eco ? eco.best.kn : 6.5;
    const kn = rangeSpeed === 'eco' ? ecoKn : nowKn, alt = rangeSpeed === 'eco' ? nowKn : ecoKn;
    const r = Core.range(rangeEng, kn), r2 = Core.range(rangeEng, alt);
    $('#range-sub').textContent = s.tanks.map((t) => t.name + ' ' + fi(Core.usable(t.id).usable) + ' L usable').join(' · ');
    $('#range-seg').innerHTML = `<button class="chip ${rangeMode === 'round' ? 'on' : ''}" data-act="range-mode" data-m="round">Out &amp; back</button><button class="chip ${rangeMode === 'one' ? 'on' : ''}" data-act="range-mode" data-m="one">One way</button>`;
    const ar = s.settings.rangeArea;
    $('#range-area').innerHTML = [['water', 'Open water'], ['fairway', 'Fairways'], ['circle', 'Circle']].map(([k, l]) => `<button class="chip ${ar === k ? 'on' : ''}" data-act="range-area" data-a="${k}">${l}</button>`).join('');
    const nmv = (x) => (x ? (rangeMode === 'round' ? x.round : x.oneWay) : NaN);
    $('#range-eng').innerHTML = Core.MODES.map((m) => `<button class="chip ${m === rangeEng ? 'on' : ''}" data-act="range-eng" data-m="${m}">${MODE_SHORT[m]}</button>`).join('');
    $('#range-spd').innerHTML = `<button class="chip ${rangeSpeed === 'now' ? 'on' : ''}" data-act="range-speed" data-s="now">${f(nowKn)} kn ${lv.sogAvg >= 2 ? '(now)' : ''}</button><button class="chip ${rangeSpeed === 'eco' ? 'on' : ''}" data-act="range-speed" data-s="eco">${f(ecoKn)} kn (economy)</button>`;
    $('#range-dyn').innerHTML = `
      ${!r ? '<div class="warn">Dip both tanks once (Tanks → Log dip) to see the range.</div>' : `
      <div class="card dark" style="margin-top:4px"><div class="cardhead"><div><div class="sub">${rangeMode === 'round' ? 'Turn back before' : 'Reach'}</div><div class="num" style="font-size:30px">${fi(nmv(r))} NM</div><div class="sub">${f(r.lpnm)} L/NM at ${f(kn)} kn</div></div><div style="text-align:right;max-width:170px" class="sub">${rangeEng === 'both' ? 'Limited by ' + esc(Core.tank(r.limit).name) + ' tank' + (isFinite(r.otherNm) ? ` (other lasts ${fi(rangeMode === 'round' ? r.otherNm / 2 : r.otherNm)} NM)` : '') : 'Only the ' + esc(Core.tank(rangeEng).name) + ' tank is used'}<br>Dashed: ${fi(nmv(r2))} NM at ${f(alt)} kn</div></div></div>`}`;
    $('#range-note').textContent = `Green pins = boat fuel stations, white = fuel station by the water (tap for price, distance and fuel needed). Usable fuel excludes what lies below the suction pipe. Open water avoids land and water shallower than the ${f(s.settings.draftM)} m draft limit (100 m grid); Fairways follows marked fairway lines. Planning aid only — wind and sea add to consumption.`;
    const m = maps.range; m._over.clearLayers(); clearRoute();
    const man = s.settings.rangeStart;
    const c = man ? [man.lat, man.lon] : lv.fix ? [lv.fix.lat, lv.fix.lon] : null;
    $('#range-start').innerHTML = `<button class="chip ${man ? '' : 'on'}" data-act="range-start-gps">${lv.fix ? 'Boat (GPS)' : 'GPS – no position'}</button>
      ${man ? '<button class="chip on" data-act="range-start-gps">Chosen point ✕</button>' : '<span class="sub" style="align-self:center">or long-press the map</span>'}`;
    rangeCtx = { r, r2, kn, alt, c, nmv, err: null };
    drawStations();
    if (!allStations().length) $('#range-dyn').insertAdjacentHTML('afterbegin', `<div class="warn">No fuel stations loaded yet.<div class="btnrow" style="padding:8px 0 0 0"><button class="btn small grow dark" data-act="fuel-update">Load fuel stations from OpenStreetMap</button></div><div class="sub" id="fuel-out"></div></div>`);
    if (!r) return;
    if (!c) { rangeCtx.err = 'nostart'; setRangeStatus('No GPS position. Long-press the map (or tap it and choose "Start from here") to set a start point.'); return; }
    L.marker(c, { icon: man ? startIcon() : boatIcon(lv.fix ? lv.fix.heading || 0 : 0), interactive: false, zIndexOffset: 1000 }).addTo(m._over);
    m.invalidateSize(); m.fitBounds(L.latLng(c).toBounds(Math.max(nmv(r), nmv(r2) || 0) * 1852 * 2.1));
    const area = s.settings.rangeArea;
    const circles = (why) => {
      L.circle(c, { radius: nmv(r) * 1852, color: '#1F5675', weight: 2, fillColor: '#1F5675', fillOpacity: 0.18, interactive: false }).addTo(m._over);
      if (r2) L.circle(c, { radius: nmv(r2) * 1852, color: '#1F5675', weight: 2, dashArray: '6 5', fill: false, interactive: false }).addTo(m._over);
      setRangeStatus(why ? why + ' Showing straight-line circles.' : 'Straight-line circles.');
    };
    if (area === 'circle') return circles('');
    const token = ++rangeToken;
    setRangeStatus('Calculating ' + (area === 'water' ? 'reachable water' : 'reachable fairways') + '…');
    Sea.compute(area, c[0], c[1], nmv(r) * 1852, (r2 ? nmv(r2) : 0) * 1852, s.settings.draftM).then((res) => {
      if (token !== rangeToken) return;
      if (res.error) {
        rangeCtx.err = res.error;
        return circles(whyText(res.error));
      }
      if (res.mode === 'water' && res.img) {
        const cv = document.createElement('canvas'); cv.width = res.img.w; cv.height = res.img.h;
        cv.getContext('2d').putImageData(new ImageData(res.img.buf, res.img.w, res.img.h), 0, 0);
        L.imageOverlay(cv.toDataURL(), res.img.bounds, { opacity: 1, interactive: false, className: 'sea-overlay' }).addTo(m._over);
      }
      if (res.mode === 'fairway') {
        const rnd = rangeRenderer || (rangeRenderer = L.canvas({ padding: 0.3 }));
        const toLines = (a) => a.map((q) => [[q[0], q[1]], [q[2], q[3]]]);
        if (res.segs.far.length) L.polyline(toLines(res.segs.far), { color: '#4F8FB0', weight: 3, opacity: 0.8, renderer: rnd, interactive: false }).addTo(m._over);
        if (res.segs.near.length) L.polyline(toLines(res.segs.near), { color: '#13212F', weight: 4, renderer: rnd, interactive: false }).addTo(m._over);
      }
      const lo = r2 && nmv(r2) < nmv(r) ? alt : kn, hi = lo === kn ? alt : kn;
      setRangeStatus((area === 'water' ? 'Dark = reachable at ' + f(lo) + ' kn, light = also at ' + f(hi) + ' kn' : 'Black = fairways reachable at ' + f(lo) + ' kn, blue = also at ' + f(hi) + ' kn') +
        ` · draft limit ${f(s.settings.draftM)} m · ${f(res.ms / 1000)} s. Tap the map for a route.`);
    }).catch((e) => { if (token === rangeToken) circles('Calculation failed (' + e.message + ').'); });
  }
  let rangeToken = 0, rangeCtx = null, rangeRenderer = null, routeLayer = null, lastTap = null;
  // ---- fuel stations (OpenStreetMap + your own) and price history ----
  const allStations = () => (Sea.stations || []).concat(S().userStations || []);
  const lastPrice = (id) => { const p = (S().stationPrices || {})[id]; return p && p.length ? p[p.length - 1] : null; };
  const ageTxt = (t) => { const d = (Date.now() - t) / 86400000; return d < 1 ? 'today' : d < 14 ? Math.round(d) + ' d ago' : d < 60 ? Math.round(d / 7) + ' wk ago' : Math.round(d / 30) + ' mo ago'; };
  function nearestStation(lat, lon, maxM) {
    let best = null, bd = Infinity;
    allStations().forEach((st) => { const d = Core.haversine([lat, lon], [st.lat, st.lon]); if (d < bd) { bd = d; best = st; } });
    return best && bd <= maxM ? { st: best, m: bd } : null;
  }
  const PUMP = '<path d="M7 21V6.5A1.5 1.5 0 0 1 8.5 5h6A1.5 1.5 0 0 1 16 6.5V21M5.5 21h12M9 8.5h5v3.5H9zM16 10l2.4 1.6a1 1 0 0 1 .4.8V17a1.2 1.2 0 0 0 2.4 0v-6.2l-2.3-2.6" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>';
  function fuelIcon(st, zoom) {
    if (zoom < 11) return L.divIcon({ className: 'fuel-pin', iconSize: [24, 24], iconAnchor: [12, 12], html: `<svg width="24" height="24" viewBox="0 0 24 24" style="filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.35))"><circle cx="12" cy="12" r="10.5" fill="${st.near ? '#fff' : '#0E6B3A'}" stroke="${st.near ? '#0E6B3A' : '#fff'}" stroke-width="2"/><g transform="translate(3.6 3.4) scale(.7)">${st.near ? PUMP.replace(/#fff/g, '#0E6B3A') : PUMP}</g></svg>` });
    const lp = lastPrice(st.id), w = 64;
    const tag = lp ? `<div style="margin-bottom:1px;padding:1px 6px;border-radius:9px;background:#fff;border:1.5px solid #0E6B3A;color:#0E6B3A;font:700 12px 'Barlow Semi Condensed',Barlow,sans-serif;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.3)">${f(lp.price, 2)} €</div>` : '';
    const h = lp ? 66 : 46;   // price tag sits above the pin, the tip marks the station
    const fill = st.near ? '#fff' : '#0E6B3A', pump = st.near ? PUMP.replace(/#fff/g, '#0E6B3A') : PUMP;
    return L.divIcon({ className: 'fuel-pin', iconSize: [w, h], iconAnchor: [w / 2, h - 1], html: `<div style="display:flex;flex-direction:column;align-items:center;width:${w}px">${tag}
      <svg width="36" height="46" viewBox="0 0 36 46" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))"><path d="M18 45C18 45 3 28.5 3 17.5a15 15 0 0 1 30 0C33 28.5 18 45 18 45Z" fill="${fill}" stroke="${st.near ? '#0E6B3A' : '#fff'}" stroke-width="2.5"/><g transform="translate(6.5 5)">${pump}</g></svg></div>` });
  }
  let stationLayer = null, openStation = null;

  function drawStations() {
    const m = maps.range; if (!m) return;
    if (stationLayer) m.removeLayer(stationLayer);
    stationLayer = L.layerGroup().addTo(m);
    const z = m.getZoom();
    allStations().forEach((st) => { const mk = L.marker([st.lat, st.lon], { icon: fuelIcon(st, z), title: st.name, zIndexOffset: 500 }).on('click', () => stationCard(st)).addTo(stationLayer); mk._st = st; });
    if (!m._fuelZoom) { m._fuelZoom = true; m.on('zoomend', () => { if (!stationLayer) return; const zz = m.getZoom(); stationLayer.eachLayer((mk) => mk._st && mk.setIcon(fuelIcon(mk._st, zz))); }); }
  }

  async function stationCard(st) {
    openStation = st; clearRoute();
    const lp = lastPrice(st.id), area = S().settings.rangeArea;
    const info = [st.operator && st.operator !== st.name ? esc(st.operator) : '', st.fuels && st.fuels.length ? esc(st.fuels.join(', ').replace(/_/g, ' ')) : '', st.hours ? esc(st.hours) : ''].filter(Boolean).join(' · ');
    const head = `<div class="cardhead"><div><div class="h">${esc(st.name)}</div><div class="sub">${info || (st.user ? 'your own station' : 'OpenStreetMap')}</div>${st.near ? '<div class="sub" style="color:#B8470F">Fuel station by the water — not marked as a boat fuel station in OpenStreetMap; check before relying on it.</div>' : ''}</div>
      <div style="text-align:right"><div class="num" style="font-size:20px">${lp ? f(lp.price, 3) + ' €/L' : '–'}</div><div class="sub">${lp ? (lp.src === 'refuel' ? 'you paid ' : 'seen ') + ageTxt(lp.t) : 'no price yet'}</div></div></div>`;
    const btns = `<div class="btnrow" style="padding:0"><button class="btn small grow" data-act="price-seen">Log price seen</button>${st.user ? '<button class="btn small" data-act="del-station">Delete</button>' : ''}</div>`;
    const box = $('#range-route');
    box.innerHTML = `<div class="card">${head}<div class="sub" id="st-route">Calculating route…</div>${btns}</div>`;
    const ctx = rangeCtx;
    if (!ctx || !ctx.r || !ctx.c) { $('#st-route').textContent = 'Set a start point to see the distance.'; return; }
    let nm = NaN, how = 'straight line';
    if (area !== 'circle' && !ctx.err && Sea.meta) {
      try { const res = await Sea.route(st.lat, st.lon, area); if (res && res.pts && res.pts.length > 1) { nm = res.m / 1852; how = area === 'water' ? 'over open water' : 'along fairways'; routeLayer = L.polyline(res.pts, { color: '#B8470F', weight: 4, dashArray: '8 6' }).addTo(maps.range); } } catch (e) { /* fall back */ }
    }
    if (!isFinite(nm)) nm = Core.haversine(ctx.c, [st.lat, st.lon]) / 1852;
    const fuel = nm * ctx.r.lpnm, ok = nm <= ctx.r.oneWay;
    const el = $('#st-route'); if (el && openStation === st) el.innerHTML = `${f(nm)} NM ${how} · ${fi(fuel)} L at ${f(ctx.kn)} kn · <b style="color:${ok ? '#1F6E5A' : '#A63A2A'}">${ok ? 'reachable' : 'beyond range'}</b>`;
  }
  const whyText = (e) => ({ nodata: 'No sea data downloaded yet (More → Sea data).', outside: 'The start point is outside the sea-data area.', land: 'The start point is on land or too far from water deeper than the draft limit — long-press the map at your harbour to choose a start point.', 'no fairway data': 'The sea data has no fairways.', nostart: 'No start point yet.' }[e] || e);
  const startIcon = () => L.divIcon({ className: 'boat-icon', iconSize: [22, 22], iconAnchor: [11, 11], html: '<svg width="22" height="22" viewBox="-11 -11 22 22"><circle r="8" fill="#B8470F" stroke="#fff" stroke-width="3"/><circle r="2.5" fill="#fff"/></svg>' });
  function setRangeStart(lat, lon) { S().settings.rangeStart = { lat: +lat.toFixed(5), lon: +lon.toFixed(5) }; Core.save(); toast('Start point set'); renderRange(); }
  const startBtn = '<div class="btnrow" style="padding:0"><button class="btn small grow" data-act="range-start-here">Start from here</button><button class="btn small grow" data-act="add-station">Add fuel station here</button></div>';
  function setRangeStatus(t) { const el = $('#range-status'); if (el) el.textContent = t; }
  function clearRoute() { if (routeLayer && maps.range) maps.range.removeLayer(routeLayer); routeLayer = null; const el = $('#range-route'); if (el) el.innerHTML = ''; }
  async function rangeTap(ev) {
    const s = S(), area = s.settings.rangeArea;
    lastTap = ev.latlng;
    clearRoute();
    const box = (msg) => { $('#range-route').innerHTML = `<div class="card"><div class="sub">${msg}</div>${startBtn}</div>`; };
    if (!rangeCtx || !rangeCtx.r) return box('Dip both tanks first to calculate a range.');
    if (area === 'circle') return box('Circle mode shows straight-line range only. Choose Open water or Fairways for routes.');
    if (rangeCtx.err) return box(whyText(rangeCtx.err));
    if (!Sea.meta) return box(whyText('nodata'));
    try {
      const res = await Sea.route(ev.latlng.lat, ev.latlng.lng, area);
      if (!res || !res.pts || res.pts.length < 2) {
        return box(area === 'water'
          ? 'No route there: the point is beyond the fuel range shown, or on land more than about 1 km from reachable water.'
          : 'No route there: tap within about 3 km of a fairway drawn on the map (black or blue).');
      }
      routeLayer = L.polyline(res.pts, { color: '#B8470F', weight: 4, dashArray: '8 6' }).addTo(maps.range);
      const nm = res.m / 1852, { r, kn, nmv } = rangeCtx;
      const fuel = nm * r.lpnm, okOne = nm <= r.oneWay, okRound = nm <= r.round;
      $('#range-route').innerHTML = `<div class="card"><div class="cardhead"><div><div class="sub">Route ${area === 'water' ? 'over open water' : 'along fairways'}</div><div class="num" style="font-size:24px">${f(nm)} NM</div></div>
        <div style="text-align:right"><div class="sub">Fuel at ${f(kn)} kn</div><div class="num" style="font-size:20px">${fi(fuel)} L one way · ${fi(2 * fuel)} L back</div></div></div>
        <div class="sub" style="color:${okRound ? '#1F6E5A' : okOne ? '#B8470F' : '#A63A2A'};font-weight:600">${okRound ? 'Enough fuel there and back.' : okOne ? 'Enough one way only — refuel there.' : 'Not enough fuel to get there.'}</div>${startBtn}</div>`;
    } catch (e) { toast('Route failed: ' + e.message); }
  }

  const seaInfo = (m) => `built ${dstr(Date.parse(m.built))}, depth: ${m.depthSource}, ${m.fairwayEdges} fairway segments, ${(Sea.stations || []).length} fuel stations, ${f((m.bytes || 0) / 1e6)} MB`;
  // MORE / SETTINGS
  R.more = () => {
    const s = S().settings;
    $('#v-more').innerHTML = `
      <div class="top"><div><div class="title">Settings</div><div class="sub">Maps, economy, range, backup</div></div></div>
      <div class="card" data-noi18n><div class="cardhead"><div class="h">Kieli / Language</div></div>
        <div class="seg" style="margin:0"><button class="${I18N.lang === 'fi' ? 'on' : ''}" data-act="lang" data-l="fi">Suomi</button><button class="${I18N.lang === 'en' ? 'on' : ''}" data-act="lang" data-l="en">English</button></div></div>
      <div class="card"><div class="cardhead"><div class="h">Base map</div></div>
        <div class="seg" style="margin:0"><button class="${s.base === 'traficom' ? 'on' : ''}" data-act="base" data-b="traficom">Traficom</button><button class="${s.base === 'osm' ? 'on' : ''}" data-act="base" data-b="osm">OSM</button><button class="${s.base === 'nls' ? 'on' : ''}" data-act="base" data-b="nls">NLS</button></div>
        <div class="check"><input type="checkbox" id="seamarks" ${s.seamarks ? 'checked' : ''} data-act="seamarks"><label for="seamarks">OpenSeaMap seamarks on top</label></div>
        <div class="field"><label for="tlayer">Traficom chart series</label><select id="tlayer" data-noi18n data-act="tlayer" style="height:44px;border-radius:10px;border:1px solid #D9D5C9;background:#fff;max-width:60%">${TRAFICOM_LAYERS.map((l) => `<option ${l === s.traficomLayer ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
        <button class="btn small" data-act="detect">Check Traficom service</button>
        <div class="sub" id="detect-out">Matrix: ${esc(s.traficomMatrix)}{z} · ${esc(s.traficomFormat)}</div>
        <div class="field"><label for="nlskey">NLS API key<small>free from Maanmittauslaitos; needed for the NLS map</small></label></div>
        <div class="inbox wide"><input id="nlskey" value="${esc(s.nlsKey)}" placeholder="paste key" data-act="nlskey"></div>
      </div>
      <div class="card"><div class="cardhead"><div class="h">Offline charts</div></div>
        <div class="sub">Saves Traficom chart tiles for the area shown on the Helm map (4 zoom levels deeper). Do this on Wi-Fi in the harbour.</div>
        <button class="btn small" data-act="offline">Save Helm map area for offline</button><div class="sub" id="offline-out"></div>
      </div>
      <div class="card"><div class="cardhead"><div class="h">Economy &amp; range</div></div>
        <div class="field"><label for="mincruise">Cruising from<small>slower = manoeuvring, never proposed</small></label><div class="inbox"><input id="mincruise" inputmode="decimal" value="${dv(s.minCruiseKn)}" data-act="setnum" data-k="minCruiseKn"><span>kn</span></div></div>
        <div class="field"><label for="effm">Efficient cruise margin<small>max extra fuel per NM vs the best</small></label><div class="inbox"><input id="effm" inputmode="decimal" value="${dv(s.effMarginPct)}" data-act="setnum" data-k="effMarginPct"><span>%</span></div></div>
        <div class="field"><label for="rpmstep">RPM rounding</label><div class="inbox"><input id="rpmstep" inputmode="decimal" value="${s.rpmStep}" data-act="setnum" data-k="rpmStep"><span>rpm</span></div></div>
      </div>
      <div class="card"><div class="cardhead"><div class="h">Ruler</div></div>
        <div class="seg" style="margin:0"><button class="${RUL() === 'cm' ? 'on' : ''}" data-act="ruler-unit" data-u="cm">Centimetres (0.5 cm)</button><button class="${RUL() === 'mm' ? 'on' : ''}" data-act="ruler-unit" data-u="mm">Millimetres</button></div>
        <div class="sub">Unit for dips, refuels, full-tank depth and suction-pipe height. Readings already saved are converted automatically. The tank polynomial keeps its own unit (Tanks → Polynomial).</div>
      </div>
      <div class="card"><div class="cardhead"><div class="h">Sea data for range</div></div>
        <div class="sub">Land, depth and fairways for Suomenlahti and Saaristomeri, built by the "Build sea data" workflow in your GitHub repository. Download once on Wi-Fi; it then works offline.</div>
        <div class="field"><label for="draft">Draft limit<small>avoid water shallower than this</small></label><div class="inbox"><input id="draft" inputmode="decimal" value="${dv(s.draftM)}" data-act="setnum" data-k="draftM"><span>m</span></div></div>
        <button class="btn small" data-act="sea-download">Download / update sea data</button>
        <div class="sub" id="sea-out">${Sea.meta ? 'Loaded: ' + seaInfo(Sea.meta) : 'Not downloaded yet.'}</div>
        <div class="cardhead" style="padding-top:8px"><div class="h">Fuel stations</div><div class="sub">${(Sea.stations || []).length} on the map${(S().userStations || []).length ? ' + ' + S().userStations.length + ' your own' : ''}</div></div>
        <div class="sub">Fetched from OpenStreetMap on this phone. Green = boat fuel station; white = ordinary fuel station within about 200 m of water (download the sea data first for this check).</div>
        <button class="btn small" data-act="fuel-update">Update fuel stations from OpenStreetMap</button><div class="sub" id="fuel-out"></div>
      </div>
      <div class="card"><div class="cardhead"><div class="h">Backup</div></div>
        <div class="sub">All data lives on this phone only. Export a backup now and then (also before reinstalling).</div>
        <div class="btnrow" style="padding:0"><button class="btn small grow" data-act="export">Export backup</button><label class="btn small grow" for="importf">Import backup</label><input type="file" id="importf" accept="application/json,.json" style="display:none" data-act="import"></div>
      </div>
      <div class="btnrow"><button class="btn small grow" data-act="check-update">Check for app update</button></div>
      <div class="note">Version 5.5 · Fuel stations © OpenStreetMap contributors · Wind data © Finnish Meteorological Institute (CC BY 4.0) · Chart data © Traficom, CC BY 4.0 — not quality-assured, not for navigation. Seamarks © OpenSeaMap, map © OpenStreetMap contributors, background map © Maanmittauslaitos.</div>`;
  };

  async function detectTraficom() {
    const out = $('#detect-out'); out.textContent = 'Checking…';
    try {
      const res = await fetch('https://julkinen.traficom.fi/rasteripalvelu/wmts?SERVICE=WMTS&REQUEST=GetCapabilities');
      const xml = new DOMParser().parseFromString(await res.text(), 'text/xml');
      const sets = [...xml.getElementsByTagName('TileMatrixSet')].filter((n) => n.parentNode && n.parentNode.nodeName.endsWith('Contents'));
      const pmset = sets.find((n) => /Pseudo-Mercator|3857|900913/i.test(n.getElementsByTagName('ows:Identifier')[0]?.textContent || ''));
      if (!pmset) throw new Error('no web-mercator matrix set');
      const id = pmset.getElementsByTagName('TileMatrix')[0].getElementsByTagName('ows:Identifier')[0].textContent;
      const prefix = id.replace(/\d+$/, '');
      const ly = [...xml.getElementsByTagName('Layer')].find((n) => (n.getElementsByTagName('ows:Identifier')[0]?.textContent || '') === S().settings.traficomLayer);
      const fmt = ly ? (ly.getElementsByTagName('Format')[0]?.textContent || 'image/png') : S().settings.traficomFormat;
      S().settings.traficomMatrix = prefix; S().settings.traficomFormat = fmt; Core.save(); refreshBaseLayers();
      out.textContent = 'OK — matrix ' + prefix + '{z}, ' + fmt + (ly ? '' : ' (layer name not found in service list)');
    } catch (e) {
      out.textContent = 'Could not read the service description (' + e.message + '). Defaults are used; if the chart stays blank, use OSM.';
    }
  }
  let offlineBusy = false;
  async function saveOffline() {
    if (offlineBusy) return; offlineBusy = true;
    const out = $('#offline-out'), m = maps.helm;
    if (!m) { out.textContent = 'Open the Helm screen once first.'; offlineBusy = false; return; }
    const b = m.getBounds(), z0 = Math.max(8, m.getZoom()), z1 = Math.min(16, z0 + 4);
    const tiles = [];
    for (let z = z0; z <= z1; z++) {
      const p1 = m.project(b.getNorthWest(), z).divideBy(256).floor(), p2 = m.project(b.getSouthEast(), z).divideBy(256).floor();
      for (let x = p1.x; x <= p2.x; x++) for (let y = p1.y; y <= p2.y; y++) tiles.push({ x, y, z });
    }
    if (tiles.length > 4000) { out.textContent = tiles.length + ' tiles is too many. Zoom the Helm map in a bit and try again.'; offlineBusy = false; return; }
    const tmpl = traficomUrl(), total = tiles.length;
    let done = 0, failed = 0;
    const work = async () => { while (tiles.length) { const t = tiles.pop(); try { await fetch(tmpl.replace('{z}', t.z).replace('{x}', t.x).replace('{y}', t.y), { mode: 'no-cors' }); } catch (e) { failed++; } done++; if (done % 20 === 0) out.textContent = 'Saved ' + done + ' / ' + total + ' tiles…'; } };
    out.textContent = 'Saving ' + total + ' tiles…';
    await Promise.all([work(), work(), work(), work()]);
    out.textContent = 'Done: ' + (done - failed) + ' of ' + total + ' tiles saved' + (failed ? ' (' + failed + ' failed)' : '') + '.';
    offlineBusy = false;
  }

  function loadSheet() {
    const last = S().settings.lastLoad || 'normal';
    sheet(`<h3>Load on board</h3><p>Helps the app learn how load changes consumption.</p><div class="list">${['light', 'normal', 'full'].map((l) => `<button class="item" data-act="start-with-load" data-l="${l}"><span class="main"><b>${LOAD_LABEL[l]}</b><span>${LOAD_HINT[l]}</span></span>${l === last ? '<span class="right"><span class="sub">last used</span></span>' : ''}</button>`).join('')}</div>`);
  }

  // ---------- actions ----------
  const RPMS = []; for (let r = 700; r <= 2800; r += 100) RPMS.push(r);
  let sheetUnit = 'mm', dipKindSel = 'check', delDipFn = null, delDipOne = [];
  function readCleanTable() {
    S().hull.clean = S().hull.clean.map((r, i) => { const a = $('#ch-r' + i), b = $('#ch-k' + i); return [a ? Core.num(a.value) : r[0], b ? Core.num(b.value) : r[1]]; });
  }
  const A = {
    'go': (el) => go(el.dataset.v),
    'sheet-close': closeSheet,
    'confirm-ok': () => { closeSheet(); if (confirmFn) confirmFn(); confirmFn = null; },
    'center': () => { follow = true; const lv = Core.live; if (lv.fix) maps.helm.setView([lv.fix.lat, lv.fix.lon], Math.max(maps.helm.getZoom(), 13)); else toast('Waiting for GPS…'); },
    'start-trip': () => {
      if (!('geolocation' in navigator)) return toast('This browser has no GPS access.');
      if (Core.needsPreDip()) {
        const first = !S().events.length;
        sheet(`<h3>Dip before departure?</h3><p>${first ? 'No dip recorded yet. A dip before departure lets the app follow the fuel levels and measure consumption.' : 'The tanks have not been dipped since the last trip. A dip now makes the next consumption measurement exact.'}</p>
          <div class="btnrow"><button class="btn grow" data-act="predip-skip">Skip</button><button class="btn primary" data-act="predip">Dip tanks</button></div>`);
        return;
      }
      loadSheet();
    },
    'predip-skip': () => { if (current !== 'helm') go('helm'); loadSheet(); },
    'predip': () => { closeSheet(); go('predip'); },
    'start-with-load': async (el) => {
      closeSheet();
      if (current !== 'helm') go('helm');
      await Core.startTrip('both', el.dataset.l); follow = true; trackCache = []; helmTrack.setLatLngs([]); renderHelmDyn(); toast('Trip started (' + LOAD_LABEL[el.dataset.l].toLowerCase() + ' load). Set RPM when you settle on a cruise.');
    },
    'load-sheet': () => sheet(`<h3>Load on board</h3><div class="list">${['light', 'normal', 'full'].map((l) => `<button class="item" data-act="set-load" data-l="${l}"><span class="main"><b>${LOAD_LABEL[l]}</b><span>${LOAD_HINT[l]}</span></span>${S().active && S().active.load === l ? '<span class="right"><span class="num">✓</span></span>' : ''}</button>`).join('')}</div>`),
    'set-load': (el) => { if (S().active) { S().active.load = el.dataset.l; S().settings.lastLoad = el.dataset.l; Core.save(); } closeSheet(); renderHelmDyn(); },
    'trip-load': (el) => { Core.setTripLoad(el.dataset.id, el.dataset.l); toast('Load updated — curves refitted'); R.trip(); },
    'pause': () => { Core.setPaused(!S().active.paused); renderHelmDyn(); },
    'mode-sheet': () => sheet(`<h3>Engines running</h3><p>Switch when you start or stop an engine. A stopped engine uses no fuel.</p><div class="list">${Core.MODES.map((m) => `<button class="item" data-act="set-mode" data-m="${m}"><span class="main"><b>${MODE_LABEL[m]}</b></span>${S().active && S().active.mode === m ? '<span class="right"><span class="num">✓</span></span>' : ''}</button>`).join('')}</div>`),
    'set-mode': (el) => { Core.setMode(el.dataset.m); closeSheet(); renderHelmDyn(); toast(MODE_LABEL[el.dataset.m]); },
    'rpm-sheet': () => {
      const cur = S().active && S().active.rpm;
      sheet(`<h3>Engine RPM</h3><p>Same RPM on both engines. It stays set until you change it.</p>
        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:12px 16px 0 16px">${RPMS.map((r) => `<button class="chip ${r === cur ? 'on' : ''}" data-act="set-rpm" data-r="${r}">${r}</button>`).join('')}</div>
        <div class="card"><div class="field"><label for="rpm-custom">Other</label><div class="inbox"><input id="rpm-custom" inputmode="numeric"><span>rpm</span></div><button class="btn small" data-act="set-rpm-custom">Set</button></div></div>
        <div class="btnrow"><button class="btn grow" data-act="set-rpm" data-r="">Clear RPM</button></div>`);
    },
    'set-rpm': (el) => { Core.setRpm(el.dataset.r ? +el.dataset.r : null); closeSheet(); renderHelmDyn(); },
    'set-rpm-custom': () => { const r = Math.round(Core.num($('#rpm-custom').value)); if (!(r > 300 && r < 5000)) return toast('Enter RPM between 300 and 5000'); Core.setRpm(r); closeSheet(); renderHelmDyn(); },
    'end-trip': () => confirmSheet('End this trip?', 'The trip is saved and you can dip the tanks next.', 'End trip', async () => { const tr = await Core.stopTrip(); go('tripend', { id: tr.id }); setTimeout(() => Wind.processPending(windDone), 2000); }),
    'save-dips': () => {
      let n = 0; const rough = $('#dip-rough').checked;
      S().tanks.forEach((t) => { const mm = rv($('#dip-' + t.id).value); if (isFinite(mm) && mm >= 0) { Core.addDip(t.id, mm, rough, undefined, 'after'); n++; } });
      toast(n ? 'Dip saved. Consumption curves updated.' : 'Trip saved without a dip.');
      go('trips');
    },
    'save-predip': () => {
      let n = 0; const rough = $('#dip-rough').checked;
      S().tanks.forEach((t) => { const mm = rv($('#dip-' + t.id).value); if (isFinite(mm) && mm >= 0) { Core.addDip(t.id, mm, rough, undefined, 'before'); n++; } });
      if (!n) return toast('Enter at least one depth, or skip');
      toast('Dip saved'); go('helm'); loadSheet();
    },
'idle-start-sheet': () => sheet(`<h3>Idle run</h3><p>Engine running without moving, e.g. to charge the batteries. Which engine?</p><div class="list">${Core.MODES.map((m) => `<button class="item" data-act="idle-start" data-m="${m}"><span class="main"><b>${MODE_LABEL[m]}</b></span></button>`).join('')}</div>`),
    'idle-start': (el) => { closeSheet(); S().settings.lastIdleMode = el.dataset.m; Core.startIdle(el.dataset.m); renderHelmDyn(); toast('Idle run started'); },
    'idle-stop': () => { const tr = Core.stopIdle(); renderHelmDyn(); toast(tr ? 'Idle run saved: ' + dur(tr.hours) : 'Idle run under a minute — not saved'); },
    'ir-add': () => idleSheet(null),
    'ir-edit': (el) => { const tr = S().trips.find((t) => t.id === el.dataset.id); if (tr) idleSheet(tr); },
    'ir-mode': (el) => { idleMode = el.dataset.m; segOn(el); },
    'ir-save': () => {
      const start = readWhen('ir-start'), h = (Core.num($('#ir-h').value) || 0) + (Core.num($('#ir-min').value) || 0) / 60;
      if (!(h > 0 && h <= 24)) return toast('Enter the duration (up to 24 h)');
      if (start + h * 3600000 > Date.now() + 300000) return toast('The idle run cannot end in the future');
      const o = { start, hours: h, mode: idleMode };
      if (idleEdit) Core.updateIdle(idleEdit, o); else { Core.addIdle(o); S().settings.lastIdleMode = idleMode; }
      closeSheet(); toast(idleEdit ? 'Saved' : 'Idle run added'); (R[current] || R.log)();
    },
    'ir-del': () => { const id = idleEdit; confirmSheet('Delete this idle run?', 'Levels and consumption are recalculated without it.', 'Delete', async () => { await Core.deleteTrip(id); (R[current] || R.log)(); }); },
    'ir-del-row': (el) => confirmSheet('Delete this idle run?', 'Levels and consumption are recalculated without it.', 'Delete', async () => { await Core.deleteTrip(el.dataset.id); (R[current] || R.log)(); }),
    'manual-new': () => go('tripform', {}),
    'manual-edit': (el) => go('tripform', { id: el.dataset.id }),
    'mt-mode': (el) => { mtMode = el.dataset.m; segOn(el); mtCalc(); },
    'mt-load': (el) => { mtLoad = el.dataset.l; segOn(el); mtCalc(); },
    'mt-save': (el) => {
      const c = mtCalc(), start = readWhen('mt-start');
      if (!c.ok || !(c.nm <= 500) || c.h > 48) return toast('Enter the distance and the time under way');
      if (c.nm / c.h > 40) return toast('Average speed over 40 kn — check the values');
      if (start + c.h * 3600000 > Date.now() + 300000) return toast('The trip cannot end in the future');
      const o = { start, hours: c.h, distNm: c.nm, mode: mtMode, load: mtLoad, name: $('#mt-name').value.trim() };
      const tr = el.dataset.id ? Core.updateManualTrip(el.dataset.id, o) : Core.addManualTrip(o);
      toast(el.dataset.id ? 'Saved' : 'Trip added');
      go('trip', { id: tr.id });
    },
    'open-trip': (el) => go('trip', { id: el.dataset.id }),
    'rename-trip': (el) => { const tr = S().trips.find((t) => t.id === el.dataset.id); tr.name = $('#trip-name').value.trim() || tr.name; Core.save(); toast('Saved'); R.trip(); },
    'del-trip': (el) => confirmSheet('Delete this trip?', 'Its track, speed and RPM log are removed. This cannot be undone.', 'Delete', async () => { await Core.deleteTrip(el.dataset.id); go('trips'); }),
    'cp-add': () => { cpEdit = null; consPointSheet(null); },
    'cp-edit': (el) => { const fq = Core.findConsPoint(el.dataset.id); if (!fq) return; cpEdit = fq.q.id; consPointSheet(fq.q); },
    'cp-save': () => {
      const kn = Core.num($('#cp-kn').value), l = Core.num($('#cp-l').value);
      if (!(kn >= 1 && kn <= 25)) return toast('Enter a speed between 1 and 25 kn');
      if (!(l > 0 && l < 30)) return toast('Enter the fuel use in L/NM');
      const series = cpEdit ? Core.findConsPoint(cpEdit).series : curveMode;
      if (S().cons.pts[series].some((q) => q.id !== cpEdit && Math.abs(q.kn - kn) < 0.05)) return toast('There is already a point at this speed');
      if (cpEdit) Core.updateConsPoint(cpEdit, kn, l); else Core.addConsPoint(series, kn, l);
      closeSheet(); R.curve();
    },
    'cp-del': () => confirmSheet('Delete this point?', 'Suggested fits are recalculated without it. The curve in use does not change until you use a new fit.', 'Delete', () => { Core.deleteConsPoint(cpEdit); R.curve(); }),
    'cp-use': (el) => { const x = Core.consSuggestions(curveMode).list[+el.dataset.i]; if (!x) return; Core.setConsBase(curveMode, x.model); toast('Base curve updated'); R.curve(); },
    'cp-default': () => confirmSheet('Use the default formula?', 'The base curve goes back to the default formula. Your points stay in the list.', 'Use default', () => { Core.setConsBase(curveMode, null); R.curve(); }),
    'idle-save': () => {
      const v = {}; for (const t of S().tanks) { v[t.id] = Core.num($('#idle-' + t.id).value); if (!(v[t.id] >= 0.2 && v[t.id] <= 10)) return toast('Enter idle use between 0.2 and 10 L/h'); }
      const C = S().cons;
      if (Math.abs(v.port - C.idle.port) < 1e-9 && Math.abs(v.stbd - C.idle.stbd) < 1e-9) return toast('No change');
      Core.setConsIdle(v.port, v.stbd); toast('Idle use saved'); R.curve();
    },
    'cp-chart': () => { cpChart = !cpChart; R.curve(); },
    'cons-review': () => consProposalSheet(),
    'cons-accept': () => { if (Core.acceptCons()) toast('New consumption curve in use'); closeSheet(); R.curve(); },
    'cons-reject': () => { Core.rejectCons(); closeSheet(); toast('Kept the current curve'); R.curve(); },
    'cons-hist': () => { consHistOpen = !consHistOpen; R.curve(); },
    'cons-restore': (el) => confirmSheet('Restore this curve?', 'The current curve is kept in the list so you can switch back.', 'Restore', () => { Core.restoreCons(+el.dataset.i); R.curve(); }),
    'curve-tab': (el) => { curveTab = el.dataset.t; R.curve(); },
    'curve-mode': (el) => { curveMode = el.dataset.m; R.curve(); },
    'metric': (el) => { curveMetric = el.dataset.m; R.curve(); },
    'hull-period': (el) => { hullPeriod = +el.dataset.i; R.curve(); },
    'hull-clean': () => confirmSheet('Hull cleaned today?', 'A new comparison period starts from today. Earlier periods stay viewable.', 'Mark cleaned', () => { Core.addCleaning(); hullPeriod = undefined; R.curve(); }),
    'ch-add': () => { readCleanTable(); S().hull.clean.push([NaN, NaN]); R.curve(); },
    'ch-del': (el) => { readCleanTable(); S().hull.clean.splice(+el.dataset.i, 1); R.curve(); },
    'ch-save': () => {
      readCleanTable();
      const rows = S().hull.clean.filter((r) => isFinite(r[0]) && isFinite(r[1])).sort((a, b) => a[0] - b[0]);
      if (rows.length < 2) return toast('Enter at least two rows');
      S().hull.clean = rows; S().hull.cleanSample = false; Core.save(); toast('Clean-hull table saved'); R.curve();
    },
    'tank-sel': (el) => { tankSel = el.dataset.t; R.tanks(); },
    'hist-toggle': () => { histOpen = !histOpen; R.tanks(); },
    'sug-chart': () => { sugChart = !sugChart; R.tanks(); },
    'dip-sheet': () => {
      // default type: right after a trip (within 6 h, no dip since) it is "after trip", otherwise "separate"
      const lastEnd = S().trips.reduce((m, tr) => Math.max(m, tr.end || 0), 0);
      dipKindSel = Date.now() - lastEnd < 6 * 3600000 && Core.needsPreDip() ? 'after' : 'check';
      sheet(`<h3>Log dip</h3><p>Ruler depth. Litres come from the tank curve. Leave a tank empty if you did not dip it.</p>
        <div class="card">${S().tanks.map((t) => `<div class="field"><label for="sd-${t.id}" style="color:${t.color};font-weight:600">${esc(t.name)}<small id="sdL-${t.id}"> </small></label><div class="inbox"><input id="sd-${t.id}" inputmode="decimal" data-sdip="${t.id}" placeholder="${predDepth(t)}"><span>${RUL()}</span></div></div>`).join('')}
        ${roughBox('sd-rough')}
        <div class="seg" style="margin:0">${[['after', 'After trip'], ['before', 'Before trip'], ['check', 'Separate']].map(([k, l]) => `<button class="${dipKindSel === k ? 'on' : ''}" data-act="sd-kind" data-k="${k}">${l}</button>`).join('')}</div>
        ${whenField('sd-when')}</div>
        <div class="btnrow"><button class="btn grow" data-act="sheet-close">Cancel</button><button class="btn primary" data-act="save-dip">Save dip</button></div>`);
      setTimeout(() => { const i = $('#sd-' + tankSel); if (i) i.focus(); }, 100);
    },
    'sd-kind': (el) => { dipKindSel = el.dataset.k; el.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el)); },
    'save-dip': () => {
      const t0 = readWhen('sd-when'), rough = $('#sd-rough').checked;
      if (t0 > Date.now() + 300000) return toast('The time is in the future');
      let n = 0, low = false;
      S().tanks.forEach((t) => { const mm = rv($('#sd-' + t.id).value); if (isFinite(mm) && mm >= 0) { Core.addDip(t.id, mm, rough, t0, dipKindSel); n++; if (mm < t.pipeMm) low = true; } });
      if (!n) return toast('Enter the depth in ' + RUL());
      closeSheet();
      toast(low ? 'Below suction pipe — engine may draw air' : 'Dip saved', low ? 4000 : 2800);
      (R[current] || R.tanks)();
    },
    'edit-tank': () => {
      const t = Core.tank(tankSel), byL = t.pipeL !== null && t.pipeL !== undefined;
      sheet(`<h3>Edit ${esc(t.name)} tank</h3>
        <div class="card">
          <div class="field"><label for="et-name">Name</label><div class="inbox wide" style="width:50%"><input id="et-name" value="${esc(t.name)}"></div></div>
          <div class="field"><label for="et-cap">Capacity</label><div class="inbox"><input id="et-cap" inputmode="decimal" value="${dv(t.capacity)}"><span>L</span></div></div>
          <div class="field"><label for="et-max">Full-tank depth<small>ruler reading when full</small></label><div class="inbox"><input id="et-max" inputmode="decimal" value="${rn(t.maxMm)}"><span>${RUL()}</span></div></div>
          <div class="field"><label for="et-pipe">Suction pipe ends at<small>depth on the ruler</small></label><div class="inbox"><input id="et-pipe" inputmode="decimal" value="${byL ? '' : rn(t.pipeMm)}"><span>${RUL()}</span></div></div>
          <div class="field"><label for="et-pipeL">…or unusable litres<small>leave empty to use the depth</small></label><div class="inbox"><input id="et-pipeL" inputmode="decimal" value="${byL ? dv(t.pipeL) : ''}"><span>L</span></div></div>
        </div>
        <div class="btnrow"><button class="btn grow" data-act="sheet-close">Cancel</button><button class="btn primary" data-act="save-tank">Save</button></div>`);
    },
    'save-tank': () => {
      const t = Core.tank(tankSel);
      const cap = Core.num($('#et-cap').value), mx = rv($('#et-max').value), pmm = rv($('#et-pipe').value), pL = Core.num($('#et-pipeL').value);
      if (!(cap > 0) || !(mx > 0)) return toast('Check capacity and full-tank depth');
      t.name = $('#et-name').value.trim() || t.name; t.capacity = cap; t.maxMm = mx;
      if (isFinite(pL)) t.pipeL = pL; else { t.pipeL = null; t.pipeMm = isFinite(pmm) ? pmm : 0; }
      Core.refit(); Core.save(); closeSheet(); toast('Tank saved'); R.tanks();
    },
    'base-sheet': () => { tfTab = 'poly'; go('tankfit'); },
    'tf-tab': (el) => { tfTab = el.dataset.t; R.tankfit(); },
    'tf-mode': (el) => { tfReadInputs(); tfState().mode = el.dataset.m; Core.save(); R.tankfit(); },
    'tf-edit': (el) => { tfReadInputs(); tfState().edit = el.dataset.t; Core.save(); R.tankfit(); },
    'tf-areas': (el) => {
      tfReadInputs(); const set = tfSet(), n = +el.dataset.n;
      set.bounds = set.bounds.slice(0, n - 1); while (set.bounds.length < n - 1) set.bounds.push(NaN);
      if (n > 1 && set.bounds.some((b) => !isFinite(b))) { const s = TankFit.suggestBounds(tfPoints(set, tfTank()), n, tfTank().maxMm, [0, tfTank().maxMm]); if (s) { set.bounds = s.bounds; set.methods = s.methods; } }
      Core.save(); R.tankfit();
    },
    'tf-suggest': (el) => {
      tfReadInputs(); const set = tfSet(), tk = tfTank(); el.disabled = true; el.textContent = 'Calculating…';
      setTimeout(() => {
        const s = TankFit.suggestBounds(tfPoints(set, tk), set.bounds.length + 1, tk.maxMm, [0, tk.maxMm]);
        if (s) { set.bounds = s.bounds; set.methods = s.methods; Core.save(); R.tankfit(); } else { toast('Too few readings to split into areas'); R.tankfit(); }
      }, 30);
    },
    'tf-method': (el) => { tfReadInputs(); tfSet().methods[+el.dataset.k] = el.dataset.m; Core.save(); tfResults(); },
    'tf-apply': () => {
      tfReadInputs(); const set = tfSet(), tk = tfTank();
      const pts = tfPoints(set, tk), top = Math.max(tk.maxMm, ...pts.map((p) => p[0]));
      const e = TankFit.evaluate(pts, tfBounds(set), set.methods, top, [0, top]);
      if (!e.ok || !e.mono) return toast('This fit cannot be used');
      const cur = S().curve.model, key = tfKey();
      const model = key === 'shared' ? { shared: e.model } : Object.assign({}, cur && !cur.shared ? cur : {}, { [key]: e.model });
      confirmSheet('Use this tank curve?', 'Tank levels, consumption curves and range are recalculated with it. The current curve stays under Earlier curves.', 'Use', () => { Core.setTableModel(model); toast('New tank curve in use'); go('tanks'); });
    },
    'base-unit': (el) => { sheetUnit = el.dataset.u; el.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el)); },
    'save-base': () => {
      const co = [0, 1, 2, 3, 4].map((i) => Number(String($('#bc' + i).value).replace(',', '.').trim()));
      if (co.some((x) => !isFinite(x))) return toast('A coefficient is not a number');
      const t = Core.tank(tankSel);
      const full = Core.polyEval(co, sheetUnit === 'cm' ? t.maxMm / 10 : t.maxMm);
      Core.setBase(co, sheetUnit); closeSheet();
      toast('Saved. Full-tank depth gives ' + fi(full) + ' L (capacity ' + fi(t.capacity) + ' L)', 4500); go('tanks');
    },
    'add-anchor': () => { kpEdit = null; kpTank = tankSel; pointSheet(); },
    'kp-edit': (el) => { const x = S().anchors.find((q) => q.id === el.dataset.id); if (!x) return; kpEdit = x.id; kpTank = x.tank; pointSheet(x); },
    'kp-tank': (el) => { kpTank = el.dataset.t; segOn(el); },
    'save-anchor': () => {
      const mm = rv($('#ac-mm').value), Lv = Core.num($('#ac-L').value);
      if (!isFinite(mm) || !isFinite(Lv)) return toast('Enter both values');
      const p = kpEdit ? Core.updateAnchor(kpEdit, kpTank, mm, Lv) : Core.addAnchor(kpTank, mm, Lv);
      closeSheet(); (R[current] || R.tanks)(); if (p && kpTank !== 'both') proposalSheet();
    },
    'kp-del': () => confirmSheet('Delete this point?', 'Suggested fits are recalculated without it. The curve in use does not change until you use a new fit.', 'Delete', () => { Core.deleteAnchor(kpEdit); (R[current] || R.tanks)(); }),
    'kp-more': () => { kpOpen = !kpOpen; R.tanks(); setTimeout(() => { const c = $('#kp-card'); if (c) c.scrollIntoView({ block: 'start' }); }, 30); },
    'kp-review': () => { if (current !== 'tanks') go('tanks'); setTimeout(() => { const c = $('#kp-card'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); },
    'kp-dismiss': (el) => { S().curve.kpDismissed = el.dataset.k + '#' + Core.pointsKey(el.dataset.k); Core.save(); R.tanks(); },
    'kp-use': (el) => {
      const key = el.dataset.k, t = Core.tank(tankSel), sg = fitSuggestions(key, t)[+el.dataset.i]; if (!sg) return;
      confirmSheet('Use this tank curve?', 'Tank levels, consumption curves and range are recalculated with it. The current curve stays under Earlier curves.', 'Use', () => {
        const cur = S().curve.model;
        const model = key === 'shared' ? { shared: sg.model } : Object.assign({}, cur && !cur.shared ? cur : {}, { [key]: sg.model });
        const T = tfState(); T.mode = key === 'shared' ? 'shared' : 'separate'; if (key !== 'shared') T.edit = key;
        Object.assign(T.sets[key], { bounds: sg.bounds.slice(), methods: sg.methods.slice() });
        Core.setTableModel(model); toast('New tank curve in use'); R.tanks();
      });
    },
    'del-anchor': (el) => { Core.deleteAnchor(el.dataset.id); R.tanks(); },
    'proposal': proposalSheet,
    'accept-curve': () => { if (Core.acceptCurve()) toast('New tank curve in use'); closeSheet(); R.tanks(); },
    'reject-curve': () => { Core.rejectCurve(); closeSheet(); toast('Kept the current curve'); R.tanks(); },
    'restore-curve': (el) => confirmSheet('Restore this curve?', 'The current curve is kept in the list so you can switch back.', 'Restore', () => { Core.restoreCurve(+el.dataset.i); R.tanks(); }),
    'del-event': (el) => confirmSheet('Delete this reading?', 'Levels, consumption curves and the tank-curve fit are recalculated without it.', 'Delete', () => { Core.deleteEvent(el.dataset.id); (R[current] || R.tanks)(); }),
    'log-all': (el) => { logAll[el.dataset.k] = !logAll[el.dataset.k]; R.log(); },
    'del-dips': (el) => {
      const ids = el.dataset.ids.split(','), ev = ids.map((id) => S().events.find((e) => e.id === id)).filter(Boolean);
      if (ev.length === 1) return A['del-event']({ dataset: { id: ids[0] } });
      const rm = (list) => { list.forEach((e) => Core.deleteEvent(e.id)); closeSheet(); R.log(); };
      delDipFn = rm.bind(null, ev); delDipOne = ev;
      sheet(`<h3>Delete dip</h3><p>Levels, consumption curves and the tank-curve fit are recalculated without it.</p>
        <div class="btnrow" style="flex-wrap:wrap">${ev.map((e, i) => `<button class="btn grow" data-act="del-dip-one" data-i="${i}">${esc(Core.tank(e.tank).name)} only</button>`).join('')}</div>
        <div class="btnrow"><button class="btn grow" data-act="sheet-close">Cancel</button><button class="btn primary" data-act="del-dip-all">Delete both</button></div>`);
    },
    'del-dip-all': () => { if (delDipFn) delDipFn(); },
    'del-dip-one': (el) => { const e = delDipOne[+el.dataset.i]; if (e) { Core.deleteEvent(e.id); closeSheet(); R.log(); } },
    'log-period': (el) => { logPeriod = el.dataset.p === 'all' ? 'all' : +el.dataset.p; R.log(); },
    'del-refuel': (el) => confirmSheet('Delete this refuel?', 'Levels, consumption curves and the tank-curve fit are recalculated without it.', 'Delete', () => {
      S().events.filter((e) => (e.group || e.id) === el.dataset.k).forEach((e) => Core.deleteEvent(e.id)); R.log();
    }),
    'refuel-sel': (el) => { refuelSel = el.dataset.t; S().settings.lastRefuelSel = refuelSel; Core.save(); R.refuel(); },
    'refuel-src': (el) => { const i = $('#rst'); if (i) refuelStName = i.value; refuelSrc = el.dataset.s; el.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el)); const keep = {}; document.querySelectorAll('#v-refuel input').forEach((x) => { keep[x.id] = x.type === 'checkbox' ? x.checked : x.value; }); R.refuel(); Object.entries(keep).forEach(([k, v]) => { const x = document.getElementById(k); if (x) { if (x.type === 'checkbox') x.checked = v; else x.value = v; } }); refuelCalc(); },
    'save-refuel': () => {
      const c = refuelCalc();
      if (!c.ok) return toast(c.rows.length > 1 ? 'Enter depth before and after for both tanks and the pump total' : 'Enter the depth before filling and the litres pumped');
      const rough = $('#rf-rough').checked;
      const stName = refuelSrc === 'station' && $('#rst') ? $('#rst').value.trim() : '';
      const src = { type: refuelSrc, name: stName };
      const tw = readWhen('rwhen'); if (tw > Date.now() + 300000) return toast('The time is in the future');
      const p = Core.addRefuel(c.rows.map((r) => ({ tank: r.t.id, beforeMm: r.b, pumped: r.p, afterMm: r.a, brim: r.brim })), c.price, rough, tw, src);
      refuelStName = stName;
      if (isFinite(c.price)) {
        S().settings.price = String(c.price); Core.save();
        // a known station by name gets the price in its history
        const st = stName && allStations().find((x) => x.name.toLowerCase() === stName.toLowerCase());
        if (st) { Core.addStationPrice(st.id, c.price, 'refuel', c.pumped, tw); setTimeout(() => toast('Price saved for ' + st.name), 1500); }
      }
      go(backOf.refuel || 'tanks');
      if (p) proposalSheet(); else toast('Refuel saved');
    },
    'range-mode': (el) => { rangeMode = el.dataset.m; renderRange(); },
    'range-speed': (el) => { rangeSpeed = el.dataset.s; renderRange(); },
    'range-eng': (el) => { rangeEng = el.dataset.m; renderRange(); },
    'check-update': async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
        toast('Checking… the app reloads if a new version is found');
        setTimeout(() => location.reload(), 2500);
      } catch (e) { toast('Update check failed: ' + e.message); }
    },
    'ruler-unit': (el) => { S().settings.rulerUnit = el.dataset.u; Core.save(); toast('Ruler in ' + (el.dataset.u === 'cm' ? 'centimetres' : 'millimetres')); R.more(); },
    'price-seen': () => {
      const st = openStation; if (!st) return;
      sheet(`<h3>Price at ${esc(st.name)}</h3><p>Diesel price you saw, for example on the price board.</p><div class="card"><div class="field"><label for="ps-p">Price</label><div class="inbox"><input id="ps-p" inputmode="decimal"><span>€/L</span></div></div></div><div class="btnrow"><button class="btn grow" data-act="sheet-close">Cancel</button><button class="btn primary" data-act="save-price-seen">Save</button></div>`);
      setTimeout(() => $('#ps-p').focus(), 100);
    },
    'save-price-seen': () => { const p = Core.num($('#ps-p').value); if (!(p > 0 && p < 10)) return toast('Enter the price in €/L'); Core.addStationPrice(openStation.id, p, 'seen'); closeSheet(); toast('Price saved'); drawStations(); stationCard(openStation); },
    'add-station': () => {
      if (!lastTap) return;
      sheet(`<h3>Add fuel station</h3><p>A fuel station missing from the map, at the point you tapped.</p><div class="card"><div class="field"><label for="ns-n">Name</label><div class="inbox wide" style="width:60%"><input id="ns-n" placeholder="e.g. Harbour fuel"></div></div></div><div class="btnrow"><button class="btn grow" data-act="sheet-close">Cancel</button><button class="btn primary" data-act="save-station">Add</button></div>`);
    },
    'save-station': () => { const st = Core.addUserStation(lastTap.lat, lastTap.lng, $('#ns-n').value.trim()); closeSheet(); toast('Fuel station added'); drawStations(); stationCard(st); },
    'del-station': () => confirmSheet('Delete this station?', 'Its price history is kept in backups but the marker is removed.', 'Delete', () => { Core.deleteUserStation(openStation.id); openStation = null; clearRoute(); drawStations(); }),
    'fuel-update': async () => {
      const out = $('#fuel-out'), btns = document.querySelectorAll('[data-act=fuel-update]'); btns.forEach((b) => { b.disabled = true; });
      try {
        const r = await Sea.fetchStations((t) => { if (out) out.textContent = t; });
        const msg = `${r.total} fuel stations: ${r.marine} boat fuel stations, ${r.near} by the water`;
        if (out) out.textContent = msg; toast(msg, 4000);
        if (current === 'range') renderRange(); else if (current === 'more') R.more();
      } catch (e) { if (out) out.textContent = 'Could not reach OpenStreetMap (' + e.message + '). Try again on Wi-Fi.'; }
      btns.forEach((b) => { b.disabled = false; });
    },
    'range-start-here': () => { if (lastTap) setRangeStart(lastTap.lat, lastTap.lng); },
    'range-start-gps': () => { S().settings.rangeStart = null; Core.save(); toast('Start from the boat GPS position'); renderRange(); },
    'range-area': (el) => { S().settings.rangeArea = el.dataset.a; Core.save(); renderRange(); },
    'sea-download': async () => {
      const out = $('#sea-out'), btn = $('[data-act=sea-download]'); btn.disabled = true;
      try { const m = await Sea.download(S().settings.seaUrl || 'sea/', (t) => { out.textContent = t; }); out.textContent = 'Ready: ' + seaInfo(m); toast('Sea data ready'); }
      catch (e) { out.textContent = 'Failed: ' + e.message; }
      btn.disabled = false;
    },
    'lang': (el) => { if (el.dataset.l === I18N.lang) return; I18N.setLang(el.dataset.l); S().settings.lang = el.dataset.l; Core.save(); setTimeout(() => location.reload(), 150); },
    'base': (el) => { S().settings.base = el.dataset.b; if (el.dataset.b === 'nls' && !S().settings.nlsKey) toast('Add your NLS API key below; until then OSM is shown.'); Core.save(); refreshBaseLayers(); R.more(); },
    'detect': detectTraficom,
    'offline': saveOffline,
    'export': async () => {
      const data = await Core.exportAll();
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'fuel-log-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
  };

  document.addEventListener('click', (e) => {
    const nav = e.target.closest('#nav button'); if (nav) return go(nav.dataset.go);
    const el = e.target.closest('[data-act]');
    if (!el || el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
    const fn = A[el.dataset.act]; if (fn) { e.preventDefault(); fn(el); }
  });
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.dip) dipPreview();
    if (el.dataset.rf) refuelCalc();
    if (el.dataset.mt) mtCalc();
    if (el.dataset.tf !== undefined || el.dataset.tfb !== undefined) { clearTimeout(tfTimer); tfTimer = setTimeout(() => { tfReadInputs(); Core.save(); tfResults(); }, 350); }
    if (el.dataset.sdip) { const t = Core.tank(el.dataset.sdip), mm = rv(el.value), Lv = Core.litres(t, mm); $('#sdL-' + t.id).textContent = isFinite(Lv) ? '= ' + fi(Lv) + ' L' + (mm < t.pipeMm ? ' · below suction pipe!' : '') : ' '; }
  });
  document.addEventListener('change', async (e) => {
    const el = e.target, act = el.dataset.act, s = S().settings;
    if (el.dataset.rf) refuelCalc();
    if (el.id === 'tf-full') { tfReadInputs(); tfSet().full = el.checked; Core.save(); tfResults(); }
    if (act === 'seamarks') { s.seamarks = el.checked; Core.save(); refreshBaseLayers(); }
    if (act === 'tlayer') { s.traficomLayer = el.value; Core.save(); refreshBaseLayers(); }
    if (act === 'nlskey') { s.nlsKey = el.value.trim(); Core.save(); refreshBaseLayers(); }
    if (act === 'setnum') {
      const v = Core.num(el.value), k = el.dataset.k;
      const ok = { reservePct: v >= 0 && v < 90, minCruiseKn: v >= 1 && v <= 20, effMarginPct: v >= 0 && v <= 100, rpmStep: v >= 1 && v <= 500, draftM: v >= 0 && v <= 10, planArriveL: v >= 0 && v <= 800, planExtraL: v >= 0 && v <= 300 }[k];
      if (ok) { s[k] = v; Core.save(); toast('Saved'); } else { toast('Value out of range'); el.value = s[k]; }
    }
    if (act === 'import' && el.files[0]) {
      try { await Core.importAll(JSON.parse(await el.files[0].text())); toast('Backup imported'); go('helm'); }
      catch (err) { toast('Import failed: ' + err.message); }
    }
  });

  // ---------- start ----------
  const windDone = () => { if (current === 'trip' || current === 'curve' || current === 'trips') R[current](); };
  window.addEventListener('online', () => Wind.processPending(windDone));
  Core.init().then(() => {
    Sea.init().then(() => { if (current === 'range' && maps.range) drawStations(); });
    setTimeout(() => Wind.processPending(windDone), 3000);
    go('helm');
    Core.resumeIfActive();
    if (!S().active && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((p) => { Core.live.fix = { lat: p.coords.latitude, lon: p.coords.longitude, t: Date.now(), heading: 0 }; Core.live.acc = p.coords.accuracy; updateHelmLive(); }, () => {}, { enableHighAccuracy: true, timeout: 20000 });
    }
  });
  if ('serviceWorker' in navigator) {
    // reload once when a new version takes over, so updates show up without manual tricks
    let reloaded = false;
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded && !(S() && S().active)) { reloaded = true; location.reload(); } });
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => reg.update()).catch(() => {}));
  }
  window.FuelLogDebug = { go, Core, Sea, Wind, proposalSheet, consProposalSheet, maps };
})();
