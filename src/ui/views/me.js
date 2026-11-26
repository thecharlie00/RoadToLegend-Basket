(function (root) {
  'use strict';
  // YO: cromo, atributos, plantilla del entrenador, avatar, mascota y loro, tienda y estilo.
  // Vista extraída de app.js: lo compartido (estado, traductor, trabajador, otras vistas…) llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIViews = CAA.UIViews || {};
  CAA.UIViews["me"] = function (ui) {
    const { ATTR_GROUPS, bar, crest, draft, esc, flag, hasCareer, loc, meter, nationName, pick, seasonLabel, state, t, tier } = ui;
    function avatarProfile() {
      const s = state.career.summary;
      if (!s) return null;
      const life = s.life || { equipment: {} };
      const items = CAA.Content.packs().shop.items;
      const color = slot => { const item = items.find(i => i.id === (life.equipment || {})[slot]); return item ? item.color : null; };
      const p = s.player;
      return { mode: s.mode, name: p ? p.name : s.coach.name, height: p ? p.height : 190, archetype: p ? p.archetype : null, handedness: p ? p.handedness : 'right', women: !!(s.league && s.league.gender === 'f'), look: s.look || null, equipment: { jersey: color('jersey'), shoes: color('shoes'), accessory: color('accessory') } };
    }
    function face(p) { return CAA.Faces ? CAA.Faces.svg(p, 26) : ''; }
    function avatarHtml() {
      const profile = avatarProfile();
      if (!profile) return '';
      const eq = profile.equipment || {};
      const style = c => c ? ` style="background:${esc(c)}"` : '';
      return `<div class="avatar-wrap"><canvas id="me3d" role="img" aria-label="${t('life.me3d', { name: esc(profile.name) })}"></canvas><button class="small-btn celebrate" data-action="celebrate">🎉 ${t('look.celebrate')}</button><div id="me2d" class="me2d" role="img" aria-label="${t('life.me')}" hidden><div class="me-head"${style(eq.accessory)}></div><div class="me-body"${style(eq.jersey)}></div><div class="me-legs"></div><div class="me-shoes"${style(eq.shoes)}></div></div><p class="muted">${t('life.meNote')}</p></div>`;
    }
    function drawPet() {
      const canvas = doc.getElementById('pet3d');
      const pet = state.career.summary && state.career.summary.pet;
      if (!canvas || !pet) { if (ui.petTimer) { root.clearTimeout(ui.petTimer); ui.petTimer = null; } return; }
      try {
        if (!ui.petRenderer || ui.petCanvas !== canvas) { if (ui.petRenderer) ui.petRenderer.dispose(); ui.petCanvas = canvas; ui.petRenderer = CAA.Voxel.createRenderer(canvas, { onContextLost: () => { ui.petRenderer = null; ui.petCanvas = null; } }); }
        const reduced = CAA.A11Y.reduced(state.settings);
        const club = state.career.summary && state.career.summary.club;
        ui.petRenderer.draw(CAA.PetVox.geometry(Object.assign({ stage: CAA.Pet.stageOf(pet) }, pet), { colorMode: state.settings.colorMode, highContrast: state.settings.highContrast, t: root.performance.now() / 1000, reduced, clubColors: CAA.Crest && CAA.Crest.colors && club ? CAA.Crest.colors(club) : null }), 'avatar');
        if (!reduced && !doc.hidden) { if (ui.petTimer) root.clearTimeout(ui.petTimer); ui.petTimer = root.setTimeout(drawPet, 90); }
      } catch (_) { canvas.hidden = true; }
    }
    function drawScene() {
      const canvas = doc.getElementById('ev3d');
      if (!canvas || !avatarProfile() || !CAA.Scenes) return;
      try {
        if (!ui.sceneRenderer || ui.sceneCanvas !== canvas) { if (ui.sceneRenderer) ui.sceneRenderer.dispose(); ui.sceneCanvas = canvas; ui.sceneRenderer = CAA.Voxel.createRenderer(canvas, { onContextLost: () => { canvas.hidden = true; ui.sceneRenderer = null; ui.sceneCanvas = null; } }); }
        const reduced = CAA.A11Y.reduced(state.settings), tt = root.performance.now() / 1000;
        const g = CAA.Scenes.geometry(canvas.dataset.cat, avatarProfile(), { colorMode: state.settings.colorMode, highContrast: state.settings.highContrast, t: reduced ? null : tt, dribble: false });
        if (!reduced && g.camera) { const c = g.camera, dx = c.eye[0] - c.target[0], dz = c.eye[2] - c.target[2], r = Math.hypot(dx, dz), a0 = Math.atan2(dx, dz) + Math.sin(tt * 0.35) * 0.09; g.camera = Object.assign({}, c, { eye: [c.target[0] + Math.sin(a0) * r, c.eye[1] + Math.sin(tt * 0.5) * 0.06, c.target[2] + Math.cos(a0) * r] }); }
        g.light = Object.assign(CAA.Voxel.studioLight(g.camera.eye, g.camera.target), { ambient: 0.5, aoMin: 0.84 }); g.gain = 1.06;
        ui.sceneRenderer.draw(g, g.camera);
        if (!reduced && !doc.hidden) { if (ui.sceneTimer) root.clearTimeout(ui.sceneTimer); ui.sceneTimer = root.setTimeout(drawScene, 50); }
      } catch (_) { canvas.hidden = true; }
    }
    function drawAvatar() {
      const canvas = doc.getElementById('me3d');
      if (!canvas || !avatarProfile()) return;
      const fallback = () => { canvas.hidden = true; const el = doc.getElementById('me2d'); if (el) el.hidden = false; };
      try {
        if (!ui.avatarRenderer || ui.avatarCanvas !== canvas) {
          ui.avatarCanvas = canvas;
          ui.avatarRenderer = CAA.Voxel.createRenderer(canvas, { onContextLost: () => { fallback(); ui.avatarRenderer = null; ui.avatarCanvas = null; } });
        }
        // Celebración: al tocar el modelo hace la celebración elegida en «Aspecto» durante 1,6 s.
        const cel = state.celebrate, ph = cel ? (root.performance.now() - cel) / 1600 : 1;
        if (cel && ph >= 1) state.celebrate = null;
        const reduced = CAA.A11Y.reduced(state.settings);
        const g = CAA.Voxel.avatarGeometry(avatarProfile(), { colorMode: state.settings.colorMode, highContrast: state.settings.highContrast, celebrate: !!state.celebrate, phase: Math.min(1, ph), t: reduced ? null : root.performance.now() / 1000 });
        // Peana con el color del nivel del cromo y cámara en ligero vaivén (estático con movimiento reducido).
        const pl = state.career && state.career.summary && state.career.summary.player, tk = pl ? (pl.ovr >= 85 ? '#8b5cf6' : pl.ovr >= 80 ? '#e2b23b' : pl.ovr >= 68 ? '#b9c3ca' : '#c08a52') : '#ff7a1f';
        g.colors.ped_a = [0.08, 0.09, 0.18]; g.colors.ped_b = [parseInt(tk.slice(1, 3), 16) / 255, parseInt(tk.slice(3, 5), 16) / 255, parseInt(tk.slice(5, 7), 16) / 255];
        g.cubes = g.cubes.filter(c => c.color !== 'shadow');
        g.cubes.unshift({ x: 0, y: -0.06, z: 0, sx: 1.5, sy: 0.12, sz: 1.5, color: 'ped_a', yaw: 0.785 }, { x: 0, y: 0.015, z: 0, sx: 1.25, sy: 0.04, sz: 1.25, color: 'ped_b', yaw: 0.785 });
        const tt = root.performance.now() / 1000, a = reduced ? 0.5 : 0.5 + Math.sin(tt * 0.5) * 0.32;
        const cam = { eye: [Math.sin(a) * 6.4, 2.6, Math.cos(a) * 6.4], target: [0, 1.5, 0], fov: 36, near: 0.1, far: 40 };
        g.light = CAA.Voxel.studioLight(cam.eye, cam.target); g.clear = [0.28, 0.3, 0.44]; g.gain = 1.08; g.sky = [[0.5, 0.53, 0.68], [0.33, 0.36, 0.52], [0.2, 0.2, 0.3]]; g.glow = 0.55;
        ui.avatarRenderer.draw(g, cam);
        if (!reduced && !doc.hidden && state.tab === 'life' && !state.celebrate) { if (ui.avatarTimer) root.clearTimeout(ui.avatarTimer); ui.avatarTimer = root.setTimeout(drawAvatar, 40); }
        if (state.celebrate) root.setTimeout(drawAvatar, 60);
      } catch (_) { fallback(); }
    }
    function renderCromo() {
      if (!hasCareer()) return `<header class="cromo"><div class="cromo-id"><b class="title-sm">${t('boot.title1')} ${t('boot.title2')}</b></div><button class="iconbtn" data-action="boot-menu" aria-label="${t('nav.menu')}">⋯</button></header>`;
      const s = state.career.summary, p = s.player;
      const ovr = p ? p.ovr : Math.round(s.table.length ? 50 + (s.club.wins - s.club.losses) : 50);
      const cc = CAA.Crest && CAA.Crest.colors && s.club ? CAA.Crest.colors(s.club) : null;
      const clubStyle = cc ? ` style="--club-a:${esc(cc[0])};--club-b:${esc(cc[1])}"` : '';
      return `<header class="cromo"${clubStyle}><div class="ovr tier-${tier(ovr)}" aria-label="${t('cromo.ovr', { ovr })}"><b>${p ? p.ovr : '★'}</b><small>${p ? esc(p.pos) : t('cromo.coach')}</small></div>
        <div class="cromo-id">${p ? `<span class="dorsal" aria-label="${t('cromo.number', { n: p.number })}">${p.number}</span>` : ''}<b class="name">${esc(p ? p.name : s.coach.name)}</b>
        <span class="cromo-sub">${crest(s.club)} ${esc(s.club.name)} · ${p ? t('cromo.age', { age: p.age }) + ' ' + flag(p.nationality) : t('cromo.coachRole')}</span></div>
        <button class="iconbtn" data-action="toggle-audio" aria-pressed="${!!state.settings.audio}" aria-label="${t('settings.audio')}">♪</button><button class="iconbtn" data-action="boot-menu" aria-label="${t('nav.menu')}">⋯</button></header>`;
    }
    // Cromo del jugador (como la carta del fútbol): color por media, dorsal, escudo y seis valoraciones.
    function playerCard(s, p) {
      const A = p.attrs || {}, avg = keys => Math.round(keys.reduce((a, k) => a + (A[k] || 50), 0) / keys.length);
      const G = [['TIR', ['tiroCerca', 'tiroMedia', 'tiroTriple', 'tiroLibre']], ['ATA', ['bandeja', 'mate', 'poste']], ['ORG', ['manejo', 'pase', 'vision']],
        ['DEF', ['defExterior', 'defInterior', 'robo', 'tapon']], ['REB', ['rebOf', 'rebDef']], ['FIS', ['velocidad', 'aceleracion', 'salto', 'fuerza', 'resistencia']]];
      const tierK = p.ovr >= 85 ? 'special' : tier(p.ovr), potLow = Math.max(p.ovr, p.potential - 4), potHigh = Math.min(99, p.potential + 4);
      return `<section class="pcard ${tierK}" aria-label="${t('me.card', { name: esc(p.name), ovr: p.ovr })}">
        <div class="pc-stage">${avatarHtml()}</div>
        <div class="pc-info"><div class="pc-top"><div><b class="pc-ovr">${p.ovr}</b><span class="pc-pos">${esc(p.pos)}</span></div><span class="pc-num">${p.number}</span>${crest(s.club, 30)}</div>
        <h2 class="pc-name">${esc(p.name)}</h2><div class="pc-grid">${G.map(([k, keys]) => `<span><b>${avg(keys)}</b> ${t('card.' + k)}</span>`).join('')}</div></div>
        <p class="pc-foot">${flag(p.nationality)} ${t('pos.' + p.pos)} · ${t('career.archetype.' + p.archetype)} · ${p.height} cm · ${t('me.pot')} ${potLow}–${potHigh}</p></section>`;
    }
    // Libro de estadísticas: partido a partido, mapa de tiro y progresión (lo que más piden los jugadores).
    const pct = v => v == null ? '—' : v.toFixed(1).replace(/\.0$/, '') + '%';
    function shotChart(zones, title) {
      const Z = { restricted: [150, 50, 'circle'], paint: [150, 100, 'rect'], midShort: [95, 70, 'circle'], midLong: [205, 118, 'circle'], corner3: [22, 40, 'rect'], above3: [150, 172, 'circle'] };
      const att = zones.reduce((a, z) => a + z.att, 0);
      const heat = z => z.att ? (z.pct >= 50 ? 'var(--good)' : z.pct >= 35 ? 'var(--gold)' : 'var(--bad)') : 'var(--line)';
      const cells = zones.map(z => { const [x, y] = Z[z.zone]; return `<g><circle cx="${x}" cy="${y}" r="${z.att ? 17 : 13}" fill="${heat(z)}" opacity="${z.att ? 0.85 : 0.35}"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">${z.att ? Math.round(z.pct) + '%' : '—'}</text></g>`; }).join('');
      const corner2 = zones.find(z => z.zone === 'corner3'), c2 = corner2 && corner2.att ? `<circle cx="278" cy="40" r="17" fill="${heat(corner2)}" opacity="0.85"/>` : '';
      return `<figure class="shotmap"><svg viewBox="0 0 300 210" role="img" aria-label="${esc(title)}"><rect x="1" y="1" width="298" height="208" rx="10" fill="var(--panel)" stroke="var(--line)"/>
        <path d="M14 1 V70 A140 140 0 0 0 286 70 V1" fill="none" stroke="var(--line)" stroke-width="2"/><rect x="100" y="1" width="100" height="120" fill="none" stroke="var(--line)" stroke-width="2"/><circle cx="150" cy="22" r="8" fill="none" stroke="var(--accent)" stroke-width="2.5"/>${c2}${cells}</svg>
        <figcaption><ul class="zone-list">${zones.map(z => `<li><span>${t('zone.' + z.zone)}</span><b>${z.made}/${z.att}</b><small>${pct(z.pct)}</small></li>`).join('')}</ul>${att ? '' : `<p class="muted small">${t('book.noShots')}</p>`}</figcaption></figure>`;
    }
    function lineChart(rows, keys) {
      if (rows.length < 2) return `<p class="muted small">${t('book.progressSoon')}</p>`;
      const W = 300, H = 150, P = 26, n = rows.length;
      const x = i => P + (W - P * 2) * (n === 1 ? 0.5 : i / (n - 1));
      const series = keys.map(([k, color, max]) => {
        const y = v => H - P - (H - P * 2) * Math.max(0, Math.min(1, v / max));
        const pts = rows.map((r, i) => `${x(i).toFixed(1)},${y(r[k] || 0).toFixed(1)}`).join(' ');
        return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>${rows.map((r, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(r[k] || 0).toFixed(1)}" r="3.5" fill="${color}"><title>${seasonLabel(r.y)} · ${t('book.k.' + k)}: ${r[k]}</title></circle>`).join('')}`;
      }).join('');
      const labels = rows.map((r, i) => (n <= 8 || i % Math.ceil(n / 8) === 0 || i === n - 1) ? `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="9" fill="var(--muted)">${String(r.y).slice(-2)}</text>` : '').join('');
      return `<svg class="progress-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('book.progress')}"><line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="var(--line)"/>${series}${labels}</svg>
        <p class="legend small">${keys.map(([k, color]) => `<span><i style="background:${color}"></i>${t('book.k.' + k)}</span>`).join('')}</p>`;
    }
    function bookCards(s) {
      const b = s.book; if (!b) return '';
      const row = g => `<tr class="${g.won ? '' : 'loss'}"><td>${g.po ? '🏆 ' : ''}${t(g.home ? 'home.vsHome' : 'home.vsAway', { team: esc(g.opp) })}</td><td class="num ${g.won ? 'ok' : 'bad'}">${t(g.won ? 'home.w' : 'home.l')} ${g.score[0]}–${g.score[1]}</td>${s.player ? (g.dnp ? `<td class="num muted" colspan="5">${t('book.dnp')}</td>` : `<td class="num">${g.min}</td><td class="num"><b>${g.pts}</b></td><td class="num">${g.reb}</td><td class="num">${g.ast}</td><td class="num">${g.fgm}/${g.fga}</td>`) : `<td>${g.top ? esc(g.top) + ' · ' + g.topPts : ''}</td>`}</tr>`;
      const head = s.player ? `<th class="num">${t('stat.min')}</th><th class="num">${t('stat.pts')}</th><th class="num">${t('stat.reb')}</th><th class="num">${t('stat.ast')}</th><th class="num">${t('book.fg')}</th>` : `<th>${t('book.topScorer')}</th>`;
      const log = b.log.slice().reverse(), first = log.slice(0, 8), rest = log.slice(8);
      const table = list => `<div class="table-scroll compact" tabindex="0" role="region" aria-label="${t('book.log')}"><table><thead><tr><th>${t('book.rival')}</th><th class="num">${t('book.result')}</th>${head}</tr></thead><tbody>${list.map(row).join('')}</tbody></table></div>`;
      const best = s.player ? log.filter(g => !g.dnp).sort((a, c) => c.pts - a.pts)[0] : null;
      const logCard = `<section class="card"><div class="guide-head"><h3>${t('book.log')}</h3><span class="tag">${t('book.games', { n: log.length })}</span></div>
        ${log.length ? table(first) + (rest.length ? `<details><summary>${t('book.more', { n: rest.length })}</summary>${table(rest)}</details>` : '') : `<p class="muted small">${t('book.empty')}</p>`}
        ${best ? `<p class="small">${t('book.best', { pts: best.pts, team: esc(best.opp) })}</p>` : ''}</section>`;
      if (!s.player) return logCard;
      const shots = `<section class="card"><h3>${t('book.shots')}</h3><p class="muted small">${t('book.shotsDesc')}</p>${shotChart(b.zones, t('book.shots'))}
        <details><summary>${t('book.shotsCareer')}</summary>${shotChart(b.careerZones, t('book.shotsCareer'))}</details></section>`;
      const prog = `<section class="card"><h3>${t('book.progress')}</h3>${lineChart(b.seasons, [['ovr', 'var(--accent)', 99], ['ppg', 'var(--gold)', 40], ['rpg', 'var(--sky)', 20]])}</section>`;
      return logCard + shots + prog;
    }
    function attrHelp() {
      return `<details class="attr-help"><summary>${t('attrh.title')}</summary><p class="muted small">${t('attrh.intro')}</p><dl>${ATTR_GROUPS.map(([, keys]) => keys.map(k => `<dt>${t('attr.' + k)}</dt><dd>${t('attrh.' + k)}</dd>`).join('')).join('')}</dl></details>`;
    }
    function renderMe() {
      if (!hasCareer()) return ui.renderHome();
      const s = state.career.summary, life = s.life || { achievements: [], owned: [], equipment: {}, counters: {}, press: [] };
      const packs = CAA.Content.packs();
      const p = s.player;
      const potLow = p ? Math.max(p.ovr, p.potential - 4) : 0, potHigh = p ? Math.min(99, p.potential + 4) : 0;
      const hero = p ? playerCard(s, p) : `<section class="card me-hero">${avatarHtml()}<div><h2>${esc(p ? p.name : s.coach.name)}</h2>
        ${p ? `<p class="muted">${t('pos.' + p.pos)} · ${t('career.archetype.' + p.archetype)} · ${t(p.handedness === 'left' ? 'career.left' : 'career.right')}</p>
        <div class="kv"><span>${t('me.ovr')}</span><b>${p.ovr}</b><span>${t('me.pot')}</span><b>${potLow}–${potHigh}</b><span>${t('me.height')}</span><b>${p.height} cm</b><span>${t('me.wingspan')}</span><b>${p.wingspan} cm</b><span>${t('me.weight')}</span><b>${p.weight} kg</b><span>${t('career.nationality')}</span><b>${flag(p.nationality)} ${esc(nationName(p.nationality))}</b></div>`
        : `<p class="muted">${t('cromo.coachRole')} · ${esc(s.club.name)}</p><div class="kv"><span>${t('meter.morale')}</span><b>${s.coach.morale}</b><span>${t('meter.board')}</span><b>${s.coach.trust}</b></div>`}</div></section>`;
      const brand = life.sponsor ? t('sponsor.' + life.sponsor) : t('me.noSponsor');
      const offcourt = `<section class="card"><h3>${t('me.offcourt')}</h3><div class="kv"><span>${t('me.agent')}</span><b>${t(life.agent ? 'agent.' + life.agent : 'me.noAgent')}</b><span>${t('me.sponsor')}</span><b>${esc(brand)}</b><span>${t('meter.fame')}</span><b>${life.fame || 0}</b><span>${t('life.cash')}</span><b>${(life.cash || 0).toLocaleString(CAA.I18N.getLocale())}</b><span>${t('life.style')}</span><b>${life.style}</b></div></section>`;
      const attrs = p ? `<section class="card"><h3>${t('me.attributes')}</h3><div class="attr-groups">${ATTR_GROUPS.map(([g, keys]) => `<div><h4 class="eyebrow">${t('attrg.' + g)}</h4>${keys.map(k => bar(t('attr.' + k), p.attrs[k])).join('')}</div>`).join('')}</div>${attrHelp()}</section>` : '';
      const st = p ? p.stats : null;
      const stats = p ? `<section class="card"><h3>${t('me.season')}</h3><div class="statline">${[['gp', st.gp], ['min', (st.min / Math.max(1, st.gp)).toFixed(1)], ['pts', (st.pts / Math.max(1, st.gp)).toFixed(1)], ['reb', (st.reb / Math.max(1, st.gp)).toFixed(1)], ['ast', (st.ast / Math.max(1, st.gp)).toFixed(1)], ['stl', (st.stl / Math.max(1, st.gp)).toFixed(1)], ['blk', (st.blk / Math.max(1, st.gp)).toFixed(1)]].map(([k, v]) => `<div><b>${v}</b><small>${t('stat.' + k)}</small></div>`).join('')}</div>
        <p class="muted small">${p.contract ? t('me.contract', { salary: p.contract.salary.toLocaleString(CAA.I18N.getLocale()), years: p.contract.years }) : t('me.noContract')}</p></section>` : '';
      const petCard = renderPet(s);
      const fm = s.family;
      const famCard = fm && (fm.partner || fm.children.length || fm.legends.length) ? `<section class="card family"><h3>${t('fam.title')}</h3>
        ${fm.partner ? `<p><b>${esc(fm.partner.name)}</b> · ${t('fam.status.' + fm.status)}</p>${meter(t('fam.happiness'), fm.partner.happiness)}` : `<p class="muted small">${t('fam.status.single')}</p>`}
        ${fm.children.length ? `<h4 class="eyebrow">${t('fam.children')}</h4>${fm.children.map(c => `<div class="kv"><span>${esc(c.name)} · ${t('ret.childAge', { n: state.career.state.year - c.bornYear })}</span><b>${t('fam.bond', { n: Math.round(c.bond) })}</b></div>`).join('')}` : ''}
        ${fm.legends.length ? `<h4 class="eyebrow">${t('fam.dynasty', { n: fm.generation })}</h4><ul class="news">${fm.legends.map((l, i) => `<li>🏛 <b>${esc(l.name)}</b> · ${t('fam.gen', { n: i + 1 })} · ${t('ret.legendLine', { seasons: ui.seasonsTxt(l.seasons), pts: l.totals ? l.totals.pts : 0, titles: l.titles })}</li>`).join('')}</ul>` : ''}</section>` : '';
      const coachCards = s.squad ? renderSquad(s) : '';
      const best = (life.arcade && life.arcade.best) || {};
      const minis = `<section class="card"><div class="guide-head"><h3>${t('arcade.title')}</h3><span class="tag led">${t('arcade.plays', { n: life.counters.arcadePlays || 0 })}</span></div>${ui.arcadeExtras(life)}<div class="minis">${CAA.Arcade.TYPES.map(g => `<div class="mini"><span class="mini-ico" aria-hidden="true">${CAA.Icons.svg({ freeThrow: 'freethrow', three: 'three', buzzer: 'buzzer', dunk: 'dunk', defense: 'defense', street: 'street' }[g], 22)}</span><div class="mini-txt"><b>${t('arcade.' + g)}</b><small>${best[g] != null ? t('arcade.best', { n: best[g] }) : t('arcade.noBest')}${ui.arcadeStat(life, g)}</small></div><button class="mini-go" data-action="arcade-start" data-game="${g}" aria-label="${esc(t('arcade.play') + ': ' + t('arcade.' + g) + '. ' + t('arcade.' + g + 'Desc'))}">${CAA.Icons.svg('ball', 18)}</button><button class="mini-auto" data-action="arcade-auto" data-game="${g}" aria-label="${esc(t('arcade.auto') + ': ' + t('arcade.' + g))}" title="${t('arcade.auto')}">AUTO</button></div>`).join('')}</div>
        ${life.pendingArcade ? `<p class="muted small">${t('arcade.pending', { game: t('arcade.' + life.pendingArcade.type) })}</p><div class="row"><button class="small-btn" data-action="arcade-resume">${t('arcade.resume')}</button><button class="small-btn" data-action="arcade-cancel">${t('arcade.abandon')}</button></div>` : ''}</section>`;
      const practice = `<section class="card"><h3>${t('me.practice')}</h3><p class="muted small">${t('me.practiceDesc')}</p>
        <div class="pick-grid two"><button class="option" data-action="life-practice-start"><b>${t('life.practiceManual')}</b></button><button class="option" data-action="life-practice-auto"><b>${t('life.practiceAuto')}</b></button><button class="option" data-action="life-buzzer-start"><b>${t('life.buzzerManual')}</b></button><button class="option" data-action="life-buzzer-auto"><b>${t('life.buzzerAuto')}</b></button></div>
        ${state.practice && state.practice.start != null ? `<button class="cta" data-action="life-practice-release">${t('life.release')}</button>` : ''}
        ${life.pendingPractice ? `<p class="muted small">${t('life.pendingAttempt', { type: t(life.pendingPractice.type === 'buzzer' ? 'life.buzzerAuto' : 'life.practiceAuto'), id: life.pendingPractice.id })}</p><div class="row"><button class="small-btn" data-action="life-practice-resume">${t('life.resumeAttempt')}</button><button class="small-btn" data-action="life-practice-cancel">${t('life.cancelAttempt')}</button></div>` : ''}
        ${state.practice && state.practice.result ? `<p class="${state.practice.result.made ? 'ok' : 'bad'}"><b>${state.practice.result.made ? t('life.made') : t('life.missed')}</b></p>` : ''}</section>`;
      const g = s.gear;
      const shop = g ? `<section class="card"><div class="guide-head"><h3>${t('me.gear')}</h3><span class="tag">${(g.cash || 0).toLocaleString(CAA.I18N.getLocale())} €</span></div>
        <p class="small">${g.effective.total ? t('shop.effective', { stats: statText(g.effective.attrs) }) : t('shop.none')}</p>
        <div class="row"><button class="small-btn primary" data-tab="shop">🛍 ${t('more.shop')}</button><button class="small-btn" data-tab="look">🎨 ${t('more.look')}</button></div></section>` : '';
      const all = packs.achievements.achievements.filter(a => !a.mode || a.mode === 'any' || a.mode === s.mode), unlocked = all.filter(a => life.achievements.includes(a.id)).length;
      const trophies = `<section class="card"><div class="guide-head"><h3>${t('me.trophies')}</h3><span class="tag led">${unlocked}/${all.length}</span></div>${CAA.PlayGames.available(root) ? `<button class="small-btn" data-action="pgs-show">${t('pgs.show')}</button>` : ''}<ul class="trophies" tabindex="0" aria-label="${t('me.trophies')}">${all.map(a => { const ok = life.achievements.includes(a.id); return `<li class="${ok ? 'ok' : 'locked'}"><span aria-hidden="true">${ok ? '🏆' : '🔒'}</span><span><b>${esc(loc(a.title))}</b><small>${esc(t('ach.' + a.metric, { n: a.threshold.toLocaleString(CAA.I18N.getLocale()) }))}</small></span></li>`; }).join('')}</ul></section>`;
      const press = (life.press || []).length ? `<section class="card"><h3>${t('life.press')}</h3><ul class="news">${life.press.slice().reverse().map(x => `<li>📰 ${esc(pick(x))}</li>`).join('')}</ul></section>` : '';
      // Simplificado: arriba lo esencial; el resto, plegado con un título claro.
      const fold = (key, html) => html ? `<details class="card more-week"><summary>${t(key)}</summary>${html}</details>` : '';
      const pet = s.pet ? petCard : fold('pet.title', petCard);
      const book = bookCards(s), talents = ui.talentsCard ? ui.talentsCard(s) : '';
      if (s.squad) return hero + talents + coachCards + fold('book.log', book) + famCard + pet + fold('arcade.title', minis) + fold('me.offcourt', offcourt) + fold('more.shop', shop) + fold('me.trophies', trophies) + fold('life.press', press);
      return hero + talents + famCard + pet + fold('arcade.title', minis) + fold('me.attributes', attrs) + fold('me.season', stats) + fold('book.title', book) + fold('me.practice', practice) + fold('me.offcourt', offcourt) + fold('more.shop', shop) + fold('me.trophies', trophies) + fold('life.press', press);
    }
    function renderSquad(s) {
      const sq = s.squad;
      const pick = state.coachPick && state.coachPick.career === s.careerId ? state.coachPick.ids : sq.starters;
      const rows = sq.roster.map(p => { const on = pick.includes(p.id); return `<tr class="${on ? 'me' : ''}"><td><button class="starter ${on ? 'on' : ''}" data-action="coach-starter" data-id="${esc(p.id)}" aria-pressed="${on}" aria-label="${t(on ? 'coach.removeStarter' : 'coach.addStarter', { name: esc(p.name) })}">${on ? '★' : '☆'}</button></td><td>${face(p)} ${esc(p.name)}${p.injury ? ` <span class="bad small">+${p.injury}</span>` : ''}</td><td>${esc(p.pos)}</td><td>${p.ovr}</td><td>${p.age}</td><td class="${p.morale < 40 ? 'bad' : ''}">${p.morale}</td><td class="${p.load > 60 ? 'bad' : ''}">${p.load}</td></tr>`; }).join('');
      const changed = JSON.stringify(pick.slice().sort()) !== JSON.stringify(sq.starters.slice().sort());
      const tac = (k, vals) => `<div class="seg" role="group" aria-label="${t('coach.' + k)}">${vals.map(v => `<button data-action="coach-tactic" data-k="${k}" data-v="${v}" aria-pressed="${sq.tactic[k] === v}">${t('coach.' + k + '.' + v)}</button>`).join('')}</div>`;
      return `<section class="card"><div class="guide-head"><h3>${t('coach.squad')}</h3><span class="tag ${pick.length === 5 ? 'led' : ''}">${t('coach.starters', { n: pick.length })}</span></div>
        <div class="table-scroll compact" tabindex="0" role="region" aria-label="${t('coach.squad')}"><table><thead><tr><th><span class="sr-only">${t('coach.starter')}</span></th><th>${t('live.col.player')}</th><th>POS</th><th>${t('me.ovr')}</th><th>${t('coach.age')}</th><th>${t('meter.morale')}</th><th>${t('effect.load')}</th></tr></thead><tbody>${rows}</tbody></table></div>
        ${changed ? `<div class="row"><button class="cta" data-action="coach-save-starters" ${pick.length !== 5 ? 'disabled' : ''}>${t('coach.saveStarters')}</button></div>` : ''}</section>
        <section class="card"><h3>${t('coach.tactics')}</h3><h4 class="eyebrow">${t('coach.pace')}</h4>${tac('pace', ['slow', 'normal', 'fast'])}<h4 class="eyebrow">${t('coach.focus')}</h4>${tac('focus', ['inside', 'balanced', 'outside'])}<h4 class="eyebrow">${t('coach.defense')}</h4>${tac('defense', ['man', 'press', 'help'])}<p class="muted small">${t('coach.tacticsDesc')}</p></section>`;
    }
    // ---- Loro: graba la voz del jugador y la repite distorsionada (solo para esta especie) ----
    function parrotStatus(st) {
      if (st.error) return t('pet.parrot.' + st.error);
      if (st.status === 'recording') return t('pet.parrot.recording');
      if (st.status === 'playing') return t('pet.parrot.playing');
      if (st.status === 'ready') return t('pet.parrot.ready', { n: (st.ms / 1000).toLocaleString(CAA.I18N.getLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) });
      return st.supported ? t('pet.parrot.idle') : t('pet.parrot.unsupported');
    }
    // Refresca solo el panel del loro: un render completo cortaría la grabación o la reproducción en curso.
    function paintParrot() {
      if (!CAA.Parrot) return;
      const box = doc.getElementById('parrot');
      if (!box) return;
      const st = CAA.Parrot.info();
      const statusEl = doc.getElementById('parrot-status');
      if (statusEl) { statusEl.textContent = parrotStatus(st); statusEl.className = 'parrot-status' + (st.error ? ' bad' : '') + (st.status === 'recording' ? ' rec' : ''); }
      const rec = doc.getElementById('parrot-rec'), say = doc.getElementById('parrot-say'), forget = doc.getElementById('parrot-forget');
      if (rec) rec.textContent = st.status === 'recording' ? t('pet.parrot.stop') : st.ready ? t('pet.parrot.again') : t('pet.parrot.record');
      const busy = !!state.busy;
      if (rec) rec.disabled = busy;
      if (say) say.disabled = busy || !st.ready || st.status === 'recording';
      if (forget) forget.disabled = busy || st.status === 'recording' || (!st.ready && !st.error);
      const fallback = doc.getElementById('parrot-fallback');
      if (fallback && st.error && /blocked|nodevice|unsupported|decode|failed/.test(st.error)) fallback.open = true;
    }
    function parrotPanel(pet) {
      if (pet.species !== 'parrot') return '';
      const st = CAA.Parrot ? CAA.Parrot.info() : { status: 'idle', error: 'unsupported', ready: false, supported: false };
      const recLabel = st.status === 'recording' ? t('pet.parrot.stop') : st.ready ? t('pet.parrot.again') : t('pet.parrot.record');
      return `<section class="parrot" id="parrot" aria-labelledby="parrot-title">
        <h4 id="parrot-title">🦜 ${t('pet.parrot.title')}</h4>
        <p class="muted small">${t('pet.parrot.hint')}</p>
        <p class="parrot-status${st.error ? ' bad' : ''}" id="parrot-status" role="status" aria-live="polite">${esc(parrotStatus(st))}</p>
        <div class="pick-grid three">
          <button class="option center" id="parrot-rec" data-action="pet-parrot" data-op="record"><b>${esc(recLabel)}</b></button>
          <button class="option center" id="parrot-say" data-action="pet-parrot" data-op="say" ${st.ready && st.status !== 'recording' ? '' : 'disabled'}><b>${t('pet.parrot.say')}</b></button>
          <button class="option center" id="parrot-forget" data-action="pet-parrot" data-op="forget" ${st.ready || st.error ? '' : 'disabled'}><b>${t('pet.parrot.forget')}</b></button>
        </div>
        <details id="parrot-fallback"${st.error && /blocked|nodevice|unsupported|decode|failed/.test(st.error) ? ' open' : ''}><summary>${t('pet.parrot.textTitle')}</summary>
          <label for="parrot-text">${t('pet.parrot.textLabel')}<input id="parrot-text" maxlength="80" value="${esc(draft('parrot-text', ''))}" placeholder="${t('pet.parrot.textPlaceholder')}" autocomplete="off"></label>
          <button class="small-btn" data-action="pet-parrot" data-op="text">${t('pet.parrot.textButton')}</button>
          <p class="muted small">${t('pet.parrot.textNote')}</p>
        </details>
        <p class="muted small">${t('pet.parrot.privacy')}</p>
      </section>`;
    }
    function renderPet(s) {
      const pet = s.pet, P = CAA.Pet;
      if (!pet) {
        const sp = state.petSpecies || 'dog';
        const cash = s.life ? s.life.cash : 0;
        const group = k => Object.keys(P.SPECIES).filter(x => !!P.SPECIES[x].exotic === (k === 'exotic'));
        const btn = k => `<button class="pick" data-action="pet-species" data-species="${k}" aria-pressed="${k === sp}"><b>${t('pet.species.' + k)}</b><small>${P.SPECIES[k].exotic ? t('pet.exotic', { n: P.EXOTIC_COST.toLocaleString(CAA.I18N.getLocale()) }) : t('pet.free')}</small><small class="muted">${t('pet.upkeepSeason', { n: P.SPECIES[k].upkeep })}</small></button>`;
        return `<section class="card pet"><h3>${t('pet.title')}</h3><p class="muted small">${t('pet.adoptDesc')}</p>
          <p class="eyebrow">${t('pet.normalTitle')}</p><div class="pick-grid three">${group('normal').map(btn).join('')}</div>
          <p class="eyebrow">${t('pet.exoticTitle')}</p><p class="muted small">${t('pet.exoticNote')}</p><div class="pick-grid three">${group('exotic').map(btn).join('')}</div>
          <label for="pet-name">${t('pet.name')}<input id="pet-name" maxlength="20" value="${esc(draft('pet-name', ''))}" placeholder="${t('pet.namePlaceholder.' + sp)}"></label>
          <button class="cta" data-action="pet-adopt" ${P.SPECIES[sp].exotic && cash < P.EXOTIC_COST ? 'disabled' : ''}>${t('pet.adopt')}</button>
          <p class="muted small">${t('pet.noDeath')}</p></section>`;
      }
      const SP = P.SPECIES[pet.species], stage = P.stageOf(pet), wk = state.career.state.week;
      const view = state.petView === 'style' || state.petView === 'info' ? state.petView : 'care';
      const learnedN = P.learned(pet).length;
      const msg = pet.last ? t('pet.msg.' + pet.last.key, { name: pet.name, trick: pet.last.trick ? t('pet.trick.' + pet.last.trick) : '', route: pet.last.route ? t('pet.route.' + pet.last.route) : '', stage: pet.last.stage ? t('pet.stage.' + pet.last.stage) : '', tier: pet.last.tier ? t('pet.tier.' + pet.last.tier) : '', toy: pet.last.toy ? t('pet.supply.' + pet.last.toy) : '', x: pet.last.x || '' }) : '';
      const canContest = pet.lastContestWeek < 0 || wk - pet.lastContestWeek >= 4;
      const none = pet.actionsLeft <= 0, quick = pet.quick || {};
      const clubColors = CAA.Crest && CAA.Crest.colors && s.club ? CAA.Crest.colors(s.club) : [];
      const tab = (k, label) => `<button class="pick" data-action="pet-view" data-view="${k}" aria-pressed="${view === k}"><b>${label}</b></button>`;
      const tabs = `<div class="pick-grid three" role="group" aria-label="${t('pet.views')}">${tab('care', t('pet.view.care'))}${tab('style', t('pet.view.style'))}${tab('info', t('pet.view.info'))}</div>`;
      const head = `<div class="guide-head"><h3>${esc(pet.name)}</h3><span class="tag">${t('pet.species.' + pet.species)} · ${t('pet.stage.' + stage)} · ${t('pet.trait.' + pet.trait)}</span></div>
        <div class="pet-stage"><canvas id="pet3d" role="img" aria-label="${t('pet.canvas', { name: esc(pet.name) })}"></canvas><div class="pet-bars">${P.NEEDS.map(k => meter(t('pet.' + k), pet[k])).join('')}${meter(t('pet.bond'), pet.bond)}</div></div>
        ${msg ? `<p class="pet-msg" role="status">${esc(msg)}</p>` : ''}`;
      let body = '';
      if (view === 'care') {
        const qBtn = (a, ico, used) => `<button class="option center" data-action="pet-act" data-act="${a}" ${used ? 'disabled' : ''}><b>${ico} ${t('pet.act.' + a)}</b></button>`;
        const care = qBtn('cuddle', '🤗', pet.cuddled) + qBtn('water', '💧', quick.water) + qBtn('brush', '🪮', quick.brush);
        const inv = pet.inv || {}, toys = pet.toys || [];
        const actBtn = (a, ico, extra = '', dis = false) => P.careAllowed(pet, a) ? `<button class="option center" data-action="pet-act" data-act="${a}" ${extra} ${none || dis ? 'disabled' : ''}><b>${ico} ${t('pet.act.' + a)}</b></button>` : '';
        const main = [`<button class="option center" data-action="pet-act" data-act="feed" ${none ? 'disabled' : ''}><b>🍖 ${t('pet.act.feed')}</b></button>`,
          `<button class="option center" data-action="pet-act" data-act="feed" data-food="food_prem" ${none || (!(inv.food_prem > 0) && s.life.cash < 300) ? 'disabled' : ''}><b>🥩 ${t('pet.act.premium')}</b><small>${t('pet.left', { n: inv.food_prem || 0 })}</small></button>`,
          `<button class="option center" data-action="pet-act" data-act="feed" data-food="treats" ${none || !(inv.treats > 0) ? 'disabled' : ''}><b>🦴 ${t('pet.act.treat')}</b><small>${t('pet.left', { n: inv.treats || 0 })}</small></button>`,
          `<button class="option center" data-action="pet-act" data-act="bath" ${none ? 'disabled' : ''}><b>🛁 ${t('pet.act.bath')}</b></button>`,
          `<button class="option center" data-action="pet-act" data-act="play" ${none ? 'disabled' : ''}><b>🏀 ${t('pet.act.play')}</b></button>`,
          actBtn('pat', '🤲'), actBtn('watch', '👀'), actBtn('photo', '📸'),
          actBtn('spa', '💆', '', s.life.cash < P.SPA_COST), actBtn('home', '🏠')].filter(Boolean)
          .concat(toys.map(k => `<button class="option center" data-action="pet-act" data-act="play" data-toy="${k}" ${none ? 'disabled' : ''}><b>🎾 ${t('pet.supply.' + k)}</b></button>`)).join('');
        const routes = SP.walks ? Object.entries(P.ROUTES).map(([k, r]) => `<button class="option center" data-action="pet-act" data-act="walk" data-route="${k}" ${none || pet.bond < r.bond ? 'disabled' : ''}><b>🌳 ${t('pet.route.' + k)}</b><small>${pet.bond < r.bond ? t('pet.needBond', { n: r.bond }) : t('pet.walk')}</small></button>`).join('') : `<p class="muted small">${t('pet.noWalk')}</p>`;
        const tricks = P.TRICKS.map(tr => { const pr = pet.tricks[tr.id] || 0, cant = tr.diff > SP.maxTrick; return `<button class="trick ${pr >= 100 ? 'done' : ''}" data-action="pet-act" data-act="train" data-trick="${tr.id}" ${none || pr >= 100 || cant ? 'disabled' : ''}><span><b>${t('pet.trick.' + tr.id)}</b><small>${cant ? t('pet.cannot') : '★'.repeat(tr.diff)}</small></span><span class="track" aria-hidden="true"><i style="width:${pr}%"></i></span><span class="muted small">${pr >= 100 ? t('pet.learned') : pr + '%'}</span></button>`; }).join('');
        const tiers = Object.keys(P.CONTESTS).map(k => { const open = P.contestOpen(pet, k); return `<button class="option center" data-action="pet-contest" data-tier="${k}" ${!open || !canContest ? 'disabled' : ''}><b>🏆 ${t('pet.tier.' + k)}</b><small>${open ? t('pet.tierWins', { n: (pet.contests.wins || {})[k] || 0 }) : t('pet.tierLocked')}</small></button>`; }).join('');
        const supplies = P.SUPPLIES.map(x => { const own = x.kind === 'toy' && toys.includes(x.id); return `<div class="item"><span aria-hidden="true">${x.kind === 'toy' ? '🎾' : '🍖'}</span><span><b>${t('pet.supply.' + x.id)}</b><small>${x.qty ? '×' + x.qty + ' · ' : ''}${x.price.toLocaleString(CAA.I18N.getLocale())} €</small></span>${own ? `<span class="tag">${t('pet.owned')}</span>` : `<button class="small-btn" data-action="pet-supply" data-item="${x.id}" ${s.life.cash < x.price ? 'disabled' : ''}>${t('life.buy')}</button>`}</div>`; }).join('');
        const album = (pet.album || []).slice().reverse().slice(0, 8).map(m => `<li><span class="muted">${seasonLabel(m.year)} · ${t('pet.week', { n: m.week })}</span> ${esc(t('pet.album.' + m.key, { name: pet.name, x: m.x ? (m.key === 'trick' ? t('pet.trick.' + m.x) : m.key === 'route' ? t('pet.route.' + m.x) : m.key === 'grew' ? t('pet.stage.' + m.x) : m.key === 'contestWin' ? t('pet.tier.' + m.x) : m.key === 'toy' ? t('pet.supply.' + m.x) : m.x) : '' }))}</li>`).join('');
        body = `${parrotPanel(pet)}<p class="eyebrow">${t('pet.quick')}</p><div class="pick-grid three">${care}</div>
          <p class="eyebrow">${t('pet.actionsLeft', { n: pet.actionsLeft })}</p><div class="pick-grid three">${main}</div>
          <details><summary>${t('pet.walks')}</summary><div class="pick-grid">${routes}</div></details>
          <details><summary>${t('pet.tricks', { n: learnedN, total: P.TRICKS.length })}</summary><div class="tricks">${tricks}</div></details>
          <details><summary>${t('pet.contests', { won: pet.contests.won, played: pet.contests.played })}</summary>${canContest ? '' : `<p class="muted small">${t('pet.contestWait')}</p>`}<div class="pick-grid three">${tiers}</div></details>
          <details><summary>${t('pet.shopSupplies')}</summary><div class="shop">${supplies}</div></details>
          ${album ? `<details><summary>${t('pet.albumTitle')}</summary><ul class="news">${album}</ul></details>` : ''}`;
      } else if (view === 'style') {
        const coat = pet.coat || 'nat', bg = pet.bg || 'none';
        const coats = P.COATS.map(c => { const on = coat === c.id, open = P.coatOpen(pet, c.id); return `<button class="swatch-btn" data-action="pet-coat" data-coat="${c.id}" aria-pressed="${on}" ${on ? '' : open ? '' : 'disabled'} title="${open ? esc(t('pet.coat.' + c.id)) : esc(t(c.lock === 'national' ? 'pet.lockedNational' : 'pet.lockedRegional'))}"><span class="coat-dot" style="background:${c.sample || '#c58a4a'}" aria-hidden="true"></span><small>${open ? '' : '🔒 '}${t('pet.coat.' + c.id)}</small></button>`; }).join('');
        const bgs = P.BACKGROUNDS.map(b => { const on = bg === b.id; return `<button class="swatch-btn" data-action="pet-bg" data-bg="${b.id}" aria-pressed="${on}"><span class="coat-dot" style="${b.color ? `background:${b.color}` : b.club ? `background:linear-gradient(135deg, ${esc(clubColors[0] || '#1b2140')} 50%, ${esc(clubColors[1] || '#141a2e')} 50%)` : 'background:#1b2140'}" aria-hidden="true"></span><small>${t('pet.bg.' + b.id)}</small></button>`; }).join('');
        const slotGroups = P.SLOTS.map(sl => { const list = P.ITEMS.filter(i => i.slot === sl && (!i.prize || pet.owned.includes(i.id))); return list.length ? `<p class="eyebrow">${t('pet.slot.' + sl)}</p><div class="shop">${list.map(i => { const owned = pet.owned.includes(i.id), on = pet.equipped[sl] === i.id; return `<div class="item"><span class="swatch" style="background:${i.color}" aria-hidden="true"></span><span><b>${t('pet.item.' + i.id)}</b><small>${t('pet.rarity.' + i.rarity)}${owned ? '' : ' · ' + i.cost + ' ' + t('life.style')}</small></span>${owned ? `<button class="small-btn" data-action="pet-equip" data-item="${i.id}">${on ? t('pet.unequip') : t('life.equip')}</button>` : `<button class="small-btn" data-action="pet-buy" data-item="${i.id}" ${s.life.style < i.cost ? 'disabled' : ''}>${t('life.buy')}</button>`}</div>`; }).join('')}</div>` : ''; }).join('');
        const prizes = P.ITEMS.filter(i => i.prize && !pet.owned.includes(i.id)).map(i => `<span class="chip">🔒 ${t('pet.item.' + i.id)}</span>`).join('');
        body = `<p class="eyebrow">${t('pet.coatTitle')}</p><div class="pick-grid swatches">${coats}</div>
          <p class="eyebrow">${t('pet.bgTitle')}</p><div class="pick-grid swatches">${bgs}</div>
          <p class="eyebrow">${t('pet.shop')}</p>${slotGroups}
          ${prizes ? `<p class="eyebrow">${t('pet.prizes')}</p><p class="muted small">${t('pet.prizesNote')}</p><p>${prizes}</p>` : ''}
          <details><summary>${t('pet.shopSupplies')}</summary><div class="shop">${P.SUPPLIES.map(x => `<div class="item"><span aria-hidden="true">${x.kind === 'toy' ? '🎾' : '🍖'}</span><span><b>${t('pet.supply.' + x.id)}</b><small>${x.price.toLocaleString(CAA.I18N.getLocale())} €</small></span><button class="small-btn" data-action="pet-supply" data-item="${x.id}" ${s.life.cash < x.price ? 'disabled' : ''}>${t('life.buy')}</button></div>`).join('')}</div></details>`;
      } else {
        const facts = [`${t('pet.species.' + pet.species)}`, t('pet.upkeepSeason', { n: SP.upkeep }), t('pet.stage.' + stage), t('pet.trait.' + pet.trait)];
        if (SP.fame) facts.push(t('pet.fameBonus', { n: SP.fame }));
        if (SP.calm) facts.push(t('pet.calmBonus'));
        if (SP.risk) facts.push(t('pet.riskNote'));
        const allowed = Array.from(new Set(P.ACTIONS.concat(Object.keys(P.CARE_ACTIONS)))).filter(a => P.careAllowed(pet, a)).map(a => `<span class="chip">${t('pet.act.' + a)}</span>`).join('');
        body = `<p class="eyebrow">${t('pet.facts')}</p><p>${facts.map(f => `<span class="chip">${f}</span>`).join('')}</p>
          <p class="eyebrow">${t('pet.careNote')}</p><p>${allowed}</p>
          <label for="pet-rename-name">${t('pet.renameTitle')}<input id="pet-rename-name" maxlength="20" value="${esc(draft('pet-rename-name', pet.name))}"></label>
          <button class="cta" data-action="pet-rename">${t('pet.rename')}</button>
          <p class="muted small">${t('pet.noDeath')}</p>`;
      }
      return `<section class="card pet">${head}${tabs}${body}</section>`;
    }
    // ===== Tienda (adaptación de ui-shop del fútbol): escaparate semanal, ofertas, tiers, conjuntos y requisitos =====
    function statText(stats) { return Object.entries(stats || {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${t('attr.' + k)}`).join(' · '); }
    function reqText(req) { if (!req) return ''; const k = Object.keys(req)[0]; return t('shop.req.' + k, { n: req[k] }); }
    function styleShopHtml() {
      const s = state.career.summary, life = s.life || { owned: [], equipment: {}, style: 0, cash: 0 }, packs = CAA.Content.packs();
      return `<section class="card"><div class="guide-head"><h3>${t('life.shop')}</h3><span class="tag">${t('life.style')}: ${life.style} · ${t('life.cash')}: ${life.cash}</span></div><div class="shop">${packs.shop.items.map(i => {
        const owned = life.owned.includes(i.id), equipped = (life.equipment || {})[i.slot] === i.id;
        return `<div class="item"><span class="swatch" style="background:${esc(i.color)}" aria-hidden="true"></span><span><b>${esc(loc(i.name))}</b><small>${t('slot.' + i.slot)} · ${i.cost} ${t('life.style')}</small></span>${owned ? `<button class="small-btn" data-action="life-equip" data-item="${i.id}" ${equipped ? 'disabled' : ''}>${equipped ? t('me.equipped') : t('life.equip')}</button>` : `<button class="small-btn" data-action="life-buy" data-item="${i.id}">${t('life.buy')}</button>`}</div>`; }).join('')}</div></section>`;
    }
    function renderShop() {
      if (!hasCareer()) return ui.renderHome();
      const g = state.career.summary.gear; if (!g) return '';
      const money = n => n.toLocaleString(CAA.I18N.getLocale()) + ' €';
      const tier = k => CAA.Gear.TIERS[k];
      const card = i => `<div class="gear-item${i.equipped ? ' on' : ''}${i.locked ? ' locked' : ''}"><span class="swatch" style="background:${esc(i.color)}" aria-hidden="true"></span>
        <div class="gi-body"><b>${esc(loc(i.name))}</b>${i.owned ? ` <span class="tier" style="--tier:${tier(i.tier).c}">${t('tier.' + tier(i.tier).id)}</span>` : ''}${i.offer ? ` <span class="tag offer">-30 %</span>` : ''}
        <small>${t('slot.' + i.slot)}${i.set ? ' · ' + t('set.' + i.set) : ''}</small><small class="ok">${esc(statText(i.stats))}${i.extra ? (Object.keys(i.stats).length ? ' · ' : '') + esc(statText(Object.fromEntries(Object.entries(i.extra).map(([k, v]) => ['x' + k, v])))) : ''}</small>
        ${i.affix ? `<small class="gear-affix">✦ ${t('gear.affix')}: +${i.affix.v} ${t('attr.' + i.affix.k)}</small>` : ''}
        ${i.owned && i.main ? `<small class="muted">${t('gear.wear', { lvl: i.wearLevel, max: g.wearSteps.length, n: i.wear, next: g.wearSteps[i.wearLevel] || g.wearSteps[g.wearSteps.length - 1], attr: t('attr.' + i.main) })}</small>` : ''}
        ${i.delta && Object.keys(i.delta).length ? `<small class="gear-delta">${t('gear.vsEquipped')}: ${Object.entries(i.delta).map(([k, v]) => `<span class="${v > 0 ? 'ok' : 'bad'}">${v > 0 ? '+' : ''}${v} ${t('attr.' + k)}</span>`).join(' ')}</small>` : ''}
        ${i.locked ? `<small class="muted">🔒 ${esc(reqText(i.req))}</small>` : ''}</div>
        <div class="gi-act">${!i.owned ? `<button class="small-btn primary" data-action="gear-op" data-op="buy" data-item="${i.id}" ${i.locked || g.cash < i.price ? 'disabled' : ''}>${money(i.price)}</button>`
          : `${i.equipped ? `<button class="small-btn" data-action="gear-op" data-op="unequip" data-item="${i.id}">${t('shop.unequip')}</button>` : `<button class="small-btn" data-action="gear-op" data-op="equip" data-item="${i.id}">${t('life.equip')}</button>`}
             ${i.upgradeCost ? `<button class="small-btn" data-action="gear-op" data-op="upgrade" data-item="${i.id}" ${g.cash < i.upgradeCost ? 'disabled' : ''} aria-label="${t('shop.upgradeTo', { tier: t('tier.' + tier(i.tier + 1).id) })}">⬆ ${money(i.upgradeCost)}</button>` : ''}
             ${i.matCost ? `<button class="small-btn" data-action="gear-op" data-op="upgradeMat" data-item="${i.id}" ${g.mat < i.matCost ? 'disabled' : ''} aria-label="${t('gear.upgradeMat', { tier: t('tier.' + tier(i.tier + 1).id), n: i.matCost })}">⬆ 🧵${i.matCost}</button>` : ''}
             ${i.canReforge ? `<button class="small-btn" data-action="gear-op" data-op="reforge" data-item="${i.id}" ${g.mat < g.reforgeMat ? 'disabled' : ''} aria-label="${t('gear.reforgeLabel', { n: g.reforgeMat })}">✦ 🧵${g.reforgeMat}</button>` : ''}`}</div></div>`;
      const boxCards = g.boxes.map(b => `<section class="card gear-box"><div class="guide-head"><h3>🎁 ${t('gear.box')}</h3><span class="tag led">${t('gear.reason.' + b.reason)}</span></div><p class="muted small">${t('gear.boxPick')}</p>
        <div class="gear-choices">${b.options.map((o, ix) => `<div class="gear-choice" style="--tier:${tier(o.tier).c}"><span class="swatch" style="background:${esc(o.color)}" aria-hidden="true"></span>
          <b>${esc(loc(o.name))}</b><span class="tier" style="--tier:${tier(o.tier).c}">${t('tier.' + tier(o.tier).id)}</span><small>${t('slot.' + o.slot)}${o.set ? ' · ' + t('set.' + o.set) : ''}</small>
          <small class="ok">${esc(statText(o.stats))}${o.affix ? ` · ✦ +${o.affixVal} ${t('attr.' + o.affix)}` : ''}</small><small class="muted">${t('gear.outcome.' + o.outcome, { n: o.mat })}</small>
          <button class="small-btn primary" data-action="gear-op" data-op="claim" data-box="${b.id}" data-index="${ix}">${t('gear.pick')}</button></div>`).join('')}</div></section>`).join('');
      const reforge = g.reforge ? (() => { const it = g.items.find(x => x.id === g.reforge.item); return `<section class="card gear-box" role="region" aria-label="${t('gear.reforgeTitle')}"><h3>✦ ${t('gear.reforgeTitle')}: ${esc(loc(it.name))}</h3><p class="muted small">${t('gear.reforgeDesc')}</p><div class="row">${g.reforge.options.map(k => `<button class="small-btn primary" data-action="gear-op" data-op="reforgePick" data-item="${it.id}" data-affix="${k}">+${it.affix ? it.affix.v : ''} ${t('attr.' + k)}</button>`).join('')}</div></section>`; })() : '';
      const loadouts = `<section class="card"><h3>${t('gear.loadouts')}</h3><p class="muted small">${t('gear.loadoutsDesc')}</p><div class="gear-loadouts">${g.loadouts.map((n, ix) => `<div><b>${t('gear.loadout', { n: ix + 1 })}</b><small class="muted">${n == null ? t('gear.loadoutEmpty') : t('gear.loadoutPieces', { n })}</small>
        <div class="row"><button class="small-btn" data-action="gear-op" data-op="saveLoadout" data-index="${ix}">${t('gear.save')}</button><button class="small-btn primary" data-action="gear-op" data-op="useLoadout" data-index="${ix}" ${n == null ? 'disabled' : ''}>${t('gear.use')}</button></div></div>`).join('')}</div></section>`;
      const featured = g.items.filter(i => i.featured || i.offer);
      const bySlot = g.slots.map(sl => { const its = g.items.filter(i => i.slot === sl); return its.length ? `<h4 class="eyebrow">${t('slot.' + sl)}</h4><div class="gear-list">${its.map(card).join('')}</div>` : ''; }).join('');
      const eff = g.effective;
      return `<section class="card shop-head"><span class="eyebrow">${t('shop.kicker')}</span><h2>${t('more.shop')}</h2><p class="muted small">${t('shop.desc', { att: g.cap.att, total: g.cap.total })}</p>
        <div class="statline"><span>${t('life.cash')}</span><b>${money(g.cash)}</b><span>${t('gear.mat')}</span><b>🧵 ${g.mat}</b></div>
        <p class="muted small">${t(g.team ? 'gear.howCoach' : 'gear.how', { box: 6, n: g.since })}</p>
        <p class="small">${eff.total ? t('shop.effective', { stats: statText(eff.attrs) }) : t('shop.none')}${eff.sets.length ? ' · ' + t('shop.sets', { sets: eff.sets.map(x => t('set.' + x)).join(', ') }) : ''}</p></section>
        ${boxCards}${reforge}${loadouts}
        <section class="card"><h3>${t('shop.week')}</h3><div class="gear-list">${featured.map(card).join('')}</div></section>
        <section class="card"><h3>${t('shop.catalog')}</h3>${bySlot}</section>${styleShopHtml()}`;
    }
    // ===== Aspecto (look56) =====
    function renderLook() {
      if (!hasCareer()) return ui.renderHome();
      const g = state.career.summary.gear; if (!g) return '';
      const L = g.look, LK = CAA.Gear.LOOK;
      const sw = (field, list, cur, isColor) => `<div class="pick-grid swatches" role="group" aria-label="${t('look.' + field)}">${list.map((v, i) => { const val = isColor ? i : v; const on = String(cur) === String(val); return `<button class="pick${isColor ? ' color' : ''}" data-action="look-set" data-field="${field}" data-value="${esc(String(val))}" aria-pressed="${on}" ${isColor ? `style="--sw:${v}" aria-label="${t('look.' + field)} ${i + 1}"` : ''}>${isColor ? '' : `<b>${t('look.' + field + '.' + v)}</b>`}</button>`; }).join('')}</div>`;
      return `<section class="card"><span class="eyebrow">${t('look.kicker')}</span><h2>${t('more.look')}</h2>${avatarHtml()}
        <h3 class="eyebrow">${t('look.skin')}</h3>${sw('skin', LK.skin, L.skin, true)}
        <h3 class="eyebrow">${t('look.hair')}</h3>${sw('hair', LK.hair, L.hair)}
        <h3 class="eyebrow">${t('look.hairColor')}</h3>${sw('hairColor', LK.hairColor, L.hairColor, true)}
        <h3 class="eyebrow">${t('look.beard')}</h3>${sw('beard', LK.beard, L.beard)}
        <h3 class="eyebrow">${t('look.celebration')}</h3>${sw('celebration', LK.celebration, L.celebration)}
        <p class="muted small">${t('look.note')}</p><button class="small-btn" data-tab="shop">🛍 ${t('more.shop')}</button></section>`;
    }
    return { avatarProfile, face, avatarHtml, drawPet, drawScene, drawAvatar, renderCromo, playerCard, renderMe, renderSquad, parrotStatus, paintParrot, parrotPanel, renderPet, statText, reqText, styleShopHtml, renderShop, renderLook };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
