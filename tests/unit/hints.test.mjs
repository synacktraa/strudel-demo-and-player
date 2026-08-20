import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { CELLS } from '../../app/ui/lessons.js';

/**
 * The README's starter patterns and the in-app Hint buttons are the same
 * strings written in two places, and they have already drifted apart once -
 * the README picked up condensed one-liners for cells 5 and 6 while the app
 * kept the originals. A teacher reading one and a student seeing the other is
 * exactly the confusion this suite exists to prevent.
 */

const README = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');

/** The ```js blocks under the "1 · Rhythm" style headings, in order. */
function readmeStarters() {
  const section = README.slice(README.indexOf('Each cell has a **Hint** button'));
  const end = section.indexOf('Every sound named above');
  const blocks = [...section.slice(0, end).matchAll(/```js\n([\s\S]*?)```/g)];
  return blocks.map((m) => m[1].trim());
}

const lessonCells = CELLS.filter((c) => c.lesson);

test('every lesson cell has a hint', () => {
  assert.equal(lessonCells.length, 6, 'expected six lesson cells');
  for (const cell of lessonCells) {
    assert.ok(cell.hint && cell.hint.trim(), `${cell.id} has no hint`);
  }
});

test('the README starter patterns match the in-app hints exactly', () => {
  const fromReadme = readmeStarters();
  const fromApp = lessonCells.map((c) => c.hint.trim());

  assert.equal(
    fromReadme.length,
    fromApp.length,
    `README lists ${fromReadme.length} starters but the app has ${fromApp.length} hints`,
  );

  for (let i = 0; i < fromApp.length; i++) {
    assert.equal(
      fromReadme[i],
      fromApp[i],
      `starter for lesson ${i + 1} differs between README and lessons.js`,
    );
  }
});

test('hints only use sounds the notebook vendors', () => {
  // Guards against a hint that would print "sound not found" in front of the
  // class. These are the banks and synths the recommended profile ships.
  const known = /^(bd|sd|hh|oh|cp|rim|mt|lt|ht|cr|rd|cb|sh|tb|brk|misc|piano|sawtooth|triangle|sine|square|gm_[a-z0-9_]+)$/;
  for (const cell of CELLS) {
    if (!cell.hint) continue;
    const sounds = [
      ...cell.hint.matchAll(/\bs\(\s*"([^"]+)"/g),
      ...cell.hint.matchAll(/\.sound\(\s*"([^"]+)"/g),
    ];
    for (const match of sounds) {
      for (const token of match[1].split(/[\s[\]<>,]+/).filter(Boolean)) {
        const name = token.replace(/[*!@/].*$/, '').replace(/:\d+$/, '');
        if (!name || name === '~') continue;
        assert.match(name, known, `${cell.id} hint uses unknown sound "${name}"`);
      }
    }
  }
});
