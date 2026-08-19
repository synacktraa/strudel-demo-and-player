#!/usr/bin/env node
/**
 * Zero-dependency static server for the Strudel Workshop Notebook.
 *
 * Uses only Node builtins, so the workshop machines never need `npm install`.
 * A server is unavoidable: Strudel's AudioWorklet, SharedWorker and sample
 * fetching are all blocked on file:// URLs.
 */
import { createServer as createHttpServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, sep } from 'node:path';
import { spawn } from 'node:child_process';

const PROJECT_ROOT = dirname(fileURLToPath(import.meta.url));

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

export function contentTypeFor(filePath) {
  const dot = filePath.lastIndexOf('.');
  const ext = dot === -1 ? '' : filePath.slice(dot).toLowerCase();
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

/**
 * Map a request path to a file inside `root`, or null if it escapes the root.
 */
export function resolveSafePath(root, urlPath) {
  let pathname = urlPath.split('?')[0].split('#')[0];
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  // Reject traversal outright rather than relying on join() to collapse it -
  // an explicit 403 is easier to reason about than a silently rewritten path.
  const segments = pathname.split(/[/\\]+/).filter(Boolean);
  if (segments.some((s) => s === '..')) return null;

  const resolved = join(root, ...segments);
  if (resolved !== root && !resolved.startsWith(root + sep)) return null;
  return resolved;
}

export function createServer({ root = PROJECT_ROOT } = {}) {
  return createHttpServer((req, res) => {
    const filePath = resolveSafePath(root, req.url ?? '/');
    if (!filePath) {
      res.writeHead(403, { 'content-type': 'text/plain' });
      return res.end('Forbidden');
    }

    let stats;
    try {
      stats = statSync(filePath);
      if (stats.isDirectory()) {
        stats = statSync(join(filePath, 'index.html'));
      }
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('Not found');
    }

    // vendor/ only changes when setup re-runs, and each of the 8 editors runs
    // Strudel's prebake() - so pinning it hard turns ~50 revalidations per load
    // into memory-cache hits. Source files stay uncached so edits show up.
    const isVendored = req.url.startsWith('/vendor/');
    const headers = {
      'content-type': contentTypeFor(filePath),
      'cache-control': isVendored ? 'public, max-age=31536000, immutable' : 'no-cache',
      'accept-ranges': 'bytes',
    };

    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (match) {
        const start = match[1] === '' ? 0 : Number(match[1]);
        const end = match[2] === '' ? stats.size - 1 : Number(match[2]);
        if (start <= end && end < stats.size) {
          res.writeHead(206, {
            ...headers,
            'content-range': `bytes ${start}-${end}/${stats.size}`,
            'content-length': end - start + 1,
          });
          return createReadStream(filePath, { start, end }).pipe(res);
        }
      }
    }

    res.writeHead(200, { ...headers, 'content-length': stats.size });
    if (req.method === 'HEAD') return res.end();
    createReadStream(filePath).pipe(res);
  });
}

function openBrowser(url) {
  const commands =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '""', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  try {
    spawn(commands[0], commands[1], { stdio: 'ignore', detached: true }).unref();
  } catch {
    /* the URL is printed below either way */
  }
}

function listenOnFirstFreePort(server, host, ports) {
  return new Promise((resolve, reject) => {
    const tryNext = (index) => {
      if (index >= ports.length) {
        return reject(new Error(`No free port found (tried ${ports.join(', ')})`));
      }
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') return tryNext(index + 1);
        reject(err);
      });
      server.listen(ports[index], host, () => resolve(ports[index]));
    };
    tryNext(0);
  });
}

// Only run the CLI when executed directly, not when imported by tests.
if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  const args = process.argv.slice(2);
  const portArg = args.find((a) => a.startsWith('--port='));
  const requested = portArg ? Number(portArg.split('=')[1]) : 8000;
  const shouldOpen = args.includes('--open');

  const server = createServer();
  const port = await listenOnFirstFreePort(server, '127.0.0.1', [
    requested,
    requested + 1,
    requested + 2,
    requested + 3,
    0,
  ]);
  const actual = server.address().port;
  const url = `http://localhost:${actual}`;

  console.log('');
  console.log('  Strudel Workshop Notebook');
  console.log(`  ->  ${url}`);
  console.log('');
  console.log('  Running fully offline. Press Ctrl+C to stop.');
  console.log('');

  if (shouldOpen) openBrowser(url);
  void port;
}
