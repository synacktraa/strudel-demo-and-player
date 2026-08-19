import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { contentTypeFor, resolveSafePath, createServer } from '../../server.mjs';

test('contentTypeFor covers every file type the notebook serves', () => {
  assert.match(contentTypeFor('index.html'), /^text\/html/);
  assert.match(contentTypeFor('app.js'), /javascript/);
  assert.match(contentTypeFor('styles.css'), /^text\/css/);
  assert.match(contentTypeFor('map.json'), /^application\/json/);
  assert.equal(contentTypeFor('kick.wav'), 'audio/wav');
  assert.equal(contentTypeFor('piano.mp3'), 'audio/mpeg');
  assert.equal(contentTypeFor('hat.ogg'), 'audio/ogg');
  assert.equal(contentTypeFor('icon.svg'), 'image/svg+xml');
  assert.equal(contentTypeFor('shot.flac'), 'audio/flac');
  assert.equal(contentTypeFor('unknown.xyz'), 'application/octet-stream');
});

test('resolveSafePath maps / to index.html', () => {
  const root = mkdtempSync(join(tmpdir(), 'srv-'));
  assert.equal(resolveSafePath(root, '/'), join(root, 'index.html'));
});

test('resolveSafePath rejects directory traversal', () => {
  const root = mkdtempSync(join(tmpdir(), 'srv-'));
  assert.equal(resolveSafePath(root, '/../../etc/passwd'), null);
  assert.equal(resolveSafePath(root, '/vendor/../../secret'), null);
  assert.equal(resolveSafePath(root, '/%2e%2e/%2e%2e/secret'), null);
});

test('resolveSafePath strips query strings and decodes percent-encoding', () => {
  const root = mkdtempSync(join(tmpdir(), 'srv-'));
  assert.equal(resolveSafePath(root, '/vendor/a.json?v=1'), join(root, 'vendor', 'a.json'));
  assert.equal(resolveSafePath(root, '/vendor/my%20kick.wav'), join(root, 'vendor', 'my kick.wav'));
});

test('server serves files from the project root and 404s the rest', async () => {
  const root = mkdtempSync(join(tmpdir(), 'srv-'));
  writeFileSync(join(root, 'index.html'), '<h1>hello</h1>');
  mkdirSync(join(root, 'vendor'), { recursive: true });
  writeFileSync(join(root, 'vendor', 'map.json'), '{"ok":true}');

  const server = createServer({ root });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const index = await fetch(`${base}/`);
    assert.equal(index.status, 200);
    assert.match(index.headers.get('content-type'), /text\/html/);
    assert.equal(await index.text(), '<h1>hello</h1>');

    const json = await fetch(`${base}/vendor/map.json`);
    assert.equal(json.status, 200);
    assert.deepEqual(await json.json(), { ok: true });

    const missing = await fetch(`${base}/nope.wav`);
    assert.equal(missing.status, 404);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('server sets the COOP/COEP-free headers Strudel needs and disables caching of html', async () => {
  const root = mkdtempSync(join(tmpdir(), 'srv-'));
  writeFileSync(join(root, 'index.html'), '<h1>hi</h1>');
  const server = createServer({ root });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const res = await fetch(`${base}/`);
    assert.match(res.headers.get('cache-control'), /no-cache|no-store/);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('vendored assets are cached hard, source files are not', async () => {
  // Each of the 8 editors runs Strudel's prebake(), refetching every sample map.
  // Without a long cache lifetime that is ~50 uncached requests on every load.
  // vendor/ only ever changes when setup re-runs, so it is safe to pin.
  const root = mkdtempSync(join(tmpdir(), 'srv-'));
  writeFileSync(join(root, 'index.html'), 'x');
  writeFileSync(join(root, 'app.js'), 'y');
  mkdirSync(join(root, 'vendor', 'samples'), { recursive: true });
  writeFileSync(join(root, 'vendor', 'samples', 'map.json'), '{}');

  const server = createServer({ root });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const vendored = await fetch(`${base}/vendor/samples/map.json`);
    assert.match(vendored.headers.get('cache-control'), /max-age=\d{5,}/);
    assert.match(vendored.headers.get('cache-control'), /immutable/);

    // Editing app.js or index.html during a workshop must take effect on reload.
    for (const path of ['/', '/app.js']) {
      const res = await fetch(`${base}${path}`);
      assert.match(res.headers.get('cache-control'), /no-cache/, `${path} must not be pinned`);
    }
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('server supports range requests so audio can stream', async () => {
  const root = mkdtempSync(join(tmpdir(), 'srv-'));
  writeFileSync(join(root, 'index.html'), 'x');
  writeFileSync(join(root, 'clip.wav'), 'ABCDEFGHIJ');
  const server = createServer({ root });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const res = await fetch(`${base}/clip.wav`, { headers: { Range: 'bytes=2-5' } });
    assert.equal(res.status, 206);
    assert.equal(await res.text(), 'CDEF');
    assert.equal(res.headers.get('content-range'), 'bytes 2-5/10');
  } finally {
    await new Promise((r) => server.close(r));
  }
});
