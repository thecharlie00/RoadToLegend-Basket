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

  function getProfile(id) {
    const profile = PROFILES[id];
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
  function newPossessionClock(profile) { return profile.shotClock * 10; }
  function offensiveReboundClock(profile) { return profile.offensiveReboundReset * 10; }
  function frontcourtResetClock(profile, remainingTenths) { return Math.max(remainingTenths, profile.frontcourtReset * 10); }
  function foulOut(profile, personalFouls) { return personalFouls >= profile.personalFoulLimit; }
  function threePointDistance(profile, corner) { return corner ? profile.three.corner : profile.three.arc; }

  CAA.Rules = { PROFILES, getProfile, listProfiles, isOvertime, periodLabel, foulBucketKey, teamFoulBucket, bonusState, newPossessionClock, offensiveReboundClock, frontcourtResetClock, foulOut, threePointDistance };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Rules;
})(typeof globalThis !== 'undefined' ? globalThis : this);
