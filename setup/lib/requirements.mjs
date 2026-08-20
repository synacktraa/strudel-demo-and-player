/**
 * What the notebook itself needs in order to make sound.
 *
 * Vendoring every GM soundfont variant would be gigabytes, so we ship one
 * variant per instrument by default and top that up with whatever the lesson
 * cells actually reference (e.g. the demo cell plays `gm_epiano1:1`, which is
 * variant index 1 and therefore needs two files).
 */

const SOUNDFONT_RE = /\bgm_[a-z0-9_]+(?::(\d+))?/gi;
const BANK_RE = /\bbank\s*\(\s*['"]([A-Za-z0-9_-]+)['"]\s*\)/g;

/**
 * @param {string} html
 * @returns {{ soundfonts: Map<string, number>, banks: Set<string> }}
 *   soundfonts maps instrument name -> number of variants needed (>= 1)
 */
export function extractSoundRequirements(html) {
  const soundfonts = new Map();
  const banks = new Set();

  for (const match of html.matchAll(SOUNDFONT_RE)) {
    const name = match[0].split(':')[0];
    const index = match[1] === undefined ? 0 : Number(match[1]);
    const needed = index + 1;
    soundfonts.set(name, Math.max(soundfonts.get(name) ?? 0, needed));
  }

  for (const match of html.matchAll(BANK_RE)) {
    banks.add(match[1]);
  }

  return { soundfonts, banks };
}

/**
 * Trim the full GM map down to the variants we intend to download.
 *
 * @param {Record<string, string[]>} gm  full instrument -> font file list
 * @param {{ defaultDepth: number, required: Map<string, number> }} options
 */
export function resolveGmVariants(gm, { defaultDepth = 1, required = new Map() } = {}) {
  const out = {};
  for (const [name, fonts] of Object.entries(gm)) {
    const depth = Math.max(defaultDepth, required.get(name) ?? 0);
    out[name] = fonts.slice(0, Math.min(depth, fonts.length));
  }
  return out;
}

/**
 * Read every file the notebook's sound requirements could hide in.
 *
 * This used to scan index.html alone, which broke silently the moment the
 * lesson content moved into app/ui/lessons.js: setup happily vendored zero
 * soundfonts and the demo cell would have been silent at the workshop. Scanning
 * the whole UI directory means content can move again without taking the
 * vendoring with it.
 */
export async function readNotebookSources(appDir) {
  const { readFile, readdir } = await import('node:fs/promises');
  const { join } = await import('node:path');

  const parts = [await readFile(join(appDir, 'index.html'), 'utf8')];
  let uiFiles = [];
  try {
    uiFiles = (await readdir(join(appDir, 'ui'))).filter((f) => f.endsWith('.js'));
  } catch {
    // No ui/ directory - plain-HTML notebook, index.html is the whole story.
  }
  for (const file of uiFiles) {
    parts.push(await readFile(join(appDir, 'ui', file), 'utf8'));
  }
  return parts.join('\n');
}
