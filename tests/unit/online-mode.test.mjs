import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createServer, toOnlineHtml, CDN_SOURCES } from '../../app/server.mjs';
import { STRUDEL_VERSION, UI_LIBS } from '../../setup/lib/manifest.mjs';

const SHIPPED_HTML = readFileSync(new URL('../../app/index.html', import.meta.url), 'utf8');

test('offline is the default: the shipped page references no remote host', () => {
  // The whole promise of this project. If this ever fails, a machine could
  // reach the workshop needing internet it will not have.
  assert.doesNotMatch(SHIPPED_HTML, /src\s*=\s*["']https?:/i);
  assert.match(SHIPPED_HTML, /vendor\/strudel\/index\.js/);
});

test('toOnlineHtml swaps every vendored script for its CDN equivalent', () => {
  const online = toOnlineHtml(SHIPPED_HTML);
  for (const [local, remote] of Object.entries(CDN_SOURCES)) {
    assert.ok(!online.includes(local), `${local} should have been replaced`);
    assert.ok(online.includes(remote), `${remote} should be present`);
  }
});

test('toOnlineHtml leaves first-party files local', () => {
  const online = toOnlineHtml(SHIPPED_HTML);
  // Our own source is always served from disk - only the libraries move.
  assert.match(online, /href="styles\.css"/);
  assert.match(online, /src="ui\/main\.js"/);
});

test('toOnlineHtml is a no-op on a page with nothing to swap', () => {
  const plain = '<h1>hello</h1>';
  assert.equal(toOnlineHtml(plain), plain);
});

test('CDN versions match what setup vendors', () => {
  // Two copies of the same version numbers, kept honest. If setup starts
  // vendoring React 19, online mode must not silently stay on 18.
  assert.ok(
    CDN_SOURCES['vendor/strudel/index.js'].includes(STRUDEL_VERSION),
    `online Strudel URL should pin ${STRUDEL_VERSION}`,
  );
  for (const lib of UI_LIBS) {
    const local = `vendor/ui-libs/${lib.file}`;
    assert.equal(CDN_SOURCES[local], lib.url, `${lib.file} URL differs between server and setup`);
  }
});

async function withServer(options, fn) {
  const server = createServer(options);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

test('the server serves local sources by default and CDN sources with mode=online', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mode-'));
  writeFileSync(
    join(root, 'index.html'),
    '<script src="vendor/strudel/index.js"></script><script src="ui/main.js"></script>',
  );

  await withServer({ root }, async (base) => {
    const body = await (await fetch(`${base}/`)).text();
    assert.match(body, /vendor\/strudel\/index\.js/, 'default must stay offline');
    assert.doesNotMatch(body, /unpkg\.com/);
  });

  await withServer({ root, mode: 'online' }, async (base) => {
    const body = await (await fetch(`${base}/`)).text();
    assert.match(body, /unpkg\.com/);
    assert.doesNotMatch(body, /vendor\/strudel\/index\.js/);
    assert.match(body, /ui\/main\.js/, 'first-party source stays local in online mode');
  });
});

test('online mode rewrites only HTML, never other assets', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mode-'));
  writeFileSync(join(root, 'index.html'), '<script src="vendor/strudel/index.js"></script>');
  // A JS file that happens to mention the same path must be served byte-for-byte.
  writeFileSync(join(root, 'note.js'), '// see vendor/strudel/index.js for details');

  await withServer({ root, mode: 'online' }, async (base) => {
    const js = await (await fetch(`${base}/note.js`)).text();
    assert.equal(js, '// see vendor/strudel/index.js for details');
  });
});
