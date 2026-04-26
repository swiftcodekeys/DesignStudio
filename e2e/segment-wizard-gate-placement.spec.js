// e2e/segment-wizard-gate-placement.spec.js
// Run against Cloudflare Pages preview:
//   BASE_URL=https://<preview>.designstudio-csy.pages.dev npx playwright test e2e/segment-wizard-gate-placement.spec.js --reporter=list

import { test, expect } from '@playwright/test';

var BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Gate placement + segment wizard', () => {

  test('draw-tool flow: skip gate step, wizard shows no gates', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('[data-testid="start-drawing"], .draw-cta, button:has-text("Draw my fence")');
    await page.waitForSelector('.mapboxgl-canvas', { timeout: 15000 });
    await page.click('button:has-text("No gates — skip")');
    await page.waitForSelector('.qsl-wizard-layout', { timeout: 10000 });
    expect(await page.locator('.swc-gate-row').count()).toBe(0);
  });

  test('segment wizard: CTA disabled until all segments confirmed', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('[data-testid="start-drawing"], .draw-cta, button:has-text("Draw my fence")');
    await page.waitForSelector('.mapboxgl-canvas', { timeout: 15000 });
    await page.click('button:has-text("No gates — skip")');
    await page.waitForSelector('.qsl-wizard-layout', { timeout: 10000 });
    var ctaBtn = page.locator('.swc-cta');
    await expect(ctaBtn).toBeDisabled();
    var cards = page.locator('.swc-card');
    var count = await cards.count();
    for (var i = 0; i < count; i++) {
      await cards.nth(i).locator('.swc-tier-btn').first().click();
    }
    await expect(ctaBtn).toBeEnabled();
  });

  test('manual-entry buyer: no segment cards shown', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('button:has-text("Enter footage manually"), [data-testid="manual-entry"]');
    await page.waitForSelector('.qsl-wizard-layout, [data-testid="qb-terrain-section"]', { timeout: 10000 });
    expect(await page.locator('.swc-card').count()).toBe(0);
  });

  test('payload contains gateCount and totalPanelFt at review step', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('[data-testid="start-drawing"], .draw-cta, button:has-text("Draw my fence")');
    await page.waitForSelector('.mapboxgl-canvas', { timeout: 15000 });
    await page.click('button:has-text("No gates — skip")');
    await page.waitForSelector('.qsl-wizard-layout', { timeout: 10000 });
    var cards = page.locator('.swc-card');
    var count = await cards.count();
    for (var i = 0; i < count; i++) {
      await cards.nth(i).locator('.swc-tier-btn').first().click();
    }
    await page.locator('.swc-cta').click();
    for (var step = 0; step < 4; step++) {
      var nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
      if (await nextBtn.isVisible()) await nextBtn.click();
    }
    await page.waitForSelector('.qb-review, [data-testid="review-step"]', { timeout: 10000 });
    var reviewText = await page.locator('.qb-review, [data-testid="review-step"]').innerText();
    expect(reviewText).toMatch(/\d+ ft|gates/i);
  });

});
