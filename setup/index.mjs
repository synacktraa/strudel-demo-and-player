#!/usr/bin/env node
/**
 * One-command setup. Run this once per machine, while it still has internet.
 *
 *   npm run setup
 *
 * Afterwards `npm start` works with the network disconnected.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const SETUP_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SETUP_DIR, '..');
const args = process.argv.slice(2);

function run(script, scriptArgs = []) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [join(SETUP_DIR, script), ...scriptArgs], {
      stdio: 'inherit',
      cwd: ROOT,
    });
    child.on('close', (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(`${script} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

const major = Number(process.versions.node.split('.')[0]);
if (major < 18) {
  console.error('');
  console.error(`  Node 18 or newer is required (this is Node ${process.versions.node}).`);
  console.error('  Install a current version from https://nodejs.org and run `npm run setup` again.');
  console.error('');
  process.exit(1);
}

console.log('');
console.log('  ===========================================================');
console.log('   Strudel Workshop Notebook - offline setup');
console.log('  ===========================================================');

try {
  await run('vendor.mjs', args);
} catch (err) {
  console.error('');
  console.error(`  Setup could not finish: ${err.message}`);
  console.error('  Check the internet connection and run `npm run setup` again -');
  console.error('  files already downloaded are kept, so it resumes where it stopped.');
  console.error('');
  process.exit(1);
}

console.log('');
await run('verify.mjs');

console.log('  You can disconnect from the internet now. To start the notebook:');
console.log('');
console.log('      npm start');
console.log('');
