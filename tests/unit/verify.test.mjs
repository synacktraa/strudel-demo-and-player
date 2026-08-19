import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { checkVendor, checkPageHasNoRemoteRefs } from '../../scripts/lib/verify.mjs';

function makeVendor({ withManifest = true, withStrudel = true, patched = true, withMaps = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'vendor-'));
  const vendor = join(root, 'vendor');
  mkdirSync(join(vendor, 'strudel', 'assets'), { recursive: true });
  mkdirSync(join(vendor, 'samples', 'maps', 'dough-samples'), { recursive: true });
  mkdirSync(join(vendor, 'samples', 'maps', 'uzu-drumkit'), { recursive: true });
  mkdirSync(join(vendor, 'samples', 'maps', 'todepond'), { recursive: true });
  mkdirSync(join(vendor, 'soundfonts'), { recursive: true });

  if (withManifest) {
    writeFileSync(
      join(vendor, 'manifest.json'),
      JSON.stringify({
        profile: 'recommended',
        strudelVersion: '1.3.0',
        worklets: ['clockworker-TEST.js'],
        stats: { failures: 0 },
      }),
    );
  }
  if (withStrudel) {
    // Pad to a realistic size - the bundle check rejects a truncated download.
    const padding = 'x'.repeat(600_000);
    const body = patched
      ? `var strudel=1;/vendor/samples/maps/dough-samples;${padding}`
      : `var strudel=1;https://raw.githubusercontent.com/felixroos/dough-samples/main;${padding}`;
    writeFileSync(join(vendor, 'strudel', 'index.js'), body);
    writeFileSync(join(vendor, 'strudel', 'assets', 'clockworker-TEST.js'), 'worklet');
  }
  if (withMaps) {
    const withAudio = (setId, bank, file) => {
      mkdirSync(join(vendor, 'samples', 'audio', setId), { recursive: true });
      writeFileSync(join(vendor, 'samples', 'audio', setId, file), 'RIFF....WAVE');
      return JSON.stringify({ _base: `/vendor/samples/audio/${setId}/`, [bank]: [file] });
    };
    for (const f of ['tidal-drum-machines.json', 'piano.json', 'Dirt-Samples.json', 'vcsl.json', 'mridangam.json']) {
      const setId = f.replace('.json', '');
      writeFileSync(join(vendor, 'samples', 'maps', 'dough-samples', f), withAudio(setId, 'bd', 'kick.wav'));
    }
    writeFileSync(
      join(vendor, 'samples', 'maps', 'uzu-drumkit', 'strudel.json'),
      withAudio('uzu-drumkit', 'bd', 'kick.wav'),
    );
    writeFileSync(join(vendor, 'samples', 'maps', 'todepond', 'tidal-drum-machines-alias.json'), '{}');
  }
  writeFileSync(join(vendor, 'soundfonts', '0000_JCLive_sf2_file.js'), 'font');
  return vendor;
}

test('checkVendor passes on a complete vendor directory', async () => {
  const report = await checkVendor(makeVendor());
  assert.equal(report.ok, true, JSON.stringify(report.checks.filter((c) => !c.ok), null, 2));
});

test('checkVendor fails when setup has never been run', async () => {
  const root = mkdtempSync(join(tmpdir(), 'vendor-'));
  const report = await checkVendor(join(root, 'vendor'));
  assert.equal(report.ok, false);
  assert.ok(report.checks.some((c) => !c.ok && /manifest/i.test(c.name)));
});

test('checkVendor fails when the Strudel bundle still points at a remote host', async () => {
  const report = await checkVendor(makeVendor({ patched: false }));
  assert.equal(report.ok, false);
  const failed = report.checks.find((c) => !c.ok && /remote/i.test(c.name));
  assert.ok(failed, 'expected a failing "no remote URLs" check');
  assert.match(failed.detail, /raw\.githubusercontent\.com/);
});

test('checkVendor fails when a sample map prebake() requires is missing', async () => {
  const report = await checkVendor(makeVendor({ withMaps: false }));
  assert.equal(report.ok, false);
  assert.ok(report.checks.some((c) => !c.ok && /sample map/i.test(c.name)));
});

test('checkVendor fails when the AudioWorklet chunk is missing', async () => {
  const vendor = makeVendor();
  const { rmSync } = await import('node:fs');
  rmSync(join(vendor, 'strudel', 'assets', 'clockworker-TEST.js'));
  const report = await checkVendor(vendor);
  assert.equal(report.ok, false);
  assert.ok(report.checks.some((c) => !c.ok && /worklet/i.test(c.name)));
});

test('checkPageHasNoRemoteRefs flags a CDN script tag', () => {
  const html = `<script src="https://unpkg.com/@strudel/repl@1"></script>`;
  const result = checkPageHasNoRemoteRefs(html);
  assert.equal(result.ok, false);
  assert.match(result.offenders[0], /unpkg\.com/);
});

test('checkPageHasNoRemoteRefs ignores plain informational hyperlinks', () => {
  // <a href> to strudel.cc just fails to open offline; it loads nothing into the page.
  const html = `<a href="https://strudel.cc" target="_blank">strudel.cc</a>
                <script src="vendor/strudel/index.js"></script>`;
  assert.equal(checkPageHasNoRemoteRefs(html).ok, true);
});

test('checkPageHasNoRemoteRefs flags a remote stylesheet or image', () => {
  assert.equal(checkPageHasNoRemoteRefs(`<link rel="stylesheet" href="https://cdn.x/a.css">`).ok, false);
  assert.equal(checkPageHasNoRemoteRefs(`<img src="https://cdn.x/a.png">`).ok, false);
});
