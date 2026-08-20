import test from 'node:test';
import assert from 'node:assert/strict';

import { HERO, HOW_TO, CELLS, WRAP_UP, NAV } from '../../app/ui/lessons.js';
import { UI, t, both } from '../../app/ui/text.js';

/**
 * The teaching team does not read Indonesian and the students may not read
 * English, so every visible string has to carry both. A half-translated
 * notebook is worse than an untranslated one: it leaves one audience guessing
 * at exactly the sentence that was meant to help them.
 */

/** [label, pair] for everything a reader sees. */
function allPairs() {
  const out = [];
  const add = (label, pair) => out.push([label, pair]);

  add('HERO.title', HERO.title);
  add('HERO.lead', HERO.lead);
  add('HERO.body', HERO.body);
  add('HOW_TO.title', HOW_TO.title);
  add('HOW_TO.note', HOW_TO.note);
  HOW_TO.items.forEach(([term, desc], i) => {
    add(`HOW_TO.items[${i}].term`, term);
    add(`HOW_TO.items[${i}].desc`, desc);
  });

  for (const cell of CELLS) {
    add(`${cell.id}.title`, cell.title);
    add(`${cell.id}.objective`, cell.objective);
    add(`${cell.id}.nav`, cell.nav);
    (cell.activities ?? []).forEach((a, i) => add(`${cell.id}.activities[${i}]`, a));
    (cell.tags ?? []).forEach((tag, i) => add(`${cell.id}.tags[${i}]`, tag));
  }

  add('WRAP_UP.title', WRAP_UP.title);
  WRAP_UP.items.forEach((item, i) => add(`WRAP_UP.items[${i}]`, item));
  for (const [key, pair] of Object.entries(UI)) add(`UI.${key}`, pair);
  for (const item of NAV) add(`NAV.${item.id}`, item.nav);

  return out;
}

test('every visible string carries both languages', () => {
  for (const [label, pair] of allPairs()) {
    assert.ok(pair && typeof pair === 'object', `${label} is not a translated pair`);
    assert.equal(typeof pair.id, 'string', `${label} has no Indonesian`);
    assert.equal(typeof pair.en, 'string', `${label} has no English`);
    assert.ok(pair.id.trim().length > 0, `${label} has empty Indonesian`);
    assert.ok(pair.en.trim().length > 0, `${label} has empty English`);
  }
});

test('nothing was left in English on the Indonesian side', () => {
  // Catches a pair built as t(english, english) - a real risk when translating
  // in bulk. Proper nouns and loanwords are legitimately identical.
  const SAME_IS_FINE = new Set(['mixing', 'Demo']);
  for (const [label, pair] of allPairs()) {
    if (SAME_IS_FINE.has(pair.en)) continue;
    assert.notEqual(
      pair.id,
      pair.en,
      `${label} is identical in both languages - was it actually translated?`,
    );
  }
});

test('code samples inside copy survive translation', () => {
  // The lessons name real Strudel functions. A translated <code> block that
  // renamed them would teach students something that does not run.
  for (const [label, pair] of allPairs()) {
    const codeOf = (s) => (s.match(/<code>(.*?)<\/code>/g) ?? []).join('|');
    assert.equal(
      codeOf(pair.id),
      codeOf(pair.en),
      `${label}: the code samples differ between languages`,
    );
  }
});

test('hint patterns and cell code are never translated', () => {
  // These are program text, not prose - they must stay plain strings.
  for (const cell of CELLS) {
    if (cell.hint !== undefined) assert.equal(typeof cell.hint, 'string', `${cell.id}.hint`);
    assert.equal(typeof cell.code, 'string', `${cell.id}.code`);
  }
});

test('both() renders a pair for plain-text attributes', () => {
  assert.equal(both(t('Putar', 'Play')), 'Putar / Play');
  assert.equal(both(null), '');
});
