(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  if (typeof require === 'function') {
    if (!CAA.Hash) require('../core/hash.js');
    if (!CAA.RNG) require('../core/rng.js');
    if (!CAA.Clock) require('../core/clock.js');
    if (!CAA.World) require('../data/world.js');
    if (!CAA.Rules) require('../match/rules.js');
    if (!CAA.Match) require('../match/engine.js');
    if (!CAA.Live) require('../match/live.js');
    if (!CAA.Arcade) require('../match/arcade.js');
    if (!CAA.Pet) require('../domain/pet.js');
    if (!CAA.Playoffs) require('../domain/playoffs.js');
    if (!CAA.Calibration) require('../match/calibration.js');
    if (!CAA.Names) require('../domain/names.js');
    if (!CAA.Player) require('../domain/player.js');
    if (!CAA.Contracts) require('../domain/contracts.js');
    if (!CAA.Season) require('../domain/season.js');
    if (!CAA.Draft) require('../domain/draft.js');
    if (!CAA.Career) require('../domain/career.js');
    if (!CAA.Content) require('../domain/content.js');
    if (!CAA.Minigames) require('../match/minigames.js');
  }

  function handle(msg) {
    const id = msg && msg.id;
    try {
      if (!msg || typeof msg.type !== 'string') throw new Error('type required');
      let result;
      switch (msg.type) {
        case 'ping':
          result = { pong: true, worker: true };
          break;
        case 'rng': {
          const rng = CAA.RNG.create(msg.payload && msg.payload.seed);
          const n = Math.min(1000, Math.max(1, (msg.payload && msg.payload.n) || 10));
          const values = [];
          for (let i = 0; i < n; i++) values.push(rng.nextUint32());
          result = { values, snapshot: rng.serialize() };
          break;
        }
        case 'clock': {
          const clock = CAA.Clock.createMatchClock(msg.payload || {});
          clock.start();
          const ticks = Math.min(10000, Math.max(1, (msg.payload && msg.payload.ticks) || 10));
          let last;
          for (let i = 0; i < ticks; i++) last = clock.tick();
          result = { last, snapshot: clock.snapshot() };
          break;
        }
        case 'world.validate':
          result = CAA.World.validatePack(msg.payload);
          break;
        case 'world.coverage':
          result = CAA.World.coverage(msg.payload);
          break;
        case 'hash':
          result = { hash: CAA.Hash.hex32(CAA.Hash.hashObject(msg.payload)) };
          break;
        case 'rules.list':
          result = { profiles: CAA.Rules.listProfiles() };
          break;
        case 'rules.profile':
          result = CAA.Rules.getProfile(msg.payload && msg.payload.id);
          break;
        case 'match.simulate': {
          const state = CAA.Match.simulateMatch(msg.payload || {});
          result = { state: CAA.Match.serializeMatch(state), box: CAA.Match.boxScore(state), validation: CAA.Match.validateBox(state) };
          break;
        }
        case 'match.box':
          result = CAA.Match.boxScore(msg.payload && msg.payload.state);
          break;
        case 'calibration.batch':
          result = CAA.Calibration.runBatch(msg.payload || {});
          break;
        case 'career.clubs': {
          const route = msg.payload && msg.payload.route || 'eu-academy';
          const leagueId = route === 'eu-academy' ? 'es-ascenso-iberico' : 'na-boreal-men';
          result = { route, leagueId, clubs: CAA.Season.clubCatalog(leagueId) };
          break;
        }
        case 'career.create':
          result = CAA.Career.serialize(CAA.Career.createCareer(msg.payload || {}));
          break;
        case 'career.advance': {
          const state = CAA.Career.resume(msg.payload.state);
          CAA.Career.advanceWeek(state, msg.payload.action);
          result = { state: CAA.Career.serialize(state), summary: CAA.Career.summary(state) };
          break;
        }
        case 'career.sign': {
          const state = CAA.Career.resume(msg.payload.state);
          CAA.Career.signOffer(state, msg.payload.index);
          result = { state: CAA.Career.serialize(state), summary: CAA.Career.summary(state) };
          break;
        }
        case 'career.live': {
          const state = CAA.Career.resume(msg.payload.state);
          const p = msg.payload || {};
          const live = p.start ? CAA.Career.liveStart(state) : CAA.Career.liveAdvance(state, { choice: p.choice, toEnd: !!p.toEnd, release: Number.isFinite(p.release) ? p.release : undefined });
          result = { state: CAA.Career.serialize(state), summary: CAA.Career.summary(state), live: CAA.Live.view(live) };
          break;
        }
        case 'career.arcade': {
          const state = CAA.Career.resume(msg.payload.state);
          const p = msg.payload || {};
          let arcade = null;
          if (p.start) arcade = { pending: CAA.Career.arcadeStart(state, { type: p.type }) };
          else if (p.cancel) { CAA.Career.arcadeCancel(state); arcade = { cancelled: true }; }
          else arcade = CAA.Career.arcadeFinish(state, { ticks: p.ticks, auto: !!p.auto });
          result = { state: CAA.Career.serialize(state), summary: CAA.Career.summary(state), arcade };
          break;
        }
        case 'career.pet': {
          const state = CAA.Career.resume(msg.payload.state);
          const pet = CAA.Career.petOp(state, msg.payload.config || {});
          result = { state: CAA.Career.serialize(state), summary: CAA.Career.summary(state), pet };
          break;
        }
        case 'career.dismissSummary': {
          const state = CAA.Career.resume(msg.payload.state);
          CAA.Career.dismissSummary(state);
          result = { state: CAA.Career.serialize(state), summary: CAA.Career.summary(state) };
          break;
        }
        case 'career.coach': {
          const state = CAA.Career.resume(msg.payload.state);
          CAA.Career.coachSet(state, msg.payload.config || {});
          result = { state: CAA.Career.serialize(state), summary: CAA.Career.summary(state) };
          break;
        }
        case 'career.summary':
          result = CAA.Career.summary(CAA.Career.resume(msg.payload.state));
          break;
        case 'content.validate':
          result = CAA.Content.validate();
          break;
        case 'career.event': {
          const state = CAA.Career.resume(msg.payload.state);
          CAA.Career.chooseEvent(state, msg.payload.optionId);
          result = { state: CAA.Career.serialize(state), summary: CAA.Career.summary(state) };
          break;
        }
        case 'career.buy': {
          const state = CAA.Career.resume(msg.payload.state);
          CAA.Career.buyItem(state, msg.payload.itemId);
          result = { state: CAA.Career.serialize(state), summary: CAA.Career.summary(state) };
          break;
        }
        case 'career.equip': {
          const state = CAA.Career.resume(msg.payload.state);
          CAA.Career.equipItem(state, msg.payload.itemId);
          result = { state: CAA.Career.serialize(state), summary: CAA.Career.summary(state) };
          break;
        }
        case 'career.practice.begin':
        case 'career.practice.resolve':
        case 'career.practice.cancel':
        case 'career.practice': {
          const state = CAA.Career.resume(msg.payload.state);
          const config = msg.payload.config || {};
          const practice = msg.type === 'career.practice.begin' ? CAA.Career.beginPractice(state, config)
            : msg.type === 'career.practice.resolve' ? CAA.Career.resolvePractice(state, config)
            : msg.type === 'career.practice.cancel' ? CAA.Career.cancelPractice(state)
            : CAA.Career.practice(state, config);
          result = { state: CAA.Career.serialize(state), summary: CAA.Career.summary(state), practice };
          break;
        }
        case 'career.guide': {
          const state = CAA.Career.resume(msg.payload.state);
          CAA.Career.nextGuide(state);
          result = { state: CAA.Career.serialize(state), summary: CAA.Career.summary(state) };
          break;
        }
        case 'minigame.resolve':
          result = msg.payload && msg.payload.type === 'buzzer' ? CAA.Minigames.buzzer(msg.payload) : CAA.Minigames.freeThrow(msg.payload || {});
          break;
        case 'career.crossing': {
          const state = CAA.Career.resume(msg.payload.state);
          const crossing = CAA.Career.exploreCrossing(state, msg.payload.targetLeagueId);
          result = { state: CAA.Career.serialize(state), summary: CAA.Career.summary(state), crossing };
          break;
        }
        case 'season.play': {
          const season = CAA.Season.createSeason(msg.payload.leagueId, msg.payload.seed);
          CAA.Season.playRegularSeason(season, msg.payload.seed);
          result = { table: CAA.Season.standings(season.clubs), hash: CAA.Season.hashSeason(season), round: season.round };
          break;
        }
        case 'draft.run': {
          const season = CAA.Season.createSeason('na-boreal-men', msg.payload.seed || 'draft');
          CAA.Season.playRegularSeason(season, msg.payload.seed || 'draft');
          const table = CAA.Season.standings(season.clubs);
          const seeds = CAA.Season.naPlayoffSeeds(season);
          const lottery = CAA.Draft.lotteryOrder(seeds.lottery, (msg.payload.seed || 'draft') + ':lottery');
          const order = CAA.Draft.draftOrder(lottery, table.slice(0, 16).map(r => r.id));
          result = CAA.Draft.runDraft({ seed: (msg.payload.seed || 'draft') + ':class', order });
          break;
        }
        default:
          throw new Error('unknown type: ' + msg.type);
      }
      return { id, ok: true, result };
    } catch (err) {
      return { id, ok: false, error: String(err && err.message || err) };
    }
  }

  CAA.WorkerHandler = { handle };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.WorkerHandler;
})(typeof globalThis !== 'undefined' ? globalThis : this);
