import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { HERO, HOW_TO, CELLS, WRAP_UP } from '../../app/ui/lessons.js';

/**
 * The page must not tell the reader where it is running.
 *
 * It used to say "running entirely on this machine" and "No internet needed",
 * which is simply false under `npm run app:online` - and is not information a
 * student needs in either mode. Where the bytes come from is an operator
 * concern; it belongs in the README and the server banner, not the notebook.
 */

const UI_DIR = fileURLToPath(new URL('../../app/ui', import.meta.url));

/** Phrases that assert something about where the code runs. */
const LOCALITY_CLAIMS = [
  /\bon this machine\b/i,
  /\bno internet\b/i,
  /\binternet (is )?not (needed|required)\b/i,
  /\bwithout (an? )?internet\b/i,
  /\bruns? (entirely )?(locally|offline)\b/i,
  /\bfully offline\b/i,
  /\bworks offline\b/i,
];

/** Every string a student can actually read, gathered from the content data. */
function visibleCopy() {
  const out = [];
  out.push(HERO.title, HERO.lead, HERO.body);
  out.push(HOW_TO.title, HOW_TO.note, ...HOW_TO.items.flat());
  for (const cell of CELLS) {
    out.push(cell.title, cell.objective, ...(cell.activities ?? []), ...(cell.tags ?? []));
  }
  out.push(WRAP_UP.title, ...WRAP_UP.items);
  return out.filter(Boolean);
}

test('lesson content makes no claim about where the notebook runs', () => {
  for (const text of visibleCopy()) {
    for (const claim of LOCALITY_CLAIMS) {
      assert.doesNotMatch(text, claim, `visible copy asserts where it runs: "${text}"`);
    }
  }
});

test('component markup makes no claim about where the notebook runs', () => {
  // Catches copy written straight into JSX, like the old header subtitle.
  for (const file of readdirSync(UI_DIR).filter((f) => f.endsWith('.js'))) {
    const source = readFileSync(join(UI_DIR, file), 'utf8');
    // Strip block comments: the rationale for the no-build/offline design is
    // documented in the source and should stay there.
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const claim of LOCALITY_CLAIMS) {
      assert.doesNotMatch(withoutComments, claim, `${file} contains a locality claim in its markup`);
    }
  }
});
