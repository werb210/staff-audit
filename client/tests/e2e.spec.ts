import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Manifest = {
  basePath: string;
  silos: string[];
  tabs: {
    name: string;
    route: string;
    features: any[];
  }[];
};

const MANIFEST: Manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'tabs.manifest.json'), 'utf8')
);

// Collect results for a Markdown summary
const results: { tab: string; feature: string; ok: boolean; note?: string }[] = [];

// Known harmless console messages to ignore
const ignoreConsole = [
  /replit\.com\/public\/js\/beacon\.js/i,
  /Content Security Policy/i,
  /Unrecognized feature:/i,
  /\[DIALER\] Duplicate mount blocked/i, // keep as warn; won't fail
  /\[WS\] error/i, // WebSocket connection issues in test environment
  /Failed to load resource/i // Common in test environments
];

async function attachGuards(page) {
  // Capture console errors to fail features
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      const t = msg.text();
      if (!ignoreConsole.some(rx => rx.test(t))) {
        // flag on the page to later assert
        page.evaluate((m) => (window as any).__TEST_ERRORS__ = ((window as any).__TEST_ERRORS__||[]).concat(m), t);
      }
    }
  });

  // Capture our custom dialer event if app dispatches it
  await page.addInitScript(() => {
    (window as any).__TEST_EVENTS__ = [];
    window.addEventListener('dialer:open', (e: any) => {
      (window as any).__TEST_EVENTS__.push({ type: 'dialer:open', detail: e?.detail || null });
    }, { once: false, passive: true });
  });
}

async function assertNoConsoleErrors(page) {
  const errs = await page.evaluate(() => (window as any).__TEST_ERRORS__ || []);
  expect.soft(errs, 'Unexpected console errors').toEqual([]);
}

function label(tab: string, feature: string) {
  return `${tab} › ${feature}`;
}

for (const tab of MANIFEST.tabs) {
  test.describe(tab.name, () => {
    test.beforeEach(async ({ page, baseURL }) => {
      await attachGuards(page);
      const url = new URL(tab.route, baseURL);
      await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
      // Give the app a breath to mount sockets/dialer
      await page.waitForLoadState('networkidle').catch(()=>{});
      // Wait for React to hydrate
      await page.waitForTimeout(2000);
    });

    for (const f of tab.features) {
      test(f.name, async ({ page }) => {
        try {
          // optional: flip silo switch if present
          const silo = MANIFEST.silos?.[0];
          if (silo) {
            const siloToggle = page.locator('[data-testid="silo-toggle"]');
            if (await siloToggle.count().catch(()=>0)) {
              await siloToggle.click().catch(()=>{});
              await page.locator(`text=${silo}`).first().click().catch(()=>{});
            }
          }

          // ACTIONS
          if (f.action === 'click') {
            await page.locator(f.selector).first().click();
          } else if (f.action === 'assert-visible') {
            await expect(page.locator(f.selector).first()).toBeVisible({ timeout: 10000 });
          } else if (f.action === 'form-save') {
            await page.locator(f.openSelector).first().click();
            for (const step of f.form || []) {
              if (step.fill) await page.locator(step.fill).fill(step.value);
              if (step.select) await page.locator(step.select).selectOption(step.value);
              if (step.check) await page.locator(step.check).setChecked(true);
            }
            const [resp] = await Promise.all([
              page.waitForResponse(r => r.url().includes('/api/') && r.status() < 400),
              page.locator(f.save).click()
            ]);
            expect.soft(resp.ok(), 'Save API returned non-2xx').toBeTruthy();
          }

          // EXPECTS
          if (f.expect?.visible) {
            await expect(page.locator(f.expect.visible)).toBeVisible();
          }
          if (f.expect?.['url-contains']) {
            await expect(page).toHaveURL(new RegExp(f.expect['url-contains']));
          }
          if (f.expect?.download) {
            const [ download ] = await Promise.all([
              page.waitForEvent('download'),
              // Click already done; if not, trigger here
            ]);
            expect.soft(await download.suggestedFilename()).toBeTruthy();
          }
          if (f.expect?.['response-2xx']) {
            const resp = await page.waitForResponse(r => r.url().includes(f.expect['response-2xx']) && r.status() < 400, { timeout: 10_000 });
            expect.soft(resp.ok()).toBeTruthy();
          }
          if (f.expect?.event === 'dialer:open') {
            const seen = await page.waitForFunction(() => (window as any).__TEST_EVENTS__?.some((e:any) => e.type === 'dialer:open'), null, { timeout: 5000 }).catch(()=>false);
            expect.soft(!!seen, 'dialer:open event not observed').toBeTruthy();
          }

          await assertNoConsoleErrors(page);
          results.push({ tab: tab.name, feature: f.name, ok: true });
        } catch (e: any) {
          results.push({ tab: tab.name, feature: f.name, ok: false, note: e?.message?.slice(0, 500) });
          throw e;
        }
      });
    }
  });
}

test.afterAll(async () => {
  const byTab = results.reduce((m, r) => {
    (m[r.tab] ||= []).push(r);
    return m;
  }, {} as Record<string, typeof results>);
  
  let md = `# UI Audit Report\n\nGenerated: ${new Date().toISOString()}\n\n`;
  
  const totalPass = results.filter(r => r.ok).length;
  const totalFail = results.length - totalPass;
  
  md += `## Summary: ${totalPass}/${results.length} features passing\n\n`;
  
  for (const [tab, rows] of Object.entries(byTab)) {
    const pass = rows.filter(r => r.ok).length;
    const fail = rows.length - pass;
    md += `## ${tab} — ${pass}/${rows.length} passing\n\n`;
    for (const r of rows) {
      md += `- ${r.ok ? '✅' : '❌'} **${r.feature}**${r.ok ? '' : ` — ${r.note || ''}`}\n`;
    }
    md += `\n`;
  }
  
  fs.writeFileSync(path.join(__dirname, 'REPORT.md'), md);
  console.log(`\n📊 UI Audit Complete: ${totalPass}/${results.length} features passing`);
  console.log(`📋 Report written to: tests/REPORT.md`);
  console.log(`🌐 HTML report: playwright-report/index.html\n`);
});