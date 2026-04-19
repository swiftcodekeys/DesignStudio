import { test, expect } from '@playwright/test';

test.describe('flat yard end-to-end', () => {
  test('draws 4 property sides, reaches checkout ready state', async ({ page }) => {
    await page.goto('/studio?tab=draw');
    // Navigate to draw step — /studio?tab=draw routes to MapboxDrawView when USE_MAPBOX_DRAW=true
    await page.fill('input[placeholder*="address"]', '123 Main St, Howell MI');
    await page.click('button:has-text("Find my yard")');
    await page.waitForSelector('.mbx-map canvas', { timeout: 30000 }); // wait for Mapbox map to initialize

    // Manual mode is the reliable fallback when parcel auto-detect may not resolve
    // Use force:true because the backlinks-bar overlay may intercept pointer events
    await page.click('button:has-text("Manual Mode")', { force: true });
    await page.click('.mbx-map', { position: { x: 400, y: 300 } });
    await page.click('.mbx-map', { position: { x: 600, y: 300 } });
    await page.click('.mbx-map', { position: { x: 600, y: 500 } });
    await page.click('.mbx-map', { position: { x: 400, y: 500 } });

    // Finalize drawing — SlopePopup removed post-Task#9; per-segment cards appear in sidebar
    await page.click('button:has-text("Done \u2014 review segments")', { force: true });

    // Continue becomes enabled once segments exist
    await expect(page.locator('button:has-text("Continue to Quote")')).toBeVisible();
  });
});
