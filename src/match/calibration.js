(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const Match = CAA.Match || (typeof require === 'function' ? require('./engine.js') : null);
  const Rules = CAA.Rules || (typeof require === 'function' ? require('./rules.js') : null);

  const NBA_TARGET = { pts: 115.61, fga: 89.09, fgm: 41.97, '3pa': 36.97, '3pm': 13.30, fta: 23.49, ftm: 18.38, orb: 11.38, drb: 32.39, ast: 26.74, stl: 8.42, blk: 4.84, tov: 14.51, pf: 19.87, possessions: 99.4 };

  function mean(arr) { return arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length); }
  function percentile(arr, p) { const s = arr.slice().sort((a, b) => a - b); const i = (s.length - 1) * p; const lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }
  function variance(arr) { const m = mean(arr); return mean(arr.map(x => (x - m) * (x - m))); }

  function runBatch(config = {}) {
    const games = Math.max(1, Math.min(config.games || 100, 5000));
    const ruleSetId = config.ruleSetId || 'NA-2026-27';
    const rating = config.rating || 50;
    const rows = [];
    const margins = [];
    let upsets = 0;
    for (let i = 0; i < games; i++) {
      const teams = Match.neutralTeams(rating);
      if (config.ratingDiff) { teams[0] = Match.demoTeam('home', 'Home', rating + config.ratingDiff); teams[1] = Match.demoTeam('away', 'Away', rating - config.ratingDiff); }
      const state = Match.simulateMatch({ ruleSetId, seed: (config.seed || 'calibration') + ':' + i, teams, matchId: 'cal-' + i, tuning: config.tuning });
      const valid = Match.validateBox(state);
      if (!valid.ok) throw new Error('invalid box: ' + valid.errors.join('; '));
      for (const t of state.teams) rows.push(Object.assign({}, t.stats));
      margins.push(Math.abs(state.score[0] - state.score[1]));
      if (config.ratingDiff && state.winner !== 0) upsets++;
    }
    const summary = {};
    for (const k of Object.keys(rows[0])) {
      const vals = rows.map(r => r[k]);
      summary[k] = { mean: +mean(vals).toFixed(3), p10: +percentile(vals, 0.1).toFixed(3), p90: +percentile(vals, 0.9).toFixed(3), variance: +variance(vals).toFixed(3) };
    }
    const fgm = summary.fgm.mean, fga = summary.fga.mean, tpm = summary['3pm'].mean, tpa = summary['3pa'].mean, ftm = summary.ftm.mean, fta = summary.fta.mean, pts = summary.pts.mean;
    const derived = {
      fgPct: +(fgm / fga).toFixed(4), threePct: +(tpm / tpa).toFixed(4), ftPct: +(ftm / fta).toFixed(4),
      threePAr: +(tpa / fga).toFixed(4), fTr: +(fta / fga).toFixed(4),
      efgPct: +((fgm + 0.5 * tpm) / fga).toFixed(4), tsPct: +(pts / (2 * (fga + 0.44 * fta))).toFixed(4),
      orbPct: +(summary.orb.mean / (summary.orb.mean + summary.drb.mean)).toFixed(4),
      astPct: +(summary.ast.mean / fgm).toFixed(4)
    };
    const target = ruleSetId === 'NA-2026-27' ? NBA_TARGET : null;
    const deltas = {};
    if (target) for (const [k, v] of Object.entries(target)) deltas[k] = +(((summary[k].mean - v) / v) * 100).toFixed(2);
    const deltaKeys = Object.keys(deltas);
    const maxAbsDelta = deltaKeys.length ? +Math.max(...deltaKeys.map(k => Math.abs(deltas[k]))).toFixed(2) : null;
    return { ruleSetId, games, teamGames: rows.length, summary, derived, margins: { mean: +mean(margins).toFixed(2), p10: +percentile(margins, 0.1).toFixed(2), p90: +percentile(margins, 0.9).toFixed(2) }, upsetRate: config.ratingDiff ? +(upsets / games).toFixed(3) : null, target, deltas, maxAbsDelta, withinThreePercent: maxAbsDelta == null ? null : maxAbsDelta <= 3 };
  }

  CAA.Calibration = { NBA_TARGET, runBatch, mean, percentile, variance };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Calibration;
})(typeof globalThis !== 'undefined' ? globalThis : this);
