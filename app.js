/* Popcorn Fuel Log v2 — screens. Depends on Leaflet (L) and core.js (Core). */
'use strict';

(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f = (x, d = 1) => (isFinite(x) ? Number(x).toFixed(d) : '–');
  const fi = (x) => (isFinite(x) ? Math.round(x).toString() : '–');
  const pm = (x, d = 0) => (isFinite(x) ? (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d) : '–');
  const dur = (h) => { if (!isFinite(h)) return '–'; const m = Math.round(h * 60); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'; };
  const clock = (ms) => { const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h + ':' + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0'); };
  const dstr = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const dtstr = (t) => new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const tstr = (t) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const S = () => Core.state;
  // ruler unit: values are stored in mm, shown and typed in the chosen unit (default cm)
  const RUL = () => (S() && S().settings.rulerUnit) || 'cm';
  const rv = (v) => { const x = Core.num(v); return isFinite(x) ? (RUL() === 'cm' ? x * 10 : x) : NaN; };
  const rn = (mm) => (isFinite(mm) ? (RUL() === 'cm' ? (Math.round(mm / 5) * 5 / 10).toFixed(1).replace(/\.0$/, '') : String(Math.round(mm))) : '');
  const rs = (mm) => (isFinite(mm) ? rn(mm) + ' ' + RUL() : '–');
  const MODE_LABEL = { both: 'Both engines', port: 'Port only', stbd: 'Stbd only' };
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
  const NAV_OF = { helm: 'helm', tripend: 'helm', range: 'range', trips: 'trips', trip: 'trips', curve: 'curve', tanks: 'tanks', refuel: 'tanks', more: 'more' };
  function go(v, p = {}) {
    current = v; params = p;
    document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.id === 'v-' + v));
    document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === NAV_OF[v]));
    (R[v] || (() => {}))();
    $('#v-' + v).scrollTop = 0;
    Object.values(maps).forEach((m) => setTimeout(() => m.invalidateSize(), 50));
  }

  // ---------- shared fragments ----------
  function tankBar(t) {
    const u = Core.usable(t.id);
    const pct = (x) => Math.max(0, Math.min(100, (x / t.capacity) * 100)).toFixed(1);
    return `<div class="tankrow"><div class="name" style="color:${t.color}">${esc(t.name)}</div>
      <div class="bar" style="position:relative;overflow:visible">
        <div style="width:${pct(u.L)}%;background:${t.color};border-radius:6px"></div>
        <div title="unusable" style="position:absolute;left:0;top:0;height:12px;border-radius:6px 0 0 6px;width:${pct(u.dead)}%;background:repeating-linear-gradient(135deg,rgba(19,33,47,.6) 0 3px,rgba(255,255,255,.3) 3px 6px)"></div>
        <div title="reserve" style="position:absolute;top:-3px;height:18px;width:2px;background:#13212F;left:${pct(u.dead + u.reserve)}%"></div>
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
      <div class="sub">Hatched = below suction pipe · line = reserve</div>
      <div class="sub" id="helm-range"></div></div>`;
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
      <div class="note">${e.fromData ? 'From your logged trips' : 'Starting guess until you have trips with dips'} · cruising from ${S().settings.minCruiseKn} kn${src}.</div>`;
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
        <button class="mapchip" data-act="go" data-v="range">${IC.ring}Range</button>
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
    $('#helm-dyn').innerHTML = `
      ${lv.error ? `<div class="warn">GPS: ${esc(lv.error)}. Allow location for this app in Android settings.</div>` : ''}
      ${A && lv.gap ? '<div class="warn">GPS paused while the screen was off. The gap was filled with a straight line.</div>' : ''}
      ${A ? `<div class="btnrow" style="padding-top:10px"><button class="btn small grow" data-act="mode-sheet"><b id="h-mode">${MODE_LABEL[A.mode]}</b></button><button class="btn small grow dark" data-act="rpm-sheet">RPM&nbsp;<b id="h-rpm">${A.rpm || 'set'}</b></button><button class="btn small" data-act="load-sheet">${LOAD_LABEL[A.load || 'normal']}</button></div>` : ''}
      <div class="grid2">
        <div class="tile"><div class="lbl">Speed (SOG)</div><div class="val"><span class="num big" id="h-sog">${f(kn)}</span><span class="unit">kn</span></div><div class="hint" id="h-sogavg">avg ${f(lv.sogAvg)} kn</div></div>
        <div class="tile dark"><div class="lbl">Fuel per mile</div><div class="val"><span class="num big" id="h-lpnm">${kn >= 1 ? f(Core.lpnm(mode, kn)) : '–'}</span><span class="unit">L/NM</span></div><div class="hint" id="h-lpnm-h"></div></div>
        <div class="tile"><div class="lbl">Distance</div><div class="val"><span class="num mid" id="h-dist">${A ? f(A.distNm) : '–'}</span><span class="unit">NM</span></div></div>
        <div class="tile"><div class="lbl">Used, est.</div><div class="val"><span class="num mid" id="h-used">${A ? fi(Core.tripFuelTotal(A)) : '–'}</span><span class="unit">L</span></div><div class="hint" id="h-used-split"></div></div>
      </div>
      <div class="card" style="gap:4px">${ecoHtml(true)}</div>
      ${tankBars()}
      <div class="btnrow">
        ${A ? `<button class="btn" data-act="pause">${A.paused ? 'Resume' : 'Pause'}</button><button class="btn primary" data-act="end-trip">End trip &amp; dip tanks</button>`
            : '<button class="btn primary" data-act="start-trip">Start trip</button>'}
      </div>
      <div class="note">Keep the app open on screen while under way: Android pauses GPS for web apps when the screen is off. Set RPM whenever you change throttle — steady stretches teach the app your speed–RPM table and hull condition.</div>`;
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
      set('h-mode', MODE_LABEL[A.mode]); set('h-rpm', A.rpm || 'set');
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
  setInterval(() => { const A = S() && S().active; if (A && current === 'helm') $('#helm-sub').textContent = 'Trip ' + clock(Date.now() - A.start) + (A.paused ? ' · paused' : ''); }, 1000);

  // END TRIP
  R.tripend = () => {
    const tr = S().trips.find((t) => t.id === params.id);
    if (!tr) return go('helm');
    const bb = Core.tripBands(tr);
    const moving = tr.hours - bb.both[0] - bb.port[0] - bb.stbd[0];
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
          <div class="inbox"><input id="dip-${t.id}" inputmode="decimal" data-dip="${t.id}" placeholder="${RUL()}"><span>${RUL()}</span></div>
          <div style="flex:1;text-align:right"><div class="num" style="font-size:20px" id="dipL-${t.id}">– L</div><div class="sub" id="dipU-${t.id}"></div></div></div>`).join('')}
        ${roughBox('dip-rough')}
        <div id="dip-sum"></div>
      </div>
      <div class="btnrow"><button class="btn" data-act="go" data-v="trips">Skip dip</button><button class="btn primary" data-act="save-dips" data-id="${tr.id}">Save</button></div>
      <div class="note">No dip now? The trip still counts: the next dip measures all trips since the previous one together.</div>`;
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
      v.innerHTML = `<div class="top"><div><div class="title">Trips</div><div class="sub" id="trips-sub"></div></div></div>
        <div class="mapbox" style="height:38vh;min-height:220px"><div id="map-trips" class="map"></div><div class="maplegend" id="trips-legend" style="top:10px;bottom:auto"></div></div>
        <div id="trips-dyn"></div>`;
      getMap('trips'); tripsBuilt = true;
    }
    const trips = s.trips.slice().sort((a, b) => b.start - a.start);
    const vals = trips.map((t) => { const m = Core.tripMeasured(t); return m ? m.lpnm : Core.tripFuelTotal(t) / Math.max(0.1, t.distNm); });
    const br = breaks(vals);
    const totNm = trips.reduce((a, t) => a + t.distNm, 0), totL = trips.reduce((a, t) => a + Core.tripFuelTotal(t), 0);
    $('#trips-sub').textContent = `${trips.length} trips · ${fi(totNm)} NM · ~${fi(totL)} L`;
    $('#trips-legend').innerHTML = `<div style="font-weight:600;color:#4F5B66">L/NM</div><div class="row"><span class="sw" style="background:${RAMP[0]}"></span>&lt;${f(br[0])}<span class="sw" style="background:${RAMP[1]}"></span>–${f(br[1])}<span class="sw" style="background:${RAMP[2]}"></span>–${f(br[2])}<span class="sw" style="background:${RAMP[3]}"></span>&gt;${f(br[2])}</div>`;
    $('#trips-dyn').innerHTML = trips.length ? `<div class="list">${trips.map((t, i) => {
      const m = Core.tripMeasured(t);
      return `<button class="item" data-act="open-trip" data-id="${t.id}"><span class="stripe" style="background:${rampColor(vals[i], br)}"></span>
        <span class="main"><b>${esc(t.name)}</b><span>${dstr(t.start)} · ${f(t.distNm)} NM · ${dur(t.hours)}</span></span>
        <span class="right"><span class="num">${f(vals[i])} L/NM</span><span>${m ? (m.shared ? 'shared dip' : 'dipped') : 'estimate'}</span></span></button>`;
    }).join('')}</div>` : '<div class="empty">No trips yet. Start one from the Helm screen.</div>';
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
        <div class="mapbox" style="height:30vh;min-height:200px"><div id="map-trip" class="map"></div></div><div id="trip-dyn"></div>`;
      getMap('trip'); tripBuilt = true;
    }
    const est = Core.tripFuelTotal(tr), meas = Core.tripMeasured(tr), bb = Core.tripBands(tr);
    $('#trip-title').textContent = tr.name; $('#trip-sub').textContent = dtstr(tr.start) + '–' + tstr(tr.end);
    const smp = tr.samples || [];
    $('#trip-dyn').innerHTML = `
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
    if (pts.length > 1) {
      for (let i = 1; i < pts.length; i++) {
        const kn = pts[i][3];
        L.polyline([[pts[i - 1][0], pts[i - 1][1]], [pts[i][0], pts[i][1]]], { color: kn < 4 ? '#9CC3D5' : kn < 7 ? '#4F8FB0' : kn < 10 ? '#1F5675' : '#B8470F', weight: 4 }).addTo(m._over);
      }
      m.invalidateSize(); m.fitBounds(L.latLngBounds(pts.map((p) => [p[0], p[1]])), { padding: [20, 20] });
    }
  };

  // CHART helper
  function lineChart(series, opt) {
    const W = 340, H = 230, x0 = 40, x1 = 332, y0 = 200, y1 = 10;
    const X = (v) => x0 + ((v - opt.xMin) / (opt.xMax - opt.xMin)) * (x1 - x0);
    const Y = (v) => y0 - ((Math.min(Math.max(v, opt.yMin), opt.yMax) - opt.yMin) / (opt.yMax - opt.yMin)) * (y0 - y1);
    const path = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(opt.label)}">
      ${opt.yTicks.map((t) => `<line x1="${x0}" x2="${x1}" y1="${Y(t)}" y2="${Y(t)}" stroke="#ECE8DC"/><text x="${x0 - 6}" y="${Y(t) + 4}" font-size="11" fill="#4F5B66" text-anchor="end">${opt.yFmt(t)}</text>`).join('')}
      ${opt.xTicks.map((t) => `<text x="${X(t)}" y="216" font-size="11" fill="#4F5B66" text-anchor="middle">${opt.xFmt(t)}</text>`).join('')}
      <text x="${x1}" y="228" font-size="11" fill="#4F5B66" text-anchor="end">${esc(opt.xUnit)}</text>
      <line x1="${x0}" x2="${x1}" y1="${y0}" y2="${y0}" stroke="#4F5B66"/>
      ${(opt.vlines || []).map((v) => `<line x1="${X(v.x)}" x2="${X(v.x)}" y1="${y1}" y2="${y0}" stroke="${v.color}" stroke-width="2" stroke-dasharray="4 3"/>`).join('')}
      ${series.map((s) => (s.band ? `<path d="${s.band.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[2]).toFixed(1)).join(' ')} ${s.band.slice().reverse().map((p) => 'L' + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ')} Z" fill="${s.color}" opacity="0.16"/>` : '')).join('')}
      ${series.map((s) => (s.pts && s.pts.length ? `<path d="${path(s.pts)}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.5}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round"/>` : '')).join('')}
      ${series.map((s) => (s.dots || []).map((d) => `<circle cx="${X(d[0]).toFixed(1)}" cy="${Y(d[1]).toFixed(1)}" r="${d[2] || 4}" fill="${s.dotFill || s.color}" stroke="${s.dotStroke || '#fff'}" stroke-width="1.5"/>`).join('')).join('')}
      ${series.map((s) => (s.segs || []).map((g) => `<line x1="${X(g[0])}" y1="${Y(g[1])}" x2="${X(g[2])}" y2="${Y(g[3])}" stroke="${s.color}" stroke-width="1.5"/><circle cx="${X(g[2])}" cy="${Y(g[3])}" r="3.5" fill="#fff" stroke="${s.color}" stroke-width="1.5"/>`).join('')).join('')}
    </svg>`;
  }
  const niceMax = (v) => { const p = Math.pow(10, Math.floor(Math.log10(v || 1))); const m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; };

  // CURVE (consumption + hull)
  let curveTab = 'fuel', curveMetric = 'nm', curveMode = 'both', hullPeriod;
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
    const sp = []; for (let b = 2; b <= 16; b++) sp.push(Core.bandMid(b));
    const val = (lph, kn) => (nm ? lph / kn : lph);
    const band = sp.map((kn) => { const y = val(Core.lphTotal(mode, kn), kn), e = val(Core.lphSigma(mode, kn), kn); return [kn, Math.max(0, y - e), y + e]; });
    const hrs = fit.loggedH[mode];
    const series = [{ pts: sp.map((kn) => [kn, val(Core.lphTotal(mode, kn), kn)]), color: '#13212F', band,
      dots: sp.map((kn) => { const b = Core.bandOf(kn); return hrs[b] > 0.02 ? [kn, val(Core.lphTotal(mode, kn), kn), 3 + Math.sqrt(hrs[b]) * 1.5] : null; }).filter(Boolean) }];
    if (mode === 'both') {
      series.push({ pts: sp.map((kn) => [kn, val(Core.lphEng('port', 'both', kn), kn)]), color: '#A63A2A', width: 2 });
      series.push({ pts: sp.map((kn) => [kn, val(Core.lphEng('stbd', 'both', kn), kn)]), color: '#1F6E5A', width: 2 });
    }
    const yMax = niceMax(Math.max(...band.slice(0, 12).map((p) => p[2])) * 1.05);
    const kn = Core.live.sogKn;
    const chart = lineChart(series, { label: 'Fuel use against speed', xMin: 2, xMax: 17, yMin: 0, yMax, xTicks: [2, 4, 6, 8, 10, 12, 14, 16], yTicks: [0, 0.2, 0.4, 0.6, 0.8, 1].map((q) => q * yMax), xFmt: (v) => v, yFmt: (v) => (yMax <= 10 ? f(v) : fi(v)), xUnit: 'kn',
      vlines: [{ x: S().settings.minCruiseKn, color: '#C9C1AA' }].concat(kn >= 2 && kn <= 17 ? [{ x: kn, color: '#B8470F' }] : []) });
    const rows = []; for (let b = 1; b < Core.NB - 1; b++) if (hrs[b] > 0.02 || (b >= 4 && b <= 14)) rows.push(b);
    const xr = fit.x, cols = 'grid-template-columns:1.25fr 1fr 1fr 1fr .9fr .8fr';
    $('#curve-body').innerHTML = `
      <div class="chips" style="padding-top:10px">${Core.MODES.map((m) => `<button class="chip ${m === mode ? 'on' : ''}" data-act="curve-mode" data-m="${m}">${m === 'both' ? 'Both engines' : MODE_LABEL[m].replace(' only', ' solo')}</button>`).join('')}</div>
      <div class="seg" style="margin-top:10px"><button class="${nm ? 'on' : ''}" data-act="metric" data-m="nm">Litres per NM</button><button class="${nm ? '' : 'on'}" data-act="metric" data-m="h">Litres per hour</button></div>
      ${fit.nIntervals === 0 ? '<div class="warn">This is a starting guess, not your boat yet. It becomes your curve after a few trips with tank dips before and after.</div>' : ''}
      <div class="card" style="padding:12px 6px 8px 2px">${chart}
        <div class="sub" style="padding-left:30px">${mode === 'both' ? '<b style="color:#13212F">Total</b> · <b style="color:#A63A2A">port</b> · <b style="color:#1F6E5A">stbd</b> · ' : ''}shaded = uncertainty · dot size = hours · grey line = cruising from ${S().settings.minCruiseKn} kn</div>
      </div>
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
        ${s.hull.clean.map((r, i) => `<div class="field"><div class="inbox"><input inputmode="decimal" id="ch-r${i}" value="${isFinite(r[0]) ? r[0] : ''}" aria-label="RPM row ${i + 1}"><span>rpm</span></div><div class="inbox"><input inputmode="decimal" id="ch-k${i}" value="${isFinite(r[1]) ? r[1] : ''}" aria-label="Speed row ${i + 1}"><span>kn</span></div><button class="iconbtn" aria-label="Delete row" data-act="ch-del" data-i="${i}">${IC.x}</button></div>`).join('')}
        <div class="btnrow" style="padding:0"><button class="btn small grow" data-act="ch-add">Add row</button><button class="btn small primary" data-act="ch-save">Save table</button></div>
        <div class="sub">Speed with a clean hull, both engines, calm water. Enter at the start of the season.</div>
      </div>
      <div class="note">Wind, current and load move single stretches by a few percent; the weekly median shows the trend. A rising speed loss at the same RPM means growth on the hull or propellers.</div>`;
  }

  // TANKS
  let tankSel = 'port';
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
    series.push({ color: '#13212F', dots: s.anchors.filter((a) => a.tank === t.id).map((a) => [a.mm, a.L, 4.5]), dotFill: '#E9B44C', dotStroke: '#13212F' });
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
        <div class="tile"><div class="lbl">Now, est.</div><div class="num mid">${fi(u.L)} <span class="unit">L</span></div><div class="hint">${last ? 'dip ' + rs(last.mm) : 'no dip'}</div></div>
        <div class="tile dark"><div class="lbl">Usable</div><div class="num mid">${fi(u.usable)} <span class="unit">L</span></div><div class="hint">after pipe &amp; reserve</div></div>
        <div class="tile"><div class="lbl">Unusable</div><div class="num mid">${fi(u.dead)} <span class="unit">L</span></div><div class="hint">${byL ? 'set in litres' : 'below ' + rs(t.pipeMm)}</div></div>
      </div>
      <div class="card" style="gap:6px">${tankBar(t)}<div class="sub">Reserve ${s.settings.reservePct}% of usable capacity = ${fi(u.reserve)} L</div></div>
      <div class="btnrow"><button class="btn dark grow" data-act="dip-sheet">Log dip</button><button class="btn primary" data-act="go" data-v="refuel">Log refuel</button></div>
      ${p ? `<div class="card dark"><div class="cardhead"><div><div class="h">Improved tank curve available</div><div class="sub">From ${p.n} readings · error ${f(p.rmsBefore)} → ${f(p.rmsAfter)} L</div></div><button class="btn small" style="background:#fff;color:#13212F" data-act="proposal">Review</button></div></div>` : ''}
      <div class="card" style="padding:12px 6px 10px 2px">
        <div class="cardhead" style="padding-left:10px"><div class="h">Tank curve</div><div class="sub">${eqs.length} readings used</div></div>
        ${curveChart(t)}
        <div class="sub" style="padding-left:30px">grey dashed = your polynomial · solid = current curve · black ticks = refuels (before → after) · vertical = suction pipe</div>
        <div class="btnrow" style="padding:6px 10px 0 10px"><button class="btn small grow" data-act="base-sheet">Polynomial</button><button class="btn small grow" data-act="add-anchor">Known point</button></div>
      </div>
      ${s.curve.history.length ? `<div class="card" style="gap:0"><div class="cardhead"><div class="h">Earlier curves</div></div>${s.curve.history.map((h, i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #ECE8DC;gap:8px"><span class="sub">${dtstr(h.t)} · ${esc(h.note || '')}</span>${h.base ? '' : `<button class="btn small" data-act="restore-curve" data-i="${i}">Restore</button>`}</div>`).join('')}</div>` : ''}
      ${s.anchors.filter((a) => a.tank === t.id).length ? `<div class="card" style="gap:0"><div class="cardhead"><div class="h">Known points</div></div>${s.anchors.filter((a) => a.tank === t.id).map((a) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:14px"><span>${rs(a.mm)} = ${f(a.L)} L</span><button class="iconbtn" aria-label="Delete point" data-act="del-anchor" data-id="${a.id}">${IC.x}</button></div>`).join('')}</div>` : ''}
      <div class="card" style="gap:0"><div class="cardhead"><div class="h">Readings</div></div>
        ${ev.length ? ev.map((e) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #ECE8DC;font-size:14px;gap:6px"><span>${dtstr(e.t)} · ${e.type === 'refuel' ? 'refuel +' + f(e.pumped) + ' L' + (e.brim ? ' (brim)' : '') : 'dip'}${e.rough ? ' · <i>rough</i>' : ''}</span><span style="white-space:nowrap">${rs(e.mm)} = ${fi(Core.litres(t, e.mm))} L <button class="iconbtn" aria-label="Delete reading" data-act="del-event" data-id="${e.id}">${IC.x}</button></span></div>`).join('') : '<div class="sub">No readings yet.</div>'}
      </div>
      ${s.curve.sample ? '<div class="warn">The tank polynomial is a sample. Tap Polynomial to enter yours, and Edit tank for capacity and suction-pipe height.</div>' : ''}`;
  };
  function proposalSheet() {
    const p = S().curve.pending; if (!p) return;
    sheet(`<h3>Improved tank curve</h3><p>Fitted to ${p.n} readings (${p.nRefuel} refuels). It stays close to your polynomial except where the refuels disagree.</p>
      <div class="card" style="gap:6px">
        <div class="cardhead"><div class="sub">Error vs readings</div><div class="num" style="font-size:20px">${f(p.rmsBefore)} → ${f(p.rmsAfter)} L</div></div>
        ${S().tanks.map((t) => `<div class="cardhead"><div class="sub" style="color:${t.color};font-weight:600">${esc(t.name)}</div><div style="font-size:14px;text-align:right">moves up to ${f(p.maxShift[t.id])} L · level now ${pm(p.levelChange[t.id], 1)} L${p.ownCurve[t.id] ? ' · <b>own curve</b>' : ''}</div></div>`).join('')}
        ${p.monotonic ? '' : '<div class="warn" style="margin:6px 0 0 0">This fit would make litres fall with depth somewhere, so it cannot be used. Check the latest readings.</div>'}
      </div>
      ${S().tanks.map((t) => `<div class="card" style="padding:8px 4px 4px 0"><div class="sub" style="padding-left:12px;color:${t.color}">${esc(t.name)}: solid = current · orange dashed = proposed</div>${curveChart(t, { proposal: p })}</div>`).join('')}
      <div class="btnrow"><button class="btn grow" data-act="reject-curve">Keep current</button><button class="btn primary" data-act="accept-curve" ${p.monotonic ? '' : 'disabled'}>Use new curve</button></div>`);
  }

  // REFUEL
  let refuelSel = 'port';
  R.refuel = () => {
    const s = S();
    const tanks = refuelSel === 'both' ? s.tanks : [Core.tank(refuelSel)];
    const two = tanks.length > 1;
    $('#v-refuel').innerHTML = `
      <div class="top back"><button class="iconbtn" aria-label="Back" data-act="go" data-v="tanks">${IC.back}</button><div><div class="title">Log refuel</div><div class="sub">${dtstr(Date.now())}</div></div></div>
      <div class="seg"><button class="${refuelSel === 'port' ? 'on' : ''}" data-act="refuel-sel" data-t="port">${esc(s.tanks[0].name)}</button><button class="${refuelSel === 'stbd' ? 'on' : ''}" data-act="refuel-sel" data-t="stbd">${esc(s.tanks[1].name)}</button><button class="${refuelSel === 'both' ? 'on' : ''}" data-act="refuel-sel" data-t="both">Both</button></div>
      <div class="card">
        ${tanks.map((t) => `<div class="field"><label for="rb-${t.id}">${two ? esc(t.name) + ': ' : ''}Depth before<small id="rbL-${t.id}">dip before filling</small></label><div class="inbox"><input id="rb-${t.id}" inputmode="decimal" data-rf="1"><span>${RUL()}</span></div></div>`).join('')}
        <div class="field"><label for="rp">Litres from pump<small>${two ? 'one total, split by the dips' : 'from the pump display'}</small></label><div class="inbox"><input id="rp" inputmode="decimal" data-rf="1"><span>L</span></div></div>
        ${tanks.map((t) => `<div class="field"><label for="ra-${t.id}">${two ? esc(t.name) + ': ' : ''}Depth after<small id="raL-${t.id}">${two ? 'needed to split the total' : 'improves the tank curve'}</small></label><div class="inbox"><input id="ra-${t.id}" inputmode="decimal" data-rf="1"><span>${RUL()}</span></div></div>
          <div class="check"><input type="checkbox" id="rbrim-${t.id}" data-rf="1"><label for="rbrim-${t.id}">${two ? esc(t.name) + ' filled' : 'Filled'} to the brim (= ${fi(t.capacity)} L)</label></div>`).join('')}
        ${roughBox('rf-rough')}
      </div>
      <div class="card dark" id="rf-check"><div class="sub">Enter the readings to compare them with the tank curve.</div></div>
      ${(() => { const fx = Core.live.fix, ns = fx && nearestStation(fx.lat, fx.lon, 1000); return ns ? `<div class="note">At <b>${esc(ns.st.name)}</b> (${fi(ns.m)} m) — the price is saved to this station's history.</div>` : ''; })()}
      <div class="card"><div class="field"><label for="rprice">Price</label><div class="inbox"><input id="rprice" inputmode="decimal" value="${esc(s.settings.price)}" data-rf="1"><span>€/L</span></div></div><div class="sub" id="rtotal"></div></div>
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
      v.innerHTML = `<div class="top"><div><div class="title">Range</div><div class="sub" id="range-sub"></div></div></div>
        <div class="seg" id="range-seg"></div>
        <div class="seg" id="range-area" style="margin-top:8px"></div>
        <div id="range-start"></div>
        <div class="mapbox" style="height:40vh;min-height:240px;margin-top:8px"><div id="map-range" class="map"></div></div>
        <div class="note" id="range-status"></div>
        <div id="range-plan"></div>
        <div id="range-route"></div>
        <div id="range-dyn"></div>`;
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
    $('#range-seg').innerHTML = `<button class="${rangeMode === 'round' ? 'on' : ''}" data-act="range-mode" data-m="round">Out &amp; back</button><button class="${rangeMode === 'one' ? 'on' : ''}" data-act="range-mode" data-m="one">One way</button>`;
    const ar = s.settings.rangeArea;
    $('#range-area').innerHTML = [['water', 'Open water'], ['fairway', 'Fairways'], ['circle', 'Circle']].map(([k, l]) => `<button class="${ar === k ? 'on' : ''}" data-act="range-area" data-a="${k}">${l}</button>`).join('');
    const nmv = (x) => (x ? (rangeMode === 'round' ? x.round : x.oneWay) : NaN);
    $('#range-dyn').innerHTML = `
      <div class="chips" style="padding-top:10px">${Core.MODES.map((m) => `<button class="chip ${m === rangeEng ? 'on' : ''}" data-act="range-eng" data-m="${m}">${MODE_LABEL[m]}</button>`).join('')}</div>
      ${!r ? '<div class="warn">Dip both tanks once (Tanks → Log dip) to see the range.</div>' : `
      <div class="chips" style="padding-top:8px"><button class="chip ${rangeSpeed === 'now' ? 'on' : ''}" data-act="range-speed" data-s="now">At ${f(nowKn)} kn ${lv.sogAvg >= 2 ? '(now)' : ''}</button><button class="chip ${rangeSpeed === 'eco' ? 'on' : ''}" data-act="range-speed" data-s="eco">At ${f(ecoKn)} kn (economy)</button></div>
      <div class="card dark"><div class="cardhead"><div><div class="sub">${rangeMode === 'round' ? 'Turn back before' : 'Reach'}</div><div class="num" style="font-size:30px">${fi(nmv(r))} NM</div><div class="sub">${f(r.lpnm)} L/NM at ${f(kn)} kn</div></div><div style="text-align:right;max-width:170px" class="sub">${rangeEng === 'both' ? 'Limited by ' + esc(Core.tank(r.limit).name) + ' tank' + (isFinite(r.otherNm) ? ` (other lasts ${fi(rangeMode === 'round' ? r.otherNm / 2 : r.otherNm)} NM)` : '') : 'Only the ' + esc(Core.tank(rangeEng).name) + ' tank is used'}<br>Dashed: ${fi(nmv(r2))} NM at ${f(alt)} kn</div></div></div>`}
      <div class="note">Usable fuel excludes what lies below the suction pipe and your ${s.settings.reservePct}% reserve. Open water avoids land and water shallower than the ${f(s.settings.draftM)} m draft limit (100 m grid); Fairways follows marked fairway lines. Planning aid only — wind and sea add to consumption.</div>`;
    const m = maps.range; m._over.clearLayers(); clearRoute();
    const man = s.settings.rangeStart;
    const c = man ? [man.lat, man.lon] : lv.fix ? [lv.fix.lat, lv.fix.lon] : null;
    $('#range-start').innerHTML = `<div class="chips" style="padding-top:8px;align-items:center"><span class="sub">Start:</span>
      <button class="chip ${man ? '' : 'on'}" data-act="range-start-gps">${lv.fix ? 'Boat (GPS)' : 'GPS – no position'}</button>
      ${man ? '<button class="chip on" data-act="range-start-gps">Chosen point ✕</button>' : '<span class="sub">or long-press the map</span>'}</div>`;
    rangeCtx = { r, r2, kn, alt, c, nmv, err: null };
    if (!r) return;
    drawStations(); renderPlanPanel();
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
        ` · draft limit ${f(s.settings.draftM)} m · ${(res.ms / 1000).toFixed(1)} s. Tap the map for a route.`);
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
  const fuelIcon = (known) => L.divIcon({ className: 'boat-icon', iconSize: [26, 26], iconAnchor: [13, 13], html: `<svg width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="12" fill="${known ? '#B8470F' : '#13212F'}" stroke="#fff" stroke-width="2"/><path d="M9 19V8.5c0-.8.6-1.5 1.5-1.5h3c.8 0 1.5.7 1.5 1.5V19M8 19h8M9.5 11h5M15 10.5l2 1.5v4.5a1 1 0 0 0 2 0V12l-2-2" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>` });
  let stationLayer = null, openStation = null;

  // ---------------- trip planner ----------------
  const plan = { on: false, dest: null, vias: [], speed: 'eco', customKn: 7, res: null, sel: 'cheapest', busy: false, layer: null, msg: '' };
  const NMm = 1852;
  const planKn = () => { const e = Core.economy(), lv = Core.live; if (plan.speed === 'eco') return e ? e.best.kn : 6.5; if (plan.speed === 'now') return lv.sogAvg >= 2 ? lv.sogAvg : 7; return plan.customKn; };
  const ptName = (p) => p.name || (f(p.lat, 3) + ', ' + f(p.lon, 3));
  function clearPlanLayer() { if (plan.layer && maps.range) maps.range.removeLayer(plan.layer); plan.layer = null; }
  function renderPlanPanel() {
    const box = $('#range-plan'); if (!box) return;
    if (!plan.on) { box.innerHTML = '<div class="btnrow" style="padding-top:6px"><button class="btn small grow dark" data-act="plan-open">Plan trip with refuelling</button></div>'; return; }
    const s = S().settings, e = Core.economy(), lv = Core.live;
    const startTxt = s.rangeStart ? 'chosen point' : (lv.fix ? 'boat (GPS)' : 'not set — long-press the map');
    box.innerHTML = `<div class="card">
      <div class="cardhead"><div class="h">Trip plan</div><button class="btn small" data-act="plan-close">Close</button></div>
      <div class="sub">Start: <b style="color:#13212F">${startTxt}</b></div>
      <div class="sub">Destination: <b style="color:#13212F">${plan.dest ? esc(ptName(plan.dest)) : 'tap the map or a fuel station'}</b>${plan.dest ? ' <button class="iconbtn" aria-label="Clear destination" data-act="plan-clear-dest">' + IC.x + '</button>' : ''}</div>
      ${plan.vias.map((v, i) => `<div class="sub">Stop-over ${i + 1}: <b style="color:#13212F">${esc(ptName(v))}</b> <button class="iconbtn" aria-label="Remove stop-over" data-act="plan-del-via" data-i="${i}">${IC.x}</button></div>`).join('')}
      <div class="seg" style="margin:0">
        <button class="${plan.speed === 'eco' ? 'on' : ''}" data-act="plan-speed" data-s="eco">Economy ${f(e ? e.best.kn : 6.5)} kn</button>
        <button class="${plan.speed === 'now' ? 'on' : ''}" data-act="plan-speed" data-s="now">Now ${f(lv.sogAvg >= 2 ? lv.sogAvg : 7)} kn</button>
        <button class="${plan.speed === 'custom' ? 'on' : ''}" data-act="plan-speed" data-s="custom">Other</button></div>
      ${plan.speed === 'custom' ? `<div class="field"><label for="plan-kn">Speed</label><div class="inbox"><input id="plan-kn" inputmode="decimal" value="${plan.customKn}" data-act="plan-kn"><span>kn</span></div></div>` : ''}
      <div class="field"><label for="plan-arrive">Fuel left at destination<small>both tanks, above the reserve</small></label><div class="inbox"><input id="plan-arrive" inputmode="decimal" value="${s.planArriveL ?? 50}" data-act="setnum" data-k="planArriveL"><span>L</span></div></div>
      <div class="field"><label for="plan-extra">Extra per refuel<small>on top of what the next leg needs</small></label><div class="inbox"><input id="plan-extra" inputmode="decimal" value="${s.planExtraL ?? 20}" data-act="setnum" data-k="planExtraL"><span>L</span></div></div>
      <div class="sub">Route: ${s.rangeArea === 'fairway' ? 'along fairways' : s.rangeArea === 'water' ? 'over open water' : 'straight lines (Circle mode)'} · ${MODE_LABEL[rangeEng || 'both']} · draft limit ${f(s.draftM)} m</div>
      <button class="btn primary" data-act="plan-calc" ${plan.dest && !plan.busy ? '' : 'disabled'}>${plan.busy ? 'Calculating…' : 'Calculate plan'}</button>
      <div class="sub" id="plan-msg">${esc(plan.msg)}</div>
      <div id="plan-out"></div></div>`;
    if (plan.res) renderPlanResults();
  }
  async function calcPlan() {
    const s = S().settings, ctxR = rangeCtx;
    if (!ctxR || !ctxR.c) { plan.msg = 'Set a start point first.'; return renderPlanPanel(); }
    if (S().tanks.some((t) => !Core.levelNow(t.id).known)) { plan.msg = 'Dip both tanks first.'; return renderPlanPanel(); }
    plan.busy = true; plan.res = null; plan.msg = 'Preparing…'; clearPlanLayer(); renderPlanPanel();
    try {
      const kn = planKn(), mode = rangeEng || 'both', lf = Core.loadFactor(s.lastLoad);
      const rate = {}; Core.ENG.forEach((e) => { rate[e] = (lf * Core.lphEng(e, mode, kn)) / kn; });
      const tanks = {}; Core.ENG.forEach((e) => { const u = Core.usable(e), tk = Core.tank(e); tanks[e] = { level: u.L, min: u.dead + u.reserve, cap: tk.capacity }; });
      const start = { lat: ctxR.c[0], lon: ctxR.c[1], name: 'Start' }, dest = plan.dest;
      const hv = (a, b) => Core.haversine([a.lat, a.lon], [b.lat, b.lon]);
      const chain = [start].concat(plan.vias, [dest]);
      let chainLen = 0; for (let i = 1; i < chain.length; i++) chainLen += hv(chain[i - 1], chain[i]);
      const cands = allStations().filter((st) => chain.every((c) => hv(c, st) > 300)).map((st) => { let det = Infinity; for (let i = 1; i < chain.length; i++) det = Math.min(det, hv(chain[i - 1], st) + hv(st, chain[i]) - hv(chain[i - 1], chain[i])); return { st, det }; })
        .filter((x) => x.det <= 0.4 * chainLen + 15000).sort((x, y) => x.det - y.det).slice(0, 12);
      const defPrice = Core.num(s.price) > 0 ? Core.num(s.price) : 1.95;
      const pts = chain.concat(cands.map((x) => x.st));
      const nodes = [{ kind: 'start', name: 'Start' }].concat(plan.vias.map((v) => ({ kind: 'via', name: ptName(v) })), [{ kind: 'end', name: ptName(dest) }],
        cands.map((x) => { const lp = lastPrice(x.st.id); return { kind: 'station', name: x.st.name, st: x.st, price: lp ? lp.price : defPrice, priceEstimated: !lp }; }));
      let D, how = 'straight lines';
      const useSea = s.rangeArea !== 'circle' && Sea.meta && !(ctxR.err && ctxR.err !== 'nostart');
      if (useSea) {
        let maxD = 0; pts.forEach((p) => pts.forEach((q) => { maxD = Math.max(maxD, hv(p, q)); }));
        const res = await Sea.matrix(pts.map((p) => ({ lat: p.lat, lon: p.lon })), s.rangeArea, s.draftM, Math.min(500000, maxD * 1.6 + 20000),
          ([k, n]) => { plan.msg = `Calculating sea distances ${k}/${n}…`; const el = $('#plan-msg'); if (el) el.textContent = plan.msg; });
        D = res.D; how = s.rangeArea === 'water' ? 'open water' : 'fairways';
      } else D = pts.map((p) => pts.map((q) => hv(p, q)));
      const order = chain.map((_, i) => i);
      const r = Planner.plan({ D, nodes, order, tanks, rate, arriveL: s.planArriveL ?? 50, extraL: s.planExtraL ?? 20, defaultPrice: defPrice, kn, stopMin: 15, maxStops: 4 });
      plan.res = { r, nodes, pts, kn, how, mode, D }; plan.sel = r.cheapest ? 'cheapest' : 'shortest';
      plan.msg = r.cheapest ? `${r.tried} combinations checked · ${cands.length} stations near the route · distances ${how}` : '';
    } catch (e) { plan.msg = 'Planning failed: ' + e.message; }
    plan.busy = false; renderPlanPanel();
  }
  function renderPlanResults() {
    const out = $('#plan-out'); if (!out || !plan.res) return;
    const { r, nodes } = plan.res;
    if (!r.cheapest) {
      const d = r.failure && r.failure.direct;
      out.innerHTML = `<div class="warn" style="margin:8px 0 0 0">No plan reaches the destination with your reserve and ${S().settings.planArriveL ?? 50} L left on arrival${d && isFinite(d.shortfall) ? ` — the direct route is short by about ${fi(d.shortfall)} L` : ' — the destination or a leg is not reachable with this route type'}. Try a fuel station closer to the route, a lower arrival amount, the economy speed, or another route type.</div>`;
      return;
    }
    const labels = { cheapest: 'Cheapest', fewest: 'Fewest stops', shortest: 'Shortest' };
    // the same itinerary can win several objectives: show it once with the labels joined
    const groups = [];
    Object.keys(labels).filter((k) => r[k]).forEach((k) => { const key = r[k].seq.join('-'), g = groups.find((x) => x.key === key); if (g) g.ks.push(k); else groups.push({ key, ks: [k] }); });
    if (!r[plan.sel]) plan.sel = groups[0].ks[0];
    const selKey = r[plan.sel].seq.join('-');
    const chips = groups.map((g) => { const p = r[g.ks[0]]; return `<button class="chip ${g.key === selKey ? 'on' : ''}" data-act="plan-sel" data-k="${g.ks[0]}">${g.ks.map((k) => labels[k]).join(' · ')} — ${fi(p.buy)} € · ${p.stops} stop${p.stops === 1 ? '' : 's'}</button>`; }).join('');
    const p = r[plan.sel];
    const legs = p.legs.map((l, i) => {
      const from = nodes[l.from], to = nodes[l.to], rf = l.refuelAtFrom, rL = rf.port + rf.stbd;
      const fuelRow = rL >= 1 ? `<div class="sub" style="color:#B8470F;font-weight:600">Refuel at ${esc(from.name)}: P ${fi(rf.port)} L + S ${fi(rf.stbd)} L × ${f(from.price, 3)} €/L = ${fi(rL * from.price)} €${from.priceEstimated ? ' (price estimate)' : ''}</div>` : '';
      return `${fuelRow}<div style="padding:4px 0;border-bottom:1px solid #ECE8DC"><b>${i + 1}. ${esc(from.name)} → ${esc(to.name)}</b><div class="sub">${f(l.nm)} NM · ${dur(l.nm / plan.res.kn)} · arrive with P ${fi(l.arrive.port)} L / S ${fi(l.arrive.stbd)} L</div></div>`;
    }).join('');
    out.innerHTML = `<div class="chips" style="padding:8px 0 0 0">${chips}</div>
      <div class="grid3" style="padding:8px 0 0 0">
        <div class="tile"><div class="lbl">Distance</div><div class="num mid">${f(p.nm)}</div><div class="hint">NM · ${dur(p.hours)}</div></div>
        <div class="tile"><div class="lbl">Fuel bought</div><div class="num mid">${fi(p.litresBought)}</div><div class="hint">L · ${p.stops} stop${p.stops === 1 ? '' : 's'}</div></div>
        <div class="tile dark"><div class="lbl">Cost</div><div class="num mid">${fi(p.buy)} €</div><div class="hint">${p.estimated ? 'includes estimates' : 'known prices'}</div></div></div>
      <div style="padding-top:8px">${legs}</div>
      <div class="sub" style="padding-top:6px">At the destination: P ${fi(p.end.port)} L · S ${fi(p.end.stbd)} L. ${esc(plan.msg)}</div>`;
    drawPlan(p);
  }
  async function drawPlan(p) {
    clearPlanLayer();
    const m = maps.range; if (!m) return;
    const grp = L.layerGroup().addTo(m); plan.layer = grp;
    const { nodes, pts, how } = plan.res, s = S().settings;
    const all = [];
    for (const l of p.legs) {
      const a = pts[l.from], b = pts[l.to];
      let line = [[a.lat, a.lon], [b.lat, b.lon]];
      if (how !== 'straight lines') { try { const r = await Sea.leg({ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon }, s.rangeArea, s.draftM, l.nm * NMm * 1.3 + 5000); if (r && r.pts && r.pts.length > 1) line = r.pts; } catch (e) { /* straight */ } }
      if (plan.layer !== grp) return;
      L.polyline(line, { color: '#B8470F', weight: 4 }).addTo(grp); all.push(...line);
    }
    p.seq.forEach((ni, k) => {
      const n = nodes[ni], q = pts[ni];
      if (n.kind === 'start') return;
      L.marker([q.lat, q.lon], { interactive: false, zIndexOffset: 900, icon: L.divIcon({ className: 'boat-icon', iconSize: [22, 22], iconAnchor: [11, 11], html: `<div style="width:22px;height:22px;border-radius:11px;background:${n.kind === 'end' ? '#13212F' : '#B8470F'};color:#fff;font:600 12px Barlow,sans-serif;display:flex;align-items:center;justify-content:center;border:2px solid #fff">${n.kind === 'end' ? '⚑' : k}</div>` }) }).addTo(grp);
    });
    if (all.length) m.fitBounds(L.latLngBounds(all), { padding: [24, 24] });
  }
  function drawStations() {
    const m = maps.range; if (!m) return;
    if (stationLayer) m.removeLayer(stationLayer);
    stationLayer = L.layerGroup().addTo(m);
    allStations().forEach((st) => L.marker([st.lat, st.lon], { icon: fuelIcon(!!lastPrice(st.id)), title: st.name, zIndexOffset: 500 }).on('click', () => stationCard(st)).addTo(stationLayer));
  }
  async function stationCard(st) {
    openStation = st; clearRoute();
    const lp = lastPrice(st.id), area = S().settings.rangeArea;
    const info = [st.operator && st.operator !== st.name ? esc(st.operator) : '', st.fuels && st.fuels.length ? esc(st.fuels.join(', ').replace(/_/g, ' ')) : '', st.hours ? esc(st.hours) : ''].filter(Boolean).join(' · ');
    const head = `<div class="cardhead"><div><div class="h">${esc(st.name)}</div><div class="sub">${info || (st.user ? 'your own station' : 'OpenStreetMap')}</div></div>
      <div style="text-align:right"><div class="num" style="font-size:20px">${lp ? f(lp.price, 3) + ' €/L' : '–'}</div><div class="sub">${lp ? (lp.src === 'refuel' ? 'you paid ' : 'seen ') + ageTxt(lp.t) : 'no price yet'}</div></div></div>`;
    const btns = `<div class="btnrow" style="padding:0">${plan.on ? '<button class="btn small grow dark" data-act="plan-dest-st">Destination</button><button class="btn small grow" data-act="plan-via-st">Stop-over</button>' : ''}<button class="btn small grow" data-act="price-seen">Log price seen</button>${st.user ? '<button class="btn small" data-act="del-station">Delete</button>' : ''}</div>`;
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
    const el = $('#st-route'); if (el && openStation === st) el.innerHTML = `${f(nm)} NM ${how} · ${fi(fuel)} L at ${f(ctx.kn)} kn · <b style="color:${ok ? '#1F6E5A' : '#A63A2A'}">${ok ? 'reachable with reserve' : 'beyond range'}</b>`;
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
    if (plan.on) {
      sheet(`<h3>Trip plan</h3><p>Use the tapped point as…</p><div class="list">
        <button class="item" data-act="plan-dest-tap"><span class="main"><b>Destination</b></span></button>
        <button class="item" data-act="plan-via-tap"><span class="main"><b>Stop-over (visit on the way)</b></span></button>
        <button class="item" data-act="range-start-here-sheet"><span class="main"><b>Start point</b></span></button></div>
        <div class="btnrow"><button class="btn grow" data-act="sheet-close">Cancel</button></div>`);
      return;
    }
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
        <div class="sub" style="color:${okRound ? '#1F6E5A' : okOne ? '#B8470F' : '#A63A2A'};font-weight:600">${okRound ? 'Enough fuel there and back, with reserve.' : okOne ? 'Enough one way only — refuel there.' : 'Not enough fuel to get there with the reserve kept.'}</div>${startBtn}</div>`;
    } catch (e) { toast('Route failed: ' + e.message); }
  }

  const seaInfo = (m) => `built ${dstr(Date.parse(m.built))}, depth: ${m.depthSource}, ${m.fairwayEdges} fairway segments, ${(Sea.stations || []).length} fuel stations, ${f((m.bytes || 0) / 1e6)} MB`;
  // MORE / SETTINGS
  R.more = () => {
    const s = S().settings;
    $('#v-more').innerHTML = `
      <div class="top"><div><div class="title">Settings</div><div class="sub">Maps, economy, range, backup</div></div></div>
      <div class="card"><div class="cardhead"><div class="h">Base map</div></div>
        <div class="seg" style="margin:0"><button class="${s.base === 'traficom' ? 'on' : ''}" data-act="base" data-b="traficom">Traficom</button><button class="${s.base === 'osm' ? 'on' : ''}" data-act="base" data-b="osm">OSM</button><button class="${s.base === 'nls' ? 'on' : ''}" data-act="base" data-b="nls">NLS</button></div>
        <div class="check"><input type="checkbox" id="seamarks" ${s.seamarks ? 'checked' : ''} data-act="seamarks"><label for="seamarks">OpenSeaMap seamarks on top</label></div>
        <div class="field"><label for="tlayer">Traficom chart series</label><select id="tlayer" data-act="tlayer" style="height:44px;border-radius:10px;border:1px solid #D9D5C9;background:#fff;max-width:60%">${TRAFICOM_LAYERS.map((l) => `<option ${l === s.traficomLayer ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
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
        <div class="field"><label for="mincruise">Cruising from<small>slower = manoeuvring, never proposed</small></label><div class="inbox"><input id="mincruise" inputmode="decimal" value="${s.minCruiseKn}" data-act="setnum" data-k="minCruiseKn"><span>kn</span></div></div>
        <div class="field"><label for="effm">Efficient cruise margin<small>max extra fuel per NM vs the best</small></label><div class="inbox"><input id="effm" inputmode="decimal" value="${s.effMarginPct}" data-act="setnum" data-k="effMarginPct"><span>%</span></div></div>
        <div class="field"><label for="rpmstep">RPM rounding</label><div class="inbox"><input id="rpmstep" inputmode="decimal" value="${s.rpmStep}" data-act="setnum" data-k="rpmStep"><span>rpm</span></div></div>
        <div class="field"><label for="reserve">Reserve<small>% of usable capacity (above suction pipe)</small></label><div class="inbox"><input id="reserve" inputmode="decimal" value="${s.reservePct}" data-act="setnum" data-k="reservePct"><span>%</span></div></div>
      </div>
      <div class="card"><div class="cardhead"><div class="h">Ruler</div></div>
        <div class="seg" style="margin:0"><button class="${RUL() === 'cm' ? 'on' : ''}" data-act="ruler-unit" data-u="cm">Centimetres (0.5 cm)</button><button class="${RUL() === 'mm' ? 'on' : ''}" data-act="ruler-unit" data-u="mm">Millimetres</button></div>
        <div class="sub">Unit for dips, refuels, full-tank depth and suction-pipe height. Readings already saved are converted automatically. The tank polynomial keeps its own unit (Tanks → Polynomial).</div>
      </div>
      <div class="card"><div class="cardhead"><div class="h">Sea data for range</div></div>
        <div class="sub">Land, depth and fairways for Suomenlahti and Saaristomeri, built by the "Build sea data" workflow in your GitHub repository. Download once on Wi-Fi; it then works offline.</div>
        <div class="field"><label for="draft">Draft limit<small>avoid water shallower than this</small></label><div class="inbox"><input id="draft" inputmode="decimal" value="${s.draftM}" data-act="setnum" data-k="draftM"><span>m</span></div></div>
        <button class="btn small" data-act="sea-download">Download / update sea data</button>
        <div class="sub" id="sea-out">${Sea.meta ? 'Loaded: ' + seaInfo(Sea.meta) : 'Not downloaded yet.'}</div>
      </div>
      <div class="card"><div class="cardhead"><div class="h">Backup</div></div>
        <div class="sub">All data lives on this phone only. Export a backup now and then (also before reinstalling).</div>
        <div class="btnrow" style="padding:0"><button class="btn small grow" data-act="export">Export backup</button><label class="btn small grow" for="importf">Import backup</label><input type="file" id="importf" accept="application/json,.json" style="display:none" data-act="import"></div>
      </div>
      <div class="btnrow"><button class="btn small grow" data-act="check-update">Check for app update</button></div>
      <div class="note">Version 4.3 · Fuel stations © OpenStreetMap contributors · Wind data © Finnish Meteorological Institute (CC BY 4.0) · Chart data © Traficom, CC BY 4.0 — not quality-assured, not for navigation. Seamarks © OpenSeaMap, map © OpenStreetMap contributors, background map © Maanmittauslaitos.</div>`;
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

  // ---------- actions ----------
  const RPMS = []; for (let r = 700; r <= 2800; r += 100) RPMS.push(r);
  let sheetUnit = 'mm';
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
      const last = S().settings.lastLoad || 'normal';
      sheet(`<h3>Load on board</h3><p>Helps the app learn how load changes consumption.</p><div class="list">${['light', 'normal', 'full'].map((l) => `<button class="item" data-act="start-with-load" data-l="${l}"><span class="main"><b>${LOAD_LABEL[l]}</b><span>${LOAD_HINT[l]}</span></span>${l === last ? '<span class="right"><span class="sub">last used</span></span>' : ''}</button>`).join('')}</div>`);
    },
    'start-with-load': async (el) => {
      closeSheet();
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
      S().tanks.forEach((t) => { const mm = rv($('#dip-' + t.id).value); if (isFinite(mm) && mm >= 0) { Core.addDip(t.id, mm, rough); n++; } });
      toast(n ? 'Dip saved. Consumption curves updated.' : 'Trip saved without a dip.');
      go('trips');
    },
    'open-trip': (el) => go('trip', { id: el.dataset.id }),
    'rename-trip': (el) => { const tr = S().trips.find((t) => t.id === el.dataset.id); tr.name = $('#trip-name').value.trim() || tr.name; Core.save(); toast('Saved'); R.trip(); },
    'del-trip': (el) => confirmSheet('Delete this trip?', 'Its track, speed and RPM log are removed. This cannot be undone.', 'Delete', async () => { await Core.deleteTrip(el.dataset.id); go('trips'); }),
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
    'dip-sheet': () => {
      const t = Core.tank(tankSel);
      sheet(`<h3>Dip ${esc(t.name)} tank</h3><p>Ruler depth. Litres come from the tank curve.</p>
        <div class="card"><div class="field"><label for="sd-mm">Depth<small id="sd-L"> </small></label><div class="inbox"><input id="sd-mm" inputmode="decimal" data-sdip="1"><span>${RUL()}</span></div></div>
        ${roughBox('sd-rough')}
        <div class="check"><input type="checkbox" id="sd-both"><label for="sd-both">I'll dip the other tank too</label></div></div>
        <div class="btnrow"><button class="btn grow" data-act="sheet-close">Cancel</button><button class="btn primary" data-act="save-dip">Save dip</button></div>`);
      setTimeout(() => $('#sd-mm').focus(), 100);
    },
    'save-dip': () => {
      const mm = rv($('#sd-mm').value); if (!isFinite(mm)) return toast('Enter the depth in ' + RUL());
      Core.addDip(tankSel, mm, $('#sd-rough').checked); const both = $('#sd-both').checked; closeSheet();
      if (mm < Core.tank(tankSel).pipeMm) toast('Below suction pipe — engine may draw air', 4000);
      if (both) { tankSel = S().tanks.find((t) => t.id !== tankSel).id; R.tanks(); A['dip-sheet'](); } else R.tanks();
    },
    'edit-tank': () => {
      const t = Core.tank(tankSel), byL = t.pipeL !== null && t.pipeL !== undefined;
      sheet(`<h3>Edit ${esc(t.name)} tank</h3>
        <div class="card">
          <div class="field"><label for="et-name">Name</label><div class="inbox wide" style="width:50%"><input id="et-name" value="${esc(t.name)}"></div></div>
          <div class="field"><label for="et-cap">Capacity</label><div class="inbox"><input id="et-cap" inputmode="decimal" value="${t.capacity}"><span>L</span></div></div>
          <div class="field"><label for="et-max">Full-tank depth<small>ruler reading when full</small></label><div class="inbox"><input id="et-max" inputmode="decimal" value="${rn(t.maxMm)}"><span>${RUL()}</span></div></div>
          <div class="field"><label for="et-pipe">Suction pipe ends at<small>depth on the ruler</small></label><div class="inbox"><input id="et-pipe" inputmode="decimal" value="${byL ? '' : rn(t.pipeMm)}"><span>${RUL()}</span></div></div>
          <div class="field"><label for="et-pipeL">…or unusable litres<small>leave empty to use the depth</small></label><div class="inbox"><input id="et-pipeL" inputmode="decimal" value="${byL ? t.pipeL : ''}"><span>L</span></div></div>
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
    'base-sheet': () => {
      const c = S().curve; sheetUnit = c.unit;
      sheet(`<h3>Tank polynomial</h3><p>Shared by both tanks: litres = c0 + c1·x + c2·x² + c3·x³ + c4·x⁴, where x is the ruler depth. Paste values like 1.23e-5. Saving resets the refuel corrections; the old curve stays under Earlier curves.</p>
        <div class="card">
          <div class="seg" style="margin:0"><button class="${c.unit === 'mm' ? 'on' : ''}" data-act="base-unit" data-u="mm">x in mm</button><button class="${c.unit === 'cm' ? 'on' : ''}" data-act="base-unit" data-u="cm">x in cm</button></div>
          ${c.base.map((v, i) => `<div class="field"><label for="bc${i}">c${i}</label><div class="inbox wide" style="width:65%"><input id="bc${i}" inputmode="decimal" value="${v}"></div></div>`).join('')}
        </div>
        <div class="btnrow"><button class="btn grow" data-act="sheet-close">Cancel</button><button class="btn primary" data-act="save-base">Save polynomial</button></div>`);
    },
    'base-unit': (el) => { sheetUnit = el.dataset.u; el.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el)); },
    'save-base': () => {
      const co = [0, 1, 2, 3, 4].map((i) => Number(String($('#bc' + i).value).replace(',', '.').trim()));
      if (co.some((x) => !isFinite(x))) return toast('A coefficient is not a number');
      const t = Core.tank(tankSel);
      const full = Core.polyEval(co, sheetUnit === 'cm' ? t.maxMm / 10 : t.maxMm);
      Core.setBase(co, sheetUnit); closeSheet();
      toast('Saved. Full-tank depth gives ' + fi(full) + ' L (capacity ' + fi(t.capacity) + ' L)', 4500); R.tanks();
    },
    'add-anchor': () => sheet(`<h3>Known point</h3><p>A depth where you know the litres exactly, e.g. after filling an empty tank in measured steps.</p>
        <div class="card"><div class="field"><label for="ac-mm">Depth</label><div class="inbox"><input id="ac-mm" inputmode="decimal"><span>${RUL()}</span></div></div>
        <div class="field"><label for="ac-L">Litres in tank</label><div class="inbox"><input id="ac-L" inputmode="decimal"><span>L</span></div></div></div>
        <div class="btnrow"><button class="btn grow" data-act="sheet-close">Cancel</button><button class="btn primary" data-act="save-anchor">Add</button></div>`),
    'save-anchor': () => {
      const mm = rv($('#ac-mm').value), Lv = Core.num($('#ac-L').value);
      if (!isFinite(mm) || !isFinite(Lv)) return toast('Enter both values');
      const p = Core.addAnchor(tankSel, mm, Lv); closeSheet(); R.tanks(); if (p) proposalSheet();
    },
    'del-anchor': (el) => { Core.deleteAnchor(el.dataset.id); R.tanks(); },
    'proposal': proposalSheet,
    'accept-curve': () => { if (Core.acceptCurve()) toast('New tank curve in use'); closeSheet(); R.tanks(); },
    'reject-curve': () => { Core.rejectCurve(); closeSheet(); toast('Kept the current curve'); R.tanks(); },
    'restore-curve': (el) => confirmSheet('Restore this curve?', 'The current curve is kept in the list so you can switch back.', 'Restore', () => { Core.restoreCurve(+el.dataset.i); R.tanks(); }),
    'del-event': (el) => confirmSheet('Delete this reading?', 'Levels, consumption curves and the tank-curve fit are recalculated without it.', 'Delete', () => { Core.deleteEvent(el.dataset.id); R.tanks(); }),
    'refuel-sel': (el) => { refuelSel = el.dataset.t; R.refuel(); },
    'save-refuel': () => {
      const c = refuelCalc();
      if (!c.ok) return toast(c.rows.length > 1 ? 'Enter depth before and after for both tanks and the pump total' : 'Enter the depth before filling and the litres pumped');
      const rough = $('#rf-rough').checked;
      const p = Core.addRefuel(c.rows.map((r) => ({ tank: r.t.id, beforeMm: r.b, pumped: r.p, afterMm: r.a, brim: r.brim })), c.price, rough);
      if (isFinite(c.price)) {
        S().settings.price = String(c.price); Core.save();
        const fx = Core.live.fix, ns = fx && nearestStation(fx.lat, fx.lon, 1000);
        if (ns) { Core.addStationPrice(ns.st.id, c.price, 'refuel', c.pumped); setTimeout(() => toast('Price saved for ' + ns.st.name), 1500); }
      }
      go('tanks');
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
    'plan-open': () => { plan.on = true; plan.msg = 'Tap the map or a fuel station to choose the destination.'; renderPlanPanel(); },
    'plan-close': () => { plan.on = false; plan.res = null; plan.msg = ''; clearPlanLayer(); renderPlanPanel(); },
    'plan-dest-tap': () => { closeSheet(); plan.dest = { lat: lastTap.lat, lon: lastTap.lng, name: '' }; plan.res = null; clearPlanLayer(); renderPlanPanel(); },
    'plan-via-tap': () => { closeSheet(); plan.vias.push({ lat: lastTap.lat, lon: lastTap.lng, name: 'Stop-over ' + (plan.vias.length + 1) }); plan.res = null; clearPlanLayer(); renderPlanPanel(); },
    'range-start-here-sheet': () => { closeSheet(); setRangeStart(lastTap.lat, lastTap.lng); },
    'plan-dest-st': () => { const st = openStation; if (!st) return; plan.dest = { lat: st.lat, lon: st.lon, name: st.name }; plan.res = null; clearRoute(); clearPlanLayer(); renderPlanPanel(); },
    'plan-via-st': () => { const st = openStation; if (!st) return; plan.vias.push({ lat: st.lat, lon: st.lon, name: st.name }); plan.res = null; clearRoute(); clearPlanLayer(); renderPlanPanel(); },
    'plan-clear-dest': () => { plan.dest = null; plan.res = null; clearPlanLayer(); renderPlanPanel(); },
    'plan-del-via': (el) => { plan.vias.splice(+el.dataset.i, 1); plan.res = null; clearPlanLayer(); renderPlanPanel(); },
    'plan-speed': (el) => { plan.speed = el.dataset.s; plan.res = null; clearPlanLayer(); renderPlanPanel(); },
    'plan-calc': () => calcPlan(),
    'plan-sel': (el) => { plan.sel = el.dataset.k; renderPlanResults(); },
    'range-start-here': () => { if (lastTap) setRangeStart(lastTap.lat, lastTap.lng); },
    'range-start-gps': () => { S().settings.rangeStart = null; Core.save(); toast('Start from the boat GPS position'); renderRange(); },
    'range-area': (el) => { S().settings.rangeArea = el.dataset.a; Core.save(); renderRange(); },
    'sea-download': async () => {
      const out = $('#sea-out'), btn = $('[data-act=sea-download]'); btn.disabled = true;
      try { const m = await Sea.download(S().settings.seaUrl || 'sea/', (t) => { out.textContent = t; }); out.textContent = 'Ready: ' + seaInfo(m); toast('Sea data ready'); }
      catch (e) { out.textContent = 'Failed: ' + e.message; }
      btn.disabled = false;
    },
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
    if (el.dataset.sdip) { const t = Core.tank(tankSel), mm = rv(el.value), Lv = Core.litres(t, mm); $('#sd-L').textContent = isFinite(Lv) ? '= ' + fi(Lv) + ' L' + (mm < t.pipeMm ? ' · below suction pipe!' : '') : ' '; }
  });
  document.addEventListener('change', async (e) => {
    const el = e.target, act = el.dataset.act, s = S().settings;
    if (el.dataset.rf) refuelCalc();
    if (act === 'seamarks') { s.seamarks = el.checked; Core.save(); refreshBaseLayers(); }
    if (act === 'tlayer') { s.traficomLayer = el.value; Core.save(); refreshBaseLayers(); }
    if (act === 'nlskey') { s.nlsKey = el.value.trim(); Core.save(); refreshBaseLayers(); }
    if (act === 'plan-kn') { const v = Core.num(el.value); if (v >= 1 && v <= 30) { plan.customKn = v; plan.res = null; clearPlanLayer(); } else toast('Speed 1–30 kn'); }
    if (act === 'setnum') {
      const v = Core.num(el.value), k = el.dataset.k;
      const ok = { reservePct: v >= 0 && v < 90, minCruiseKn: v >= 1 && v <= 20, effMarginPct: v >= 0 && v <= 100, rpmStep: v >= 1 && v <= 500, draftM: v >= 0 && v <= 10, planArriveL: v >= 0 && v <= 800, planExtraL: v >= 0 && v <= 300 }[k];
      if (ok) { s[k] = v; Core.save(); toast('Saved'); if (k.startsWith('plan')) { plan.res = null; clearPlanLayer(); } } else { toast('Value out of range'); el.value = s[k]; }
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
    Sea.init();
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
  window.FuelLogDebug = { go, Core, Sea, Wind, proposalSheet, plan };
})();
