(function (root) {
  'use strict';
  // Pantallas de inicio: idioma, menú principal y asistente de creación de carrera.
  // Vista extraída de app.js: lo compartido (estado, traductor, trabajador, otras vistas…) llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  CAA.UIViews = CAA.UIViews || {};
  CAA.UIViews["boot"] = function (ui) {
    const { NATIONS, NUMBERS, crest, draft, esc, flag, hasCareer, leagueLabel, nationName, payload, state, t } = ui;
    // Banderas SVG para el selector de idioma: no dependen de la fuente de emoji del sistema.
    function langFlag(code) {
      const shapes = {
        es: '<rect width="24" height="16" fill="#c60b1e"/><rect y="4" width="24" height="8" fill="#ffc400"/><rect y="6.4" width="6" height="3.2" rx=".6" fill="#c60b1e" opacity=".7"/>',
        en: '<rect width="24" height="16" fill="#012169"/><path d="M0 0l24 16M24 0L0 16" stroke="#fff" stroke-width="3.2"/><path d="M12 0v16M0 8h24" stroke="#fff" stroke-width="5"/><path d="M12 0v16M0 8h24" stroke="#c8102e" stroke-width="2.4"/>',
        fr: '<rect width="8" height="16" fill="#002395"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#ed2939"/>',
        de: '<rect width="24" height="5.34" fill="#000"/><rect y="5.33" width="24" height="5.34" fill="#dd0000"/><rect y="10.66" width="24" height="5.34" fill="#ffce00"/>',
        it: '<rect width="8" height="16" fill="#009246"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#ce2b37"/>'
      };
      return `<svg class="flag-svg" viewBox="0 0 24 16" width="26" height="18" aria-hidden="true" focusable="false"><rect width="24" height="16" rx="2" fill="#0a0c1b"/>${shapes[code] || ''}<rect x=".5" y=".5" width="23" height="15" rx="1.6" fill="none" stroke="rgba(255,255,255,.28)"/></svg>`;
    }
    // Ilustración de portada: pabellón nocturno, cancha, aro y balón. Todo SVG/CSS, sin imágenes externas.
    function bootArt() {
      const crowd = Array.from({ length: 30 }, (_, i) => {
        const x = 8 + i * 19, y = 148 - (i * 7 % 13), h = 10 + (i * 5 % 14), tone = i % 3 === 0 ? '#232a55' : i % 3 === 1 ? '#1a2044' : '#2c3468';
        return `<rect x="${x}" y="${y}" width="12" height="${h}" rx="3" fill="${tone}"/>`;
      }).join('');
      return `<div class="boot-hero-art" aria-hidden="true"><svg viewBox="0 0 560 230" role="presentation" focusable="false">
        <defs>
          <linearGradient id="bhSpot" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#8fb3ff" stop-opacity=".3"/><stop offset="1" stop-color="#8fb3ff" stop-opacity="0"/></linearGradient>
          <linearGradient id="bhFloor" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#4b3324"/><stop offset="1" stop-color="#171226"/></linearGradient>
          <linearGradient id="bhBall" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffc48d"/><stop offset=".5" stop-color="#ff7a1f"/><stop offset="1" stop-color="#a83a05"/></linearGradient>
          <linearGradient id="bhBoard" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e8fbff" stop-opacity=".55"/><stop offset="1" stop-color="#7fb7c9" stop-opacity=".12"/></linearGradient>
          <radialGradient id="bhGlow"><stop stop-color="#3be3ff" stop-opacity=".55"/><stop offset="1" stop-color="#3be3ff" stop-opacity="0"/></radialGradient>
          <radialGradient id="bhBallGlow"><stop stop-color="#ff9a4a" stop-opacity=".5"/><stop offset="1" stop-color="#ff9a4a" stop-opacity="0"/></radialGradient>
        </defs>
        <rect width="560" height="230" fill="#0a0c1b"/>
        <path d="M128 0 10 196h216z" fill="url(#bhSpot)"/>
        <path d="M448 0 342 196h216z" fill="url(#bhSpot)" opacity=".75"/>
        <g opacity=".55">${crowd}</g>
        <rect y="176" width="560" height="54" fill="url(#bhFloor)"/>
        <path d="M0 176h560" stroke="#ffb27a" stroke-opacity=".4"/>
        <path d="M40 176q240-76 480 0" fill="none" stroke="#ffcf9a" stroke-opacity=".45" stroke-width="3"/>
        <path d="M168 176v-58h224v58" fill="none" stroke="#ffcf9a" stroke-opacity=".18" stroke-width="2"/>
        <circle cx="280" cy="176" r="34" fill="none" stroke="#ffcf9a" stroke-opacity=".16" stroke-width="2"/>
        <g transform="translate(430 96)">
          <line x1="43" y1="-46" x2="43" y2="0" stroke="#5d6bb0" stroke-width="6" opacity=".45"/>
          <rect width="88" height="58" rx="3" fill="url(#bhBoard)" stroke="#9fe9ff" stroke-opacity=".55"/>
          <rect x="27" y="15" width="34" height="24" fill="none" stroke="#9fe9ff" stroke-opacity=".45"/>
          <ellipse cx="44" cy="62" rx="24" ry="6" fill="none" stroke="#ff7a1f" stroke-width="4"/>
          <path d="M20 63l5 27m7-26 2 30m9-30v30m7-29-2 29m9-27-5 26" stroke="#cfe9ff" stroke-opacity=".5" fill="none"/>
        </g>
        <g transform="translate(150 116)"><g class="boot-art-ball">
          <circle r="58" fill="url(#bhBallGlow)"/>
          <circle r="36" fill="url(#bhBall)"/>
          <path d="M-36 0h72M0-36v72" stroke="#7a2c05" stroke-opacity=".55" stroke-width="2"/>
          <path d="M-27-24c17 15 17 33 0 48M27-24c-17 15-17 33 0 48" stroke="#7a2c05" stroke-opacity=".45" fill="none" stroke-width="2"/>
          <circle r="36" fill="none" stroke="#ffd0a8" stroke-opacity=".35"/>
        </g></g>
        <g transform="translate(16 16)">
          <rect width="152" height="54" rx="9" fill="#04060f" stroke="#3be3ff" stroke-opacity=".35"/>
          <circle class="boot-art-pulse" cx="15" cy="15" r="4" fill="#ff5470"/>
          <text x="27" y="19" font-family="'Barlow Condensed',sans-serif" font-size="12" letter-spacing="2.4" fill="#aeb3d1">LIVE</text>
          <text x="13" y="44" font-family="'Bebas Neue',sans-serif" font-size="26" letter-spacing="1" fill="#3be3ff">24 · 10:00</text>
        </g>
        <text x="548" y="214" text-anchor="end" font-family="'Bebas Neue',sans-serif" font-size="92" letter-spacing="2" fill="none" stroke="#ff7a1f" stroke-opacity=".13" stroke-width="2">BKL</text>
      </svg></div>`;
    }
    function renderBoot() {
      if (state.screen === 'lang') {
        return `<main id="panel" class="boot" tabindex="-1"><p class="eyebrow">Idioma · Language</p><h1 class="boot-title">${t('boot.title1')}<br><span>${t('boot.title2')}</span></h1>
          <div class="stack">${[['es', '🇪🇸', 'Español'], ['en', '🇬🇧', 'English'], ['fr', '🇫🇷', 'Français'], ['de', '🇩🇪', 'Deutsch'], ['it', '🇮🇹', 'Italiano']].map(([code, f, name]) => `<button class="choice" data-action="boot-lang" data-locale="${code}" lang="${code}"><span class="big-flag" aria-hidden="true">${langFlag(code)}</span><b>${name}</b><small class="lang-code" aria-hidden="true">${code.toUpperCase()}</small></button>`).join('')}</div></main>`;
      }
      if (state.screen === 'menu') {
        const leagues = Object.keys(CAA.Season.LEAGUES).length;
        const clubs = Object.values(CAA.Season.LEAGUES).reduce((a, l) => a + l.teams, 0);
        const career = hasCareer() ? state.career.summary : null;
        return `<main id="panel" class="boot" tabindex="-1"><p class="eyebrow">${t('boot.kicker')}</p><h1 class="boot-title">${t('boot.title1')}<br><span>${t('boot.title2')}</span></h1>
          <p class="boot-lead">${t('boot.lead')}</p>${bootArt()}<p class="boot-stats"><b>${leagues} ${t('boot.leagues')}</b> <b>${clubs} ${t('boot.clubs')}</b> <b>${new Set(Object.values(CAA.Season.LEAGUES).map(l => l.country)).size} ${t('boot.countries')}</b></p>
          ${ui.updateBar()}<div class="boot-actions">
            ${career ? `<button class="cta" data-action="boot-continue">${t('boot.continue')} <span aria-hidden="true">▶</span></button><p class="muted small">${esc(career.player ? career.player.name : career.coach.name)} · ${esc(career.club.name)} · ${t('career.week')} ${career.week}</p>` : ''}
            <button class="${career ? 'cta ghost' : 'cta'}" data-action="boot-new">${t('boot.new')} <span aria-hidden="true">▶</span></button>
          </div>
          <div class="tiles boot-tiles">
            <button class="tile" data-action="boot-open" data-target="jugada"><span class="ico" aria-hidden="true">${CAA.Icons.svg('ball')}</span><b>${t('more.jugada')}</b></button>
            <button class="tile" data-action="boot-open" data-target="settings"><span class="ico" aria-hidden="true">${CAA.Icons.svg('gear')}</span><b>${t('more.settings')}</b></button>
            <button class="tile" data-action="boot-open" data-target="more"><span class="ico" aria-hidden="true">${CAA.Icons.svg('more')}</span><b>${t('boot.more')}</b></button>
          </div>
          <p class="version">v${esc(payload.manifest.version)} · ${root.CAAAndroid ? 'ANDROID' : 'WEB'}</p></main>`;
      }
      if (state.screen === 'eras') return ui.renderEraMenu();
      if (state.screen === 'modes') {
        const card = (mode, ok) => `<button class="mode-card" data-action="boot-mode" data-mode="${mode}" ${ok ? '' : 'disabled'}><b>${t('modes.' + mode)}</b><span>${t('modes.' + mode + 'Desc')}</span>${ok ? '' : `<em>${t('modes.soon')}</em>`}</button>`;
        return `<main id="panel" class="boot" tabindex="-1"><p class="eyebrow">${t('boot.new')}</p><h1 class="boot-title small">${t('modes.title')}</h1>
          <h2 class="eyebrow" id="gender-h">${t('modes.genderTitle')}</h2>
          <div class="gender-pick" role="group" aria-labelledby="gender-h">${['m', 'f'].map(g => `<button class="gender-card${(state.career.gender === 'f') === (g === 'f') ? ' on' : ''}" data-action="mode-gender" data-gender="${g}" aria-pressed="${(state.career.gender === 'f') === (g === 'f')}"><b>${t(g === 'f' ? 'modes.genderF' : 'modes.genderM')}</b><span>${t(g === 'f' ? 'modes.womenDesc' : 'modes.menDesc')}</span></button>`).join('')}</div>
          <h2 class="eyebrow">${t('modes.modeTitle')}</h2>
          <div class="mode-grid">${card('player', true)}${card('coach', true)}${card('club', true)}${card('eras', true)}</div>
          <details class="mode-more"><summary>${t('modes.more')}</summary><div class="mode-grid">${card('challenge', true)}</div></details>
          <button class="ghost-btn" data-action="boot-back">${t('wiz.back')}</button></main>`;
      }
      return renderCreate();
    }
    function renderCreate() {
      const c = state.career, w = state.wizard;
      const player = c.mode === 'player';
      const era = !!c.eraYear;
      const chal = !!c.challenge && !player;
      const total = chal ? 2 : (player ? 4 : 2);
      const step = Math.min(w.step, total);
      const pick = (field, value, label, sub) => `<button class="pick" data-action="wiz-set" data-field="${field}" data-value="${esc(value)}" aria-pressed="${String(c[field]) === String(value)}"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</button>`;
      let body = '';
      const stepKey = chal ? ['challenge', 'who'][step - 1] : (player ? ['who', 'position', 'talent', 'club'] : ['who', 'club'])[step - 1];
      if (stepKey === 'challenge') {
        body = `<p class="muted">${t('chal.intro')}</p><div class="pick-list">${Object.keys(CAA.Career.CHALLENGES).map(k => pick('challenge', k, t('chal.' + k), t('chal.' + k + 'Desc') + ' ' + t('chal.' + k + 'Goal'))).join('')}</div>`;
      } else if (stepKey === 'era') {
        body = `<p class="muted">${t('era.intro')}</p><div class="pick-list">${CAA.Eras.DECADES.map(d => pick('eraYear', d.start, t('era.d.' + d.id), t('era.d.' + d.id + 'Desc'))).join('')}</div>`;
      } else if (stepKey === 'who') {
        body = `<label for="career-name">${t(player ? 'wiz.name' : 'wiz.coachName')}<input id="career-name" value="${esc(draft('career-name', c.name))}" maxlength="40" autocomplete="off" placeholder="${t('career.namePlaceholder')}"></label>
          ${c.newClub ? `<h3 class="eyebrow">${t('club.found')}</h3><label for="club-name">${t('club.name')}<input id="club-name" value="${esc(draft('club-name', c.newClub.name))}" maxlength="30" autocomplete="off" placeholder="${t('club.namePh')}"></label>
            <label for="club-abbr">${t('club.abbr')}<input id="club-abbr" value="${esc(draft('club-abbr', c.newClub.abbr))}" maxlength="4" autocomplete="off"></label>
            <div class="pick-grid two"><label for="club-primary">${t('club.primary')}<input id="club-primary" type="color" value="${esc(c.newClub.primary)}"></label><label for="club-secondary">${t('club.secondary')}<input id="club-secondary" type="color" value="${esc(c.newClub.secondary)}"></label></div>` : ''}
          ${chal ? `<details><summary>${t('wiz.advanced')}</summary><label for="career-seed">${t('career.seed')}<input id="career-seed" value="${esc(draft('career-seed', c.seed))}"></label></details>` : ''}
          ${player ? `<label for="career-nationality">${t('career.nationality')}<select id="career-nationality">${NATIONS.slice().sort((a, b) => nationName(a).localeCompare(nationName(b))).map(n => `<option value="${n}" ${n === c.nationality ? 'selected' : ''}>${flag(n)} ${esc(nationName(n))}</option>`).join('')}</select></label>` : ''}`;
      } else if (stepKey === 'position') {
        body = `<h3 class="eyebrow">${t('career.pos')}</h3><div class="pick-grid">${['PG', 'SG', 'SF', 'PF', 'C'].map(p => pick('pos', p, p, t('pos.' + p))).join('')}</div>
          <h3 class="eyebrow">${t('career.archetype')}</h3><p class="muted small wiz-hint">${t('wiz.profilesHint', { pos: t('pos.' + c.pos) })}</p><div class="pick-list profiles">${CAA.Player.profilesFor(c.pos).map(p => `<button class="pick profile" data-action="wiz-set" data-field="archetype" data-value="${p.archetype}" aria-pressed="${c.archetype === p.archetype}"><b>${t('profile.' + p.pos + '.' + p.archetype)}</b><small>${t('arch.' + p.archetype)}</small><span class="chips">${p.strengths.map(k => `<span class="chip">${t('attr.' + k)}</span>`).join('')}</span></button>`).join('')}</div>
          <h3 class="eyebrow">${t('career.handedness')}</h3><div class="pick-grid two">${pick('handedness', 'right', t('career.right'))}${pick('handedness', 'left', t('career.left'))}</div>
          <h3 class="eyebrow">${t('wiz.number')}</h3><div class="pick-grid nums">${NUMBERS.map(n => pick('number', n, String(n))).join('')}</div>`;
      } else if (stepKey === 'talent') {
        body = `<div class="pick-list">${['promise', 'gem', 'chosen', 'mystery'].map(k => pick('talent', k, t('talent.' + k), t('talent.' + k + 'Desc'))).join('')}</div>`;
      } else {
        const routes = era ? ['world'] : c.gender === 'f' ? (player ? ['na-draft', 'na-undrafted', 'world'] : ['na-draft', 'world']) : player ? ['eu-academy', 'na-draft', 'na-undrafted', 'world'] : ['eu-academy', 'na-draft', 'world'];
        const clubLeague = c.route === 'world' ? c.leagueId : c.route === 'eu-academy' ? 'es-ascenso-iberico' : c.gender === 'f' ? 'na-boreal-women' : 'na-boreal-men';
        body = `<h3 class="eyebrow">${t('wiz.path')}</h3><div class="pick-list">${routes.map(r => pick('route', r, t('route.' + r), t('route.' + r + (c.gender === 'f' && r !== 'world' ? (player ? 'DescW' : r === 'na-draft' ? 'DescCoachW' : 'Desc') : 'Desc')))).join('')}</div>
          ${c.route === 'world' ? `${leaguePicker('career', c.gender, c.leagueId, null, c.eraYear, c.leagueCountry)}${era ? `<p class="muted small">${t('era.leaguesNote', { year: c.eraYear })}</p>` : ''}` : ''}
          ${c.newClub ? `<p class="muted small">${t('club.foundNote')}</p>` : `<h3 class="eyebrow">${t(c.route === 'na-draft' ? 'wiz.preferredClub' : 'wiz.firstClub')}</h3>`}
          ${c.newClub ? '' : c.clubsLoading ? `<p class="muted">${t('status.working')}</p>` : `<div class="pick-list clubs">${c.clubs.map(x => `<button class="pick club" data-action="wiz-set" data-field="clubId" data-value="${esc(x.id)}" aria-pressed="${x.id === c.clubId}">${crest(x)}<b>${esc(x.name)}</b><small>${esc(c.route === 'world' ? leagueLabel(clubLeague) : t('league.' + clubLeague))}</small></button>`).join('')}</div>`}
          <p class="muted small">${t(c.route === 'na-draft' ? 'career.draftClubNote' : 'career.clubNote')}</p>
          <details><summary>${t('wiz.advanced')}</summary><label for="career-seed">${t('career.seed')}<input id="career-seed" value="${esc(draft('career-seed', c.seed))}"></label><label class="check-label"><input id="career-quick" type="checkbox" ${c.quick ? 'checked' : ''}>${t('wiz.quick')}</label></details>`;
      }
      const last = step === total;
      return `<main id="panel" class="boot create" tabindex="-1"><p class="eyebrow">${t('wiz.step', { n: step, total })}</p>
        <div class="steps" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i class="${i < step ? 'on' : ''}"></i>`).join('')}</div>
        <h1 class="boot-title small">${t('wiz.' + stepKey + (player || stepKey === 'era' || stepKey === 'challenge' ? '' : 'Coach'))}</h1>${body}
        <div class="wiz-nav"><button class="ghost-btn" data-action="${step === 1 ? 'wiz-cancel' : 'wiz-back'}">${t(step === 1 ? 'confirm.cancel' : 'wiz.back')}</button>
        ${last ? `<button class="cta" data-action="career-create" ${!chal && (c.clubsLoading || !c.clubId) ? 'disabled' : ''}>${t('wiz.start')} <span aria-hidden="true">▶</span></button>` : `<button class="cta" data-action="wiz-next">${t('wiz.next')}</button>`}</div></main>`;
    }
    const CONTINENTS = ['europe', 'americas', 'asia', 'oceania', 'africa'];
    // Selector en dos pasos (país → liga) para las más de 200 ligas del mundo.
    function leaguePicker(prefix, gender, selected, exclude, year, countryState) {
      const list = CAA.Season.leagueList(gender).filter(l => (!exclude || !exclude.includes(l.id)) && (!year || CAA.Eras.available(CAA.Season.LEAGUES[l.id], year)));
      const selL = CAA.Season.LEAGUES[selected];
      const country = countryState && list.some(l => l.country === countryState) ? countryState : selL && list.some(l => l.country === selL.country) ? selL.country : (list[0] || {}).country;
      const countries = Array.from(new Set(list.map(l => l.country)));
      const cname = c => c === 'AF' ? t('continent.africa') : nationName(c);
      const groups = CONTINENTS.map(ct => { const cs = countries.filter(c => (list.find(l => l.country === c) || {}).continent === ct).sort((a, b) => cname(a).localeCompare(cname(b))); return cs.length ? `<optgroup label="${t('continent.' + ct)}">${cs.map(c => `<option value="${c}" ${c === country ? 'selected' : ''}>${c === 'AF' ? '🌍' : flag(c)} ${esc(cname(c))}</option>`).join('')}</optgroup>` : ''; }).join('');
      const leagues = list.filter(l => l.country === country).sort((a, b) => a.level - b.level || a.gender.localeCompare(b.gender));
      return `<label for="${prefix}-country">${t('wiz.country')}<select id="${prefix}-country" data-picker="${prefix}">${groups}</select></label>
        <label for="${prefix}-league">${t('wiz.league')}<select id="${prefix}-league">${leagues.map(l => `<option value="${l.id}" ${l.id === selected ? 'selected' : ''}>${esc(CAA.Season.LEAGUES[l.id].name)}${l.level === 2 ? ' · 2' : ''}</option>`).join('')}</select></label>
        <p class="muted small">${t('wiz.leagueCount', { n: list.length, c: countries.length })}</p>`;
    }
    function leagueOptions(gender, selected, exclude, year) {
      const list = CAA.Season.leagueList(gender).filter(l => (!exclude || !exclude.includes(l.id)) && (!year || CAA.Eras.available(CAA.Season.LEAGUES[l.id], year)));
      return CONTINENTS.map(c => { const ls = list.filter(l => l.continent === c); return ls.length ? `<optgroup label="${t('continent.' + c)}">${ls.map(l => `<option value="${l.id}" ${l.id === selected ? 'selected' : ''}>${esc(leagueLabel(l.id))}${l.level === 2 ? ' · 2' : ''}</option>`).join('')}</optgroup>` : ''; }).join('');
    }
    return { langFlag, bootArt, renderBoot, renderCreate, CONTINENTS, leaguePicker, leagueOptions };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
