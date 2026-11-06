// Captura del directo 3D para revisión visual (uso en desarrollo).
import { resolve } from 'node:path';
import { launchBrowser, pathToFileURL } from './browser-env.mjs';
const out = process.argv[2] || 'data/qa/live3d';
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto(pathToFileURL(resolve('dist/index.html')).href);
await page.waitForFunction(() => globalThis.CAA_APP);
const idle = () => page.waitForFunction(() => !CAA_APP.state.busy);
const click = async sel => { await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; })); await page.locator(sel).first().click(); await idle(); };
if (await page.evaluate(() => CAA_APP.state.screen) === 'lang') await click('[data-action="boot-lang"][data-locale="es"]');
await click('[data-action="boot-new"]');
if (process.argv[3] === 'f') await click('[data-action="mode-gender"][data-gender="f"]');
await click('[data-action="boot-mode"][data-mode="player"]');
while (!(await page.locator('[data-action="career-create"]').count())) await click('[data-action="wiz-next"]');
await page.waitForFunction(() => CAA_APP.state.career.clubs.length > 0 && !CAA_APP.state.career.clubsLoading);
await click('[data-action="career-create"]');
if (await page.locator('[data-action="confirm-yes"]').count()) await click('[data-action="confirm-yes"]');
await page.waitForFunction(() => CAA_APP.state.screen === 'game' && CAA_APP.state.career.state);
while (await page.locator('[data-action="life-event"]').count()) await click('[data-action="life-event"]');
await click('[data-action="live-start"]');
await page.locator('[data-action="live-speed"][data-speed="1"]').click();
const log = [];
for (let i = 0; i < 12; i++) { await page.waitForTimeout(i ? 1300 : 4500); try { await page.locator("#live3d").screenshot({ path: `${out}-${i}.png`, timeout: 3000 }); } catch (e) { log.push("(sin canvas: " + await page.evaluate(() => CAA_APP.state.tab + "/" + !!document.querySelector("[data-action=live-choice], .moment")) + ")"); continue; } log.push(await page.evaluate(() => document.getElementById('pb-score').textContent + ' | ' + (document.getElementById('live3d-cap') || {}).textContent)); }
console.log(log.join('\n'));
await browser.close();
