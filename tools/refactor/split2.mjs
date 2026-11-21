// Parte src/ui/app.js en módulos de vista (src/ui/views/*.js) sin cambiar el comportamiento.
// - Las funciones y constantes movidas se reescriben para leer lo compartido desde `ui` (contexto).
// - Las variables `let` se quedan en app.js y se exponen en `ui` con getter/setter.
// - app.js crea `ui`, ejecuta las fábricas de cada vista y recupera sus nombres con un destructurado.
import * as espree from 'espree';
import * as eslintScope from 'eslint-scope';
import fs from 'node:fs';
import path from 'node:path';

const [appPath, mapPath, outDir] = process.argv.slice(2);
const src = fs.readFileSync(appPath, 'utf8');
const MAP = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const ast = espree.parse(src, { ecmaVersion: 2023, range: true, loc: true });
const sm = eslintScope.analyze(ast, { ecmaVersion: 2023, sourceType: 'script' });
const iife = ast.body[0].expression.callee;
const top = sm.acquire(iife);
const OPT = JSON.parse(process.env.SPLIT_OPT || '{}');
const AMBIENT = new Set(OPT.ambient || ['root', 'CAA', 'doc', 'arguments']);
const NS = OPT.ns || 'UIViews', MARK = OPT.mark || '  if (doc.readyState', CTX = OPT.ctx || 'ui', PREFIX = OPT.prefix || '';
const body = iife.body.body;

const declOf = new Map(); // name -> {node, kind}
for (const n of body) {
  if (n.type === 'FunctionDeclaration') declOf.set(n.id.name, { node: n, kind: 'function' });
  else if (n.type === 'VariableDeclaration') for (const d of n.declarations) declOf.set(d.id.name, { node: n, kind: n.kind });
}
const modOf = new Map();
for (const [mod, names] of Object.entries(MAP.modules)) for (const nm of names) {
  if (!declOf.has(nm)) throw new Error('unknown name ' + nm);
  if (declOf.get(nm).kind === 'let') throw new Error('let stays in app: ' + nm);
  modOf.set(nm, mod);
}
// Una declaración con varios nombres debe ir entera al mismo módulo.
const stmtMod = new Map();
for (const n of body) {
  const names = n.type === 'FunctionDeclaration' ? [n.id.name] : n.type === 'VariableDeclaration' ? n.declarations.map(d => d.id.name) : [];
  const mods = new Set(names.map(x => modOf.get(x) || null));
  if (mods.size > 1) throw new Error('split declaration ' + names.join(','));
  const m = [...mods][0];
  if (m) stmtMod.set(n, m);
}
const topVar = new Map(top.variables.map(v => [v.name, v]));
// referencias a variables de ámbito superior por posición
function refsIn(range) {
  const out = [];
  for (const v of top.variables) for (const r of v.references) {
    const [s, e] = r.identifier.range;
    if (s >= range[0] && e <= range[1]) out.push({ name: v.name, id: r.identifier, write: r.isWrite() });
  }
  return out;
}
// Padre de cada identificador (para propiedades abreviadas { state })
const parentOf = new Map();
(function walk(node, parent) {
  if (!node || typeof node.type !== 'string') return;
  parentOf.set(node, parent);
  for (const k of Object.keys(node)) {
    if (k === 'parent') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c, node));
    else if (v && typeof v.type === 'string') walk(v, node);
  }
})(ast, null);

const exportsOf = {}; const usedFromUi = new Set();
const moduleSrc = {};
for (const mod of Object.keys(MAP.modules)) {
  const stmts = body.filter(n => stmtMod.get(n) === mod);
  const own = new Set(MAP.modules[mod]);
  let parts = []; const direct = new Set();
  for (const n of stmts) {
    const reps = [];
    for (const r of refsIn(n.range)) {
      if (own.has(r.name) || AMBIENT.has(r.name)) continue;
      usedFromUi.add(r.name);
      // Funciones y constantes de app.js: se toman una vez del contexto y se usan por su nombre.
      const d = declOf.get(r.name);
      if (d && d.kind !== 'let' && !modOf.has(r.name)) { direct.add(r.name); continue; }
      const p = parentOf.get(r.id);
      if (p && p.type === 'Property' && p.shorthand && p.value === r.id) reps.push([r.id.range[0], r.id.range[1], r.name + ': ' + CTX + '.' + r.name]);
      else reps.push([r.id.range[0], r.id.range[1], CTX + '.' + r.name]);
    }
    reps.sort((a, b) => b[0] - a[0]);
    // incluye el comentario que precede a la declaración
    let start = n.range[0];
    const before = src.slice(0, start), lastNl = before.lastIndexOf('\n');
    let text = src.slice(n.range[0], n.range[1]);
    for (const [s, e, w] of reps) text = text.slice(0, s - n.range[0]) + w + text.slice(e - n.range[0]);
    // comentarios de línea justo encima
    const lines = before.slice(0, lastNl).split('\n'); const comments = [];
    for (let i = lines.length - 1; i >= 0 && /^\s*\/\//.test(lines[i]); i--) comments.unshift(lines[i].trim());
    const indented = text.split('\n').map((l, i) => i === 0 ? '    ' + l : (l.startsWith('  ') ? '  ' + l : l)).join('\n');
    parts.push((comments.length ? comments.map(c => '    ' + c).join('\n') + '\n' : '') + indented);
    n.__comments = comments.length;
  }
  exportsOf[mod] = [...own];
  const header = MAP.headers[mod] || '';
  moduleSrc[mod] = `(function (root) {
  'use strict';
  // ${header}
  // ${OPT.note || 'Vista extraída de app.js: lo compartido (estado, traductor, trabajador, otras vistas…) llega en `ui`.'}
  const CAA = root.CAA = root.CAA || {};
${OPT.noDoc ? '' : '  const doc = root.document;\n'}  CAA.${NS} = CAA.${NS} || {};
  CAA.${NS}[${JSON.stringify(mod)}] = function (${CTX}) {
${direct.size ? '    const { ' + [...direct].sort().join(', ') + ' } = ' + CTX + ';\n' : ''}${parts.join('\n')}
    return { ${exportsOf[mod].join(', ')} };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;
}
// Comprobación: las inicializaciones de nivel superior que quedan en app.js no pueden usar nombres movidos
const movedNames = new Set(modOf.keys());
const keep = body.filter(n => !stmtMod.has(n));
const lastStmt = body[body.length - 1];
const markPos = src.lastIndexOf(MARK);
for (const n of keep) {
  if (n.type === 'FunctionDeclaration' || n === lastStmt || n.range[0] >= markPos) continue;
  for (const r of refsIn(n.range)) {
    if (!movedNames.has(r.name)) continue;
    // dentro de una función flecha / expresión de función es perezoso: permitido
    let p = parentOf.get(r.id), lazy = false;
    while (p && p !== n) { if (/Function/.test(p.type)) { lazy = true; break; } p = parentOf.get(p); }
    if (!lazy) throw new Error('eager use of moved ' + r.name + ' at line ' + r.id.loc.start.line);
  }
}
// Constantes de módulo que usan otras vistas al crearse
for (const mod of Object.keys(MAP.modules)) for (const n of body.filter(x => stmtMod.get(x) === mod && x.type === 'VariableDeclaration')) {
  for (const r of refsIn(n.range)) {
    if (!movedNames.has(r.name) || modOf.get(r.name) === mod) continue;
    let p = parentOf.get(r.id), lazy = false;
    while (p && p !== n) { if (/Function/.test(p.type)) { lazy = true; break; } p = parentOf.get(p); }
    if (!lazy) throw new Error('module ' + mod + ' const uses ' + r.name + ' eagerly');
  }
}
// Nuevo app.js
const removed = body.filter(n => stmtMod.has(n)).map(n => {
  let s = n.range[0];
  // quita también los comentarios de línea de encima y el salto de línea
  const before = src.slice(0, s); let ls = before.lastIndexOf('\n') + 1;
  let k = (n.__comments || 0);
  while (k-- > 0) ls = src.lastIndexOf('\n', ls - 2) + 1;
  let e = n.range[1]; if (src[e] === '\n') e++;
  return [ls, e];
}).sort((a, b) => b[0] - a[0]);
let app = src;
for (const [s, e] of removed) app = app.slice(0, s) + app.slice(e);
// Contexto ui: getters para todo lo de app.js que usan las vistas; setters para los let.
const uiNames = [...usedFromUi].filter(nm => !movedNames.has(nm)).sort();
const getters = uiNames.map(nm => {
  const d = declOf.get(nm);
  if (!d && nm === 'root') return null;
  if (d && d.kind === 'let') return `get ${nm}() { return ${nm}; }, set ${nm}(v) { ${nm} = v; }`;
  return `get ${nm}() { return ${nm}; }`;
}).filter(Boolean);
const modsOrder = Object.keys(MAP.modules);
const block = `
  // ===== ${OPT.blockTitle || 'Vistas por módulos (src/ui/views/*.js)'} =====
  // ${OPT.blockNote || 'Cada vista recibe este contexto; lo que exporta se añade aquí y app.js lo usa por su nombre.'}
${OPT.requires ? OPT.requires + '\n' : ''}  const ${CTX} = {
    ${getters.join(',\n    ')}
  };
  for (const name of ${JSON.stringify(modsOrder)}) Object.assign(${CTX}, CAA.${NS}[name](${CTX}));
  const { ${[...movedNames].join(', ')} } = ${CTX};
`;
// insertar antes de la última sentencia (arranque)
const lastStart = app.lastIndexOf(MARK);
app = app.slice(0, lastStart) + block.slice(1) + app.slice(lastStart);
fs.mkdirSync(outDir, { recursive: true });
for (const [mod, code] of Object.entries(moduleSrc)) fs.writeFileSync(path.join(outDir, PREFIX + mod + '.js'), code);
fs.writeFileSync(appPath, app);
console.log('moved', movedNames.size, 'names into', modsOrder.length, 'modules; ui exposes', uiNames.length, 'app bindings');
