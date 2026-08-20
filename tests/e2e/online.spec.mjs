import { test, expect } from '@playwright/test';

/**
 * The opt-in online suite - run with `npm run test:online`, needs internet.
 *
 * Excluded from the default E2E run on purpose: that suite must pass on a
 * machine with no connection, which is the whole point of the project. This
 * one exists so `--online` does not quietly rot while nobody is using it.
 */

test('online mode loads its libraries and samples from the internet', async ({ page }) => {
  const hosts = new Set();
  page.on('request', (req) => {
    const { hostname } = new URL(req.url());
    if (hostname !== '127.0.0.1' && hostname !== 'localhost') hosts.add(hostname);
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');
  await page.waitForSelector('body[data-notebook-ready="true"]', { timeout: 90_000 });
  await page.waitForFunction(
    () => {
      const eds = [...document.querySelectorAll('strudel-editor')];
      return eds.length === 8 && eds.every((e) => e.editor && e.editor.prebaked);
    },
    null,
    { timeout: 90_000 },
  );

  expect([...hosts], 'libraries should come from the CDN').toContain('unpkg.com');
  expect(errors).toEqual([]);
});

test('online mode still plays, using remotely fetched samples', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-notebook-ready="true"]', { timeout: 90_000 });
  await page.waitForFunction(
    () => {
      const eds = [...document.querySelectorAll('strudel-editor')];
      return eds.length === 8 && eds.every((e) => e.editor && e.editor.prebaked);
    },
    null,
    { timeout: 90_000 },
  );

  await page.evaluate(() =>
    document.querySelector('#cell-1 strudel-editor').editor.setCode('s("bd*4 hh*8")'),
  );
  await page.locator('#cell-1 .play-btn').click();

  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.querySelector('#cell-1 strudel-editor').editor.repl.scheduler.started,
        ),
      { timeout: 30_000 },
    )
    .toBe(true);
});

test('first-party sources are still served locally in online mode', async ({ page }) => {
  await page.goto('/');
  const srcs = await page.evaluate(() =>
    [...document.querySelectorAll('script[src], link[href]')].map(
      (el) => el.getAttribute('src') || el.getAttribute('href'),
    ),
  );
  // Only the libraries move to the CDN; our own code always comes from disk.
  expect(srcs).toContain('ui/main.js');
  expect(srcs).toContain('styles.css');
});
