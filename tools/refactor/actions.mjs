// Segunda pasada: la cadena de if/else de action() en app.js pasa a módulos de acciones
// (src/ui/actions/*.js) como una tabla nombre → función. Mismo orden de prioridad: primero los
// nombres exactos y después los patrones (jm-*, pet-*, lab-*) en el orden en que estaban.
import * as espree from 'espree';
import * as eslintScope from 'eslint-scope';
import fs from 'node:fs';
import path from 'node:path';

const [appPath, outDir] = process.argv.slice(2);
const src = fs.readFileSync(appPath, 'utf8');
const ast = espree.parse(src, { ecmaVersion: 2023, range: true, loc: true });
const sm = eslintScope.analyze(ast, { ecmaVersion: 2023, sourceType: 'script' });
const iife = ast.body[0].expression.callee;
const top = sm.acquire(iife);
const body = iife.body.body;
const declKind = new Map();
for (const n of body) {
  if (n.type === 'FunctionDeclaration') declKind.set(n.id.name, 'function');
  else if (n.type === 'VariableDeclaration') for (const d of n.declarations) {
    if (d.id.type === 'Identifier') declKind.set(d.id.name, n.kind);
    else if (d.id.type === 'ObjectPattern') for (const p of d.id.properties) declKind.set(p.value.name, n.kind);
  }
}
const actionFn = body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'action');
const actScope = sm.acquire(actionFn);
const tryStmt = actionFn.body.body.find(n => n.type === 'TryStatement');
const chain = tryStmt.block.body.find(n => n.type === 'IfStatement' && src.slice(...n.test.range) === "name === 'confirm-cancel'");
if (!chain) throw new Error('chain not found');

const parentOf = new Map();
(function walk(node, parent) {
  if (!node || typeof node.type !== 'string') return;
  parentOf.set(node, parent);
  for (const k of Object.keys(node)) { const v = node[k]; if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c, node)); else if (v && typeof v.type === 'string') walk(v, node); }
})(ast, null);

function keysOf(test) {
  const out = [];
  (function visit(e) {
    if (e.type === 'LogicalExpression' && e.operator === '||') { visit(e.left); visit(e.right); return; }
    if (e.type === 'BinaryExpression' && e.operator === '===' && e.left.type === 'Identifier' && e.left.name === 'name' && e.right.type === 'Literal') { out.push(e.right.value); return; }
    throw new Error('pattern');
  })(test);
  return out;
}
const branches = [];
for (let n = chain; n; n = n.alternate && n.alternate.type === 'IfStatement' ? n.alternate : null) {
  if (n.alternate && n.alternate.type !== 'IfStatement') throw new Error('final else not supported');
  let keys = null, pattern = null;
  try { keys = keysOf(n.test); } catch (e) { pattern = src.slice(...n.test.range); }
  branches.push({ keys, pattern, block: n.consequent, test: n.test });
}
{ const seen = new Set(); for (const b of branches) for (const k of b.keys || []) { if (seen.has(k)) throw new Error('duplicate action ' + k); seen.add(k); } }
const GROUPS = [
  ['nav', /^(confirm-|boot-|mode-gender|wiz-|era-)/],
  ['system', /^(store-update|rate-yes|rate-later|ads-privacy|pgs-show|coach-next|coach-skip|coach-replay|guide-skip|toggle-audio|audio-test)$/],
  ['saves', /^(save-|career-save|career-load|career-create)/],
  ['lab', /^(match-|lab-)/],
  ['live', /^live-(?!hero)/],
  ['life', /^(life-|moment-|celebrate|arcade-|live-hero|pet-)/],
  ['jugada', /^jm-/],
  ['career', /./]
];
const groupOf = key => GROUPS.find(([, re]) => re.test(key))[0];
const patternGroup = p => p.includes('jm-') ? 'jugada' : p.includes("'pet-'") ? 'life' : p.includes("'lab-'") ? 'lab' : 'career';

// referencias dentro de un rango a variables de app.js (ámbito de la IIFE)
function refsIn(range) {
  const out = [];
  for (const v of top.variables) for (const r of v.references) {
    const [s, e] = r.identifier.range;
    if (s >= range[0] && e <= range[1]) out.push({ name: v.name, id: r.identifier });
  }
  return out;
}
// los bloques solo pueden usar de action() sus parámetros name y el
for (const v of actScope.variables) if (!['name', 'el', 'arguments'].includes(v.name)) {
  for (const b of branches) for (const r of v.references) { const [s, e] = r.identifier.range; if (s >= b.block.range[0] && e <= b.block.range[1]) throw new Error('block uses action local ' + v.name); }
}
const AMBIENT = new Set(['root', 'CAA', 'doc']);
const groups = {}; const usedFromUi = new Set();
for (const b of branches) {
  const g = b.keys ? groupOf(b.keys[0]) : patternGroup(b.pattern);
  if (b.keys && b.keys.some(k => groupOf(k) !== g)) throw new Error('mixed group ' + b.keys);
  const G = groups[g] = groups[g] || { handlers: [], direct: new Set() };
  const reps = [];
  for (const r of refsIn(b.block.range)) {
    if (AMBIENT.has(r.name)) continue;
    usedFromUi.add(r.name);
    if (declKind.get(r.name) !== 'let') { G.direct.add(r.name); continue; }
    const p = parentOf.get(r.id);
    if (p && p.type === 'Property' && p.shorthand && p.value === r.id) reps.push([r.id.range[0], r.id.range[1], r.name + ': ui.' + r.name]);
    else reps.push([r.id.range[0], r.id.range[1], 'ui.' + r.name]);
  }
  reps.sort((a, c) => c[0] - a[0]);
  let text = src.slice(b.block.range[0], b.block.range[1]);
  for (const [s, e, w] of reps) text = text.slice(0, s - b.block.range[0]) + w + text.slice(e - b.block.range[0]);
  // de 8 espacios (dentro de try) a 6 (dentro de la función del manejador)
  text = text.split('\n').map((l, i) => i === 0 ? l : l.replace(/^ {4}/, '  ')).join('\n');
  G.handlers.push({ keys: b.keys, pattern: b.pattern, text });
}
const HEAD = {
  nav: 'Navegación: idioma, menú, modos, Modo Épocas y asistente de creación.',
  system: 'Sistema: Google Play, tutorial, guía y sonido.',
  saves: 'Partidas: crear, guardar, cargar, exportar e importar.',
  lab: 'Laboratorio y partido de demostración.',
  live: 'Partido en directo: arranque, avance, decisiones, velocidad y vista.',
  life: 'YO: decisiones de vida, tienda, minijuegos, momentos y mascota.',
  jugada: 'Jugada Maestra.',
  career: 'Carrera: jornada, mundo, mercado, club, equipamiento, entrenador, familia y temporada.'
};
fs.mkdirSync(outDir, { recursive: true });
const order = Object.keys(groups);
for (const g of order) {
  const G = groups[g];
  const exact = [], patterns = [];
  G.handlers.forEach((h, i) => {
    const fn = `async (name, el) => ${h.text}`;
    if (h.keys) {
      if (h.keys.length === 1) exact.push(`    exact[${JSON.stringify(h.keys[0])}] = ${fn};`);
      else { exact.push(`    const h${i} = ${fn};`); exact.push(`    for (const k of ${JSON.stringify(h.keys)}) exact[k] = h${i};`); }
    } else patterns.push(`    patterns.push({ test: name => ${h.pattern}, run: ${fn} });`);
  });
  const code = `(function (root) {
  'use strict';
  // Acciones · ${HEAD[g]}
  // Cada entrada recibe (name, el) igual que antes en la cadena de action(); lo compartido llega en \`ui\`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIActions = CAA.UIActions || {};
  CAA.UIActions[${JSON.stringify(g)}] = function (ui) {
${G.direct.size ? '    const { ' + [...G.direct].sort().join(', ') + ' } = ui;\n' : ''}    const exact = {}, patterns = [];
${exact.join('\n')}
${patterns.join('\n')}
    return { exact, patterns };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;
  fs.writeFileSync(path.join(outDir, g + '.js'), code);
}
// app.js: la cadena se sustituye por la tabla; ui gana los getters que falten
let app = src.slice(0, chain.range[0]) + `const run = ACTIONS.exact[name] || (ACTIONS.patterns.find(p => p.test(name)) || {}).run;
      if (run) await run(name, el);` + src.slice(chain.range[1]);
const uiStart = app.indexOf('  const ui = {\n'), uiEnd = app.indexOf('\n  };', uiStart);
const existing = new Set([...app.slice(uiStart, uiEnd).matchAll(/get (\w+)\(\)/g)].map(m => m[1]));
const add = [...usedFromUi].filter(nm => !existing.has(nm)).sort().map(nm => declKind.get(nm) === 'let' ? `get ${nm}() { return ${nm}; }, set ${nm}(v) { ${nm} = v; }` : `get ${nm}() { return ${nm}; }`);
// los nombres que ya vienen de las vistas (destructurado de ui) no necesitan getter
const viewNames = new Set((app.match(/const \{ ([^}]+) \} = ui;/) || ['', ''])[1].split(',').map(x => x.trim()));
const addFiltered = add.filter(line => !viewNames.has(line.match(/get (\w+)/)[1]));
app = app.slice(0, uiEnd) + (addFiltered.length ? ',\n    ' + addFiltered.join(',\n    ') : '') + app.slice(uiEnd);
app = app.replace(/(  const \{ [^}]+ \} = ui;\n)/, `$1  // Acciones por módulos (src/ui/actions/*.js): nombres exactos primero, después los patrones en su orden.
  const ACTIONS = { exact: {}, patterns: [] };
  for (const name of ${JSON.stringify(order)}) { const a = CAA.UIActions[name](ui); Object.assign(ACTIONS.exact, a.exact); ACTIONS.patterns.push(...a.patterns); }
`);
fs.writeFileSync(appPath, app);
console.log('actions:', branches.length, 'branches in', order.length, 'groups', order.join(','), '+', addFiltered.length, 'ui getters');
