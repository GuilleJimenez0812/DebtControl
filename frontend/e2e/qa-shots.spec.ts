import { test, expect } from '@playwright/test';
import { mockApi } from './api-mocks';
import * as fs from 'node:fs';

const WIDTHS = [320, 375, 768, 1024, 1440, 1600];
const OUT = 'docs/qa/screenshots';

// Page-level horizontal overflow check (same contract as overflow.spec).
async function expectNoPageOverflow(page: import('@playwright/test').Page) {
  const { width } = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(width, `page scrolls horizontally by ${width}px`).toBeLessThanOrEqual(0);
}

test.describe('QA screenshot matrix', () => {
  fs.mkdirSync(OUT, { recursive: true });

  for (const width of WIDTHS) {
test(`${width}px capture`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await mockApi(page);
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(300);

    // 1. Dashboard (debts view, md+ table / <md stacked summary+table).
    //    Assert no horizontal page scroll (the #75 contract) on each view.
    await expectNoPageOverflow(page);
    await page.screenshot({ path: `${OUT}/${width}_debts.png`, fullPage: false });

    // 2. Purchases view.
    await page.getByRole('button', { name: /purchases|compras/i }).first().click();
    await page.waitForTimeout(250);
    await expectNoPageOverflow(page);
    await page.screenshot({ path: `${OUT}/${width}_purchases.png` });

    // 3. Open a purchase detail modal (real overlay interior) via its row.
    // Desktop renders the full table; mobile hides it and shows the stacked cards,
    // so the visible order-number cell is `first()` (table) or `last()` (card).
    const order = page.getByText('ORD-2026-0001', { exact: true });
    if (width < 768) await order.last().click();
    else await order.first().click();
    await page.waitForTimeout(350);
    await expectNoPageOverflow(page);
    await page.screenshot({ path: `${OUT}/${width}_purchase-modal.png` });

    // Return to dashboard, switch back to debts.
    await page.goto('/');
    await page.waitForTimeout(300);

    // 4. Drawer open (below md) or admin menu (md+).
    if (width < 768) {
      await page.getByRole('button', { name: 'Open menu' }).click();
      await page.waitForTimeout(250);
      await expectNoPageOverflow(page);
      await page.screenshot({ path: `${OUT}/${width}_drawer.png` });
    }
  });
  }
});