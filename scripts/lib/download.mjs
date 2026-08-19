/**
 * Small, dependency-free download helper with retries, resume and progress.
 * Written against Node builtins so the workshop machines need nothing installed
 * beyond Node itself.
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname } from 'node:path';

const RETRY_DELAYS_MS = [500, 1500, 4000, 8000];

export async function fetchBuffer(url, { retries = RETRY_DELAYS_MS.length } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)]));
    }
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} for ${url}`);
        // 404 will never succeed on retry; everything else might.
        if (res.status === 404) break;
        continue;
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

export async function fetchText(url, options) {
  return (await fetchBuffer(url, options)).toString('utf8');
}

export async function fetchJson(url, options) {
  return JSON.parse(await fetchText(url, options));
}

async function alreadyDownloaded(path) {
  try {
    const s = await stat(path);
    return s.size > 0;
  } catch {
    return false;
  }
}

/**
 * Download a list of {url, path} jobs with bounded concurrency.
 * Existing non-empty files are skipped, so an interrupted setup resumes cheaply.
 *
 * @returns {Promise<{ downloaded: number, skipped: number, bytes: number, failures: Array }>}
 */
export async function downloadAll(jobs, { concurrency = 12, onProgress, label = '' } = {}) {
  const result = { downloaded: 0, skipped: 0, bytes: 0, failures: [] };
  let cursor = 0;
  let done = 0;

  const worker = async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      try {
        if (await alreadyDownloaded(job.path)) {
          result.skipped++;
        } else {
          const buf = await fetchBuffer(job.url);
          await mkdir(dirname(job.path), { recursive: true });
          await writeFile(job.path, buf);
          result.downloaded++;
          result.bytes += buf.length;
        }
      } catch (err) {
        result.failures.push({ url: job.url, path: job.path, error: err.message });
      }
      done++;
      onProgress?.(done, jobs.length, label);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length || 1) }, worker));
  return result;
}

/** Single-line progress bar that stays readable when piped to a file. */
export function makeProgressReporter() {
  const isTTY = process.stdout.isTTY;
  let lastPrint = 0;
  return (done, total, label) => {
    const now = Date.now();
    const finished = done === total;
    if (!finished && now - lastPrint < 120) return;
    lastPrint = now;
    const pct = total === 0 ? 100 : Math.floor((done / total) * 100);
    const width = 24;
    const filled = Math.round((pct / 100) * width);
    const bar = '#'.repeat(filled) + '-'.repeat(width - filled);
    const line = `  ${label.padEnd(22)} [${bar}] ${String(pct).padStart(3)}%  ${done}/${total}`;
    if (isTTY) {
      process.stdout.write(`\r${line}${finished ? '\n' : ''}`);
    } else if (finished) {
      process.stdout.write(`${line}\n`);
    }
  };
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
