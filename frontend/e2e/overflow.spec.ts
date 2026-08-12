import { test, expect } from '@playwright/test';
import { mockApi } from './api-mocks';

const WIDTHS = [320, 375, 768, 1024, 1440];

/**
 * Assert no horizontal page overflow: the viewport must never scroll sideways.
 * Element-level clipping inside `overflow-hidden`/`overflow-x-auto` containers
 * is intentional (decorative blur blobs, scrollable table wrappers), so the
 * contract asserted here is the document-level one from ticket #75.
 */
async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return { width, horizontalScrollbar: window.innerWidth - document.documentElement.clientWidth < 0 };
  });

  expect.soft(overflow.horizontalScrollbar, `Page scrolls horizontally by ${overflow.width}px`).toBe(false);
}

test.describe('no horizontal page overflow', () => {
  for (const width of WIDTHS) {
    test(`${width}px width`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await mockApi(page);
      await page.goto('/');

      await expect(page.locator('header')).toBeVisible();
      // Wait for the summary to render (needed to mount table/cards content).
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
      await expectNoHorizontalOverflow(page);

      // Switch to the purchases (card/table) view.
      await page.getByRole('button', { name: /purchases|compras/i }).first().click();
      await expectNoHorizontalOverflow(page);

      // Below md the navbar collapses to the hamburger drawer — open it.
      if (width < 768) {
        await page.getByRole('button', { name: 'Open menu' }).click();
        await expectNoHorizontalOverflow(page);
      }
    });
  }
});