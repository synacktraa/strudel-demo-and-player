#!/usr/bin/env node
/**
 * Download every remote asset the notebook needs into ./vendor, and patch the
 * Strudel bundle so it loads them from there.
 *
 * Run once, on a machine with internet. After this, `npm start` works with the
 * network cable pulled.
 *
 *   node scripts/vendor.mjs [--profile=lean|recommended|generous|full] [--force]
 */
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { patchStrudelBundle, rewriteSampleMap, collectSampleFiles, pruneBanks } from './lib/rewrite.mjs';
import { extractSoundRequirements, resolveGmVariants } from './lib/requirements.mjs';
import {
  STRUDEL_VERSION,
  SAMPLE_SETS,
  ALIAS_MAP,
  PROFILES,
  DEFAULT_PROFILE,
  banksForProfile,
} from './lib/manifest.mjs';
import {
  fetchBuffer,
  fetchText,
  fetchJson,
  downloadAll,
  makeProgressReporter,
  formatBytes,
} from './lib/download.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'app');
const VENDOR = join(APP, 'vendor');

const args = process.argv.slice(2);
const profileArg = args.find((a) => a.startsWith('--profile='))?.split('=')[1] ?? DEFAULT_PROFILE;
const force = args.includes('--force');

if (!PROFILES[profileArg]) {
  console.error(`Unknown profile "${profileArg}". Choose one of: ${Object.keys(PROFILES).join(', ')}`);
  process.exit(1);
}

const profile = profileArg;
const progress = makeProgressReporter();
const totals = { downloaded: 0, skipped: 0, bytes: 0, failures: [] };

function merge(result) {
  totals.downloaded += result.downloaded;
  totals.skipped += result.skipped;
  totals.bytes += result.bytes;
  totals.failures.push(...result.failures);
}

/** GitHub raw needs each path segment encoded; spaces and '#' show up in sample names. */
function encodePath(relativePath) {
  return relativePath.split('/').map(encodeURIComponent).join('/');
}

// ---------------------------------------------------------------- Strudel ---

async function vendorStrudel() {
  const dest = join(VENDOR, 'strudel');
  await mkdir(join(dest, 'assets'), { recursive: true });

  const base = `https://unpkg.com/@strudel/repl@${STRUDEL_VERSION}`;
  const raw = await fetchText(`${base}/dist/index.js`);

  const { code, replacements } = patchStrudelBundle(raw);
  await writeFile(join(dest, 'index.js'), code, 'utf8');

  // The AudioWorklet chunk is resolved relative to the script that loads it.
  const workletNames = [...raw.matchAll(/assets\/(clockworker-[A-Za-z0-9_-]+\.js)/g)].map((m) => m[1]);
  const uniqueWorklets = [...new Set(workletNames)];
  if (uniqueWorklets.length === 0) {
    throw new Error('No clockworker asset referenced by the Strudel bundle - layout changed.');
  }
  for (const name of uniqueWorklets) {
    const buf = await fetchBuffer(`${base}/dist/assets/${name}`);
    await writeFile(join(dest, 'assets', name), buf);
  }

  console.log(
    `  strudel@${STRUDEL_VERSION}          ${replacements.length} remote URLs redirected, ${uniqueWorklets.length} worklet(s)`,
  );
  return { replacements, worklets: uniqueWorklets };
}

async function vendorHydra() {
  // Optional: only used if a student calls initHydra(). Small enough to include.
  const dest = join(VENDOR, 'hydra');
  await mkdir(dest, { recursive: true });
  try {
    const buf = await fetchBuffer('https://unpkg.com/hydra-synth');
    await writeFile(join(dest, 'hydra-synth.js'), buf);
    console.log(`  hydra-synth             ${formatBytes(buf.length)}`);
    return true;
  } catch (err) {
    console.log(`  hydra-synth             skipped (${err.message})`);
    return false;
  }
}

// ---------------------------------------------------------------- samples ---

async function vendorSamples(notebookBanks) {
  const summary = [];

  for (const set of SAMPLE_SETS) {
    const map = await fetchJson(set.url);
    const remoteBase = map._base;
    const wantedBanks = banksForProfile(set, profile, notebookBanks);

    const pruned = wantedBanks === 'all' ? map : pruneBanks(map, wantedBanks ?? []);
    const localBase = `/vendor/samples/audio/${set.id}/`;
    const finalMap = rewriteSampleMap(pruned, localBase);

    const mapPath = join(VENDOR, 'samples', 'maps', set.mapDir, set.mapFile);
    await mkdir(dirname(mapPath), { recursive: true });
    await writeFile(mapPath, JSON.stringify(finalMap, null, 2), 'utf8');

    const files = collectSampleFiles(finalMap);
    const jobs = files.map((rel) => ({
      url: remoteBase + encodePath(rel),
      path: join(VENDOR, 'samples', 'audio', set.id, ...rel.split('/')),
    }));

    const bankCount = Object.keys(finalMap).filter((k) => !k.startsWith('_')).length;

    if (jobs.length === 0) {
      console.log(`  ${set.id.padEnd(22)} map only (no audio in "${profile}" profile)`);
      summary.push({ set: set.id, banks: 0, files: 0 });
      continue;
    }

    const result = await downloadAll(jobs, { onProgress: progress, label: set.id });
    merge(result);
    summary.push({ set: set.id, banks: bankCount, files: jobs.length });
  }

  // Bank alias table (aliasBank) - tiny, and prebake calls it unconditionally.
  const aliasPath = join(VENDOR, 'samples', 'maps', ALIAS_MAP.mapDir, ALIAS_MAP.mapFile);
  await mkdir(dirname(aliasPath), { recursive: true });
  await writeFile(aliasPath, await fetchText(ALIAS_MAP.url), 'utf8');

  return summary;
}

// ------------------------------------------------------------- soundfonts ---

async function vendorSoundfonts(required) {
  const depth = PROFILES[profile].gmDepth;
  const dest = join(VENDOR, 'soundfonts');
  await mkdir(dest, { recursive: true });

  // gm.mjs is a plain ES module exporting instrument -> [font file] - import it directly.
  const gmSource = await fetchText(`https://unpkg.com/@strudel/soundfonts@${STRUDEL_VERSION}/gm.mjs`);
  const gmPath = join(VENDOR, '.gm.tmp.mjs');
  await writeFile(gmPath, gmSource, 'utf8');
  const gm = (await import(`${pathToFileURL(gmPath).href}?v=${Date.now()}`)).default;
  await rm(gmPath, { force: true });

  const selected = resolveGmVariants(gm, { defaultDepth: depth, required });
  const fonts = [...new Set(Object.values(selected).flat())].filter(Boolean);

  const jobs = fonts.map((name) => ({
    url: `https://felixroos.github.io/webaudiofontdata/sound/${name}.js`,
    path: join(dest, `${name}.js`),
  }));

  if (jobs.length === 0) {
    console.log('  soundfonts             none requested by this profile');
    return { instruments: 0, fonts: 0 };
  }

  const result = await downloadAll(jobs, { onProgress: progress, label: 'soundfonts' });
  merge(result);
  return { instruments: Object.keys(gm).length, fonts: jobs.length };
}

// -------------------------------------------------------------------- run ---

async function main() {
  const started = Date.now();

  console.log('');
  console.log(`  Vendoring Strudel assets for offline use  (profile: ${PROFILES[profile].label})`);
  console.log('  This needs internet. It only has to happen once per machine.');
  console.log('');

  if (force && existsSync(VENDOR)) {
    console.log('  --force: removing existing vendor/ ...');
    await rm(VENDOR, { recursive: true, force: true });
  }
  await mkdir(VENDOR, { recursive: true });

  const html = await readFile(join(APP, 'index.html'), 'utf8');
  const { soundfonts: requiredFonts, banks: notebookBanks } = extractSoundRequirements(html);
  console.log(
    `  Notebook needs ${requiredFonts.size} soundfont instrument(s) and ${notebookBanks.size} named bank(s).`,
  );
  console.log('');

  const strudel = await vendorStrudel();
  await vendorHydra();
  console.log('');

  const samples = await vendorSamples(notebookBanks);
  const soundfonts = await vendorSoundfonts(requiredFonts);

  const manifest = {
    generatedAt: new Date().toISOString(),
    profile,
    strudelVersion: STRUDEL_VERSION,
    worklets: strudel.worklets,
    redirectedUrls: strudel.replacements.map((r) => r.remote),
    sampleSets: samples,
    soundfonts,
    stats: {
      downloaded: totals.downloaded,
      skipped: totals.skipped,
      bytes: totals.bytes,
      failures: totals.failures.length,
    },
  };
  await writeFile(join(VENDOR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  const elapsed = ((Date.now() - started) / 1000).toFixed(0);
  console.log('');
  console.log(
    `  Downloaded ${totals.downloaded} files (${formatBytes(totals.bytes)}), skipped ${totals.skipped} already present, in ${elapsed}s`,
  );

  if (totals.failures.length) {
    console.log('');
    console.log(`  ${totals.failures.length} file(s) failed:`);
    for (const f of totals.failures.slice(0, 10)) console.log(`    - ${f.url}  (${f.error})`);
    if (totals.failures.length > 10) console.log(`    ... and ${totals.failures.length - 10} more`);
    console.log('');
    console.log('  Re-run `npm run setup` to retry only the missing files.');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('');
  console.error(`  Vendoring failed: ${err.message}`);
  console.error('');
  process.exit(1);
});
