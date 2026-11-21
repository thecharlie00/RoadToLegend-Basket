import * as espree from 'espree';
import * as eslintScope from 'eslint-scope';
import fs from 'node:fs';
for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, 'utf8');
  const ast = espree.parse(src, { ecmaVersion: 2023, range: true, loc: true });
  const sm = eslintScope.analyze(ast, { ecmaVersion: 2023, sourceType: 'script' });
  const out = [];
  for (const scope of sm.scopes) for (const v of scope.variables) {
    if (v.name === 'arguments' || !v.defs.length) continue;
    const d = v.defs[0];
    if (!['FunctionName', 'Variable'].includes(d.type)) continue;
    const reads = v.references.filter(r => r.isRead() || (r.init === false && !r.isWrite()));
    if (!reads.length) out.push(v.name + '@' + d.name.loc.start.line);
  }
  if (out.length) console.log(f, out.join(' '));
}
