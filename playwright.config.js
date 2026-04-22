// playwright.config.js
import { defineConfig } from '@playwright/test';

// Allow CI or the developer to point tests at any host -- e.g. the Cloudflare
// Pages preview URL -- without touching this file:
//   BASE_URL=https://feat-quote-redesign.designstudio-csy.pages.dev npx playwright test
var BASE_URL = process.env.BASE_URL || 'http://localhost:3033';
var isLocalhost = BASE_URL.startsWith('http://localhost');

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 45000,
  },
  // Only spin up the dev server when targeting localhost.
  // When BASE_URL points at a remote host the webServer block is omitted so
  // Playwright skips the local build step entirely.
  webServer: isLocalhost ? {
    command: 'npx cross-env USE_MAPBOX_DRAW=true webpack serve --mode development --port 3033 --no-open',
    port: 3033,
    reuseExistingServer: true,
    timeout: 120000,
  } : undefined,
});
