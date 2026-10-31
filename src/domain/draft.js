(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);
  const Player = CAA.Player || (typeof require === 'function' ? require('./player.js') : null);
  const Contracts = CAA.Contracts || (typeof require === 'function' ? require('./contracts.js') : null);

  // Lotería NA 2026: 14 equipos, tres peores 14% para pick 1. Dos rondas.
  const LOTTERY_ODDS = [140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5];
  function weightedPick(rng, items) {
    const total = items.reduce((s, x) => s + x.weight, 0);
    let r = rng.float() * total;
    for (const x of items) { r -= x.weight; if (r <= 0) return x; }
    return items[items.length - 1];
  }
  function lotteryOrder(worstToBest, seed) {
    if (worstToBest.length !== 14) throw new Error('lottery needs 14 teams');
    const rng = RNG.create(seed || 'lottery');
    const pool = worstToBest.map((id, i) => ({ id, weight: LOTTERY_ODDS[i] }));
    const top = [];
    for (let i = 0; i < 4; i++) {
      const pick = weightedPick(rng, pool);
      top.push(pick.id);
      pool.splice(pool.indexOf(pick), 1);
    }
    const rest = worstToBest.filter(id => !top.includes(id));
    return top.concat(rest);
  }
  function draftOrder(lottery, playoffTeamsByRecord) {
    const nonLottery = playoffTeamsByRecord.slice().reverse();
    const round1 = lottery.concat(nonLottery);
    return { round1, round2: round1.slice() };
  }
  function generateProspects(seed, count) {
    const rng = RNG.create(seed || 'prospects');
    const out = [];
    const nats = ['US', 'US', 'US', 'CA', 'FR', 'ES', 'DE', 'IT', 'TR', 'GR', 'AU', 'CN', 'JP', 'KR', 'PH', 'ZA', 'AR', 'BR', 'LT', 'RS'];
    for (let i = 0; i < count; i++) {
      const quality = Math.max(35, Math.round(78 - i * 0.7 + rng.int(-6, 6)));
      const p = Player.createPlayer({ seed: (seed || 'prospects') + ':p' + i, quality, age: rng.int(18, 22), nationality: rng.pick(nats) });
      p.draftProjection = Math.max(1, Math.min(60, i + 1 + rng.int(-5, 5)));
      out.push(p);
    }
    return out.sort((a, b) => a.draftProjection - b.draftProjection);
  }
  function runDraft(config) {
    const seed = config.seed || 'draft';
    const order = config.order;
    if (!order || !order.round1 || order.round1.length !== 30) throw new Error('draft order needs 30 picks per round');
    const prospects = config.prospects || generateProspects(seed + ':class', 80);
    const rng = RNG.create(seed + ':picks');
    const picks = [];
    const pool = prospects.slice();
    for (let round = 1; round <= 2; round++) {
      const teams = round === 1 ? order.round1 : order.round2;
      for (let i = 0; i < teams.length; i++) {
        const idx = Math.min(pool.length - 1, Math.max(0, i + rng.int(-3, 3)));
        const p = pool.splice(idx, 1)[0];
        if (!p) continue;
        const scale = Contracts.rookieScale((round - 1) * 30 + i + 1);
        p.contract = Contracts.makeContract({ years: scale.years, salary: scale.salary, option: 'team', league: 'NA', rookie: true, sourceStatus: scale.sourceStatus });
        p.drafted = { round, pick: i + 1, overall: (round - 1) * 30 + i + 1, team: teams[i] };
        picks.push({ round, pick: i + 1, overall: (round - 1) * 30 + i + 1, team: teams[i], player: p.id, name: p.name });
      }
    }
    const undrafted = pool.map(p => { p.drafted = null; return { id: p.id, name: p.name, ovr: p.ovr }; });
    return { picks, undrafted, prospects: prospects.map(p => ({ id: p.id, name: p.name, ovr: p.ovr, drafted: p.drafted })) };
  }
  function undraftedOffer(p, club, rng) {
    const salary = Math.max(Contracts.naMinSalary(p), 1100000);
    return Contracts.makeContract({ years: 1, salary, guaranteed: false, league: 'NA', twoWayPending: true });
  }

  CAA.Draft = { LOTTERY_ODDS, lotteryOrder, draftOrder, generateProspects, runDraft, undraftedOffer };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Draft;
})(typeof globalThis !== 'undefined' ? globalThis : this);
