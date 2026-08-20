import { defineConfig, devices } from '@playwright/test';

import base from './playwright.config.mjs';

/**
 * The opt-in online suite: `npm run test:online`.
 *
 * Separate config rather than an env var so it works the same in PowerShell,
 * cmd and any POSIX shell without pulling in cross-env - this project ships
 * with no runtime dependencies and it would be odd to add one for a test flag.
 */
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: ['**/online.spec.mjs'],
  webServer: {
    ...base.webServer,
    command: 'node app/server.mjs --online --port=8299 --no-open',
    url: 'http://127.0.0.1:8299',
  },
  use: { ...base.use, baseURL: 'http://127.0.0.1:8299' },
});
