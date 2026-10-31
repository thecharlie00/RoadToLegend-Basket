(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);

  // Cifras NA verificadas 2026-27. Rookie scale / max-min exactos pendientes de CBA completo.
  const NA_ECONOMY_2026_27 = {
    season: '2026-27', salaryCap: 164961000, taxLine: 200428000, salaryFloor: 148465000,
    firstApron: 209015000, secondApron: 221686000,
    midLevel: { nonTaxpayer: 15044000, taxpayer: 6064000, room: 9366000 },
    sourceStatus: 'verified', sourceUrl: 'https://pr.nba.com/2026-27-salary-cap/',
    rookieScaleStatus: 'pending'
  };
  const EU_ECONOMY_DEFAULT = {
    season: '2026-27', budgetTop: 18000000, budgetSecond: 3500000,
    buyoutMultiplier: 1.35, foreignQuota: 5, windowMonths: [7, 8, 1, 2],
    sourceStatus: 'pending', notes: 'Presupuestos y cupos son propuesta MVP; verificar reglamento por competición.'
  };

  function yearsOfService(p) { return Math.max(0, (p.age || 19) - 19); }
  function naMaxSalary(p, cap) {
    const yos = yearsOfService(p);
    const pct = yos <= 6 ? 0.25 : yos <= 9 ? 0.30 : 0.35;
    return Math.round((cap || NA_ECONOMY_2026_27.salaryCap) * pct);
  }
  function naMinSalary(p) {
    const yos = yearsOfService(p);
    return Math.round(1100000 + Math.min(yos, 10) * 120000);
  }
  function rookieScale(pick) {
    // Tabla provisional MVP; no afirmar escala oficial exacta hasta cargar CBA.
    const base = Math.max(1000000, Math.round(10500000 * Math.pow(0.91, Math.max(0, pick - 1))));
    return { years: 2, teamOptionYears: 2, salary: base, sourceStatus: 'pending' };
  }
  function teamSalary(club) { return (club.roster || []).reduce((s, p) => s + (p.contract ? p.contract.salary : 0), 0); }
  function capState(club, economy) {
    const eco = economy || NA_ECONOMY_2026_27;
    const salary = teamSalary(club);
    return {
      salary, cap: eco.salaryCap, tax: eco.taxLine, floor: eco.salaryFloor,
      firstApron: eco.firstApron, secondApron: eco.secondApron,
      overCap: salary > eco.salaryCap, overTax: salary > eco.taxLine,
      overFirstApron: salary > eco.firstApron, overSecondApron: salary > eco.secondApron,
      belowFloor: salary < eco.salaryFloor
    };
  }
  function makeContract(config) {
    const c = Object.assign({ years: 1, salary: 1000000, option: 'none', guaranteed: true, buyout: null, signedSeason: '2026-27' }, config);
    if (c.years < 1 || c.salary < 0) throw new Error('invalid contract');
    return c;
  }
  function offerForPlayer(p, club, rng, economy) {
    const isNA = club.league === 'na-boreal-men';
    const ovr = p.ovr || 50;
    if (isNA) {
      const max = naMaxSalary(p, economy && economy.salaryCap);
      const min = naMinSalary(p);
      const target = Math.round(min + (max - min) * Math.pow(Math.max(0, ovr - 40) / 59, 2.2));
      const salary = Math.max(min, Math.min(max, target + rng.int(-200000, 200000)));
      return makeContract({ years: rng.int(1, 4), salary, option: rng.float() < 0.2 ? 'team' : 'none', league: 'NA' });
    }
    const budget = club.budget || EU_ECONOMY_DEFAULT.budgetSecond;
    const salary = Math.max(60000, Math.round(budget * 0.08 * Math.pow(ovr / 60, 2) + rng.int(-30000, 30000)));
    return makeContract({ years: rng.int(1, 3), salary, buyout: Math.round(salary * EU_ECONOMY_DEFAULT.buyoutMultiplier), league: 'EU' });
  }
  function canSign(club, p, contract, economy) {
    const isNA = club.league === 'na-boreal-men';
    if (!isNA) return { ok: true };
    const cap = capState(club, economy);
    const next = cap.salary + contract.salary;
    if (next > cap.secondApron) return { ok: false, reason: 'second-apron' };
    if (contract.salary > naMaxSalary(p, economy && economy.salaryCap)) return { ok: false, reason: 'max-salary' };
    if (contract.salary < naMinSalary(p)) return { ok: false, reason: 'min-salary' };
    return { ok: true, cap: capState(Object.assign({}, club, { roster: (club.roster || []).concat([Object.assign({}, p, { contract })]) }), economy) };
  }
  function tradeMatch(a, b, economy) {
    // Simplificación MVP: matching 125% + 100k para equipos bajo segundo apron.
    const capA = capState(a, economy), capB = capState(b, economy);
    if (capA.overSecondApron || capB.overSecondApron) return { ok: false, reason: 'apron-aggregation-pending' };
    const sa = a.tradeSalary || 0, sb = b.tradeSalary || 0;
    const ok = sa <= sb * 1.25 + 100000 && sb <= sa * 1.25 + 100000;
    return { ok, reason: ok ? null : 'salary-mismatch' };
  }
  function buyoutCost(p) { return p.contract && p.contract.buyout ? p.contract.buyout : Math.round((p.contract ? p.contract.salary : 0) * 0.5); }
  function expiring(p, season) { return p.contract && p.contract.years <= 1; }
  function tickContract(p) { if (p.contract) { p.contract.years--; if (p.contract.years <= 0) p.contract = null; } return p; }

  CAA.Contracts = { NA_ECONOMY_2026_27, EU_ECONOMY_DEFAULT, naMaxSalary, naMinSalary, rookieScale, teamSalary, capState, makeContract, offerForPlayer, canSign, tradeMatch, buyoutCost, expiring, tickContract };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Contracts;
})(typeof globalThis !== 'undefined' ? globalThis : this);
