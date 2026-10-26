import { test, expect } from '@playwright/test';

test.use({ channel: 'chromium' });

test('Swagger loads locally and executes health requests', async ({ page }) => {
  const errors = [];
  const externalRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
      externalRequests.push(request.url());
    }
  });
  await page.goto('/api/docs');
  await expect(page.getByRole('heading', { name: 'Classify Osteoporosis API' })).toBeVisible();
  await expect(page.locator('.opblock')).toHaveCount(12);
  const health = page.locator('#operations-Status-get_api_health');
  await health.locator('.opblock-summary').click();
  await health.getByRole('button', { name: 'Try it out' }).click();
  const response = page.waitForResponse(response => response.url().endsWith('/api/health'));
  await health.getByRole('button', { name: 'Execute', exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(health.locator('.live-responses-table')).toContainText('"status": "ok"');
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});
