(function (root) {
  'use strict';
  // Acciones · Carrera: jornada, mundo, mercado, club, equipamiento, entrenador, familia y temporada.
  // Cada entrada recibe (name, el) igual que antes en la cadena de action(); lo compartido llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIActions = CAA.UIActions || {};
  CAA.UIActions["career"] = function (ui) {
    const { acceptCareer, jmQuickStart, matchKeys, notify, render, state, t } = ui;
    const exact = {}, patterns = [];
    const h0 = async (name, el) => {
      if (!state.career.state) throw new Error(t('career.empty'));
      const action = name === 'career-train' ? { type: 'train', focus: 'tiroTriple' } : name === 'career-rest' ? { type: 'rest' } : { type: 'play' };
      if (await jmQuickStart()) { state.busy = false; render(); return; }
      const res = await ui.worker.send('career.advance', { state: state.career.state, action });
      await acceptCareer(res);
    };
    for (const k of ["career-play","career-train","career-rest"]) exact[k] = h0;
    exact["ed-save"] = async (name, el) => {
      const key = el.dataset.input, inp = key ? doc.getElementById(key) : null;
      const value = key ? (Object.prototype.hasOwnProperty.call(state.drafts, key) ? state.drafts[key] : inp ? inp.value : '') : '';
      const res = await ui.worker.send('career.edit', { state: state.career.state, config: { op: el.dataset.op, id: el.dataset.id, name: value } });
      await acceptCareer(res); for (const k of Object.keys(state.drafts)) if (/^ed-/.test(k)) delete state.drafts[k]; notify(t('ed.saved'));
    };
    exact["sim-season"] = async (name, el) => {
      const res = await ui.worker.send('career.simSeason', { state: state.career.state });
      await acceptCareer(res); state.tab = 'career'; notify(t('more.simDone'));
    };
    exact["sim-decision"] = async (name, el) => {
      if (!state.career.state) throw new Error(t('career.empty'));
      const res = await ui.worker.send('career.simToDecision', { state: state.career.state });
      await acceptCareer(res);
      const sim = res.sim || { weeks: 0, reason: 'limit' };
      notify(t('simd.done', { n: sim.weeks }) + ' · ' + t('simd.reason.' + sim.reason));
    };
    exact["draw-results"] = async (name, el) => { state.drawStep = 'results'; };
    exact["world-op"] = async (name, el) => {
      const res = await ui.worker.send('career.world', { state: state.career.state, config: { op: el.dataset.op, id: el.dataset.id, tactic: el.dataset.tactic } });
      if (el.dataset.op === 'draw-seen') state.drawStep = null;
      await acceptCareer(res); if (ui.audio) ui.audio.play('success');
      if (el.dataset.op === 'deadline-sign' || el.dataset.op === 'promote') notify(t('mkt.done.sign'));
      if (el.dataset.op === 'era-moment') root.requestAnimationFrame(() => { const m = state.career.summary.eraWorld && state.career.summary.eraWorld.lastMoment, card = doc.querySelector('.era-moment-res'); if (card) { card.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (m && m.stars && CAA.Juice) { CAA.Juice.burstAt(card, { count: 10 + m.stars * 6 }); if (m.stars === 4) CAA.Juice.confetti(0.6); } else if (CAA.Juice) CAA.Juice.shake(card, 0.5); } }); };
    exact["mkt-op"] = async (name, el) => {
      const res = await ui.worker.send('career.market', { state: state.career.state, config: { op: el.dataset.op, id: el.dataset.id, role: el.dataset.role, level: el.dataset.level } });
      await acceptCareer(res); if (ui.audio) ui.audio.play(el.dataset.op === 'sign' || el.dataset.op === 'sell' ? 'coin' : 'success'); notify(t('mkt.done.' + el.dataset.op));
      root.requestAnimationFrame(() => { const at = doc.querySelector('.notice, .toast, #panel'); if (CAA.Juice && at) CAA.Juice.burstAt(at, { count: 22, colors: ['#ffb21e', '#fff3c4', '#36b98a'] }); }); };
    exact["club-op"] = async (name, el) => {
      const res = await ui.worker.send('career.club', { state: state.career.state, config: { op: el.dataset.op, key: el.dataset.key, value: el.dataset.value } });
      await acceptCareer(res); if (ui.audio) ui.audio.play('success');
    };
    const h7 = async (name, el) => {
      const d = el.dataset, config = name === 'gear-op' ? { op: d.op, itemId: d.item, boxId: d.box, index: d.index, affix: d.affix } : { op: 'look', [d.field]: d.value };
      const res = await ui.worker.send('career.gear', { state: state.career.state, config });
      await acceptCareer(res);
      if (ui.audio) ui.audio.play(name === 'gear-op' && el.dataset.op !== 'unequip' ? 'success' : 'click');
      if (name === 'gear-op') notify(el.dataset.op === 'claim' && res.gear ? t('gear.claimed.' + res.gear.result, { n: res.gear.mat }) : t('shop.done.' + el.dataset.op));
    };
    for (const k of ["gear-op","look-set"]) exact[k] = h7;
    // Vestidor: ranura elegida, probar, quitar todo, equipar lo mejor y mejorar con vista previa.
    const gr = () => state.gr || (state.gr = { slot: null, tryOn: null, upc: null, best: false });
    const gearSend = async config => { const res = await ui.worker.send('career.gear', { state: state.career.state, config }); await acceptCareer(res); return res; };
    const eqNow = () => Object.assign({}, CAA.Gear.ensure(state.career.state).equipped);
    exact["gr-slot"] = async (name, el) => { const u = gr(); u.slot = u.slot === el.dataset.slot ? null : el.dataset.slot; u.upc = null; state.busy = false; };
    exact["gr-try"] = async (name, el) => { const it = CAA.Gear.BY_ID[el.dataset.item]; if (!it) return; const eq = eqNow(); eq[it.slot] = it.id; gr().tryOn = { eq }; state.busy = false; };
    exact["gr-try-no"] = async () => { gr().tryOn = null; state.busy = false; };
    exact["gr-try-ok"] = async () => { const u = gr(); if (!u.tryOn) return; const eq = u.tryOn.eq; u.tryOn = null; u.best = false; await gearSend({ op: 'apply', equipped: eq }); if (ui.audio) ui.audio.play('success'); notify(t('shop.done.equip')); };
    exact["gr-off"] = async () => { gr().tryOn = null; await gearSend({ op: 'apply', equipped: {} }); if (ui.audio) ui.audio.play('click'); notify(t('gr.offDone')); };
    exact["gr-best"] = async () => { const u = gr(); u.best = !u.best; state.busy = false; };
    exact["gr-best-go"] = async (name, el) => {
      const u = gr(), focus = el.dataset.focus || null, cur = eqNow(), eq = CAA.Gear.best(state.career.state, focus);
      const same = Object.keys(Object.assign({}, cur, eq)).every(k => (cur[k] || null) === (eq[k] || null));
      if (same) { notify(t('gr.alreadyBest')); state.busy = false; return; }
      u.tryOn = { eq, label: t('gr.bestFor', { x: focus ? t('gr.focus.' + focus) : t('gr.balanced') }) }; state.busy = false;
    };
    exact["gr-up"] = async (name, el) => { const u = gr(); u.upc = u.upc === el.dataset.item ? null : el.dataset.item; state.busy = false; };
    exact["gr-up-no"] = async () => { gr().upc = null; state.busy = false; };
    exact["gr-up-ok"] = async (name, el) => {
      const id = el.dataset.item, res = await gearSend({ op: el.dataset.pay === 'mat' ? 'upgradeMat' : 'upgrade', itemId: id });
      gr().upc = null;
      const tier = CAA.Gear.ensure(state.career.state).owned[id];
      if (ui.upAnim) root.setTimeout(() => ui.upAnim(id, tier), 30);
      if (ui.audio) ui.audio.play('levelup');
      return res;
    };
    exact["coach-starter"] = async (name, el) => {
      const sm = state.career.summary; const cur = state.coachPick && state.coachPick.career === sm.careerId ? state.coachPick.ids.slice() : sm.squad.starters.slice();
      const id = el.dataset.id; const i = cur.indexOf(id);
      if (i >= 0) cur.splice(i, 1); else if (cur.length < 5) cur.push(id); else notify(t('coach.fiveMax'), true);
      state.coachPick = { career: sm.careerId, ids: cur };
    };
    const h9 = async (name, el) => {
      const config = name === 'coach-save-starters' ? { starters: state.coachPick.ids } : name === 'coach-tactic' ? { tactic: { [el.dataset.k]: el.dataset.v } } : { training: el.dataset.v };
      const res = await ui.worker.send('career.coach', { state: state.career.state, config }); await acceptCareer(res);
      if (name === 'coach-save-starters') { state.coachPick = null; notify(t('coach.saved')); }
    };
    for (const k of ["coach-save-starters","coach-tactic","coach-training"]) exact[k] = h9;
    exact["family-setup"] = async (name, el) => {
      const nm = doc.getElementById('partner-name');
      const res = await ui.worker.send('career.family', { state: state.career.state, config: { op: 'setup', kind: el.dataset.kind, partnerName: nm ? nm.value : '' } }); await acceptCareer(res);
    };
    exact["career-family"] = async (name, el) => {
      const res = await ui.worker.send('career.advance', { state: state.career.state, action: { type: 'family' } }); await acceptCareer(res);
    };
    const h12 = async (name, el) => {
      const pos = doc.getElementById('heir-pos'), num = doc.getElementById('heir-number');
      const config = { op: 'retire', choice: name === 'retire-coach' ? 'coach' : name === 'retire-heir' ? 'heir' : 'end', childIndex: el.dataset.child != null ? Number(el.dataset.child) : undefined, pos: pos ? pos.value : 'SG', keepNumber: num ? num.checked : true };
      const res = await ui.worker.send('career.family', { state: state.career.state, config }); await acceptCareer(res);
      if (ui.audio) ui.audio.play('buzzer'); CAA.PlayStore.showAd(root, 'retire');
    };
    for (const k of ["retire-coach","retire-heir","retire-end"]) exact[k] = h12;
    exact["career-skip"] = async (name, el) => {
      const res = await ui.worker.send('career.advance', { state: state.career.state, action: { type: 'skipPlayoffs' } }); await acceptCareer(res);
    };
    exact["summary-dismiss"] = async (name, el) => {
      const res = await ui.worker.send('career.dismissSummary', { state: state.career.state }); await acceptCareer(res);
      CAA.PlayStore.showAd(root, 'season_end');
    };
    exact["career-sign"] = async (name, el) => {
      const index = Number(el.dataset.index) || 0;
      const res = await ui.worker.send('career.sign', { state: state.career.state, index });
      await acceptCareer(res);
    };
    const talent = async config => {
      if (!state.career.state) throw new Error(t('career.empty'));
      const before = state.career.summary && state.career.summary.rpg;
      const res = await ui.worker.send('career.talent', { state: state.career.state, config });
      await acceptCareer(res); if (ui.audio) ui.audio.play(config.op === 'buy' ? 'levelup' : 'click');
      notify(config.op === 'buy' ? t('rpg.bought', { name: t('rpg.perk.' + config.id) }) : t('rpg.respecDone', { n: res.talent }));
      return before;
    };
    exact["talent-buy"] = async (name, el) => { await talent({ op: 'buy', id: el.dataset.id }); };
    exact["talent-respec"] = async (name, el) => { await talent({ op: 'respec' }); };
    exact["trade-request"] = async (name, el) => {
      if (!state.career.state) throw new Error(t('career.empty'));
      const sel = doc.getElementById('trade-club'); if (!sel || !sel.value) return;
      const [leagueId, clubId] = sel.value.split('|');
      const res = await ui.worker.send('career.trade', { state: state.career.state, config: { leagueId, clubId } });
      await acceptCareer(res);
      notify(t(res.trade && res.trade.accepted ? 'trade.yes' : 'trade.no', { club: res.trade ? res.trade.club : '' }), !(res.trade && res.trade.accepted));
      if (ui.audio) ui.audio.play(res.trade && res.trade.accepted ? 'success' : 'click');
    };
    exact["career-crossing"] = async (name, el) => {
      if (!state.career.state) throw new Error(t('career.empty'));
      const sel = doc.getElementById('crossing-league');
      const target = sel ? sel.value : state.career.crossingLeague;
      const res = await ui.worker.send('career.crossing', { state: state.career.state, targetLeagueId: target });
      await acceptCareer(res);
    };
    exact["career-watch"] = async (name, el) => {
      if (!state.career.state.lastMatch) throw new Error(t('match.noReplay'));
      state.match.result = state.career.state.lastMatch; state.match.source = 'career'; state.match.playing = false; state.match.progress = 1;
      const keys = matchKeys(); state.match.frame = keys.length ? keys[0].index : 0; state.tab = 'match'; notify(t('match.replayLoaded'));
    };

    return { exact, patterns };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
