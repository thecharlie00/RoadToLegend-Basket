// Captura de la ilustración de decisión y del avatar de Yo (uso en desarrollo).
import { resolve } from 'node:path';
import { launchBrowser, pathToFileURL } from './browser-env.mjs';
const out = process.argv[2] || 'data/qa/scenes';
const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 420, height: 900 } })).newPage();
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto(pathToFileURL(resolve('dist/index.html')).href);
await page.waitForFunction(() => globalThis.CAA_APP);
const idle = () => page.waitForFunction(() => !CAA_APP.state.busy);
const click = async sel => { await page.locator(sel).first().click(); await idle(); };
if (await page.evaluate(() => CAA_APP.state.screen) === 'lang') await click('[data-action="boot-lang"][data-locale="es"]');
await click('[data-action="boot-new"]'); await click('[data-action="boot-mode"][data-mode="player"]');
while (!(await page.locator('[data-action="career-create"]').count())) await click('[data-action="wiz-next"]');
await page.waitForFunction(() => CAA_APP.state.career.clubs.length > 0 && !CAA_APP.state.career.clubsLoading);
await click('[data-action="career-create"]');
if (await page.locator('[data-action="confirm-yes"]').count()) await click('[data-action="confirm-yes"]');
await page.waitForFunction(() => CAA_APP.state.screen === 'game' && CAA_APP.state.career.state);
for (let i = 0; i < 2; i++) { await page.waitForTimeout(700); if (await page.locator('#ev3d').count()) await page.locator('#ev3d').screenshot({ path: `${out}-ev${i}.png` }); }
await page.locator('[data-tab="life"]').first().click(); await page.waitForTimeout(800);
for (let i = 0; i < 2; i++) { await page.waitForTimeout(500); await page.locator('#me3d').screenshot({ path: `${out}-me${i}.png` }); }
await browser.close();
