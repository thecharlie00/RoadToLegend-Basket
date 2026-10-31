(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const ZONE_POS = { restricted: [0.5, 0.86], paint: [0.5, 0.74], midShort: [0.35, 0.6], midLong: [0.65, 0.55], corner3: [0.08, 0.82], above3: [0.5, 0.42] };
  function frameForEvent(event, index) {
    const off = event.team === 1 ? 1 : 0;
    const zone = event.zone || 'above3';
    const pos = ZONE_POS[zone] || ZONE_POS.above3;
    const ball = { x: off ? 1 - pos[0] : pos[0], y: pos[1] };
    const players = [];
    for (let team = 0; team < 2; team++) for (let i = 0; i < 5; i++) {
      const baseX = team ? 0.75 - i * 0.12 : 0.25 + i * 0.12;
      const baseY = 0.3 + (i % 3) * 0.2;
      const attack = team === off;
      players.push({ team, x: attack ? (ball.x * 0.4 + baseX * 0.6) : baseX, y: attack ? (ball.y * 0.4 + baseY * 0.6) : baseY, number: i + 1 });
    }
    return { index, event, ball, players };
  }
  function framesFromEvents(events) { return (events || []).map((e, i) => frameForEvent(e, i)); }
  function drawCourt(ctx, w, h, frame, options = {}) {
    const cb = options.colorMode === 'blue-orange';
    const home = cb ? '#5aa9ff' : '#59d18c';
    const away = cb ? '#ff9f43' : '#ff7a6b';
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0b1417'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#24424a'; ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.05); ctx.lineTo(w * 0.5, h * 0.95); ctx.stroke();
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.5, h * 0.12, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(w * 0.05, h * 0.35, w * 0.18, h * 0.3);
    ctx.strokeRect(w * 0.77, h * 0.35, w * 0.18, h * 0.3);
    if (!frame) return;
    for (const p of frame.players) {
      ctx.fillStyle = p.team ? away : home;
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, Math.max(6, h * 0.025), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0b1417'; ctx.font = Math.max(9, h * 0.02) + "px 'Atkinson Hyperlegible Next', system-ui"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(p.number), p.x * w, p.y * h);
    }
    ctx.fillStyle = '#ffb547';
    ctx.beginPath(); ctx.arc(frame.ball.x * w, frame.ball.y * h, Math.max(4, h * 0.015), 0, Math.PI * 2); ctx.fill();
  }
  CAA.Court2D = { frameForEvent, framesFromEvents, drawCourt };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Court2D;
})(typeof globalThis !== 'undefined' ? globalThis : this);
