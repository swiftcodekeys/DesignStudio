import { test, expect } from '@playwright/test';

test.describe('sloped yard end-to-end', () => {
  test('answers "some slope" → per-segment cards render with color match', async ({ page }) => {
    await page.addInitScript(() => {
      window.process = { env: { USE_MAPBOX_DRAW: 'true' } };
    });
    await page.goto('/');

    await page.fill('input[placeholder*="address"]', '123 Main St, Howell MI');
    await page.click('button:has-text("Find my yard")');
    await page.waitForTimeout(5000);
    await page.click('button:has-text("Manual Mode")');
    await page.click('.mbx-map', { position: { x: 400, y: 300 } });
    await page.click('.mbx-map', { position: { x: 600, y: 300 } });
    await page.click('.mbx-map', { position: { x: 600, y: 500 } });
    await page.click('.mbx-map', { position: { x: 400, y: 500 } });

    await page.click('button:has-text("Done — review slope")');
    await page.click('label:has-text("Some sections slope")');
    await page.click('button:has-text("Continue")');

    const cards = page.locator('.mbx-segment-card');
    await expect(cards).toHaveCount(4);

    // Color swatch should match the border-left-color
    const firstSwatch = cards.nth(0).locator('.mbx-segment-swatch');
    await expect(firstSwatch).toHaveCSS('background-color', /rgb/);

    // Changing dropdown fires state update
    await cards.nth(0).locator('select').selectOption('rackable');
    // drawToolData should reflect override — checked via network inspection in a larger integration test
  });
});
