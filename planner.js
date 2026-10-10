/* Trip planner: fuel-feasible itineraries through fuel stations.
   Pure functions (no DOM) so the logic can be tested on its own.

   ctx = {
     D: distance matrix in metres between nodes,
     nodes: [{ kind: 'start' | 'via' | 'end' | 'station', name, price, priceEstimated }],
     order: indices of the mandatory chain [start, via..., end],
     tanks: { port: { level, min, cap }, stbd: {...} },   // litres; min = unusable + reserve
     rate: { port: L/NM, stbd: L/NM },                    // 0 for an engine that is off
     arriveL: litres above reserve wanted at the destination (both tanks together),
     extraL: extra litres on top of the need when refuelling (per refuel stop),
     defaultPrice: €/L used for fuel already in the tanks,
     kn: speed, stopMin: minutes per refuel stop, maxStops
   } */
'use strict';

const Planner = (() => {
  const NM = 1852, ENG = ['port', 'stbd'];

  function simulate(seq, ctx) {
    const { D, nodes, tanks, rate } = ctx;
    const tot = rate.port + rate.stbd;
    const share = { port: tot ? rate.port / tot : 0.5, stbd: tot ? rate.stbd / tot : 0.5 };
    const lv = { port: tanks.port.level, stbd: tanks.stbd.level };
    const legs = [];
    let nm = 0, buy = 0, stops = 0, estimated = false, shortfall = 0;
    for (let i = 0; i < seq.length - 1; i++) {
      const a = seq[i], b = seq[i + 1];
      const node = nodes[a];
      const refuel = { port: 0, stbd: 0 };
      if (node.kind === 'station') {
        // need-based: enough to reach the next station (or the destination) + extra, never above capacity
        let j = i + 1; while (j < seq.length - 1 && nodes[seq[j]].kind !== 'station') j++;
        let needNm = 0; for (let k = i; k < j; k++) needNm += D[seq[k]][seq[k + 1]] / NM;
        const atEnd = j === seq.length - 1;
        ENG.forEach((e) => {
          if (!rate[e]) return;
          const target = tanks[e].min + needNm * rate[e] + ctx.extraL * share[e] + (atEnd ? ctx.arriveL * share[e] : 0);
          refuel[e] = Math.max(0, Math.min(tanks[e].cap - lv[e], target - lv[e]));
          lv[e] += refuel[e];
        });
        const L = refuel.port + refuel.stbd;
        if (L >= 1) { stops++; buy += L * node.price; if (node.priceEstimated) estimated = true; }
        else { refuel.port = 0; refuel.stbd = 0; }
      }
      const dNm = D[a][b] / NM;
      if (!isFinite(dNm)) return { ok: false, reason: 'unreachable', shortfall: Infinity };
      nm += dNm;
      ENG.forEach((e) => { lv[e] -= dNm * rate[e]; shortfall = Math.max(shortfall, tanks[e].min - lv[e]); });
      legs.push({ from: a, to: b, nm: dNm, refuelAtFrom: refuel, arrive: { port: lv.port, stbd: lv.stbd } });
    }
    ENG.forEach((e) => { if (rate[e]) shortfall = Math.max(shortfall, tanks[e].min + ctx.arriveL * share[e] - lv[e]); });
    const usedOwn = Math.max(0, tanks.port.level + tanks.stbd.level + legs.reduce((s, l) => s + l.refuelAtFrom.port + l.refuelAtFrom.stbd, 0) - lv.port - lv.stbd - legs.reduce((s, l) => s + l.refuelAtFrom.port + l.refuelAtFrom.stbd, 0));
    const hours = nm / ctx.kn + stops * (ctx.stopMin || 15) / 60;
    return {
      ok: shortfall <= 0.5, shortfall: Math.max(0, shortfall), seq, legs, nm, hours, stops, buy, estimated,
      litresBought: legs.reduce((s, l) => s + l.refuelAtFrom.port + l.refuelAtFrom.stbd, 0),
      effCost: buy + Math.max(0, tanks.port.level + tanks.stbd.level - lv.port - lv.stbd) * ctx.defaultPrice,
      end: { port: lv.port, stbd: lv.stbd }, usedOwn
    };
  }

  function plan(ctx) {
    const { D, nodes, order } = ctx;
    const stations = nodes.map((n, i) => (n.kind === 'station' ? i : -1)).filter((i) => i >= 0);
    const maxStops = ctx.maxStops || 4;
    const all = [];
    // optimistic feasibility while searching: assume a refuel can always fill to capacity
    function dfs(seq, mand, used, opt) {
      const cur = seq[seq.length - 1];
      const target = order[mand];
      const tryNext = (nx, isStation) => {
        const d = D[cur][nx] / NM; if (!isFinite(d)) return;
        const o = { port: opt.port - d * ctx.rate.port, stbd: opt.stbd - d * ctx.rate.stbd };
        if (o.port < ctx.tanks.port.min - 0.5 || o.stbd < ctx.tanks.stbd.min - 0.5) return;
        if (isStation) {
          const o2 = { port: ctx.rate.port ? ctx.tanks.port.cap : o.port, stbd: ctx.rate.stbd ? ctx.tanks.stbd.cap : o.stbd };
          const u = new Set(used); u.add(nx);
          dfs(seq.concat(nx), mand, u, o2);
        } else if (mand === order.length - 1) {
          all.push(simulate(seq.concat(nx), ctx));
        } else dfs(seq.concat(nx), mand + 1, used, o);
      };
      tryNext(target, false);
      if (used.size < maxStops) stations.forEach((s) => { if (!used.has(s)) tryNext(s, true); });
    }
    dfs([order[0]], 1, new Set(), { port: ctx.tanks.port.level, stbd: ctx.tanks.stbd.level });
    const ok = all.filter((p) => p.ok);
    const pick = (cmp) => ok.slice().sort(cmp)[0] || null;
    const res = {
      cheapest: pick((a, b) => a.effCost - b.effCost || a.nm - b.nm),
      fewest: pick((a, b) => a.stops - b.stops || a.nm - b.nm),
      shortest: pick((a, b) => a.nm - b.nm || a.stops - b.stops),
      tried: all.length
    };
    if (!ok.length) {
      const direct = simulate(order, ctx);
      const best = all.slice().sort((a, b) => a.shortfall - b.shortfall)[0];
      res.failure = { direct, best: best && best.shortfall < direct.shortfall ? best : null };
    }
    return res;
  }

  return { plan, simulate };
})();

if (typeof module !== 'undefined') module.exports = Planner;
