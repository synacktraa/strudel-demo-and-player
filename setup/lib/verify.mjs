/**
 * Preflight checks that answer one question: will this machine make sound with
 * the network unplugged?
 *
 * Every check here maps to something that actually broke, or would break, at
 * the workshop - a missing map that makes prebake() reject and takes the whole
 * editor down with it, a bundle still pointing at GitHub, a missing worklet.
 */
import { readFile, stat, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { REMOTE_BASES } from './rewrite.mjs';

/** Sample maps prebake() fetches unconditionally - any 404 rejects the whole load. */
const REQUIRED_MAPS = [
  ['dough-samples', 'tidal-drum-machines.json'],
  ['dough-samples', 'piano.json'],
  ['dough-samples', 'Dirt-Samples.json'],
  ['dough-samples', 'vcsl.json'],
  ['dough-samples', 'mridangam.json'],
  ['uzu-drumkit', 'strudel.json'],
  ['todepond', 'tidal-drum-machines-alias.json'],
];

/**
 * The bundle also contains remote URLs we deliberately leave alone:
 *   - JSDoc examples shown in the built-in reference panel (inert text)
 *   - the `samples('github:user/repo')` helper, a template literal that only
 *     fires if a student explicitly calls it
 * Neither is fetched on load, so we assert on the exact prebake base URLs
 * instead of on bare hostnames. The offline E2E test is what proves the
 * stronger claim that nothing at all leaves the machine.
 */
const REMOTE_BASE_URLS = REMOTE_BASES.map((r) => r.remote);

async function fileSize(path) {
  try {
    return (await stat(path)).size;
  } catch {
    return -1;
  }
}

export async function checkVendor(vendorDir) {
  const checks = [];
  const add = (name, ok, detail = '') => checks.push({ name, ok, detail });

  // 1. Has setup run at all?
  let manifest = null;
  try {
    manifest = JSON.parse(await readFile(join(vendorDir, 'manifest.json'), 'utf8'));
    add('vendor manifest', true, `profile "${manifest.profile}", strudel ${manifest.strudelVersion}`);
  } catch {
    add('vendor manifest', false, 'vendor/manifest.json missing - run `npm run setup` (needs internet)');
    return { ok: false, checks, manifest: null };
  }

  // 2. The Strudel bundle itself.
  const bundlePath = join(vendorDir, 'strudel', 'index.js');
  const bundleSize = await fileSize(bundlePath);
  add('strudel bundle', bundleSize > 500_000, bundleSize < 0 ? 'missing' : `${(bundleSize / 1048576).toFixed(1)} MB`);

  // 3. No remote host may survive in the bundle - this is the offline guarantee.
  if (bundleSize > 0) {
    const code = await readFile(bundlePath, 'utf8');
    const offenders = REMOTE_BASE_URLS.filter((url) => code.includes(url));
    add(
      'no remote asset URLs in bundle',
      offenders.length === 0,
      offenders.length
        ? `still references ${offenders.map((u) => new URL(u).host).join(', ')}`
        : `${REMOTE_BASE_URLS.length} base URLs redirected to /vendor/`,
    );
  }

  // 4. AudioWorklet chunk - without it the scheduler never starts.
  const worklets = manifest.worklets ?? [];
  const missingWorklets = [];
  for (const name of worklets) {
    if ((await fileSize(join(vendorDir, 'strudel', 'assets', name))) <= 0) missingWorklets.push(name);
  }
  add(
    'audio worklet',
    worklets.length > 0 && missingWorklets.length === 0,
    missingWorklets.length ? `missing ${missingWorklets.join(', ')}` : `${worklets.length} present`,
  );

  // 5. React and htm - the shell does not render without them.
  const uiLibs = manifest.uiLibs ?? [];
  const missingLibs = [];
  for (const name of uiLibs) {
    if ((await fileSize(join(vendorDir, 'ui-libs', name))) <= 0) missingLibs.push(name);
  }
  add(
    'ui libraries',
    uiLibs.length > 0 && missingLibs.length === 0,
    uiLibs.length === 0
      ? 'manifest lists none - re-run `npm run setup`'
      : missingLibs.length
        ? `missing ${missingLibs.join(', ')}`
        : uiLibs.join(', '),
  );

  // 6. Every map prebake() asks for.
  const missingMaps = [];
  for (const [dir, file] of REQUIRED_MAPS) {
    if ((await fileSize(join(vendorDir, 'samples', 'maps', dir, file))) <= 0) missingMaps.push(`${dir}/${file}`);
  }
  add(
    'sample maps',
    missingMaps.length === 0,
    missingMaps.length ? `missing ${missingMaps.join(', ')}` : `${REQUIRED_MAPS.length} present`,
  );

  // 7. Audio actually on disk, and reachable from each map's _base.
  const audioReport = await checkAudioPresence(vendorDir);
  add('sample audio', audioReport.ok, audioReport.detail);

  // 8. Soundfonts.
  const fontCount = await countFiles(join(vendorDir, 'soundfonts'));
  add('soundfonts', fontCount > 0, `${fontCount} GM font file(s)`);

  // 9. Anything that failed during the last vendoring run.
  const failures = manifest.stats?.failures ?? 0;
  add('last setup run', failures === 0, failures ? `${failures} download(s) failed - re-run \`npm run setup\`` : 'clean');

  return { ok: checks.every((c) => c.ok), checks, manifest };
}

async function countFiles(dir) {
  try {
    return (await readdir(dir)).length;
  } catch {
    return 0;
  }
}

/**
 * Spot-check that each map's declared samples exist on disk. Checks the first
 * file of every bank rather than all ~2600, so it stays fast enough to run on
 * every launch.
 */
async function checkAudioPresence(vendorDir) {
  const mapsDir = join(vendorDir, 'samples', 'maps');
  let checked = 0;
  const missing = [];

  for (const [dir, file] of REQUIRED_MAPS) {
    let map;
    try {
      map = JSON.parse(await readFile(join(mapsDir, dir, file), 'utf8'));
    } catch {
      continue;
    }
    const base = map._base;
    if (!base || !base.startsWith('/vendor/')) continue;

    for (const [bank, value] of Object.entries(map)) {
      if (bank.startsWith('_')) continue;
      const first = firstString(value);
      if (!first) continue;
      checked++;
      const onDisk = join(vendorDir, '..', ...base.split('/').filter(Boolean), ...first.split('/'));
      if ((await fileSize(onDisk)) <= 0) missing.push(`${dir}/${file}:${bank}`);
      if (missing.length > 5) break;
    }
  }

  if (checked === 0) return { ok: false, detail: 'no banks registered - nothing will make a sound' };
  if (missing.length) return { ok: false, detail: `${missing.length}+ bank(s) missing audio, e.g. ${missing[0]}` };
  return { ok: true, detail: `${checked} bank(s) spot-checked, all present` };
}

function firstString(node) {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = firstString(item);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === 'object') return firstString(Object.values(node));
  return null;
}

/**
 * Catch remote sub-resources in the page. Only things the browser *loads*
 * count: <a href> to strudel.cc merely fails to open, it does not break
 * the notebook.
 */
export function checkPageHasNoRemoteRefs(html) {
  const offenders = [];
  const patterns = [
    /<script[^>]+src\s*=\s*["'](https?:)?\/\/[^"']+["']/gi,
    /<link[^>]+href\s*=\s*["'](https?:)?\/\/[^"']+["']/gi,
    /<img[^>]+src\s*=\s*["'](https?:)?\/\/[^"']+["']/gi,
    /<iframe[^>]+src\s*=\s*["'](https?:)?\/\/[^"']+["']/gi,
    /@import\s+url\(\s*["']?(https?:)?\/\//gi,
  ];
  for (const re of patterns) {
    for (const match of html.matchAll(re)) offenders.push(match[0].slice(0, 120));
  }
  return { ok: offenders.length === 0, offenders };
}
