// playwright.config.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3033',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npx cross-env USE_MAPBOX_DRAW=true webpack serve --mode development --port 3033 --no-open',
    port: 3033,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
