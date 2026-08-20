/**
 * What gets vendored, and how much of it.
 *
 * `prebake()` inside the Strudel bundle unconditionally fetches all six sample
 * maps and rejects if any 404s - so every map must exist locally even when we
 * choose not to ship its audio. Sets with `audio: false` get an empty-but-valid
 * map written instead, which registers no banks and breaks nothing.
 */

export const STRUDEL_VERSION = '1.3.0';

/** Popular drum machines kept in the `lean` profile. */
const LEAN_DRUM_MACHINES = [
  'RolandTR808',
  'RolandTR909',
  'RolandTR707',
  'RolandTR606',
  'LinnDrum',
  'AkaiLinn',
  'AlesisHR16',
  'BossDR55',
  'CasioRZ1',
  'EmuDrumulator',
  'KorgMinipops',
  'OberheimDMX',
  'SequentialCircuitsDrumTraks',
  'SimmonsSDS5',
  'ViscoSpaceDrum',
  'crate',
  'RhythmAce',
  'MFB512',
  'Yamaha',
  'Soundmaster',
];

/**
 * Sample sets, in the order prebake() requests them.
 * `id` is the on-disk folder under vendor/samples/audio/.
 */
export const SAMPLE_SETS = [
  {
    id: 'uzu-drumkit',
    url: 'https://raw.githubusercontent.com/tidalcycles/uzu-drumkit/main/strudel.json',
    mapDir: 'uzu-drumkit',
    mapFile: 'strudel.json',
    // The default kit - bd, sd, hh, oh, rim, cp... nothing works without it.
    profiles: { lean: 'all', recommended: 'all', generous: 'all', full: 'all' },
  },
  {
    id: 'Dirt-Samples',
    url: 'https://raw.githubusercontent.com/felixroos/dough-samples/main/Dirt-Samples.json',
    mapDir: 'dough-samples',
    mapFile: 'Dirt-Samples.json',
    profiles: { lean: 'all', recommended: 'all', generous: 'all', full: 'all' },
  },
  {
    id: 'piano',
    url: 'https://raw.githubusercontent.com/felixroos/dough-samples/main/piano.json',
    mapDir: 'dough-samples',
    mapFile: 'piano.json',
    profiles: { lean: 'all', recommended: 'all', generous: 'all', full: 'all' },
  },
  {
    id: 'tidal-drum-machines',
    url: 'https://raw.githubusercontent.com/felixroos/dough-samples/main/tidal-drum-machines.json',
    mapDir: 'dough-samples',
    mapFile: 'tidal-drum-machines.json',
    profiles: {
      lean: LEAN_DRUM_MACHINES,
      recommended: 'all',
      generous: 'all',
      full: 'all',
    },
  },
  {
    id: 'mridangam',
    url: 'https://raw.githubusercontent.com/felixroos/dough-samples/main/mridangam.json',
    mapDir: 'dough-samples',
    mapFile: 'mridangam.json',
    profiles: { lean: 'none', recommended: 'none', generous: 'all', full: 'all' },
  },
  {
    id: 'vcsl',
    url: 'https://raw.githubusercontent.com/felixroos/dough-samples/main/vcsl.json',
    mapDir: 'dough-samples',
    mapFile: 'vcsl.json',
    // ~2 GB of orchestral multisamples. Only in `full`.
    profiles: { lean: 'none', recommended: 'none', generous: 'none', full: 'all' },
  },
];

/** Bank-alias table, loaded by prebake via aliasBank(). Tiny, always included. */
export const ALIAS_MAP = {
  url: 'https://raw.githubusercontent.com/todepond/samples/main/tidal-drum-machines-alias.json',
  mapDir: 'todepond',
  mapFile: 'tidal-drum-machines-alias.json',
};

/**
 * Libraries the notebook UI is built on.
 *
 * React 18 rather than 19 because 19 dropped the UMD builds, and UMD is what
 * lets us run React with no bundler and no build step - important when the
 * workshop machines have neither internet nor node_modules.
 *
 * `htm` gives JSX-like syntax through tagged templates, so components read
 * normally without a compile step. All three are required: unlike hydra, the
 * page does not render without them.
 */
export const UI_LIBS = [
  { file: 'react.js', url: 'https://unpkg.com/react@18.3.1/umd/react.production.min.js' },
  { file: 'react-dom.js', url: 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js' },
  { file: 'htm.js', url: 'https://unpkg.com/htm@3.1.1/dist/htm.umd.js' },
];

export const PROFILES = {
  lean: { gmDepth: 0, label: 'lean (~25 MB)' },
  recommended: { gmDepth: 1, label: 'recommended (~110 MB)' },
  generous: { gmDepth: 3, label: 'generous (~290 MB)' },
  full: { gmDepth: 3, label: 'full (~2.3 GB)' },
};

export const DEFAULT_PROFILE = 'recommended';

/**
 * Which banks of a set to vendor under a profile.
 * @returns {'all' | null | string[]} 'all' = every bank, null = map only, no audio
 */
export function banksForProfile(set, profile, extraBanks = new Set()) {
  const rule = set.profiles[profile];
  if (rule === 'all') return 'all';
  if (rule === 'none') {
    // Even a skipped set contributes banks the notebook explicitly asks for.
    const wanted = [...extraBanks];
    return wanted.length ? wanted : null;
  }
  return [...new Set([...rule, ...extraBanks])];
}
