#!/usr/bin/env python3
"""Build the offline sea-area data for Popcorn Fuel Log.

Outputs (written to --out, default ./sea):
  meta.json         grid geometry + build info
  grid.bin.gz       uint8 grid in Web Mercator, row-major from the north edge:
                      0 = land, 1..254 = depth in decimetres (254 = 25.4 m or deeper),
                      255 = water with unknown depth
  fairways.json.gz  fairway graph: nodes (lon/lat * 1e5) and edges [a, b, metres, depth_dm or -1]

Sources (all open data):
  land      OpenStreetMap land polygons (osmdata.openstreetmap.de), CC BY-SA / ODbL
  depth     Traficom depth areas (shapefiles placed in sea-src/traficom/) if present,
            otherwise EMODnet Bathymetry DTM (WCS)
  fairways  Väylävirasto WFS: vesivaylatiedot:navigointilinjat_uusi (+ other fairway owners)

Only numpy and requests are needed for the core. Reading shapefiles / GeoTIFF uses
pyogrio, shapely, rasterio and pyproj, imported only when those inputs are used.
"""
import argparse, glob, gzip, io, json, math, os, sys, time
import numpy as np

R_EARTH = 6378137.0
DEFAULT_BBOX = (19.4, 59.2, 28.0, 61.0)       # lon/lat: Saaristomeri + Suomenlahti
CELL = 200.0                                  # Web Mercator metres (~100 m true at 60 N)
FAIRWAY_WFS = 'https://avoinapi.vaylapilvi.fi/vaylatiedot/wfs'
FAIRWAY_LAYERS = ['vesivaylatiedot:navigointilinjat_uusi', 'vesivaylatiedot:navigointilinjat_muut_vaylanpitajat']
EMODNET_WCS = 'https://ows.emodnet-bathymetry.eu/wcs'
OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


# ---------------------------------------------------------------- projection
def merc_x(lon):
    return R_EARTH * np.radians(lon)


def merc_y(lat):
    return R_EARTH * np.log(np.tan(np.pi / 4 + np.radians(lat) / 2))


def inv_merc(x, y):
    lon = np.degrees(x / R_EARTH)
    lat = np.degrees(2 * np.arctan(np.exp(y / R_EARTH)) - np.pi / 2)
    return lon, lat


class Grid:
    def __init__(self, bbox, cell=CELL):
        lon0, lat0, lon1, lat1 = bbox
        self.cell = cell
        self.x0 = math.floor(merc_x(lon0) / cell) * cell
        self.y1 = math.ceil(merc_y(lat1) / cell) * cell            # north edge
        x1 = math.ceil(merc_x(lon1) / cell) * cell
        y0 = math.floor(merc_y(lat0) / cell) * cell
        self.W = int(round((x1 - self.x0) / cell))
        self.H = int(round((self.y1 - y0) / cell))

    def to_px(self, lon, lat):
        """lon/lat -> fractional pixel coords (col, row), cell centres at .5"""
        return (merc_x(lon) - self.x0) / self.cell, (self.y1 - merc_y(lat)) / self.cell

    def centres_lonlat(self):
        cols = self.x0 + (np.arange(self.W) + 0.5) * self.cell
        rows = self.y1 - (np.arange(self.H) + 0.5) * self.cell
        lon, _ = inv_merc(cols, np.zeros_like(cols))
        _, lat = inv_merc(np.zeros_like(rows), rows)
        return lon, lat


# ---------------------------------------------------------------- rasterising
def fill_rings(rings_px, H, W):
    """Even-odd fill of many closed rings (pixel coords) at once.
    A cell is inside when its centre is inside. Rings of non-overlapping polygons
    (outer rings and holes) can all be passed together."""
    xs0, ys0, xs1, ys1 = [], [], [], []
    for r in rings_px:
        r = np.asarray(r, dtype=np.float64)
        if len(r) < 3:
            continue
        a, b = r, np.roll(r, -1, axis=0)
        xs0.append(a[:, 0]); ys0.append(a[:, 1]); xs1.append(b[:, 0]); ys1.append(b[:, 1])
    mask = np.zeros((H, W), dtype=bool)
    if not xs0:
        return mask
    x0, y0, x1, y1 = (np.concatenate(v) for v in (xs0, ys0, xs1, ys1))
    keep = y0 != y1
    x0, y0, x1, y1 = x0[keep], y0[keep], x1[keep], y1[keep]
    ylo, yhi = np.minimum(y0, y1), np.maximum(y0, y1)
    # rows whose centre (r + .5) satisfies ylo <= r+.5 < yhi
    r_start = np.ceil(ylo - 0.5).astype(np.int64)
    r_end = np.ceil(yhi - 0.5).astype(np.int64)          # exclusive
    r_start = np.clip(r_start, 0, H); r_end = np.clip(r_end, 0, H)
    n = np.maximum(0, r_end - r_start)
    sel = n > 0
    x0, y0, x1, y1, r_start, n = x0[sel], y0[sel], x1[sel], y1[sel], r_start[sel], n[sel]
    if not len(n):
        return mask
    idx = np.repeat(np.arange(len(n)), n)
    offs = np.arange(n.sum()) - np.repeat(np.cumsum(n) - n, n)
    rows = r_start[idx] + offs
    yc = rows + 0.5
    t = (yc - y0[idx]) / (y1[idx] - y0[idx])
    xc = x0[idx] + t * (x1[idx] - x0[idx])
    order = np.lexsort((xc, rows))
    rows, xc = rows[order], xc[order]
    # pair crossings within each row
    diff = np.zeros((H, W + 1), dtype=np.int32)
    starts = np.r_[0, np.flatnonzero(np.diff(rows)) + 1]
    counts = np.diff(np.r_[starts, len(rows)])
    for s, c in zip(starts, counts):
        if c % 2:
            c -= 1                                      # tolerate a broken ring
        if c <= 0:
            continue
        r = rows[s]
        xa, xb = xc[s:s + c:2], xc[s + 1:s + c:2]
        ca = np.clip(np.ceil(xa - 0.5).astype(np.int64), 0, W)
        cb = np.clip(np.ceil(xb - 0.5).astype(np.int64), 0, W)
        np.add.at(diff[r], ca, 1)
        np.add.at(diff[r], cb, -1)
    mask = np.cumsum(diff[:, :W], axis=1) > 0
    return mask


def polygons_to_rings(polys, grid):
    """polys: list of polygons, each a list of rings of (lon, lat) -> pixel rings"""
    out = []
    for poly in polys:
        for ring in poly:
            a = np.asarray(ring, dtype=np.float64)
            c, r = grid.to_px(a[:, 0], a[:, 1])
            out.append(np.column_stack([c, r]))
    return out


# ---------------------------------------------------------------- readers
def read_geojson_polys(path, field=None):
    """returns list of (polygon_rings_lonlat, value)"""
    with (gzip.open(path, 'rt') if path.endswith('.gz') else open(path)) as f:
        gj = json.load(f)
    out = []
    for ft in gj['features']:
        g = ft['geometry']; v = (ft.get('properties') or {}).get(field) if field else None
        if g['type'] == 'Polygon':
            out.append((g['coordinates'], v))
        elif g['type'] == 'MultiPolygon':
            for p in g['coordinates']:
                out.append((p, v))
    return out


def read_ogr_polys(path, bbox=None, field=None):
    """Read polygons with pyogrio (any OGR format, /vsizip/ paths ok), reprojected to lon/lat."""
    import pyogrio, shapely
    info = pyogrio.read_info(path)
    crs = info.get('crs')
    meta, _, geoms, fields = pyogrio.raw.read(path, bbox=bbox if (not crs or '4326' in str(crs)) else None, read_geometry=True)
    names = [n.lower() for n in meta['fields']]
    vals = None
    if field:
        if field.lower() not in names:
            raise SystemExit(f'{path}: field {field} not found in {meta["fields"]}')
        vals = fields[names.index(field.lower())]
    shp = shapely.from_wkb(geoms)
    tr = None
    if crs and '4326' not in str(crs):
        from pyproj import Transformer
        tr = Transformer.from_crs(crs, 'EPSG:4326', always_xy=True)
    out = []
    for i, g in enumerate(shp):
        if g is None or g.is_empty:
            continue
        parts = list(g.geoms) if g.geom_type == 'MultiPolygon' else [g] if g.geom_type == 'Polygon' else []
        for p in parts:
            rings = [np.asarray(p.exterior.coords)] + [np.asarray(h.coords) for h in p.interiors]
            if tr:
                rings = [np.column_stack(tr.transform(r[:, 0], r[:, 1])) for r in rings]
            out.append((rings, None if vals is None else vals[i]))
    return out


# ---------------------------------------------------------------- depth sources
def depth_from_polys(grid, items):
    """items: list of (rings_lonlat, depth_m). Shallow polygons are written last."""
    depth = np.full((grid.H, grid.W), 255, dtype=np.uint8)
    by = {}
    for rings, v in items:
        try:
            d = float(v)
        except (TypeError, ValueError):
            continue
        by.setdefault(round(d, 1), []).append(rings)
    for d in sorted(by, reverse=True):
        m = fill_rings(polygons_to_rings(by[d], grid), grid.H, grid.W)
        depth[m] = np.uint8(min(254, max(1, int(round(d * 10)))))
        log(f'  depth {d:5.1f} m: {int(m.sum())} cells')
    return depth


def depth_from_emodnet(grid, bbox):
    import requests, rasterio
    from rasterio.io import MemoryFile
    lon0, lat0, lon1, lat1 = bbox
    lon_c, lat_c = grid.centres_lonlat()
    depth = np.full((grid.H, grid.W), 255, dtype=np.uint8)
    steps = np.linspace(lon0, lon1, 5)
    for a, b in zip(steps[:-1], steps[1:]):
        url = (f'{EMODNET_WCS}?SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&CoverageId=emodnet__mean'
               f'&SUBSET=Lat({lat0},{lat1})&SUBSET=Long({a},{b})&FORMAT=image/tiff')
        log('EMODnet', url)
        r = requests.get(url, timeout=600)
        r.raise_for_status()
        with MemoryFile(r.content) as mf, mf.open() as ds:
            elev = ds.read(1).astype(np.float64)
            nod = ds.nodata
            T = ds.transform
            cols_sel = np.flatnonzero((lon_c >= a) & (lon_c <= b))
            if not len(cols_sel):
                continue
            cc = np.floor((lon_c[cols_sel] - T.c) / T.a).astype(int)
            rr = np.floor((lat_c - T.f) / T.e).astype(int)
            okc = (cc >= 0) & (cc < ds.width); okr = (rr >= 0) & (rr < ds.height)
            sub = np.full((grid.H, len(cols_sel)), np.nan)
            sub[np.ix_(okr, okc)] = elev[np.ix_(rr[okr], cc[okc])]
            if nod is not None:
                sub[sub == nod] = np.nan
            d = -sub                                      # elevation -> depth
            val = np.where(np.isfinite(d) & (d > 0), np.clip(np.round(d * 10), 1, 254), 255).astype(np.uint8)
            depth[:, cols_sel] = val
    return depth


# ---------------------------------------------------------------- fairways
def fetch_fairways(bbox):
    import requests
    feats = []
    for layer in FAIRWAY_LAYERS:
        start = 0
        while True:
            params = dict(service='WFS', version='2.0.0', request='GetFeature', typeNames=layer,
                          outputFormat='application/json', srsName='EPSG:4326', count=5000, startIndex=start)
            r = requests.get(FAIRWAY_WFS, params=params, timeout=300)
            if r.status_code != 200:
                log(f'WFS {layer} -> HTTP {r.status_code}: {r.text[:300]}')
                break
            fs = r.json().get('features', [])
            feats += fs
            log(f'  {layer}: +{len(fs)} (total {len(feats)})')
            if len(fs) < 5000:
                break
            start += 5000
    return feats


def lines_from_features(feats, bbox):
    lon0, lat0, lon1, lat1 = bbox
    lines = []
    swapped = None
    for ft in feats:
        g = ft.get('geometry') or {}
        p = ft.get('properties') or {}
        dvals = [p.get(k) for k in ('mitoitussyvays', 'haraussyvyys')]
        dvals = [float(v) for v in dvals if v not in (None, '')]
        depth = max(dvals) if dvals else None
        parts = g.get('coordinates') or []
        if g.get('type') == 'LineString':
            parts = [parts]
        elif g.get('type') != 'MultiLineString':
            continue
        for pts in parts:
            a = np.asarray([q[:2] for q in pts], dtype=np.float64)
            if len(a) < 2:
                continue
            if swapped is None:                           # detect lat/lon axis order
                swapped = bool(np.mean(a[:, 0]) > 50 and np.mean(a[:, 1]) < 40)
                if swapped:
                    log('  coordinates are lat/lon, swapping')
            if swapped:
                a = a[:, ::-1]
            inb = (a[:, 0] >= lon0) & (a[:, 0] <= lon1) & (a[:, 1] >= lat0) & (a[:, 1] <= lat1)
            if inb.any():
                lines.append((a, depth))
    return lines


def haversine_m(lon1, lat1, lon2, lat2):
    r = np.radians
    d = np.sin(r(lat2 - lat1) / 2) ** 2 + np.cos(r(lat1)) * np.cos(r(lat2)) * np.sin(r(lon2 - lon1) / 2) ** 2
    return 2 * 6371008.8 * np.arcsin(np.sqrt(d))


def build_graph(lines, snap_m=5.0):
    """nodes snapped to ~snap_m so line ends that almost touch are joined"""
    key_to_id, nodes = {}, []
    edges = {}
    deg = 1.0 / 111320.0 * snap_m
    for a, depth in lines:
        ids = []
        for lon, lat in a:
            k = (int(round(lon / (deg / max(0.2, math.cos(math.radians(lat)))))), int(round(lat / deg)))
            if k not in key_to_id:
                key_to_id[k] = len(nodes); nodes.append((lon, lat))
            ids.append(key_to_id[k])
        for i, j in zip(ids[:-1], ids[1:]):
            if i == j:
                continue
            e = (min(i, j), max(i, j))
            L = float(haversine_m(nodes[i][0], nodes[i][1], nodes[j][0], nodes[j][1]))
            dd = -1 if depth is None else int(round(depth * 10))
            if e in edges:                             # keep the deepest description of a shared segment
                dd = max(dd, edges[e][1]) if dd >= 0 and edges[e][1] >= 0 else max(dd, edges[e][1])
            edges[e] = (L, dd)
    flat_nodes = []
    for lon, lat in nodes:
        flat_nodes += [int(round(lon * 1e5)), int(round(lat * 1e5))]
    flat_edges = []
    for (i, j), (L, dd) in edges.items():
        flat_edges += [i, j, int(round(L)), dd]
    return {'nodes': flat_nodes, 'edges': flat_edges}


# ---------------------------------------------------------------- fuel stations (OpenStreetMap)
def fetch_fuel(bbox):
    import requests
    lon0, lat0, lon1, lat1 = bbox
    b = f'({lat0},{lon0},{lat1},{lon1})'
    q = f'''[out:json][timeout:180];
(
  nwr["waterway"="fuel"]{b};
  nwr["seamark:small_craft_facility:category"~"fuel"]{b};
  nwr["seamark:type"="small_craft_facility"]["seamark:small_craft_facility:category"~"fuel"]{b};
  nwr["amenity"="fuel"]["boat"="yes"]{b};
  nwr["amenity"="fuel"]["fuel:marine_diesel"]{b};
);
out center tags;'''
    last = None
    for url in OVERPASS:
        try:
            r = requests.post(url, data={'data': q}, timeout=300, headers={'User-Agent': 'popcorn-fuel-log/1 (personal boating app)'})
            r.raise_for_status()
            return r.json().get('elements', [])
        except Exception as e:  # try the next mirror
            last = e
            log(f'Overpass {url} failed: {e}')
    raise last


def stations_from_elements(els):
    out, seen = [], set()
    for e in els:
        lat = e.get('lat', (e.get('center') or {}).get('lat'))
        lon = e.get('lon', (e.get('center') or {}).get('lon'))
        if lat is None or lon is None:
            continue
        key = (round(lat, 4), round(lon, 4))
        if key in seen:
            continue
        seen.add(key)
        t = e.get('tags', {})
        fuels = sorted(k[5:] for k, v in t.items() if k.startswith('fuel:') and v not in ('no', ''))
        name = t.get('name') or t.get('seamark:name') or t.get('brand') or t.get('operator') or 'Fuel station'
        out.append({'id': f"osm:{e['type'][0]}{e['id']}", 'lat': round(lat, 6), 'lon': round(lon, 6), 'name': name,
                    'operator': t.get('operator') or t.get('brand') or '', 'fuels': fuels,
                    'hours': t.get('opening_hours', ''), 'phone': t.get('phone') or t.get('contact:phone') or '',
                    'website': t.get('website') or t.get('contact:website') or ''})
    return out


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--bbox', type=float, nargs=4, default=DEFAULT_BBOX, metavar=('LON0', 'LAT0', 'LON1', 'LAT1'))
    ap.add_argument('--cell', type=float, default=CELL)
    ap.add_argument('--land', required=True, help='land polygons: .shp / /vsizip/... / .geojson')
    ap.add_argument('--depth-dir', default='sea-src/traficom', help='folder with Traficom depth-area shapefiles/zips')
    ap.add_argument('--depth-field', default='DRVAL1')
    ap.add_argument('--depth-geojson', help='(testing) depth polygons as GeoJSON with DRVAL1')
    ap.add_argument('--no-emodnet', action='store_true')
    ap.add_argument('--fairways-geojson', help='(testing / offline) fairway lines as GeoJSON instead of the WFS')
    ap.add_argument('--fuel-json', help='(testing / offline) Overpass JSON instead of querying Overpass')
    ap.add_argument('--out', default='sea')
    a = ap.parse_args()

    bbox = tuple(a.bbox)
    grid = Grid(bbox, a.cell)
    log(f'grid {grid.W} x {grid.H} = {grid.W * grid.H / 1e6:.1f} M cells, cell {a.cell} m (Web Mercator)')

    # depth
    depth_src = 'none'
    if a.depth_geojson:
        depth = depth_from_polys(grid, read_geojson_polys(a.depth_geojson, a.depth_field)); depth_src = 'geojson (test)'
    else:
        files = sorted(glob.glob(os.path.join(a.depth_dir, '**', '*.shp'), recursive=True))
        for z in sorted(glob.glob(os.path.join(a.depth_dir, '**', '*.zip'), recursive=True)):
            import zipfile
            with zipfile.ZipFile(z) as zf:
                files += ['/vsizip/' + os.path.abspath(z) + '/' + n for n in zf.namelist() if n.lower().endswith('.shp')]
        items = []
        for fpath in files:
            try:
                got = read_ogr_polys(fpath, field=a.depth_field)
                log(f'Traficom depth: {fpath}: {len(got)} polygons'); items += got
            except SystemExit as e:
                log(f'  skip {fpath}: {e}')
        if items:
            depth = depth_from_polys(grid, items); depth_src = 'Traficom depth areas'
        elif not a.no_emodnet:
            try:
                depth = depth_from_emodnet(grid, bbox); depth_src = 'EMODnet Bathymetry DTM'
            except Exception as e:  # keep going without depth
                log('EMODnet failed:', e)
                depth = np.full((grid.H, grid.W), 255, dtype=np.uint8)
        else:
            depth = np.full((grid.H, grid.W), 255, dtype=np.uint8)
    log('depth source:', depth_src)

    # land
    if a.land.endswith('.geojson') or a.land.endswith('.json') or a.land.endswith('.gz'):
        land_items = read_geojson_polys(a.land)
    else:
        land_items = read_ogr_polys(a.land, bbox=bbox)
    log(f'land polygons: {len(land_items)}')
    land = fill_rings(polygons_to_rings([r for r, _ in land_items], grid), grid.H, grid.W)
    depth[land] = 0
    log(f'land cells {int(land.sum())}, water cells {int((~land).sum())}')

    # fairways
    if a.fairways_geojson:
        with open(a.fairways_geojson) as f:
            feats = json.load(f)['features']
    else:
        feats = fetch_fairways(bbox)
    lines = lines_from_features(feats, bbox)
    graph = build_graph(lines)
    log(f'fairways: {len(lines)} lines, {len(graph["nodes"]) // 2} nodes, {len(graph["edges"]) // 4} edges')

    # fuel stations
    try:
        if a.fuel_json:
            with open(a.fuel_json) as f:
                els = json.load(f).get('elements', [])
        else:
            els = fetch_fuel(bbox)
        stations = stations_from_elements(els)
    except Exception as e:
        log('fuel stations failed (continuing without):', e)
        stations = []
    log(f'fuel stations: {len(stations)}')

    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, 'fuel.json'), 'w') as f:
        json.dump({'built': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'source': 'OpenStreetMap contributors (ODbL)', 'stations': stations}, f, ensure_ascii=False, separators=(',', ':'))
    with gzip.open(os.path.join(a.out, 'grid.bin.gz'), 'wb', compresslevel=9) as f:
        f.write(depth.tobytes())
    with gzip.open(os.path.join(a.out, 'fairways.json.gz'), 'wt', compresslevel=9) as f:
        json.dump(graph, f, separators=(',', ':'))
    meta = {'version': 1, 'x0': grid.x0, 'y1': grid.y1, 'cell': grid.cell, 'W': grid.W, 'H': grid.H,
            'bbox': bbox, 'built': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'depthSource': depth_src,
            'fairwayLines': len(lines), 'fairwayEdges': len(graph['edges']) // 4, 'fuelStations': len(stations),
            'attribution': 'Land © OpenStreetMap contributors (ODbL); depth: ' + depth_src + '; fairways © Väylävirasto (CC BY 4.0)'}
    with open(os.path.join(a.out, 'meta.json'), 'w') as f:
        json.dump(meta, f, indent=1)
    sz = sum(os.path.getsize(os.path.join(a.out, n)) for n in os.listdir(a.out))
    log(f'wrote {a.out}/ ({sz / 1e6:.1f} MB)')


if __name__ == '__main__':
    main()
