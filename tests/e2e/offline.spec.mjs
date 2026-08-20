import { test, expect } from '@playwright/test';

/**
 * The offline guarantee, enforced.
 *
 * Every test here runs with all non-localhost traffic hard-aborted, so a
 * regression that reintroduces a CDN cannot pass by quietly succeeding on a
 * machine that happens to have internet.
 */

const isLocal = (url) =>
  url.startsWith('http://127.0.0.1:') ||
  url.startsWith('http://localhost:') ||
  url.startsWith('data:') ||
  url.startsWith('blob:');

/**
 * Abort anything that is not our local server, and record the attempt.
 *
 * The route matcher deliberately excludes local URLs rather than matching '**' and
 * calling continue(): each page load makes ~50 same-origin requests (8 editors x
 * 6 sample maps), and routing them all through the interceptor is slow enough to
 * blow the test timeouts.
 */
async function blockTheInternet(page) {
  const attempts = [];
  page.on('request', (req) => {
    if (!isLocal(req.url())) attempts.push(req.url());
  });
  await page.route(
    (url) => !isLocal(url.toString()),
    (route) => route.abort(),
  );
  return attempts;
}

/**
 * Wait until every <strudel-editor> has booted AND finished prebake.
 *
 * Each editor runs its own prebake (loading all six sample maps), so clicking
 * Play before those settle just queues behind them. Awaiting `prebaked` is what
 * makes these tests deterministic rather than timing-dependent.
 */
async function waitForEditors(page) {
  // app.js sets this once the play buttons and shortcuts are actually wired.
  await page.waitForSelector('body[data-notebook-ready="true"]', { timeout: 60_000 });
  await page.waitForFunction(
    () => {
      const eds = [...document.querySelectorAll('strudel-editor')];
      return eds.length > 0 && eds.every((e) => e.editor && e.editor.repl && e.editor.prebaked);
    },
    null,
    { timeout: 60_000 },
  );
  await page.evaluate(() =>
    Promise.all([...document.querySelectorAll('strudel-editor')].map((e) => e.editor.prebaked)),
  );
}

/** Expression evaluating to whether the editor in `section` is playing. */
const startedIn = (section) =>
  `document.querySelector('${section} strudel-editor').editor.repl.scheduler.started`;

const started = (n) => startedIn(`#cell-${n}`);

/**
 * Put code into a lesson cell. The cells ship empty so the teacher can write
 * them live, so every playback test has to type something first - which is
 * also exactly what happens in the room.
 */
async function enterCode(page, section, code) {
  await page.evaluate(
    ([sel, src]) => document.querySelector(sel + ' strudel-editor').editor.setCode(src),
    [section, code],
  );
}

test('loads with the internet blocked and reaches zero external requests', async ({ page }) => {
  const attempts = await blockTheInternet(page);
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  await page.goto('/');
  await waitForEditors(page);

  expect(attempts, `page tried to reach the network: ${attempts.join(', ')}`).toEqual([]);
  expect(consoleErrors).toEqual([]);
  await expect(page.locator('strudel-editor')).toHaveCount(8);
});

test('the notebook has no remote sub-resources', async ({ page }) => {
  await blockTheInternet(page);
  await page.goto('/');

  const remote = await page.evaluate(() =>
    [...document.querySelectorAll('script[src], link[href], img[src], iframe[src]')]
      .map((el) => el.getAttribute('src') || el.getAttribute('href'))
      .filter((v) => v && /^(https?:)?\/\//.test(v)),
  );
  expect(remote).toEqual([]);
});

test('a lesson cell plays a drum pattern from local samples', async ({ page }) => {
  const attempts = await blockTheInternet(page);
  const sampleRequests = [];
  page.on('response', (r) => {
    if (/\.(wav|mp3|ogg|flac)$/i.test(r.url())) sampleRequests.push({ url: r.url(), status: r.status() });
  });

  await page.goto('/');
  await waitForEditors(page);

  await enterCode(page, '#cell-1', 's("bd hh sd hh")');
  await page.locator('#cell-1 .play-btn').click();

  await expect.poll(() => page.evaluate(started(1)), { timeout: 30_000 }).toBe(true);
  await expect(page.locator('#cell-1 .play-btn')).toHaveText(/Pause/);

  // The scheduler clock must actually advance - "started" alone can be a lie.
  const t0 = await page.evaluate(() => document.querySelector('#cell-1 strudel-editor').editor.repl.scheduler.now());
  await page.waitForTimeout(1500);
  const t1 = await page.evaluate(() => document.querySelector('#cell-1 strudel-editor').editor.repl.scheduler.now());
  expect(t1, 'scheduler clock did not advance - nothing is playing').toBeGreaterThan(t0);

  expect(sampleRequests.length, 'no audio samples were loaded').toBeGreaterThan(0);
  expect(sampleRequests.every((r) => r.status === 200)).toBe(true);
  expect(attempts).toEqual([]);
});

test('cells layer instead of cutting each other off', async ({ page }) => {
  await blockTheInternet(page);
  await page.goto('/');
  await waitForEditors(page);

  await enterCode(page, '#cell-1', 's("bd*2 hh*4")');
  await enterCode(page, '#cell-2', 'note("c e g e").sound("sawtooth")');

  await page.locator('#cell-1 .play-btn').click();
  await expect.poll(() => page.evaluate(started(1)), { timeout: 30_000 }).toBe(true);

  await page.locator('#cell-2 .play-btn').click();
  await expect.poll(() => page.evaluate(started(2)), { timeout: 30_000 }).toBe(true);

  // The "How to Play" section promises students can layer cells - hold it to that.
  expect(await page.evaluate(started(1)), 'cell 1 was cut off when cell 2 started').toBe(true);
});

test('Stop All silences every cell and resets every button', async ({ page }) => {
  await blockTheInternet(page);
  await page.goto('/');
  await waitForEditors(page);

  await enterCode(page, '#cell-1', 's("bd*2 hh*4")');
  await enterCode(page, '#cell-2', 's("sd cp")');

  await page.locator('#cell-1 .play-btn').click();
  await page.locator('#cell-2 .play-btn').click();
  await expect.poll(() => page.evaluate(started(2)), { timeout: 30_000 }).toBe(true);

  await page.locator('#stop-all').click();

  await expect.poll(() => page.evaluate(started(1)), { timeout: 15_000 }).toBe(false);
  await expect.poll(() => page.evaluate(started(2)), { timeout: 15_000 }).toBe(false);
  await expect(page.locator('#cell-1 .play-btn')).toHaveText(/Play/);
  await expect(page.locator('#cell-2 .play-btn')).toHaveText(/Play/);
});

test('the demo cell plays its GM soundfonts from disk', async ({ page }) => {
  const attempts = await blockTheInternet(page);
  const soundfonts = [];
  page.on('response', (r) => {
    if (r.url().includes('/vendor/soundfonts/')) soundfonts.push(r.status());
  });

  await page.goto('/');
  await waitForEditors(page);

  await page.locator('#demo .play-btn').click();
  await expect.poll(() => page.evaluate(startedIn('#demo')), { timeout: 40_000 }).toBe(true);

  await page.waitForTimeout(4000);
  expect(soundfonts.length, 'demo cell loaded no soundfonts').toBeGreaterThan(0);
  expect(soundfonts.every((s) => s === 200)).toBe(true);
  expect(attempts).toEqual([]);
});


test('the equalizer reacts to what is playing', async ({ page }) => {
  await blockTheInternet(page);
  await page.goto('/');
  await waitForEditors(page);

  const ink = () =>
    page.evaluate(() => {
      const c = document.querySelector('.equalizer canvas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
      return n;
    });

  const atRest = await ink();
  expect(atRest, 'idle equalizer should still draw resting bars').toBeGreaterThan(0);

  await enterCode(page, '#cell-1', 's("bd*4 hh*8").gain(1)');
  await page.locator('#cell-1 .play-btn').click();
  await expect.poll(() => page.evaluate(started(1)), { timeout: 30_000 }).toBe(true);

  // Sample repeatedly: bars swing, so a single frame could catch a trough.
  let loudest = 0;
  for (let i = 0; i < 20; i++) {
    loudest = Math.max(loudest, await ink());
    await page.waitForTimeout(150);
  }
  expect(loudest, 'equalizer never rose above its resting state while audio played')
    .toBeGreaterThan(atRest * 3);

  await expect(page.locator('.equalizer')).toHaveClass(/is-active/);
});

test('the hint inserts its pattern into the cell and then closes', async ({ page }) => {
  await blockTheInternet(page);
  await page.goto('/');
  await waitForEditors(page);

  // Cell 5's hint is multi-line - the case most likely to be mangled.
  const cell = page.locator('#cell-5');
  await expect(cell.locator('.cell__hint')).toHaveCount(0);

  await cell.getByRole('button', { name: /hint/i }).click();
  const hint = await cell.locator('.cell__hint pre code').innerText();
  expect(hint).toContain('stack(');
  expect(hint.split('\n').length).toBeGreaterThan(1);

  // An empty cell is the normal case, so nothing is at risk of being lost.
  await expect(cell.locator('.insert-btn')).toHaveText(/Insert/);
  await cell.locator('.insert-btn').click();

  const inserted = await page.evaluate(
    () => document.querySelector('#cell-5 strudel-editor').editor.code,
  );
  expect(inserted.trim()).toBe(hint.trim());

  // The panel has done its job once the code is in the cell.
  await expect(cell.locator('.cell__hint')).toHaveCount(0);

  // And the inserted pattern actually runs.
  await cell.locator('.play-btn').click();
  await expect.poll(() => page.evaluate(started(5)), { timeout: 30_000 }).toBe(true);
});

test('the hint warns before overwriting work already in the cell', async ({ page }) => {
  await blockTheInternet(page);
  await page.goto('/');
  await waitForEditors(page);

  await enterCode(page, '#cell-3', 'note("e f g")');

  const cell = page.locator('#cell-3');
  await cell.getByRole('button', { name: /hint/i }).click();
  // Same action, honest label - the student can see their code will go.
  await expect(cell.locator('.insert-btn')).toHaveText(/Replace/);
});

test('a single-language mode renders as primary text, not as a gloss', async ({ page }) => {
  await blockTheInternet(page);
  await page.goto('/');
  await waitForEditors(page);

  const setMode = async (mode) => {
    await page.locator(`.lang-toggle button:text-is("${mode}")`).click();
    await page.waitForTimeout(150);
  };

  // How the primary line looks when Indonesian is alone.
  await setMode('ID');
  const primary = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector('.hero__lead .bi__id'));
    return { fontSize: s.fontSize, fontStyle: s.fontStyle, color: s.color };
  });

  // English alone must match it - not stay small, dim and italic as it is when
  // it sits underneath the Indonesian.
  await setMode('EN');
  const alone = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector('.hero__lead .bi__en'));
    return { fontSize: s.fontSize, fontStyle: s.fontStyle, color: s.color };
  });

  expect(alone, 'EN-only still uses the secondary treatment').toEqual(primary);

  // And the gradient heading must still be painted, not filled flat.
  const heading = await page.evaluate(
    () => getComputedStyle(document.querySelector('.hero h2 .bi__en')).webkitTextFillColor,
  );
  expect(heading).toBe('rgba(0, 0, 0, 0)');

  // Both languages present again in the default mode.
  await setMode('ID + EN');
  await expect(page.locator('.hero__lead .bi__id')).toBeVisible();
  await expect(page.locator('.hero__lead .bi__en')).toBeVisible();
});
