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
