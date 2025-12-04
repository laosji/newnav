import { test, expect } from '@playwright/test';

test('homepage has title and new icons', async ({ page }) => {
  await page.goto('http://localhost:4178/');

  // Wait for the page to load and the data to be available
  await page.waitForSelector('.sites-warp');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/首页/);

  // Find the Ant Bank icon
  const antBankIcon = page.locator('img[alt="澳门蚂蚁银行 icon"]');
  await expect(antBankIcon).toBeVisible();

  // Find the Astrill icon
  const astrillIcon = page.locator('img[alt="Astrill icon"]');
  await expect(astrillIcon).toBeVisible();

  // Capture a screenshot
  await page.screenshot({ path: 'verification.png' });
});
