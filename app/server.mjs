#!/usr/bin/env node
/**
 * Zero-dependency static server for the Strudel Workshop Notebook.
 *
 * Uses only Node builtins, so the workshop machines never need `npm install`.
 * A server is unavoidable: Strudel's AudioWorklet, SharedWorker and sample
 * fetching are all blocked on file:// URLs.
 */
import { createServer as createHttpServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
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

/**
 * Where the third-party libraries come from in `--online` mode.
 *
 * Deliberately duplicated rather than imported from setup/lib/manifest.mjs:
 * app/ stays self-contained so the served folder can be copied anywhere. The
 * copies cannot drift - tests/unit/online-mode.test.mjs asserts they match.
 *
 * Only libraries move. Our own files are always served from disk.
 */
export const CDN_SOURCES = {
  'vendor/ui-libs/react.js': 'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
  'vendor/ui-libs/react-dom.js': 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
  'vendor/ui-libs/htm.js': 'https://unpkg.com/htm@3.1.1/dist/htm.umd.js',
  // The unpatched bundle, so its prebake() pulls samples from GitHub. That is
  // the point of online mode: the sets too large to vendor (VCSL, mridangam)
  // and helpers like samples('github:...') and shabda() all start working.
  'vendor/strudel/index.js': 'https://unpkg.com/@strudel/repl@1.3.0',
};

/** Rewrite a page to load its libraries from the CDN instead of vendor/. */
export function toOnlineHtml(html) {
  let out = html;
  for (const [local, remote] of Object.entries(CDN_SOURCES)) {
    out = out.split(local).join(remote);
  }
  return out;
}

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

export function createServer({ root = PROJECT_ROOT, mode = 'offline' } = {}) {
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

    // Online mode swaps the library <script> tags as the page goes out, so the
    // file on disk stays honestly offline and `npm run verify` keeps passing.
    if (mode === 'online' && filePath.endsWith('.html')) {
      const body = Buffer.from(toOnlineHtml(readFileSync(filePath, 'utf8')), 'utf8');
      res.writeHead(200, { ...headers, 'content-length': body.length, 'cache-control': 'no-cache' });
      return req.method === 'HEAD' ? res.end() : res.end(body);
    }

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

/**
 * Walk upward from the preferred port, then let the OS pick anything free.
 * A classroom machine may well have something already on 8000, and the run
 * command should never fail for that reason.
 */
function listenOnFreePort(server, host, preferred, attempts = 20) {
  return new Promise((resolve, reject) => {
    const tryPort = (port, remaining) => {
      const onError = (err) => {
        if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
          // 0 asks the OS for any free port - it cannot itself be in use.
          if (remaining <= 0) return tryPort(0, -1);
          return tryPort(port + 1, remaining - 1);
        }
        reject(err);
      };
      server.once('error', onError);
      server.listen(port, host, () => {
        server.removeListener('error', onError);
        resolve(server.address().port);
      });
    };
    tryPort(preferred, attempts);
  });
}

/**
 * Fail fast, and helpfully, when setup has not been run on this machine.
 *
 * Deliberately a light existence check rather than the thorough audit in
 * `npm run verify` - it keeps app/ self-contained and portable, with no import
 * reaching back into setup/.
 */
function findMissingAssets(root) {
  const required = [
    ['vendor/manifest.json', 'asset manifest'],
    ['vendor/strudel/index.js', 'Strudel engine'],
    ['vendor/samples/maps/uzu-drumkit/strudel.json', 'default drum kit'],
  ];
  return required.filter(([rel]) => !existsSync(join(root, ...rel.split('/')))).map(([rel, label]) => `${label} (${rel})`);
}

// Only run the CLI when executed directly, not when imported by tests.
if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  const args = process.argv.slice(2);
  const portArg = args.find((a) => a.startsWith('--port='));
  const preferred = portArg ? Number(portArg.split('=')[1]) : 8000;
  const shouldOpen = !args.includes('--no-open');

  // Offline is the default on purpose. Forgetting a flag should never be the
  // thing that leaves a classroom without sound - if you want the internet,
  // you have to say so.
  const mode = args.includes('--online') ? 'online' : 'offline';

  const missing = mode === 'offline' ? findMissingAssets(PROJECT_ROOT) : [];
  if (missing.length) {
    console.error('');
    console.error('  The offline assets are missing, so the notebook cannot make a sound.');
    console.error('');
    for (const item of missing) console.error(`    - ${item}`);
    console.error('');
    console.error('  Run this once, on a machine with internet:');
    console.error('');
    console.error('      npm run setup');
    console.error('');
    console.error('  Or, if you have internet and just want to try it now:');
    console.error('');
    console.error('      npm run app:online');
    console.error('');
    process.exit(1);
  }

  const server = createServer({ mode });
  const port = await listenOnFreePort(server, '127.0.0.1', preferred);
  const url = `http://localhost:${port}`;

  console.log('');
  console.log('  Strudel Workshop Notebook');
  console.log('');
  console.log(`      ${url}`);
  console.log('');
  if (port !== preferred) {
    console.log(`  (port ${preferred} was busy, using ${port})`);
    console.log('');
  }
  if (mode === 'online') {
    console.log('  ONLINE MODE - loading Strudel, React and all samples from the internet.');
    console.log('  Nothing here works without a connection. For the workshop, use:');
    console.log('');
    console.log('      npm run app');
  } else {
    console.log('  Running fully offline. Press Ctrl+C to stop.');
  }
  console.log('');

  if (shouldOpen) openBrowser(url);
}
