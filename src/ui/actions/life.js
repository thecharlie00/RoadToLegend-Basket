(function (root) {
  'use strict';
  // Acciones · YO: decisiones de vida, tienda, minijuegos, momentos y mascota.
  // Cada entrada recibe (name, el) igual que antes en la cadena de action(); lo compartido llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIActions = CAA.UIActions || {};
  CAA.UIActions["life"] = function (ui) {
    const { acceptCareer, arcadeBegin, arcadeRelease, draft, drawAvatar, haptic, notify, state, t } = ui;
    const exact = {}, patterns = [];
    exact["life-event"] = async (name, el) => {
      const optionId = el && el.dataset.option;
      const res = await ui.worker.send('career.event', { state: state.career.state, optionId });
      await acceptCareer(res);
      root.requestAnimationFrame(() => { const card = doc.querySelector('.outcome'), J = CAA.Juice; if (!card || !J) return; if (card.classList.contains('bad')) { J.shake(card, 0.6); if (ui.audio) ui.audio.play('fail'); } else { J.pop(card, 1.03); J.burstAt(card, { count: 18, colors: ['#36b98a', '#ffffff', '#ffb21e'] }); if (ui.audio) ui.audio.play('success'); } }); };
    const h1 = async (name, el) => {
      const itemId = el && el.dataset.item;
      const res = await ui.worker.send(name === 'life-buy' ? 'career.buy' : 'career.equip', { state: state.career.state, itemId });
      await acceptCareer(res);
    };
    for (const k of ["life-buy","life-equip"]) exact[k] = h1;
    const h2 = async (name, el) => {
      const type = name === 'life-buzzer-auto' ? 'buzzer' : 'freeThrow';
      const res = await ui.worker.send('career.practice', { state: state.career.state, config: { auto: true, type } });
      await acceptCareer(res); state.practice = { result: res.practice };
    };
    for (const k of ["life-practice-auto","life-buzzer-auto"]) exact[k] = h2;
    const h3 = async (name, el) => {
      const type = name === 'life-buzzer-start' ? 'buzzer' : 'freeThrow';
      const res = await ui.worker.send('career.practice.begin', { state: state.career.state, config: { type } });
      await acceptCareer(res); state.practice = { start: root.performance.now(), type: res.practice.type, id: res.practice.id, result: null };
    };
    for (const k of ["life-practice-start","life-buzzer-start","life-practice-resume"]) exact[k] = h3;
    exact["life-practice-cancel"] = async (name, el) => {
      const res = await ui.worker.send('career.practice.cancel', { state: state.career.state }); await acceptCareer(res); state.practice = null;
    };
    exact["life-practice-release"] = async (name, el) => {
      if (state.practice && state.practice.start != null) {
        const releaseTick = Math.round((root.performance.now() - state.practice.start) / 1000 * CAA.Minigames.HZ);
        const res = await ui.worker.send('career.practice.resolve', { state: state.career.state, config: { type: state.practice.type || 'freeThrow', id: state.practice.id, releaseTick } });
        await acceptCareer(res); state.practice = { result: res.practice }; if (ui.audio) ui.audio.play(res.practice.made ? 'swish' : 'rim'); haptic(res.practice.made ? 'success' : 'fail');
      }
    };
    exact["life-guide-next"] = async (name, el) => {
      const res = await ui.worker.send('career.guide', { state: state.career.state });
      await acceptCareer(res);
    };
    exact["moment-open"] = async (name, el) => { state.moment = { id: el.dataset.id, side: 1, tactic: 'normal', result: null }; root.scrollTo && root.scrollTo(0, 0); };
    exact["moment-set"] = async (name, el) => { if (state.moment) { state.moment[el.dataset.field] = el.dataset.field === 'side' ? Number(el.dataset.value) : el.dataset.value; state.moment.result = null; } };
    exact["moment-play"] = async (name, el) => { const m = state.moment; m.result = CAA.Moments.play(m.id, m.side, m.tactic, 'moment-' + Date.now() % 100000); if (ui.audio) ui.audio.play(m.result.won ? 'success' : 'buzzer'); };
    exact["pet-species"] = async (name, el) => { state.petSpecies = el.dataset.species; };
    exact["pet-view"] = async (name, el) => { state.petView = el.dataset.view; };
    exact["pet-parrot"] = async (name, el) => {
      if (!state.career.state || !state.career.summary.pet) throw new Error(t('career.empty'));
      if (!CAA.Parrot) throw new Error(t('pet.parrot.unsupported'));
      const op = el.dataset.op || 'record', parrot = CAA.Parrot;
      const reward = async () => { const res = await ui.worker.send('career.pet', { state: state.career.state, config: { op: 'speak' } }); await acceptCareer(res); };
      if (op === 'record') {
        if (parrot.info().status === 'recording') {
          // Al parar, el loro repite la toma sin pedir otro toque: es lo que hace un loro.
          try { await parrot.finish(); } catch (e) { notify(t('pet.parrot.' + (e.code || 'failed')), true); }
          if (parrot.info().ready) { try { await parrot.say(); await reward(); } catch (_) {} }
        } else { try { await parrot.start(); } catch (e) { notify(t('pet.parrot.' + (e.code || 'failed')), true); } }
      } else if (op === 'say') {
        try { await parrot.say(); await reward(); } catch (e) { notify(t('pet.parrot.' + (e.code || 'failed')), true); }
      } else if (op === 'forget') { parrot.forget();
      } else if (op === 'text') {
        const text = draft('parrot-text', '').trim();
        if (!text) notify(t('pet.parrot.emptyText'), true);
        else { await parrot.sayText(text, CAA.I18N.getLocale()); await reward(); }
      }
    };
    exact["live-hero"] = async (name, el) => {
      state.heroShot = { aimStart: root.performance.now() }; if (ui.audio) ui.audio.play('whistle');
    };
    const h15 = async (name, el) => {
      if (!state.career.state) throw new Error(t('career.empty'));
      const res = await ui.worker.send('career.arcade', { state: state.career.state, start: true, type: el.dataset.game || (state.career.state.life.pendingArcade || {}).type, diff: state.arcadeDiff || 'normal', contest: el.dataset.contest === '1' });
      await acceptCareer(res); arcadeBegin(res.arcade.pending);
    };
    for (const k of ["arcade-start","arcade-resume"]) exact[k] = h15;
    exact["arcade-auto"] = async (name, el) => {
      if (!state.career.state) throw new Error(t('career.empty'));
      if (!state.career.state.life.pendingArcade) { const st = await ui.worker.send('career.arcade', { state: state.career.state, start: true, type: el.dataset.game, diff: state.arcadeDiff || 'normal' }); await acceptCareer(st); }
      const pend = state.career.state.life.pendingArcade;
      const res = await ui.worker.send('career.arcade', { state: state.career.state, auto: true });
      await acceptCareer(res); arcadeBegin(pend); state.arcade.final = res.arcade; state.arcade.phase = 'done'; state.arcade.round = CAA.Arcade.GAMES[pend.type].rounds - 1; state.arcade.live = { score: res.arcade.score, opponent: res.arcade.opponent || 0 };
    };
    exact["celebrate"] = async (name, el) => { state.celebrate = root.performance.now(); state.busy = false; drawAvatar(); if (ui.audio) ui.audio.play('success'); return; };
    exact["arcade-diff"] = async (name, el) => { state.arcadeDiff = el.dataset.diff; };
    exact["arcade-release"] = async (name, el) => { state.busy = false; arcadeRelease(); return; };
    exact["arcade-cancel"] = async (name, el) => {
      const res = await ui.worker.send('career.arcade', { state: state.career.state, cancel: true }); await acceptCareer(res); state.arcade = null; if (state.tab === 'arcade') state.tab = 'life';
    };
    patterns.push({ test: name => name.startsWith('pet-'), run: async (name, el) => {
      if (!state.career.state) throw new Error(t('career.empty'));
      const nameEl = doc.getElementById('pet-name');
      const nameValue = draft('pet-rename-name', state.career.summary && state.career.summary.pet ? state.career.summary.pet.name : '');
      const config = name === 'pet-adopt' ? { op: 'adopt', species: state.petSpecies || 'dog', name: nameEl ? nameEl.value : '' }
        : name === 'pet-act' ? { op: 'act', action: el.dataset.act, trick: el.dataset.trick, premium: el.dataset.premium === '1', food: el.dataset.food, toy: el.dataset.toy, route: el.dataset.route }
        : name === 'pet-contest' ? { op: 'contest', tier: el.dataset.tier }
        : name === 'pet-coat' ? { op: 'coat', coat: el.dataset.coat }
        : name === 'pet-bg' ? { op: 'bg', bg: el.dataset.bg }
        : name === 'pet-rename' ? { op: 'rename', name: nameValue }
        : { op: name === 'pet-buy' ? 'buy' : name === 'pet-supply' ? 'supply' : 'equip', item: el.dataset.item };
      const res = await ui.worker.send('career.pet', { state: state.career.state, config });
      await acceptCareer(res);
      if (name === 'pet-act' && CAA.Juice) root.requestAnimationFrame(() => { const at = doc.querySelector('#pet3d, .pet-stage, .pet canvas'); if (at) { CAA.Juice.floatText('♥', at, 'good'); CAA.Juice.burstAt(at, { count: 12, speed: 140, colors: ['#ff6fae', '#ffffff', '#ffb21e'] }); } });
      if (ui.audio) ui.audio.play(name === 'pet-contest' ? (res.pet.place === 1 ? 'success' : 'click') : 'bounce'); if (name === 'pet-contest') haptic(res.pet.place === 1 ? 'success' : 'tap');
      if (name === 'pet-contest') notify(t('pet.contestResult', { place: res.pet.place, score: res.pet.score, tier: t('pet.tier.' + res.pet.tier) }));
    } });
    return { exact, patterns };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
