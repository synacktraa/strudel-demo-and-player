/**
 * Turning the Strudel REPL bundle into an offline asset.
 *
 * The published `@strudel/repl` bundle hardcodes a handful of remote base URLs
 * (sample maps, GM soundfonts, hydra). Each appears exactly once as a plain
 * string literal, so a literal replace is enough to redirect them at a local
 * copy - no rebuild of Strudel required.
 */

export const REMOTE_BASES = [
  {
    remote: 'https://raw.githubusercontent.com/felixroos/dough-samples/main',
    local: '/vendor/samples/maps/dough-samples',
  },
  {
    remote: 'https://raw.githubusercontent.com/tidalcycles/uzu-drumkit/main',
    local: '/vendor/samples/maps/uzu-drumkit',
  },
  {
    remote: 'https://raw.githubusercontent.com/todepond/samples/main',
    local: '/vendor/samples/maps/todepond',
  },
  {
    remote: 'https://felixroos.github.io/webaudiofontdata/sound',
    local: '/vendor/soundfonts',
  },
  {
    remote: 'https://unpkg.com/hydra-synth',
    local: '/vendor/hydra/hydra-synth.js',
  },
];

/**
 * Replace every known remote base with its local counterpart.
 * Throws if any expected URL is missing, so a future Strudel release that moves
 * its URLs fails setup loudly instead of shipping a bundle that phones home.
 */
export function patchStrudelBundle(source) {
  let code = source;
  const replacements = [];

  for (const { remote, local } of REMOTE_BASES) {
    const occurrences = code.split(remote).length - 1;
    if (occurrences === 0) {
      throw new Error(
        `Remote base "${remote}" not found in bundle. ` +
          `The @strudel/repl bundle layout changed - update REMOTE_BASES in scripts/lib/rewrite.mjs.`,
      );
    }
    code = code.split(remote).join(local);
    replacements.push({ remote, local, occurrences });
  }

  return { code, replacements };
}

/** Return a copy of a sample map whose `_base` points at the local audio directory. */
export function rewriteSampleMap(map, localBase) {
  return { ...map, _base: localBase };
}

/** Every sample file path referenced by a map, relative to its `_base`. */
export function collectSampleFiles(map) {
  const files = [];
  const walk = (node) => {
    if (typeof node === 'string') {
      files.push(node);
    } else if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === 'object') {
      Object.values(node).forEach(walk);
    }
  };

  for (const [key, value] of Object.entries(map)) {
    if (key.startsWith('_')) continue;
    walk(value);
  }
  return files;
}

/** Keep only the named banks. A null/undefined list keeps everything. */
export function pruneBanks(map, banks) {
  if (!banks) return map;
  const keep = new Set(banks);
  const out = {};
  for (const [key, value] of Object.entries(map)) {
    if (key.startsWith('_') || keep.has(key)) out[key] = value;
  }
  return out;
}
