#!/usr/bin/env node
/**
 * Offline preflight. Run this on a machine before it goes to the workshop -
 * it answers "will this make sound with no internet?" without needing internet.
 *
 *   node scripts/verify-offline.mjs
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { checkVendor, checkPageHasNoRemoteRefs } from './lib/verify.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PASS = '  [ ok ] ';
const FAIL = '  [FAIL] ';

const report = await checkVendor(join(ROOT, 'app', 'vendor'));

console.log('');
console.log('  Offline readiness check');
console.log('  ' + '-'.repeat(58));

for (const check of report.checks) {
  console.log(`${check.ok ? PASS : FAIL}${check.name.padEnd(30)} ${check.detail}`);
}

// The page itself must not pull in any sub-resource over the network.
const html = await readFile(join(ROOT, 'app', 'index.html'), 'utf8');
const page = checkPageHasNoRemoteRefs(html);
console.log(
  `${page.ok ? PASS : FAIL}${'index.html sub-resources'.padEnd(30)} ` +
    (page.ok ? 'all local' : `remote: ${page.offenders.join(' | ')}`),
);

const ok = report.ok && page.ok;

console.log('  ' + '-'.repeat(58));
console.log('');
if (ok) {
  console.log('  Ready for the workshop. Start it with:  npm run app');
  console.log('');
} else {
  console.log('  Not ready. Run `npm run setup` on a machine with internet.');
  console.log('');
  process.exit(1);
}
