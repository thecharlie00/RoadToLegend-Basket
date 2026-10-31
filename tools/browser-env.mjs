import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import chromium from '@sparticuz/chromium';
import { chromium as playwright } from 'playwright-core';

// CI-only browser. Never disable web security or CORS in the pages under test.
export async function launchBrowser() {
  if (process.env.CAA_CHROMIUM_PATH) return playwright.launch({ executablePath: process.env.CAA_CHROMIUM_PATH, headless: true });
  const libDir = resolve('.cache/browser-libs');
  if (!existsSync(libDir + '/lib/libnspr4.so')) {
    mkdirSync(libDir, { recursive: true });
    const tar = libDir + '/al2023.tar';
    writeFileSync(tar, brotliDecompressSync(readFileSync(resolve('node_modules/@sparticuz/chromium/bin/al2023.tar.br'))));
    execFileSync('tar', ['-xf', tar, '-C', libDir]);
  }
  const executablePath = await chromium.executablePath();
  const blocked = new Set(['--disable-web-security', '--allow-running-insecure-content', '--disable-site-isolation-trials', '--single-process', '--no-zygote']);
  return playwright.launch({ executablePath, headless: true, chromiumSandbox: false,
    env: { ...process.env, LD_LIBRARY_PATH: libDir + '/lib:' + (process.env.LD_LIBRARY_PATH || '') },
    args: chromium.args.filter(a => !blocked.has(a)) });
}
export { playwright, pathToFileURL };
