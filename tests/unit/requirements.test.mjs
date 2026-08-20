import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { extractSoundRequirements, resolveGmVariants } from '../../setup/lib/requirements.mjs';

test('extractSoundRequirements finds soundfont names used in the notebook', () => {
  const html = `<strudel-editor><!-- note("c e g").s("gm_acoustic_bass") --></strudel-editor>`;
  const req = extractSoundRequirements(html);
  assert.equal(req.soundfonts.get('gm_acoustic_bass'), 1);
});

test('extractSoundRequirements records the highest sample index used per soundfont', () => {
  const html = `s("gm_epiano1:1") and s("gm_epiano1:4") and s("gm_epiano1")`;
  const req = extractSoundRequirements(html);
  // index 4 means we need variants 0..4 => 5 files
  assert.equal(req.soundfonts.get('gm_epiano1'), 5);
});

test('extractSoundRequirements finds drum-machine banks used via bank()', () => {
  const html = `stack(s("bd sd")).bank('crate')\n.bank("RolandTR909")`;
  const req = extractSoundRequirements(html);
  assert.ok(req.banks.has('crate'));
  assert.ok(req.banks.has('RolandTR909'));
});

test('extractSoundRequirements only reads code cells, not prose', () => {
  // Lesson prose mentions instruments in <code> tags; those are suggestions students
  // may type, so they must be picked up too - but plain prose words must not be.
  const html = `<p>Replace <code>gm_acoustic_guitar_nylon</code> with something else</p>
                <p>a sentence about crate digging</p>`;
  const req = extractSoundRequirements(html);
  assert.ok(req.soundfonts.has('gm_acoustic_guitar_nylon'));
  assert.ok(!req.banks.has('crate'));
});

test('the shipped notebook resolves to a non-empty requirement set', () => {
  const html = readFileSync(new URL('../../app/index.html', import.meta.url), 'utf8');
  const req = extractSoundRequirements(html);
  assert.ok(req.soundfonts.has('gm_epiano1'), 'demo cell uses gm_epiano1');
  assert.equal(req.soundfonts.get('gm_epiano1'), 2, 'demo cell uses gm_epiano1:1 => needs 2 variants');
  assert.ok(req.soundfonts.has('gm_acoustic_bass'), 'demo cell uses gm_acoustic_bass');
  assert.ok(req.banks.has('crate'), 'demo cell uses .bank("crate")');
});

test('resolveGmVariants takes the default depth but honours notebook requirements', () => {
  const gm = {
    gm_piano: ['a', 'b', 'c', 'd'],
    gm_epiano1: ['e', 'f', 'g', 'h'],
  };
  const required = new Map([['gm_epiano1', 3]]);
  const out = resolveGmVariants(gm, { defaultDepth: 1, required });
  assert.deepEqual(out.gm_piano, ['a']);
  assert.deepEqual(out.gm_epiano1, ['e', 'f', 'g']);
});

test('resolveGmVariants never asks for more variants than exist', () => {
  const gm = { gm_piano: ['a'] };
  const out = resolveGmVariants(gm, { defaultDepth: 3, required: new Map([['gm_piano', 9]]) });
  assert.deepEqual(out.gm_piano, ['a']);
});

test('resolveGmVariants ignores requirements for unknown instruments', () => {
  const gm = { gm_piano: ['a', 'b'] };
  const out = resolveGmVariants(gm, { defaultDepth: 1, required: new Map([['gm_not_real', 2]]) });
  assert.deepEqual(Object.keys(out), ['gm_piano']);
});
