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
  // Draft de la WNBA (reglas reales de 2026): 3 rondas con un turno por equipo. Hay lotería entre los equipos que no
  // jugaron playoffs, pero solo decide los números 1 y 2 (dos extracciones ponderadas por el récord); el resto de los
  // no clasificados elige por peor récord y después los de playoffs, de peor a mejor. Entran jugadoras que cumplen 22 años
  // ese año o han terminado la universidad, e internacionales que cumplen 20.
  const WNBA_ODDS = [27, 23, 17, 13, 9, 7, 4];
  function wnbaOrder(worstToBest, seed, playoffTeams) {
    const n = worstToBest.length, out = Math.max(2, n - (playoffTeams || 8));
    const rng = RNG.create(seed || 'wnba-lottery');
    const pool = worstToBest.slice(0, out).map((id, i) => ({ id, weight: WNBA_ODDS[i] || 3 }));
    const top = [];
    for (let i = 0; i < 2 && pool.length; i++) { const pick = weightedPick(rng, pool); top.push(pick.id); pool.splice(pool.indexOf(pick), 1); }
    const r1 = top.concat(worstToBest.filter(id => !top.includes(id)));
    return { rounds: [r1, r1.slice(), r1.slice()], round1: r1, league: 'wnba', lottery: top };
  }
  function wnbaRookie(overall, perRound) {
    // Escala de novatas aproximada (USD): primera ronda escalonada con 3 años + opción del club; resto, mínimos.
    const round = Math.ceil(overall / perRound);
    const salary = round === 1 ? Math.round(95000 - (overall - 1) * 1600) : round === 2 ? 72000 : 68000;
    return { years: round === 1 ? 3 : 2, salary, sourceStatus: 'estimate' };
  }
  function generateProspects(seed, count, opts) {
    if (opts && opts.women) return womenProspects(seed, count);
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
  function womenProspects(seed, count) {
    const rng = RNG.create(seed || 'w-prospects'), out = [];
    const nats = ['US', 'US', 'US', 'US', 'US', 'CA', 'AU', 'FR', 'ES', 'BE', 'JP', 'CN', 'BR', 'NG', 'SN', 'DE', 'IT', 'LT', 'RS', 'NL'];
    for (let i = 0; i < count; i++) {
      const nat = rng.pick(nats), intl = nat !== 'US' && nat !== 'CA';
      const quality = Math.max(35, Math.round(76 - i * 0.75 + rng.int(-6, 6)));
      const p = Player.createPlayer({ seed: (seed || 'w-prospects') + ':p' + i, quality, age: intl ? rng.int(20, 23) : 22, nationality: nat, gender: 'f' });
      p.draftProjection = Math.max(1, Math.min(45, i + 1 + rng.int(-4, 4)));
      out.push(p);
    }
    return out.sort((a, b) => a.draftProjection - b.draftProjection);
  }
  function runDraft(config) {
    const seed = config.seed || 'draft';
    const order = config.order;
    const wnba = order && order.league === 'wnba';
    if (!order || !order.round1 || (!wnba && order.round1.length !== 30)) throw new Error('draft order needs 30 picks per round');
    const per = order.round1.length, rounds = order.rounds || [order.round1, order.round2];
    const prospects = config.prospects || (wnba ? womenProspects(seed + ':class', per * 4) : generateProspects(seed + ':class', 80));
    const rng = RNG.create(seed + ':picks');
    const picks = [];
    const pool = prospects.slice();
    for (let round = 1; round <= rounds.length; round++) {
      const teams = rounds[round - 1];
      for (let i = 0; i < teams.length; i++) {
        const idx = Math.min(pool.length - 1, Math.max(0, i + rng.int(-3, 3)));
        const p = pool.splice(idx, 1)[0];
        if (!p) continue;
        const overall = (round - 1) * per + i + 1, scale = wnba ? wnbaRookie(overall, per) : Contracts.rookieScale(overall);
        p.contract = Contracts.makeContract({ years: scale.years, salary: scale.salary, option: 'team', league: 'NA', rookie: true, sourceStatus: scale.sourceStatus });
        p.drafted = { round, pick: i + 1, overall, team: teams[i] };
        picks.push({ round, pick: i + 1, overall, team: teams[i], player: p.id, name: p.name });
      }
    }
    const undrafted = pool.map(p => { p.drafted = null; return { id: p.id, name: p.name, ovr: p.ovr }; });
    return { picks, undrafted, prospects: prospects.map(p => ({ id: p.id, name: p.name, ovr: p.ovr, drafted: p.drafted })) };
  }
  function undraftedOffer(p, club, rng) {
    // Sin draft: contrato de pretemporada no garantizado (en la WNBA, el mínimo de la liga).
    const women = p && (p.gender === 'women' || p.gender === 'f');
    const salary = women ? 66000 : Math.max(Contracts.naMinSalary(p), 1100000);
    return Contracts.makeContract({ years: 1, salary, guaranteed: false, league: 'NA', twoWayPending: !women });
  }

  CAA.Draft = { LOTTERY_ODDS, WNBA_ODDS, lotteryOrder, draftOrder, wnbaOrder, generateProspects, runDraft, undraftedOffer };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Draft;
})(typeof globalThis !== 'undefined' ? globalThis : this);
