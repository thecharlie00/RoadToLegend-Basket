(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};

  const PROFILES = {
    'FIBA-2026': {
      id: 'FIBA-2026', periods: 4, periodMinutes: 10, overtimeMinutes: 5,
      shotClock: 24, offensiveReboundReset: 14, frontcourtReset: 14, backcourtAdvance: 8,
      personalFoulLimit: 5, teamFoulReset: 'quarter', otFoulsCarryFrom: 4,
      bonus: { type: 'quarter', threshold: 5, freeThrows: 2 },
      timeouts: { firstHalf: 2, secondHalf: 3, maxLate: 2, overtime: 1 },
      alternatingPossession: true, defensiveThreeSeconds: false,
      court: { length: 28, width: 15 }, three: { arc: 6.75, corner: 6.60 }
    },
    'NA-2026-27': {
      id: 'NA-2026-27', periods: 4, periodMinutes: 12, overtimeMinutes: 5,
      shotClock: 24, offensiveReboundReset: 14, frontcourtReset: 14, backcourtAdvance: 8,
      personalFoulLimit: 6, teamFoulReset: 'quarter', otFoulsCarryFrom: null,
      bonus: { type: 'nba', threshold: 5, lateThreshold: 2, otThreshold: 4, freeThrows: 2 },
      timeouts: { total: 7, maxFourth: 4, maxLate: 2, overtime: 2 },
      alternatingPossession: false, defensiveThreeSeconds: true,
      court: { length: 28.65, width: 15.24 }, three: { arc: 7.24, corner: 6.70 }
    },
    'NCAA-M-2026-27': {
      id: 'NCAA-M-2026-27', periods: 2, periodMinutes: 20, overtimeMinutes: 5,
      shotClock: 30, offensiveReboundReset: 20, frontcourtReset: 20, backcourtAdvance: 10,
      personalFoulLimit: 5, teamFoulReset: 'half', otFoulsCarryFrom: 2,
      bonus: { type: 'ncaa-men', oneAndOne: 7, double: 10 },
      timeouts: { mediaDependent: true },
      alternatingPossession: true, defensiveThreeSeconds: false,
      court: { length: 28.65, width: 15.24 }, three: { arc: 6.75, corner: 6.60 }
    },
    'NCAA-W-2026-27': {
      id: 'NCAA-W-2026-27', periods: 4, periodMinutes: 10, overtimeMinutes: 5,
      shotClock: 30, offensiveReboundReset: 20, frontcourtReset: 20, backcourtAdvance: 10,
      personalFoulLimit: 5, teamFoulReset: 'quarter', otFoulsCarryFrom: 4,
      bonus: { type: 'quarter', threshold: 5, freeThrows: 2 },
      timeouts: { mediaDependent: true },
      alternatingPossession: true, defensiveThreeSeconds: false,
      court: { length: 28.65, width: 15.24 }, three: { arc: 6.75, corner: 6.60 }
    }
  };

  // Reglas de época codificadas en el propio id (se reconstruyen igual en el worker y al cargar):
  // ERA|<base>|<periodos>x<minutos>|sc<reloj de posesión, 0 = sin reloj>|t<triple en cm, 0 = sin triple>|p<ritmo %>|m<acierto ±%>
  function eraId(base, o) { return ['ERA', base, o.periods + 'x' + o.periodMinutes, 'sc' + (o.shotClock || 0), 't' + Math.round((o.three || 0) * 100), 'p' + Math.round((o.pace || 1) * 100), 'm' + Math.round((o.shootMod || 0) * 100), 'r' + Math.round((o.threeCap || 1) * 100)].join('|'); }
  function eraProfile(id) {
    const [, base, pm, sc, tp, pc, md, rc] = id.split('|');
    const b = PROFILES[base]; if (!b) return null;
    const [periods, periodMinutes] = pm.split('x').map(Number), shot = Number(sc.slice(2)), three = Number(tp.slice(1)) / 100;
    const p = JSON.parse(JSON.stringify(b));
    Object.assign(p, { id, periods, periodMinutes, era: true, pace: Number(pc.slice(1)) / 100, shootMod: Number(md.slice(1)) / 100, threeCap: rc ? Number(rc.slice(1)) / 100 : 1,
      shotClock: shot || null, offensiveReboundReset: shot ? Math.min(shot, b.offensiveReboundReset) : null, frontcourtReset: shot ? Math.min(shot, b.frontcourtReset) : null,
      three: three ? { arc: three, corner: Math.min(three, 6.6) } : null, teamFoulReset: periods === 2 ? 'half' : b.teamFoulReset });
    if (periods === 2) { p.bonus = { type: 'quarter', threshold: 7, freeThrows: 2 }; p.otFoulsCarryFrom = 2; }
    PROFILES[id] = p;
    return p;
  }
  function getProfile(id) {
    const profile = PROFILES[id] || (typeof id === 'string' && id.startsWith('ERA|') ? eraProfile(id) : null);
    if (!profile) throw new Error('unknown ruleSet: ' + id);
    return profile;
  }
  function listProfiles() { return Object.keys(PROFILES); }
  function isOvertime(profile, period) { return period > profile.periods; }
  function periodLabel(profile, period) {
    if (isOvertime(profile, period)) return 'OT' + (period - profile.periods);
    if (profile.periods === 2) return period === 1 ? 'H1' : 'H2';
    return 'Q' + period;
  }
  function foulBucketKey(profile, period) {
    if (profile.teamFoulReset === 'half') return period <= 2 ? period : 2;
    if (isOvertime(profile, period) && profile.otFoulsCarryFrom) return profile.otFoulsCarryFrom;
    return period;
  }
  function teamFoulBucket(profile, period, foulsByPeriod) {
    return foulsByPeriod[foulBucketKey(profile, period)] || 0;
  }
  function bonusState(profile, teamFouls, period, gameClockTenths, lateFouls) {
    const ot = isOvertime(profile, period);
    const late = gameClockTenths <= 1200;
    if (profile.bonus.type === 'ncaa-men') {
      if (teamFouls >= profile.bonus.double) return { freeThrows: 2, oneAndOne: false };
      if (teamFouls >= profile.bonus.oneAndOne) return { freeThrows: 1, oneAndOne: true };
      return { freeThrows: 0, oneAndOne: false };
    }
    if (profile.bonus.type === 'nba') {
      if (ot) return { freeThrows: teamFouls >= profile.bonus.otThreshold ? 2 : 0, oneAndOne: false };
      if (teamFouls >= profile.bonus.threshold) return { freeThrows: 2, oneAndOne: false };
      if (late && (lateFouls || 0) >= profile.bonus.lateThreshold) return { freeThrows: 2, oneAndOne: false };
      return { freeThrows: 0, oneAndOne: false };
    }
    return { freeThrows: teamFouls >= profile.bonus.threshold ? 2 : 0, oneAndOne: false };
  }
  // Sin reloj de posesión (antes de 1954/1956): un valor que nunca llega a cero dentro de un periodo.
  const NO_CLOCK = 99999;
  function newPossessionClock(profile) { return profile.shotClock ? profile.shotClock * 10 : NO_CLOCK; }
  function offensiveReboundClock(profile) { return profile.shotClock ? profile.offensiveReboundReset * 10 : NO_CLOCK; }
  function frontcourtResetClock(profile, remainingTenths) { return profile.shotClock ? Math.max(remainingTenths, profile.frontcourtReset * 10) : NO_CLOCK; }
  function foulOut(profile, personalFouls) { return personalFouls >= profile.personalFoulLimit; }
  function threePointDistance(profile, corner) { return !profile.three ? null : corner ? profile.three.corner : profile.three.arc; }

  CAA.Rules = { PROFILES, eraId, getProfile, listProfiles, isOvertime, periodLabel, foulBucketKey, teamFoulBucket, bonusState, newPossessionClock, offensiveReboundClock, frontcourtResetClock, foulOut, threePointDistance };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Rules;
})(typeof globalThis !== 'undefined' ? globalThis : this);
