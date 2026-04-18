import { test, expect } from '@playwright/test';

test.describe('flat yard end-to-end', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.process = { env: { USE_MAPBOX_DRAW: 'true' } };
    });
  });

  test('draws 4 property sides, answers flat, reaches checkout ready state', async ({ page }) => {
    await page.goto('/');
    // Navigate to draw step (TODO: stub state or use existing flow)
    await page.fill('input[placeholder*="address"]', '123 Main St, Howell MI');
    await page.click('button:has-text("Find my yard")');
    await page.waitForTimeout(5000); // globe flyTo + parcel fetch

    // Click 4 parcel sides (coords depend on real parcel; use mock or real Howell address)
    // For now, manual mode is the reliable fallback:
    await page.click('button:has-text("Manual Mode")');
    await page.click('.mbx-map', { position: { x: 400, y: 300 } });
    await page.click('.mbx-map', { position: { x: 600, y: 300 } });
    await page.click('.mbx-map', { position: { x: 600, y: 500 } });
    await page.click('.mbx-map', { position: { x: 400, y: 500 } });

    await page.click('button:has-text("Done — review slope")');
    await page.click('label:has-text("Mostly flat")');
    await page.click('button:has-text("Continue")');

    await expect(page.locator('button:has-text("Continue to Quote")')).toBeVisible();
  });
});
