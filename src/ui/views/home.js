(function (root) {
  'use strict';
  // INICIO: franja de la jornada, decisiones, mundo vivo, resumen de temporada y barra de acción.
  // Vista extraída de app.js: lo compartido (estado, traductor, trabajador, otras vistas…) llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIViews = CAA.UIViews || {};
  CAA.UIViews["home"] = function (ui) {
    const { crest, draft, esc, hasCareer, leagueLabel, leagueName, loc, meter, pick, seasonLabel, state, t } = ui;
    function deadlineClock() {
      const card = doc.getElementById('deadline-card'); if (ui.dlTimer) { root.clearInterval(ui.dlTimer); ui.dlTimer = null; }
      if (!card) return;
      const start = state.dlStart || (state.dlStart = root.performance.now());
      const tick = () => {
        const el = doc.getElementById('dl-clock'); if (!el) { root.clearInterval(ui.dlTimer); ui.dlTimer = null; return; }
        const mins = Math.min(24 * 60, 18 * 60 + Math.floor((root.performance.now() - start) / 1000 * 9));
        el.textContent = mins >= 24 * 60 ? t('deadline.closed') : String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
        for (const li of card.querySelectorAll('.dl-offer')) { const due = Number(li.dataset.at) <= mins, b = li.querySelector('button'); li.classList.toggle('arrived', due); if (b && !b.textContent.includes(t('deadline.signed'))) b.disabled = !due || mins >= 24 * 60 || b.hasAttribute('data-nocash'); }
        if (mins >= 24 * 60) { root.clearInterval(ui.dlTimer); ui.dlTimer = null; }
      };
      tick(); ui.dlTimer = root.setInterval(tick, 500);
    }
    function newsText(i) {
      const d = i.detail || {};
      const vars = { weeks: i.weeks || 0, pick: d.overall, us: i.score ? i.score.join('–') : '', team: d.team || '', club: d.clubName || d.club || '', league: leagueName(d.targetLeague || d.leagueId || ''), n: d.value || '' };
      if (i.type === 'eraRule') return t('inbox.eraRule.' + d.rule, vars);
      if (i.type === 'era-comp') return t('inbox.eraComp', { comp: t(d.comp), stage: ui.STAGE(d.stage) });
      if (i.type === 'era-rewrite') return t('inbox.eraRewrite', { year: d.year, club: d.real || '' });
      if (i.type === 'cup') return t('inbox.cup', { club: d.club || '' }) + (d.mine && d.mine !== 'out' ? ' ' + t('cup.mine.' + d.mine) : '');
      if (i.type === 'nationalWindow') return t(d.win ? 'inbox.natWin' : 'inbox.natLoss', { n: d.pts });
      if (i.type === 'nationalSummer') return !d.qualified ? t('inbox.natNoQual', { kind: t('nat.kind.' + d.kind) }) : t('inbox.natSummer', { kind: t('nat.kind.' + d.kind), place: t('nat.place.' + d.place) });
      const key = 'inbox.' + i.type + (i.type === 'live' ? (i.won ? 'Won' : 'Lost') : '');
      return t(key, vars);
    }
    function chips(fx) {
      const out = [];
      for (const [k, v] of Object.entries(fx || {})) {
        if (['agent', 'sponsor', 'flag', 'unflag', 'xp', 'baby', 'familyStatus'].includes(k)) continue;
        if (k === 'attr') { for (const [a, d] of Object.entries(v)) out.push(`<span class="chip ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d} ${t('attr.' + a)}</span>`); continue; }
        if (k === 'salary') { out.push(`<span class="chip ${v >= 1 ? 'up' : 'down'}">${v >= 1 ? '+' : ''}${Math.round((v - 1) * 100)} % ${t('effect.salary')}</span>`); continue; }
        if (k === 'injuryWeeks') { out.push(`<span class="chip ${v < 0 ? 'up' : 'down'}">${v > 0 ? '+' : ''}${v} ${t('effect.injuryWeeks')}</span>`); continue; }
        if (k === 'fatigue') { out.push(`<span class="chip ${v < 0 ? 'up' : 'down'}">${v > 0 ? '+' : ''}${Math.round(v * 100)} ${t('effect.fatigue')}</span>`); continue; }
        const bad = k === 'load' ? v > 0 : v < 0;
        out.push(`<span class="chip ${bad ? 'down' : 'up'}">${v > 0 ? '+' : ''}${k === 'cash' ? v.toLocaleString(CAA.I18N.getLocale()) : v} ${t('effect.' + k)}</span>`);
      }
      return out.join('');
    }
    const seasonsTxt = n => n === 1 ? t('ret.seasonOne') : t('ret.seasonMany', { n });
    function renderRetirement(s) {
      const r = s.retirement, L = r.legacy, f = s.family || { children: [] };
      const sons = f.children.map((c, i) => ({ c, i })).filter(x => state.career.state.year - x.c.bornYear >= 0);
      return `<section class="card retire"><span class="eyebrow">${t('ret.kicker', { year: seasonLabel(r.year) })}</span><h2>${t('ret.title')}</h2>
        <p>${t('ret.body', { name: esc(L.name), seasons: seasonsTxt(L.seasons), pts: L.totals.pts, titles: L.titles, awards: L.awards })}</p>
        <div class="stack">
          <button class="option" data-action="retire-coach"><b>🧑‍🏫 ${t('ret.coach')}</b><span class="muted small">${t('ret.coachDesc', { club: esc(L.lastClubName) })}</span></button>
          ${sons.length ? `<div class="option heir"><b>👪 ${t('ret.heir')}</b><span class="muted small">${t('ret.heirDesc')}</span>
            ${sons.map(({ c, i }) => `<div class="heir-row"><span><b>${esc(c.name)}</b> <small class="muted">${t('ret.childAge', { n: state.career.state.year - c.bornYear })}</small></span><button class="small-btn primary" data-action="retire-heir" data-child="${i}">${t('ret.takeOver')}</button></div>`).join('')}
            <label for="heir-pos">${t('career.pos')}<select id="heir-pos">${['PG', 'SG', 'SF', 'PF', 'C'].map(p => `<option value="${p}">${p} · ${t('pos.' + p)}</option>`).join('')}</select></label>
            <label class="check-label"><input id="heir-number" type="checkbox" checked>${t('ret.keepNumber', { n: L.number })}</label></div>` : `<p class="muted small">${t('ret.noHeir')}</p>`}
          <button class="option" data-action="retire-end"><b>🏁 ${t('ret.end')}</b><span class="muted small">${t('ret.endDesc')}</span></button>
        </div></section>`;
    }
    // ===== Mundo vivo (world45 del fútbol) y sorteo en directo (draw.js) =====
    function liveWorldCards(s) {
      const out = [], money = n => Math.round(n).toLocaleString(CAA.I18N.getLocale()) + ' €';
      const RN = { qf: 'cup.qf', sf: 'cup.sf', final: 'cup.final' };
      if (s.cupDraw) {
        const d = s.cupDraw, step = state.drawStep || 'draw';
        const balls = d.balls.map((b, i) => `<li class="ball ${b.mine ? 'me' : ''}" style="--i:${i}">${crest({ name: b.name }, 22)}<span>${esc(b.name)}</span></li>`).join('');
        const pairs = [0, 2, 4, 6].map(i => `<li class="pair" style="--i:${i + 1}"><span class="${d.balls[i].mine ? 'me' : ''}">${esc(d.balls[i].name)}</span> <b>vs</b> <span class="${d.balls[i + 1].mine ? 'me' : ''}">${esc(d.balls[i + 1].name)}</span></li>`).join('');
        const results = d.rounds.map(r => `<h4>${t(RN[r.name])}</h4><ul class="news">${r.games.map(g => `<li class="${g.mine ? 'me' : ''}">${esc(g.a)} <b>${g.score[0]}–${g.score[1]}</b> ${esc(g.b)}</li>`).join('')}</ul>`).join('');
        out.push(`<section class="card draw-card"><span class="eyebrow">${t('draw.kicker')}</span><h3>${esc(s.league && s.league.cup && s.league.cup !== '@generic' ? s.league.cup : t('cup.title'))}</h3>
          ${step === 'draw' ? `<p class="muted small">${t('draw.desc')}</p><ol class="draw-balls">${balls}</ol><h4>${t('draw.pairs')}</h4><ul class="draw-pairs">${pairs}</ul><button class="cta" data-action="draw-results">${t('draw.results')}</button>`
            : `${results}<p class="small">${t('draw.champion', { club: esc(d.champion || '') })}</p><button class="cta" data-action="world-op" data-op="draw-seen">${t('common.continue')}</button>`}</section>`);
      }
      if (s.deadline) {
        const d = s.deadline, f = s.clubFin;
        out.push(`<section class="card deadline" id="deadline-card"><span class="eyebrow">${t('deadline.kicker')}</span><h3>${t('deadline.title')}</h3>
          <p class="clock" aria-live="polite"><b id="dl-clock">18:00</b> · ${t('deadline.cash', { v: money(f.cash) })}</p><p class="muted small">${t('deadline.desc')}</p>
          <ul class="news mkt">${d.offers.map(o => `<li class="dl-offer" data-at="${o.at}">${ui.face({ id: o.id, name: o.name, nationality: o.nat })} <b>${esc(o.name)}</b> · ${o.pos} · ${t('mkt.ovr', { n: o.ovr })} · ${t('mkt.age', { n: o.age })}<br><small class="muted">${t('deadline.at', { h: String(Math.floor(o.at / 60)).padStart(2, '0') + ':' + String(o.at % 60).padStart(2, '0') })} · ${t('mkt.fee', { v: money(o.fee) })}</small>
            <button class="small-btn" data-action="world-op" data-op="deadline-sign" data-id="${esc(o.id)}" ${f.cash < o.fee ? 'data-nocash' : ''} ${d.signed.includes(o.id) || f.cash < o.fee ? 'disabled' : ''}>${d.signed.includes(o.id) ? t('deadline.signed') : t('mkt.sign')}</button></li>`).join('')}</ul></section>`);
      }
      if (s.summerCup) {
        const sc = s.summerCup;
        out.push(`<section class="card" id="summer-card"><span class="eyebrow">${t('summer.kicker')}</span><h3>${t('summer.title', { place: sc.place })}</h3>
          <ul class="news">${sc.games.map((g, i) => `<li><small class="muted">${t(['summer.sf', 'summer.sf', 'summer.third', 'summer.final'][i])}</small> ${esc(g.a)} <b>${g.score[0]}–${g.score[1]}</b> ${esc(g.b)}</li>`).join('')}</ul>
          ${sc.pts != null ? `<p class="small">${t('summer.pts', { n: sc.pts })}</p>` : ''}<button class="small-btn" data-action="world-op" data-op="summer-seen">${t('common.continue')}</button></section>`);
      }
      if (s.youthCup) {
        const y = s.youthCup;
        out.push(`<section class="card"><span class="eyebrow">${t('youth.kicker')}</span><h3>${t('youth.' + y.kind + '.' + y.stage)}</h3>
          ${y.kind === 'player' ? `<p class="small">${t('youth.pts', { n: y.pts })}</p>` : ''}
          ${y.kind === 'coach' && s.academy ? `<p class="small">${t('youth.prospect', { name: esc(s.academy.name), pos: s.academy.pos, ovr: s.academy.ovr, pot: s.academy.potential })}</p><button class="small-btn" data-action="world-op" data-op="promote">${t('youth.promote')}</button>` : ''}
          <button class="small-btn ghost" data-action="world-op" data-op="youth-seen">${t('common.continue')}</button></section>`);
      }
      return out.join('');
    }
    function renderHome() {
      if (hasCareer() && state.career.summary.retirement) return renderRetirement(state.career.summary);
      if (hasCareer() && state.career.summary.careerOver && state.career.summary.quickEnd) return `<section class="card retire"><h2>${t('ret.overTitle')}</h2><p>${t('sum.quickEnd')}</p>${(state.career.summary.history || []).map(h => `<p class="small">${seasonLabel(h.year)} · ${esc(leagueName(h.leagueId))} · ${h.clubRank}.º</p>`).join('')}<button class="cta" data-action="boot-new">${t('boot.new')} ▶</button></section>`;
      if (hasCareer() && state.career.summary.careerOver) { const f = state.career.summary.family || { legends: [] }; return `<section class="card retire"><h2>${t('ret.overTitle')}</h2><p>${t('ret.overBody')}</p><ul class="news">${f.legends.map(l => `<li>🏛 <b>${esc(l.name)}</b> · ${t('ret.legendLine', { seasons: seasonsTxt(l.seasons), pts: l.totals ? l.totals.pts : 0, titles: l.titles })}</li>`).join('')}</ul><button class="cta" data-action="boot-new">${t('boot.new')} ▶</button></section>`; }
      if (!hasCareer()) return `<section class="card"><h2>${t('home.noCareer')}</h2><p class="muted">${t('home.noCareerDesc')}</p><button class="cta" data-action="boot-new">${t('boot.new')} ▶</button></section>`;
      const c = state.career, s = c.summary, life = s.life || { counters: {}, press: [] };
      const m = s.meters;
      const guideStep = life.guideStep || 0;
      let skipGuide = false; try { skipGuide = root.localStorage.getItem('caa.guideSkip.' + s.careerId) === '1'; } catch (_) {}
      const guides = [['life', 'life'], ['live', 'career'], ['league', 'league'], ['trophies', 'life']];
      const guide = !skipGuide && guideStep < guides.length ? `<section class="card guide"><div class="guide-head"><span class="eyebrow">${t('guide.kicker', { n: guideStep + 1, total: guides.length })}</span><button class="link" data-action="guide-skip">${t('guide.skip')}</button></div>
        <div class="steps" aria-hidden="true">${guides.map((_, i) => `<i class="${i <= guideStep ? 'on' : ''}"></i>`).join('')}</div>
        <h3>${t('guide.' + guides[guideStep][0] + (s.squad && guides[guideStep][0] === 'life' ? 'Coach' : ''))}</h3><p>${t('guide.' + guides[guideStep][0] + (s.squad && guides[guideStep][0] === 'life' ? 'Coach' : '') + 'Desc')}</p>
        <div class="row">${guides[guideStep][1] !== 'career' ? `<button class="small-btn" data-tab-go="${guides[guideStep][1]}">${t('guide.go.' + guides[guideStep][1])}</button>` : ''}<button class="small-btn" data-action="life-guide-next">${t('guide.done')}</button></div></section>` : '';
      const segs = 5, seg = s.playoffs ? 4 : Math.min(segs - 2, Math.floor(s.round / Math.max(1, s.totalRounds) * (segs - 1)));
      const season = `<section class="season"><div class="season-head"><h2>${t('home.season', { season: seasonLabel(s.year) })}</h2><span class="muted">${s.playoffs ? t('po.kicker') : t('home.round', { n: s.round + 1, total: s.totalRounds })}</span></div>
        <ol class="timeline" aria-label="${t('home.timeline')}">${Array.from({ length: segs }, (_, i) => `<li class="${i < seg ? 'done' : i === seg ? 'now' : ''}" ${i === seg ? 'aria-current="step"' : ''}>${t('home.seg' + i)}</li>`).join('')}</ol>
        <div class="meters">${s.player ? meter(t('meter.form'), m.form) + meter(t('meter.morale'), m.morale) + meter(t('meter.fitness'), m.fitness) + meter(t('meter.trust'), m.trust) + meter(t('meter.fans'), m.fans)
          : meter(t('meter.morale'), m.morale) + meter(t('meter.board'), m.trust) + meter(t('meter.locker'), m.locker) + meter(t('meter.fitness'), m.fitness) + meter(t('meter.fans'), m.fans)}</div></section>`;
      const fam = s.family;
      const famSetup = s.player && (!fam || !fam.configured) && s.week <= 4 ? `<section class="card family"><div class="guide-head"><h3>${t('fam.title')}</h3><span aria-hidden="true">👪</span></div><p class="muted small">${t('fam.setupDesc')}</p>
        <label for="partner-name">${t('fam.partnerName')}<input id="partner-name" maxlength="24" value="${esc(draft('partner-name', ''))}" placeholder="${t('fam.partnerPlaceholder')}"></label>
        <div class="pick-grid">${['none', 'partner', 'parent'].map(k => `<button class="option center" data-action="family-setup" data-kind="${k}"><b>${t('fam.setup.' + k)}</b></button>`).join('')}</div></section>` : '';
      const ev = s.event;
      const L = pair => pick(pair);
      const decision = ev ? `<section class="card decision"><div class="guide-head"><span class="tag led">● ${t(ev.story ? 'home.story' : 'home.decision')}</span><span class="muted small">${esc(t('eventcat.' + ev.category))}</span></div>
        <canvas id="ev3d" class="ev-scene" data-cat="${esc(ev.category)}" role="img" aria-label="${t('home.sceneAlt', { place: t('scene.' + CAA.Scenes.settingOf(ev.category)) })}"></canvas>
        <h3>${esc(L(ev.title))}</h3><p>${esc(L(ev.body))}</p>
        <div class="stack">${ev.options.map(o => `<button class="option" data-action="life-event" data-option="${o.id}"><span class="opt-head"><b>${esc(L(o.label))}</b><span class="odds ${o.p == null ? 'sure' : o.p >= 0.6 ? 'hi' : o.p >= 0.45 ? 'mid' : 'lo'}">${o.p == null ? t('odds.sure') : t('odds.pct', { p: Math.round(o.p * 100) })}</span></span>${o.desc ? `<span class="muted small">${esc(L(o.desc))}</span>` : ''}
          <span class="chips">${o.p == null ? chips(o.effects) : `<span class="chip-label">${t('odds.ifGood')}</span>${chips(o.ok)}<span class="chip-label">${t('odds.ifBad')}</span>${chips(o.ko)}`}</span></button>`).join('')}</div></section>` : '';
      const lo = life.lastOutcome;
      const outcome = lo && !ev ? `<section class="card outcome ${lo.uncertain ? (lo.good ? 'good' : 'bad') : ''}"><span class="eyebrow">${esc(L(lo.title))} · ${esc(L(lo.label))}</span><p><b>${esc(L(lo.result))}</b></p><span class="chips">${chips(lo.effects)}</span></section>` : '';
      const po = s.playoffs;
      const seasonCard = s.lastSeason ? renderSeasonSummary(s.lastSeason) : '';
      const poCard = po && !po.done ? `<section class="card playoffs"><span class="eyebrow">${t('po.kicker')} · ${t('po.round.' + po.round)}</span>
        ${po.series ? `<h3>${t('po.series', { w: po.series.wins, l: po.series.losses })}</h3><p class="muted small">${t('po.bestOf', { n: po.series.bestOf })}</p>` : po.status === 'waiting' ? `<h3>${t('po.waiting')}</h3><p class="muted small">${t('po.waitingDesc')}</p>` : `<h3>${t(po.status === 'missed' ? 'po.missed' : po.status === 'promoted' ? 'po.promoted' : 'po.out')}</h3><p class="muted small">${t('po.skipDesc')}</p><button class="small-btn" data-action="career-skip">${t('po.skip')}</button>`}</section>` : '';
      const next = s.next ? `<section class="card next"><span class="eyebrow">${s.next.playoff ? t('po.game', { round: t('po.round.' + s.next.roundName), n: s.next.game }) : t('home.next', { n: s.next.round })} · ${t(s.next.home ? 'home.home' : 'home.away')}</span>
        <div class="versus">${crest(s.club)}<b>${esc(s.club.name)}</b><span class="muted">${s.club.wins}-${s.club.losses}</span><em>vs</em>${crest(s.next.opponent)}<b>${esc(s.next.opponent.name)}</b><span class="muted">${s.next.opponent.wins}-${s.next.opponent.losses}</span></div></section>` : '';
      const recent = s.recent.length ? `<section class="card"><div class="guide-head"><h3>${t('home.lastGame')}</h3>${c.state.lastMatch ? `<button class="small-btn" data-action="career-watch">${t('career.watch')}</button>` : ''}</div>
        <p class="result ${s.recent[0].won ? 'ok' : 'bad'}"><b>${t(s.recent[0].won ? 'home.win' : 'home.loss')}</b> ${s.recent[0].us}–${s.recent[0].them} ${t(s.recent[0].home ? 'home.vsHome' : 'home.vsAway', { team: s.recent[0].opponent })}</p>
        <p class="form-strip" aria-label="${t('home.formStrip')}">${s.recent.map(r => `<span class="${r.won ? 'w' : 'l'}">${t(r.won ? 'home.w' : 'home.l')}</span>`).join('')}</p></section>` : '';
      // Sin plan semanal: la semana se juega o se simula directamente (menos decisiones para el jugador).
      const week = '';
      const sq = s.squad;
      const coachWeek = sq && s.next ? `<section class="card"><h3>${t('coach.week')}</h3><p class="muted small">${t('coach.weekDesc')}</p><div class="seg" role="group" aria-label="${t('coach.week')}">${['light', 'normal', 'hard'].map(v => `<button data-action="coach-training" data-v="${v}" aria-pressed="${sq.training === v}">${t('coach.training.' + v)}</button>`).join('')}</div><p class="muted small">${t('coach.trainingDesc.' + sq.training)}</p></section>` : '';
      const sc = s.scouting;
      const scout = sc ? `<section class="card"><span class="eyebrow">${t('coach.scout')}</span><h3>${esc(sc.name)} <span class="muted small">${sc.wins}-${sc.losses} · ${t('coach.avg', { n: sc.avgOvr })}</span></h3>
        <p class="muted small">${t('coach.style', { pace: t('coach.pace.' + sc.pace), shooting: t('coach.focus.' + sc.shooting) })}</p><ul class="news">${sc.top.map(p => `<li><b>${esc(p.name)}</b> · ${esc(p.pos)} · ${p.ovr} <span class="muted small">${t('career.archetype.' + p.archetype)}</span></li>`).join('')}</ul></section>` : '';
      const market = s.market.length ? `<section class="card"><h3>${t('career.market')}</h3><div class="stack">${s.market.map((mk, i) => `<div class="offer"><span>${mk.crossing ? `<b>${esc(mk.crossing.clubName || '')}</b> <small class="muted">${esc(leagueLabel(mk.crossing.targetLeague))}</small><br>` : ''}${esc(mk.contract.salary.toLocaleString(CAA.I18N.getLocale()))} €/$ · ${mk.contract.years} ${t('career.years')}</span><button class="small-btn" data-action="career-sign" data-index="${i}">${t('career.sign')}</button></div>`).join('')}</div></section>` : '';
      const news = s.inbox.slice().reverse().map(i => `<li>${esc(newsText(i))}</li>`).concat((life.press || []).slice(-4).reverse().map(p => `<li class="press">📰 ${esc(pick(p))}</li>`)).slice(0, 8).join('');
      // Lo urgente primero: partido en directo y decisión pendiente antes que la guía o la familia.
      // Inicio simplificado: una franja dice siempre qué pasa y qué toca hacer. Si hay decisión, va sola y lo demás se pliega.
      const liveNow = !!(c.state.live && c.state.live.week === c.state.week);
      const nowKey = liveNow ? 'live' : ev ? 'decision' : s.cupDraw ? 'draw' : s.deadline ? 'deadline' : s.lastSeason ? 'summary' : po && !po.done ? 'playoffs' : s.next ? 'next' : 'idle';
      const nowVars = { opp: s.next ? s.next.opponent.name : '', where: s.next ? t(s.next.home ? 'home.atHome' : 'home.away') : '' };
      const nowStrip = `<section class="now-strip ${nowKey}" aria-live="polite"><span class="eyebrow">${po && !po.done ? t('po.kicker') : t('home.nowWeek', { n: s.round + 1, total: s.totalRounds })}</span><b>${esc(t('home.now.' + nowKey, nowVars))}</b><small>${esc(t('home.nowHint.' + nowKey, nowVars))}</small></section>`;
      const extra = `<details class="card more-week"><summary>${t('home.moreWeek')}</summary>${socialCard(s)}<h3>${t('home.news')}</h3><ul class="news">${news.split('</li>').slice(0, 6).join('</li>')}</ul></details>`;
      if (liveNow && c.state.live.quick) return `${ui.eraBanner(s)}${nowStrip}${ui.jmPendingCard(c.state.live)}`;
      if (liveNow) return `${ui.eraBanner(s)}${nowStrip}${ui.renderLive(c)}`;
      if (ev) return `${ui.eraBanner(s)}${nowStrip}${decision}<details class="card more-week"><summary>${t('home.restWeek')}</summary>${liveWorldCards(s)}${market}${recent}${next}${season}${famSetup}</details>`;
      // Tiempo en familia: opcional y plegado (ya no hay plan semanal que elegir cada semana).
      const famTime = s.player && fam && (fam.partner || fam.children.length) && s.next && !(c.state.live && c.state.live.week === c.state.week) ? `<button class="option" data-action="career-family"><b>${t('home.family')}</b><span class="muted small">${t('home.familyDesc')}</span></button>` : '';
      const famFold = famSetup || famTime ? `<details class="card more-week"><summary>${t('fam.title')}</summary>${famSetup}${famTime}</details>` : '';
      return `${ui.updateBar()}${ui.eraBanner(s)}${nowStrip}${ui.vivaChronicleCard(s)}${ui.vivaFocusCard(s)}${ui.eraCompsCard(s)}${ui.eraMomentCard(s)}${liveWorldCards(s)}${outcome}${seasonCard}${poCard}${market}${recent}${next}${week}${coachWeek}${season}${famFold}${s.era ? `<details class="card more-week"><summary>${t('era.hubTitle', { decade: s.era.decade })}</summary>${ui.eraCard(s)}</details>` : ''}${guide}${scout ? `<details class="card more-week"><summary>${t('coach.scout')}</summary>${scout}</details>` : ''}${extra}`;
    }
    function renderSeasonSummary(ls) {
      const resKey = ls.myChampion ? 'champion' : ls.promoted ? 'promoted' : (ls.result || 'none');
      const st = ls.stats;
      return `<section class="card season-summary ${ls.myChampion || ls.promoted ? 'gold' : ''}"><span class="eyebrow">${t('sum.kicker', { season: seasonLabel(ls.year) })}</span>
        <h2>${t('sum.result.' + resKey)}</h2><p class="muted">${t('sum.line', { rank: ls.rank, teams: ls.teams, w: ls.record.wins, l: ls.record.losses, champ: ls.champion })}</p>
        ${ls.challenge ? `<p class="${ls.challenge.medal === 'none' ? 'muted' : 'ok'}"><b>${({ gold: '🥇', silver: '🥈', bronze: '🥉' })[ls.challenge.medal] || ''} ${t('sum.challenge', { medal: t('chal.medal.' + ls.challenge.medal) })}</b></p>` : ''}
        ${st ? `<div class="statline"><div><b>${(st.pts / Math.max(1, st.gp)).toFixed(1)}</b><small>${t('stat.pts')}</small></div><div><b>${(st.reb / Math.max(1, st.gp)).toFixed(1)}</b><small>${t('stat.reb')}</small></div><div><b>${(st.ast / Math.max(1, st.gp)).toFixed(1)}</b><small>${t('stat.ast')}</small></div><div><b>${st.ovrStart}→${st.ovr}</b><small>${t('me.ovr')}</small></div></div>` : ''}
        <h3>${t('sum.awards')}</h3><ul class="news">${ls.awards.map(a => `<li class="${a.mine ? 'mine' : ''}">${a.mine ? '🏆 ' : ''}<b>${t('award.' + a.award)}</b> · ${esc(a.player || a.club)}${a.player ? ` <span class="muted small">(${esc(a.club)})</span>` : ''}</li>`).join('')}</ul>
        <button class="cta" data-action="summary-dismiss">${t('sum.continue')}</button></section>`;
    }
    // ===== Red social, rival, récords y diario =====
    function socialCard(s) {
      if (!s.social || !s.social.length) return '';
      return `<section class="card social"><h3>${t('soc.title')}</h3><ul class="posts">${s.social.slice(0, 4).map(p => `<li><span class="av" aria-hidden="true">${p.av}</span><div><b>${esc(p.name)}</b>${p.verified ? ' <span class="ver" aria-label="' + t('soc.verified') + '">✔</span>' : ''} <small class="muted">@${esc(p.handle)}</small><p>${esc(loc(p.text))}</p><small class="muted">♥ ${p.likes.toLocaleString(CAA.I18N.getLocale())}</small></div></li>`).join('')}</ul></section>`;
    }
    function rivalCard(s) {
      const r = s.rival; if (!r) return '';
      return `<section class="card"><h3>🔥 ${t('rival.title')}</h3><p><b>${esc(r.name)}</b></p><p class="small">${t('rival.line', { g: r.g, w: r.w, l: r.l, c: r.close })}</p></section>`;
    }
    function renderActionBar() {
      if (!hasCareer() || state.tab !== 'career' || state.career.summary.retirement || state.career.summary.careerOver) return '';
      const c = state.career;
      const liveNow = c.state.live && c.state.live.week === c.state.week;
      if (liveNow) return '';
      const s = c.summary;
      if (!s.next && s.playoffs && !s.playoffs.done && !['playing', 'waiting'].includes(s.playoffs.status)) return `<div class="actionbar"><button class="cta" data-action="career-skip">${t('po.skip')} ▶</button></div>`;
      if (!s.next) return `<div class="actionbar"><button class="cta" data-action="career-play">${t('home.advance')} ▶</button></div>`;
      return `<div class="actionbar"><button class="cta" data-action="live-start">${t('home.playLive', { team: s.next.opponent.name })} <span aria-hidden="true">▶</span></button><button class="sim-btn" data-action="career-play" aria-label="${t('home.simulateLabel')}">${t('home.simulate')}</button><button class="sim-btn ff" data-action="sim-decision" aria-label="${t('simd.label')}" title="${t('simd.label')}">⏩</button></div>`;
    }
    return { newsText, chips, seasonsTxt, renderRetirement, liveWorldCards, renderHome, renderActionBar, renderSeasonSummary, socialCard, rivalCard, deadlineClock };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
