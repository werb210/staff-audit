import { test, expect } from '@playwright/test';
import * as fs from 'fs';

const manifest = JSON.parse(fs.readFileSync('./style/lisaMorgan.manifest.json', 'utf8'));

const { mobile, tablet, desktop } = manifest.breakpoints;
const PAGES: string[] = manifest.pages;

test.use({ storageState: 'auth.json' });

async function basicResponsiveAssertions(page) {
  // No horizontal scroll
  const overflowX = await page.evaluate(() => {
    return document.scrollingElement!.scrollWidth > document.scrollingElement!.clientWidth;
  });
  expect(overflowX).toBeFalsy();

  // Minimum font size somewhere on the page
  const minFont = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let min = Infinity;
    let node: any;
    while ((node = walker.nextNode())) {
      const s = window.getComputedStyle(node);
      const px = parseFloat(s.fontSize || '0');
      if (px > 0) min = Math.min(min, px);
    }
    return min;
  });
  expect(minFont).toBeGreaterThanOrEqual(14);

  // Tap target size (buttons/links)
  const tooSmall = await page.$$eval('a,button,[role="button"]', els =>
    els.some(el => {
      const r = (el as HTMLElement).getBoundingClientRect();
      return r.width < 44 || r.height < 44;
    })
  );
  expect(tooSmall).toBeFalsy();
}

for (const p of PAGES) {
  test.describe(`Responsive checks for ${p}`, () => {
    test(`Mobile ${mobile.width}x${mobile.height}`, async ({ page }) => {
      await page.setViewportSize({ width: mobile.width, height: mobile.height });
      await page.goto(`http://127.0.0.1:5000${p}`);
      await page.waitForTimeout(2000);
      await basicResponsiveAssertions(page);
    });

    test(`Tablet ${tablet.width}x${tablet.height}`, async ({ page }) => {
      await page.setViewportSize({ width: tablet.width, height: tablet.height });
      await page.goto(`http://127.0.0.1:5000${p}`);
      await page.waitForTimeout(2000);
      await basicResponsiveAssertions(page);
    });

    test(`Desktop ${desktop.width}x${desktop.height}`, async ({ page }) => {
      await page.setViewportSize({ width: desktop.width, height: desktop.height });
      await page.goto(`http://127.0.0.1:5000${p}`);
      await page.waitForTimeout(2000);
      await basicResponsiveAssertions(page);
    });
  });
}