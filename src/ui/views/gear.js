(function (root) {
  'use strict';
  // Vestidor (como el del juego de fútbol): el personaje con lo que llevas o lo que te estás probando,
  // la cámara en la ranura elegida, estadísticas en vivo (actual ▲/▼ nueva), lo que suma cada atributo con
  // su tope, ranuras con iconos de vóxeles por tier, conjuntos con lo que falta, mejorar viendo antes qué
  // cambia (y su animación), quitar todo, equipar lo mejor, conjuntos guardados y las cajas del patrocinador.
  // Vista de app.js: lo compartido (estado, traductor, otras vistas…) llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIViews = CAA.UIViews || {};
  CAA.UIViews["gear"] = function (ui) {
    const { esc, hasCareer, loc, state, t } = ui;
    const G = () => CAA.Gear;
    const tierOf = k => G().TIERS[k] || G().TIERS[0];
    const money = n => n.toLocaleString(CAA.I18N.getLocale()) + ' €';
    const gr = () => state.gr || (state.gr = { slot: null, tryOn: null, upc: null, best: false });
    const icon = (id, tier, px) => { const it = G().BY_ID[id]; return it ? CAA.GearIcons.svg(it.slot, it.color, tierOf(tier).c, px) : ''; };
    const raw = () => state.career.state;
    const chips = (st, ref) => {
      const keys = new Set([...Object.keys(st || {}), ...Object.keys(ref || {})]);
      return [...keys].map(k => { const v = (st[k] || 0) - (ref ? ref[k] || 0 : 0); if (!v) return ''; return `<span class="chip ${v > 0 ? 'up' : 'down'}">${v > 0 ? '+' : '−'}${Math.abs(v)} ${t('attr.' + k)}</span>`; }).join('');
    };
    // Atributos en partido: base + talentos + equipamiento (o solo el bonus de equipo si entrenas).
    function matchAttrs(s, gearAttrs) {
      const out = {};
      if (s.player) {
        const base = s.player.attrs || {}, tal = (s.rpg && s.rpg.attrs) || {};
        for (const k of Object.keys(base)) out[k] = Math.min(99, base[k] + (tal[k] || 0) + (gearAttrs[k] || 0));
      } else for (const [k, v] of Object.entries(gearAttrs)) out[k] = v;
      return out;
    }
    function delta(s, eq) {
      const now = matchAttrs(s, G().effective(raw()).attrs), then = matchAttrs(s, G().effectiveWith(raw(), eq).attrs);
      const keys = [...new Set([...Object.keys(now), ...Object.keys(then)])].filter(k => (now[k] || 0) !== (then[k] || 0));
      const rows = keys.map(k => { const a = now[k] || 0, b = then[k] || 0, up = b > a; return `<div class="gs-lr"><span>${t('attr.' + k)}</span><b class="num">${a}</b><i class="${up ? 'up' : 'down'}" aria-hidden="true">${up ? '▲' : '▼'}</i><b class="num ${up ? 'up' : 'down'}">${b}</b></div>`; }).join('');
      const sc = e => { const o = {}; for (const id of Object.values(e)) { const it = G().BY_ID[id]; if (it && it.set) o[it.set] = (o[it.set] || 0) + 1; } return o; };
      const a0 = sc(G().ensure(raw()).equipped), a1 = sc(eq);
      const sets = Object.keys(G().SETS).filter(k => (a0[k] || 0) !== (a1[k] || 0)).map(k => `<small class="gs-ls ${(a1[k] || 0) > (a0[k] || 0) ? 'up' : 'down'}">${t('set.' + k)} ${a0[k] || 0}→${a1[k] || 0}/${G().SETS[k].need}</small>`).join('');
      return `<div class="gs-delta">${rows || `<p class="muted small">${t('gr.noChange')}</p>`}${sets}</div>`;
    }
    // Tarjeta en YO: las ranuras en miniatura y cuánto suma.
    function gearCard(s) {
      const g = s.gear; if (!g) return '';
      const eff = g.effective;
      const mini = g.slots.map(sl => { const id = g.equipped[sl], it = id && g.items.find(x => x.id === id); return `<span class="gq${it ? '' : ' empty'}" style="--tier:${it ? tierOf(it.tier).c : 'transparent'}">${it ? icon(id, it.tier, 26) : ''}</span>`; }).join('');
      return `<button class="card gcard" data-tab="gear"><span class="gcard-h"><b>👟 ${t('gr.title')}</b><small>${eff.total ? t('gr.sums', { n: eff.total }) : t('gr.empty')}</small>${g.boxes.length ? `<span class="tag led">🎁 ${g.boxes.length}</span>` : ''}</span><span class="gq-row">${mini}</span></button>`;
    }
    function renderGear() {
      if (!hasCareer()) return ui.renderHome();
      const s = state.career.summary, g = s.gear; if (!g) return '';
      const u = gr(), eff = g.effective, team = g.team;
      // Prueba en vivo
      const T = u.tryOn;
      const live = T ? `<div class="gs-try"><span class="eyebrow">${t('gr.trying')}</span><b>${esc(T.label || Object.entries(T.eq).filter(([sl, id]) => (g.equipped[sl] || null) !== (id || null)).map(([sl, id]) => id ? loc(G().BY_ID[id].name) : t('gr.without', { slot: t('slot.' + sl) })).join(', ') || t('gr.same'))}</b>${delta(s, T.eq)}
          <div class="row"><button class="small-btn primary" data-action="gr-try-ok">${t('life.equip')}</button><button class="small-btn" data-action="gr-try-no">${t('confirm.cancel')}</button></div></div>`
        : `<p class="muted small gs-hint">${t('gr.hint')}</p>`;
      const tools = `<div class="row gs-tools"><button class="small-btn" data-action="gr-off">${t('gr.off')}</button><button class="small-btn" data-action="gr-best" aria-expanded="${!!u.best}">${t('gr.best')}</button></div>
        ${u.best ? `<div class="row gs-bestk" role="group" aria-label="${t('gr.best')}"><button class="chip" data-action="gr-best-go" data-focus="">${t('gr.balanced')}</button>${Object.keys(G().FOCUS).map(k => `<button class="chip" data-action="gr-best-go" data-focus="${k}">${t('gr.focus.' + k)}</button>`).join('')}</div>` : ''}`;
      // Lo que suma, con su tope
      const cap = g.cap, keys = Object.keys(eff.raw || {}).filter(k => eff.raw[k]);
      const sum = `<div class="gs-sum">${keys.length ? keys.map(k => { const v = eff.attrs[k] || 0, r = eff.raw[k], capped = r > v; return `<div class="gs-at"><span>${t('attr.' + k)}</span><i class="gs-b"><i style="width:${Math.round(Math.min(1, v / cap.att) * 100)}%"></i></i><b>+${v}</b>${capped ? `<small>${t('gr.cap')}</small>` : ''}</div>`; }).join('') : `<p class="muted small">${t('gr.nothing')}</p>`}</div>
        <p class="muted small">${t(team ? 'gr.capTeam' : 'gr.capNote', { a: cap.att, t: cap.total, used: eff.total })}</p>`;
      // Ranuras
      const slots = `<div class="gs-slots" role="group" aria-label="${t('gr.slots')}">${g.slots.map((sl, i) => { const id = g.equipped[sl], it = id && g.items.find(x => x.id === id);
        return `<button class="gsl${u.slot === sl ? ' on' : ''}${it ? '' : ' empty'}" style="--tier:${it ? tierOf(it.tier).c : 'var(--line)'};--d:${i * 30}ms" data-action="gr-slot" data-slot="${sl}" aria-pressed="${u.slot === sl}">${it ? icon(id, it.tier, 44) : '<span class="gsl-e" aria-hidden="true">+</span>'}<small>${t('slot.' + sl)}</small></button>`; }).join('')}</div>`;
      // Conjuntos
      const setCount = {}; for (const id of Object.values(g.equipped)) { const it = G().BY_ID[id]; if (it && it.set) setCount[it.set] = (setCount[it.set] || 0) + 1; }
      const sets = Object.entries(G().SETS).filter(([k]) => setCount[k] || g.items.some(i => i.owned && i.set === k)).map(([k, x]) => {
        const n = setCount[k] || 0, full = n >= x.need, slotsOfSet = [...new Set(G().ITEMS.filter(i => i.set === k).map(i => i.slot))];
        const have = new Set(Object.entries(g.equipped).filter(([, id]) => G().BY_ID[id] && G().BY_ID[id].set === k).map(([sl]) => sl));
        const lack = slotsOfSet.filter(sl => !have.has(sl));
        return `<div class="gset${full ? ' full' : ''}"><b>${t('set.' + k)}</b><small>${n}/${x.need}</small><span>${chips(x.stats || {})}${Object.entries(x.extra || {}).map(([e, v]) => `<span class="chip up">+${v} ${t('attr.' + e)}</span>`).join('')}</span>${!full && lack.length ? `<small class="muted">${t('gr.missing', { x: lack.map(sl => t('slot.' + sl)).join(', ') })}</small>` : ''}</div>`;
      }).join('');
      // Piezas de la ranura elegida
      const panel = u.slot ? (() => {
        const mine = g.items.filter(i => i.slot === u.slot && i.owned).sort((a, b) => (b.equipped - a.equipped) || b.tier - a.tier);
        const cur = g.equipped[u.slot];
        const rows = mine.map(i => {
          const up = u.upc === i.id, next = i.tier < 5 ? i.tier + 1 : null;
          return `<div class="gpc${i.equipped ? ' on' : ''}" style="--tier:${tierOf(i.tier).c}">${icon(i.id, i.tier, 54)}<div class="grow"><b>${esc(loc(i.name))}</b> <span class="tier" style="--tier:${tierOf(i.tier).c}">${t('tier.' + tierOf(i.tier).id)}</span>
            <div class="gpc-st">${chips(i.stats)}</div>
            ${!i.equipped && cur ? `<div class="gpc-cmp"><small>${t('gear.vsEquipped')}:</small> ${chips(i.stats, (g.items.find(x => x.id === cur) || {}).stats || {}) || `<span class="muted small">${t('gr.same')}</span>`}</div>` : ''}
            ${i.affix ? `<small class="gear-affix">✦ ${t('gear.affix')}: +${i.affix.v} ${t('attr.' + i.affix.k)}</small>` : ''}
            ${i.main ? `<small class="muted">${t('gear.wear', { lvl: i.wearLevel, max: g.wearSteps.length, n: i.wear, next: g.wearSteps[i.wearLevel] || g.wearSteps[g.wearSteps.length - 1], attr: t('attr.' + i.main) })}</small>` : ''}
            ${i.set ? `<small class="muted">${t('set.' + i.set)}</small>` : ''}
            <div class="row gpc-a"><button class="small-btn${i.equipped ? '' : ' primary'}" data-action="gear-op" data-op="${i.equipped ? 'unequip' : 'equip'}" data-item="${i.id}">${i.equipped ? t('shop.unequip') : t('life.equip')}</button>
              ${i.equipped ? '' : `<button class="small-btn" data-action="gr-try" data-item="${i.id}">${t('gr.try')}</button>`}
              ${next != null ? `<button class="small-btn" data-action="gr-up" data-item="${i.id}" aria-expanded="${up}">⬆ ${t('gr.upTo', { tier: t('tier.' + tierOf(next).id) })}</button>` : ''}
              ${i.canReforge ? `<button class="small-btn" data-action="gear-op" data-op="reforge" data-item="${i.id}" ${g.mat < g.reforgeMat ? 'disabled' : ''} aria-label="${t('gear.reforgeLabel', { n: g.reforgeMat })}">✦ 🧵${g.reforgeMat}</button>` : ''}</div>
            ${up && next != null ? `<div class="gupc"><span class="eyebrow">${t('tier.' + tierOf(i.tier).id)} → ${t('tier.' + tierOf(next).id)}</span><div class="gpc-st">${(() => { const rg = G().ensure(raw()), it = G().BY_ID[i.id]; return chips(G().pieceStats(rg, it, next), G().pieceStats(rg, it, i.tier)); })()}</div>
              ${i.equipped ? upDelta(s, i.id, next) : ''}
              <div class="row"><button class="small-btn primary" data-action="gr-up-ok" data-item="${i.id}" data-pay="cash" ${i.upgradeCost == null || g.cash < i.upgradeCost ? 'disabled' : ''}>${t('gr.confirmCash', { n: i.upgradeCost != null ? money(i.upgradeCost) : '—' })}</button>
              <button class="small-btn primary" data-action="gr-up-ok" data-item="${i.id}" data-pay="mat" ${i.matCost == null || g.mat < i.matCost ? 'disabled' : ''}>${t('gr.confirmMat', { n: i.matCost != null ? i.matCost : '—' })}</button>
              <button class="small-btn" data-action="gr-up-no">${t('confirm.cancel')}</button></div>${next >= 3 && ((s.life && s.life.fame) || 0) < 15 * next ? `<small class="muted">🔒 ${t('shop.req.fame', { n: 15 * next })}</small>` : ''}</div>` : ''}</div></div>`;
        }).join('');
        return `<section class="gs-panel" aria-label="${t('slot.' + u.slot)}"><h3>${t('slot.' + u.slot)}</h3>${rows || `<p class="muted small">${t('gr.noneSlot')}</p>`}<button class="link" data-tab="shop">${t('gr.toShop')}</button></section>`;
      })() : '';
      // Conjuntos guardados
      const fits = `<section class="gs-fits"><h3>${t('gear.loadouts')}</h3><div class="gear-loadouts">${g.loadouts.map((n, ix) => {
        const L = (G().ensure(raw()).loadouts || [])[ix];
        const ic = L ? Object.values(L).filter(id => g.items.some(x => x.id === id && x.owned)).slice(0, 6).map(id => icon(id, (g.items.find(x => x.id === id) || {}).tier || 0, 22)).join('') : '';
        return `<div class="gfit"><b>${t('gear.loadout', { n: ix + 1 })}</b><span class="gfit-ic">${ic || `<small class="muted">${t('gear.loadoutEmpty')}</small>`}</span>
          <div class="row"><button class="small-btn primary" data-action="gear-op" data-op="useLoadout" data-index="${ix}" ${n == null ? 'disabled' : ''}>${t('gear.use')}</button><button class="small-btn" data-action="gear-op" data-op="saveLoadout" data-index="${ix}">${t('gear.save')}</button>${n != null ? `<button class="small-btn" data-action="gear-op" data-op="clearLoadout" data-index="${ix}" aria-label="${t('gr.delete')}">✕</button>` : ''}</div></div>`;
      }).join('')}</div></section>`;
      return `<section class="card gs"><span class="eyebrow">${t(team ? 'gr.kickerCoach' : 'gr.kicker')}</span><h2>${t('gr.title')}</h2>
          <div class="gs-stage"><div class="gs-prev3d">${ui.avatarHtml()}</div><div class="gs-live">${live}</div></div>
          ${tools}
          <div class="statline"><span>${t('life.cash')}</span><b>${money(g.cash)}</b><span>${t('gear.mat')}</span><b>🧵 ${g.mat}</b></div>
          ${sum}${slots}${sets ? `<div class="gs-sets">${sets}</div>` : ''}${panel}</section>
        ${ui.gearBoxes(g)}${fits}`;
    }
    // Tus atributos si mejoras una pieza que llevas puesta.
    function upDelta(s, id, to) {
      const g = G().ensure(raw()), t0 = g.owned[id];
      const now = matchAttrs(s, G().effective(raw()).attrs);
      g.owned[id] = to; let then; try { then = matchAttrs(s, G().effective(raw()).attrs); } finally { g.owned[id] = t0; }
      const rows = Object.keys(then).filter(k => (then[k] || 0) !== (now[k] || 0)).map(k => { const a = now[k] || 0, b = then[k] || 0, up = b > a; return `<div class="gs-lr"><span>${t('attr.' + k)}</span><b class="num">${a}</b><i class="${up ? 'up' : 'down'}" aria-hidden="true">${up ? '▲' : '▼'}</i><b class="num ${up ? 'up' : 'down'}">${b}</b></div>`; }).join('');
      return `<div class="gs-delta">${rows || `<p class="muted small">${t('gr.noChange')}</p>`}</div>`;
    }
    // Animación de mejora: la pieza sube girando, cambia de color de tier y estalla en chispas.
    function upAnim(id, tier) {
      const it = G().BY_ID[id]; if (!it || !doc) return;
      const T = tierOf(tier), el = doc.createElement('div');
      el.className = 'gup'; el.style.setProperty('--tc', T.c); el.setAttribute('role', 'status');
      const sparks = CAA.A11Y && CAA.A11Y.reduced(state.settings) ? '' : Array.from({ length: 18 }, (_, i) => `<i style="--a:${i * 20}deg;--d:${60 + (i % 4) * 18}px"></i>`).join('');
      el.innerHTML = `<div class="gup-c"><span class="gup-old">${icon(id, Math.max(0, tier - 1), 150)}</span><span class="gup-new">${icon(id, tier, 150)}</span><span class="gup-sp" aria-hidden="true">${sparks}</span></div><div class="gup-t"><small>${t('gr.upgraded')}</small><b>${esc(loc(it.name))}</b><span class="tier" style="--tier:${T.c}">${t('tier.' + T.id)}</span></div>`;
      doc.body.appendChild(el);
      const close = () => { el.classList.add('out'); root.setTimeout(() => el.remove(), 300); };
      el.addEventListener('click', close);
      root.setTimeout(close, CAA.A11Y && CAA.A11Y.reduced(state.settings) ? 900 : 2100);
    }
    // Lo que se ve en el personaje mientras pruebas (la cámara va a la ranura elegida).
    const CAM = { shoes: [0.25, 3.2], cshoes: [0.25, 3.2], socks: [0.35, 3.4], knee: [0.6, 3.6], sleeve: [1.25, 3.8], wrist: [0.95, 3.6], watch: [0.9, 3.6], cwatch: [0.9, 3.6], band: [1.9, 3.2], goggles: [1.8, 3.2], glasses: [1.8, 3.2], phones: [1.85, 3.2], chain: [1.5, 3.4], hoodie: [1.4, 4.4], towel: [1.5, 3.8], suit: [1.3, 4.6], tie: [1.35, 3.6], scarf: [1.55, 3.4], coat: [1.1, 5], clipboard: [1, 3.8] };
    function camFocus() { const u = state.gr; if (state.tab !== 'gear' || !u || !u.slot || !CAM[u.slot]) return null; const [y, r] = CAM[u.slot]; return { y, r }; }
    function tryLook(look) {
      const u = state.gr; if (state.tab !== 'gear' || !u || !u.tryOn || !look) return look;
      const out = Object.assign({}, look);
      for (const sl of G().SLOTS.p.concat(G().SLOTS.c)) if (sl in u.tryOn.eq) { const id = u.tryOn.eq[sl]; out[sl] = id && G().BY_ID[id] ? G().BY_ID[id].color : null; }
      return out;
    }
    // Tu jugador en la pista (directo y repeticiones): su id, su aspecto y lo que lleva puesto.
    function meOnCourt() {
      const s = state.career && state.career.summary; if (!s || !s.player || !s.look) return null;
      return { id: s.player.id, look: s.look, left: s.player.handedness === 'left' };
    }
    return { gearCard, renderGear, upAnim, camFocus, tryLook, meOnCourt };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
