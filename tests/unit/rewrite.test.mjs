import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REMOTE_BASES,
  patchStrudelBundle,
  rewriteSampleMap,
  collectSampleFiles,
  pruneBanks,
} from '../../setup/lib/rewrite.mjs';

test('REMOTE_BASES covers every remote host the Strudel bundle talks to', () => {
  const remotes = REMOTE_BASES.map((r) => r.remote);
  assert.ok(remotes.includes('https://raw.githubusercontent.com/felixroos/dough-samples/main'));
  assert.ok(remotes.includes('https://raw.githubusercontent.com/tidalcycles/uzu-drumkit/main'));
  assert.ok(remotes.includes('https://raw.githubusercontent.com/todepond/samples/main'));
  assert.ok(remotes.includes('https://felixroos.github.io/webaudiofontdata/sound'));
  assert.ok(remotes.includes('https://unpkg.com/hydra-synth'));
  for (const { local } of REMOTE_BASES) {
    assert.ok(local.startsWith('/vendor/'), `${local} must be a root-relative vendor path`);
  }
});

test('patchStrudelBundle rewrites every remote base to a local vendor path', () => {
  const source = REMOTE_BASES.map((r, i) => `const u${i}="${r.remote}";`).join('');
  const { code, replacements } = patchStrudelBundle(source);

  assert.equal(replacements.length, REMOTE_BASES.length);
  for (const { remote, local } of REMOTE_BASES) {
    assert.ok(!code.includes(remote), `bundle still references ${remote}`);
    assert.ok(code.includes(local), `bundle is missing local path ${local}`);
  }
});

test('patchStrudelBundle throws when an expected remote base is absent', () => {
  // Guards against a future @strudel/repl release moving its URLs: we must fail
  // loudly at setup time rather than ship a bundle that silently phones home.
  const partial = `const u="${REMOTE_BASES[0].remote}";`;
  assert.throws(() => patchStrudelBundle(partial), /not found in bundle/i);
});

test('patchStrudelBundle leaves no https reference to a known remote asset host', () => {
  const source = REMOTE_BASES.map((r) => `"${r.remote}/thing.json"`).join(',');
  const { code } = patchStrudelBundle(source);
  assert.ok(!/raw\.githubusercontent\.com/.test(code));
  assert.ok(!/felixroos\.github\.io/.test(code));
  assert.ok(!/unpkg\.com/.test(code));
});

test('rewriteSampleMap points _base at the local audio directory', () => {
  const map = {
    _base: 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/',
    casio: ['casio/high.wav'],
  };
  const out = rewriteSampleMap(map, '/vendor/samples/audio/Dirt-Samples/');
  assert.equal(out._base, '/vendor/samples/audio/Dirt-Samples/');
  assert.deepEqual(out.casio, ['casio/high.wav']);
  assert.equal(map._base, 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/', 'must not mutate input');
});

test('collectSampleFiles finds files in arrays, note-keyed objects and bare strings', () => {
  const map = {
    _base: 'https://example.com/',
    casio: ['casio/high.wav', 'casio/low.wav'],
    piano: { A0: 'A0v8.mp3', C1: 'C1v8.mp3' },
    single: 'one/shot.wav',
  };
  const files = collectSampleFiles(map);
  assert.deepEqual(
    files.sort(),
    ['A0v8.mp3', 'C1v8.mp3', 'casio/high.wav', 'casio/low.wav', 'one/shot.wav'].sort(),
  );
});

test('collectSampleFiles ignores underscore-prefixed metadata keys', () => {
  const files = collectSampleFiles({ _base: 'https://x/', _meta: ['not/a/sample.wav'], bd: ['bd/1.wav'] });
  assert.deepEqual(files, ['bd/1.wav']);
});

test('pruneBanks keeps only requested banks and always preserves metadata keys', () => {
  const map = { _base: 'https://x/', bd: ['bd/1.wav'], sd: ['sd/1.wav'], hh: ['hh/1.wav'] };
  const out = pruneBanks(map, ['bd', 'hh']);
  assert.deepEqual(Object.keys(out).sort(), ['_base', 'bd', 'hh']);
});

test('pruneBanks with a null bank list is a pass-through', () => {
  const map = { _base: 'https://x/', bd: ['bd/1.wav'], sd: ['sd/1.wav'] };
  assert.deepEqual(pruneBanks(map, null), map);
});
