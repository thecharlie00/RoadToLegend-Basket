// Genera las 30 jugadas de la campaña de Jugada Maestra y las deja fijas en src/match/jugada.js.
// Cada jugada se acepta solo si el solucionador la gana, no se gana con un tiro directo y pide
// lo que enseña su capítulo (pase, penetración, tiro cerca, triple, pocas acciones).
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const FILE = new URL('../src/match/jugada.js', import.meta.url);
const J = require(FILE.pathname);
const H = J.HOOP;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r1 = v => Math.round(v * 10) / 10;
const SPOTS = [
  r => [60 + r() * 6, 8 + r() * 10], r => [60 + r() * 6, 82 + r() * 10], r => [84 + r() * 6, 3 + r() * 3], r => [84 + r() * 6, 94 + r() * 3],
  r => [78 + r() * 6, 30 + r() * 10], r => [78 + r() * 6, 60 + r() * 10], r => [66 + r() * 4, 36 + r() * 28]
];
function layout(r, ch) {
  const ball = [38 + r() * 10, 30 + r() * 40];
  const idx = []; while (idx.length < 4) { const k = Math.floor(r() * SPOTS.length); if (!idx.includes(k)) idx.push(k); }
  const mates = idx.map(k => SPOTS[k](r));
  const guard = (p, gap) => { const dx = H[0] - p[0], dy = H[1] - p[1], L = Math.hypot(dx, dy) || 1, a = (r() - 0.5) * 0.9; const c = Math.cos(a), s = Math.sin(a); return [p[0] + (dx * c - dy * s) / L * gap, p[1] + (dx * s + dy * c) / L * gap]; };
  const rivals = [guard(ball, 4 + r() * 1.8)];
  const sagger = Math.floor(r() * 4);
  mates.forEach((m, i) => {
    if ((ch === 1 || ch === 2) && i === sagger) rivals.push([80 + r() * 4, 44 + r() * 12]); // protector del aro
    else rivals.push(guard(m, 2.6 + r() * (ch === 3 ? 7 : 9)));
  });
  return { ball, mates, rivals };
}
const wants = {
  0: sol => sol.actions.some(a => a.k === 'pass'),
  1: sol => sol.actions.some(a => a.k === 'drive'),
  2: (sol, st) => { const last = st.log[st.log.length - 1]; return last && ['restricted', 'paint'].includes(last.zone); },
  3: () => true,
  4: () => true
};
const out = [];
for (let i = 0; i < 30; i++) {
  const ch = Math.floor(i / 6), max = ch === 4 ? 3 : i % 6 === 5 ? 5 : 4;
  for (let k = 0; k < 20000; k++) {
    const r = rng((i + 1) * 100003 + k * 7);
    const l = layout(r, ch); l.max = max; l.needThree = ch === 3;
    const st0 = J.fromLayout(l, 'gen');
    const direct = J.resolve(JSON.parse(JSON.stringify(st0)), { k: 'shot' });
    if (direct.state.won) continue;
    const sol = J.solveState(st0);
    if (!sol) continue;
    const minPar = ch >= 2 ? 2 : (i % 6 >= 3 ? 3 : 2);
    if (sol.par < minPar || sol.par > max - (ch === 4 ? 0 : 1)) continue;
    const played = J.replay(JSON.parse(JSON.stringify(st0)), sol.actions);
    if (!wants[ch](sol, played)) continue;
    out.push([l.ball.map(r1), l.mates.map(p => p.map(r1)), l.rivals.map(p => p.map(r1)), max]);
    console.log('jm-' + String(i + 1).padStart(2, '0'), 'ch' + (ch + 1), 'max', max, 'par', sol.par, sol.actions.map(a => a.k).join('>'), 'try', k);
    break;
  }
  if (out.length !== i + 1) throw new Error('no layout for level ' + (i + 1));
}
const src = fs.readFileSync(FILE, 'utf8').replace(/\/\*levels\*\/[\s\S]*?\/\*end\*\//, '/*levels*/' + JSON.stringify(out) + '/*end*/');
fs.writeFileSync(FILE, src);
