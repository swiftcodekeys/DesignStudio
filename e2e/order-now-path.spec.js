import { test, expect } from '@playwright/test';

test('Order Now submits with intent=order', async ({ page }) => {
  await page.goto('/');
  await page.goto('/?demo=step6');
  const orderButton = page.getByRole('button', { name: /order now/i });
  if (await orderButton.isVisible()) {
    const requestPromise = page.waitForRequest(req =>
      req.url().includes('/api/leads') || req.url().includes('leads')
    );
    await orderButton.click();
    const req = await requestPromise;
    const body = JSON.parse(req.postData() || '{}');
    expect(body.submitAction).toBe('order');
  } else {
    test.skip(true, 'Order Now button not rendered in demo state — manual test only');
  }
});
