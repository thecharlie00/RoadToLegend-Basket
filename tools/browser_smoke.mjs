import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchBrowser, pathToFileURL } from './browser-env.mjs';
import AxeBuilder from '@axe-core/playwright';

const browser = await launchBrowser();
const report = { date: new Date().toISOString(), browser: await browser.version(), scenarios: [], consoleErrors: [], pageErrors: [], externalRequests: [], accessibility: [] };
const url = pathToFileURL(resolve('dist/index.html')).href;
async function scenario(name, options, fn) {
  const context = await browser.newContext({ viewport: options.viewport || { width: 1280, height: 900 }, reducedMotion: options.reducedMotion || 'no-preference', acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', e => report.pageErrors.push({ name, message: e.message }));
  page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push({ name, text: m.text() }); });
  page.on('request', r => { if (/^https?:/.test(r.url())) report.externalRequests.push(r.url()); });
  if (options.init) await page.addInitScript(options.init);
  await page.goto(url);
  await page.waitForFunction(() => globalThis.CAA_APP, { timeout: 15000 });
  await fn(page, context);
  report.scenarios.push({ name, ok: true, missingTranslations: await page.evaluate(() => CAA.I18N.missingKeys()) });
  await context.close();
}
async function click(page, action) { await page.locator(`[data-action="${action}"]`).click(); await page.waitForFunction(() => !CAA_APP.state.busy); }
async function tab(page, name) { await page.locator(`[data-tab="${name}"]`).click(); }
try {
  await scenario('desktop career / autosave / reload / import / event / committed practice', {}, async (page, context) => {
    assert.equal(await page.evaluate(() => CAA_APP.worker.getMode()), 'worker');
    await tab(page, 'career');
    await page.locator('#career-seed').fill('phase5-browser');
    await click(page, 'career-create');
    await page.waitForFunction(() => CAA_APP.state.career.state && CAA_APP.state.saveState === 'saved');
    assert.equal(await page.evaluate(() => CAA_APP.state.career.state.week), 0);
    await click(page, 'career-play');
    assert.equal(await page.evaluate(() => CAA_APP.state.career.state.week), 1);
    await page.reload(); await page.waitForFunction(() => globalThis.CAA_APP);
    assert.equal(await page.evaluate(() => CAA_APP.state.career.state.week), 1);
    await click(page, 'career-play'); await click(page, 'career-play');
    await tab(page, 'life');
    await page.locator('[data-action="life-event"][data-option="a"]').click(); await page.waitForFunction(() => !CAA_APP.state.busy);
    assert.equal(await page.evaluate(() => CAA_APP.state.career.state.life.pendingEvent), null);
    await click(page, 'life-practice-start');
    assert.ok(await page.evaluate(() => CAA_APP.state.career.state.life.pendingPractice));
    const attempt = await page.evaluate(() => CAA_APP.state.career.state.life.pendingPractice.id);
    await page.reload(); await page.waitForFunction(() => globalThis.CAA_APP);
    assert.equal(await page.evaluate(() => CAA_APP.state.career.state.life.pendingPractice.id), attempt);
    await tab(page, 'life'); await click(page, 'life-practice-resume'); await click(page, 'life-practice-release');
    assert.equal(await page.evaluate(() => CAA_APP.state.career.state.life.pendingPractice), null);
    await tab(page, 'save');
    const saved = await page.evaluate(async () => JSON.stringify(await CAA_APP.storage.load('slot-1')));
    await page.locator('#slot').selectOption('slot-2');
    await page.locator('#save-import').fill(saved); await click(page, 'save-preview'); await click(page, 'save-import');
    assert.equal(await page.evaluate(() => CAA_APP.state.slot), 'slot-2');
    assert.ok(await page.evaluate(async () => !!(await CAA_APP.storage.load('slot-2'))));
    const downloadEvent = page.waitForEvent('download'); await click(page, 'save-export'); const download = await downloadEvent;
    assert.match(download.suggestedFilename(), /slot-2\.json$/);
    await page.locator('#save-import').fill('{bad'); await click(page, 'save-preview');
    assert.match(await page.locator('#global-status').textContent(), /corrupt JSON/);
    await tab(page, 'match'); await click(page, 'match-simulate');
    assert.equal(await page.locator('#court2d').count(), 1);
    await click(page, 'match-step');
    await tab(page, 'lab'); await click(page, 'lab-performance');
    report.performance = await page.evaluate(() => CAA_APP.state.diagnostics);
    assert.equal(report.performance.frames, 180); assert.equal(report.performance.stopped, false); assert.equal(report.performance.context.workload, 'court2d');
    await tab(page, 'save');
    await click(page, 'save-delete'); assert.equal(await page.locator('[role="alertdialog"]').count(), 1);
    await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'confirm-yes');
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'confirm-cancel');
    await page.keyboard.press('Escape'); assert.equal(await page.locator('[role="alertdialog"]').count(), 0);
    assert.ok(await page.evaluate(async () => !!(await CAA_APP.storage.load('slot-2'))));
    await click(page, 'save-delete'); await click(page, 'confirm-yes');
    assert.equal(await page.evaluate(async () => await CAA_APP.storage.load('slot-2')), null);
  });
  await scenario('mobile 360px / keyboard / Spanish a11y', { viewport: { width: 360, height: 800 } }, async page => {
    await tab(page, 'career'); await click(page, 'career-create'); await click(page, 'career-play'); await click(page, 'career-play'); await click(page, 'career-play');
    await tab(page, 'match'); await click(page, 'match-simulate');
    await page.locator('#tab-world').focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tab-match');
    await page.keyboard.press('End'); assert.equal(await page.evaluate(() => document.activeElement.id), 'tab-settings');
    for (const name of ['world', 'match', 'career', 'life', 'save', 'lab', 'settings']) {
      await tab(page, name);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal overflow: ' + name);
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      report.accessibility.push({ locale: 'es', tab: name, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })) });
    }
  });
  await scenario('English / large text / high contrast / reduced motion', { viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }, async page => {
    await tab(page, 'settings');
    await page.locator('[data-setting="locale"]').selectOption('en');
    await page.locator('[data-setting="fontSize"]').selectOption('2');
    await page.locator('[data-setting="highContrast"]').selectOption('true');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    for (const name of ['world', 'career', 'save', 'settings']) {
      await tab(page, name);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'large text overflow: ' + name);
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      report.accessibility.push({ locale: 'en', tab: name, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })) });
    }
    assert.ok(await page.evaluate(() => CAA.A11Y.reduced(CAA_APP.state.settings)));
  });
  await scenario('IndexedDB backup recovery / file picker / native pause-resume', {}, async page => {
    await tab(page, 'career'); await click(page, 'career-create'); await click(page, 'career-play'); await click(page, 'career-play');
    const saved = await page.evaluate(async () => JSON.stringify(await CAA_APP.storage.load('slot-1')));
    await page.evaluate(async () => {
      const db = await new Promise((resolve, reject) => { const r = indexedDB.open('camino-al-aro', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
      await new Promise((resolve, reject) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put('{bad', 'slot.slot-1.current'); tx.oncomplete = resolve; tx.onerror = reject; }); db.close();
    });
    assert.equal(await page.evaluate(async () => (await CAA_APP.storage.load('slot-1')).payload.career.week), 1);
    await page.evaluate(() => window.dispatchEvent(new Event('caa:native-pause')));
    await page.waitForFunction(() => CAA_APP.state.saveState === 'saved');
    await page.evaluate(() => window.dispatchEvent(new Event('caa:native-resume')));
    await tab(page, 'save');
    await page.locator('#save-file').setInputFiles({ name: 'career.json', mimeType: 'application/json', buffer: Buffer.from(saved) });
    await page.waitForFunction(() => CAA_APP.state.importPreview);
    await click(page, 'save-import'); await click(page, 'confirm-yes');
    assert.equal(await page.evaluate(async () => (await CAA_APP.storage.load('slot-1')).payload.career.week), 2);
  });
  await scenario('Android bridge contract / lifecycle / native export handoff', { init: () => { window.CAAAndroid = { exportSave(text) { window.__nativeExport = text; } }; } }, async page => {
    await tab(page, 'career'); await click(page, 'career-create');
    await tab(page, 'save'); await click(page, 'save-export');
    const exported = await page.evaluate(() => JSON.parse(window.__nativeExport));
    assert.equal(exported.game, 'camino-al-aro'); assert.ok(exported.payload.career);
    assert.match(await page.locator('#global-status').textContent(), /Completa el selector/);
    await page.evaluate(() => window.dispatchEvent(new Event('caa:native-pause')));
    await page.waitForFunction(() => CAA_APP.state.saveState === 'saved');
    assert.equal(await page.evaluate(() => CAA_APP.handleBack()), true);
    assert.equal(await page.evaluate(() => CAA_APP.state.tab), 'career');
    assert.equal(await page.evaluate(() => CAA_APP.handleBack()), false);
  });
  await scenario('Worker unavailable: deterministic main-thread fallback', { init: () => { window.Worker = undefined; } }, async page => {
    assert.equal(await page.evaluate(() => CAA_APP.worker.getMode()), 'main');
    await tab(page, 'career'); await click(page, 'career-create'); await click(page, 'career-play');
    assert.equal(await page.evaluate(() => CAA_APP.state.career.state.week), 1);
  });
  await scenario('Storage denied: explicit memory-only warning', { init: () => { Object.defineProperty(window, 'indexedDB', { value: undefined }); Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } }); } }, async page => {
    assert.equal(await page.evaluate(() => CAA_APP.storage.kind), 'memory');
    assert.equal(await page.evaluate(() => CAA_APP.storage.persistent), false);
    await tab(page, 'career'); await click(page, 'career-create');
    assert.equal(await page.evaluate(() => CAA_APP.state.saveState), 'memory');
    await tab(page, 'save'); assert.match(await page.locator('#app').textContent(), /solo vive en memoria/);
    assert.match(await page.locator('#app').textContent(), /solo vive en memoria/);
    await tab(page, 'save'); const downloadEvent = page.waitForEvent('download'); await click(page, 'save-export');
    const download = await downloadEvent; assert.match(download.suggestedFilename(), /slot-1\.json$/);
  });
  report.locales = await (async () => { const es = JSON.parse(readFileSync('src/locales/es.json', 'utf8')), en = JSON.parse(readFileSync('src/locales/en.json', 'utf8')); return { es: Object.keys(es).length, en: Object.keys(en).length }; })();
  assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.consoleErrors, []); assert.deepEqual(report.externalRequests, []);
  const violations = report.accessibility.flatMap(r => r.violations); assert.deepEqual(violations, []);
} finally {
  mkdirSync('data/qa', { recursive: true });
  writeFileSync('data/qa/phase5-browser.json', JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
console.log(JSON.stringify({ scenarios: report.scenarios.length, consoleErrors: report.consoleErrors.length, pageErrors: report.pageErrors.length, externalRequests: report.externalRequests.length, accessibilityViolations: report.accessibility.flatMap(r => r.violations).length, performance: report.performance }, null, 2));
