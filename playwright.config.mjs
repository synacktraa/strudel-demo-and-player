import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the offline notebook.
 *
 * Playwright is a devDependency used to verify a machine before the workshop -
 * the notebook itself never needs it, and `npm start` has no dependencies.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8199',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // Let the AudioContext start without a real user gesture, and keep
          // audio silent on the CI/prep machine.
          args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
        },
      },
    },
  ],
  webServer: {
    command: 'node app/server.mjs --port=8199 --no-open',
    url: 'http://127.0.0.1:8199',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
