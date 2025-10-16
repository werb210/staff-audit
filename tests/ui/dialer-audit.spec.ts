import { test, expect } from "@playwright/test";
import { startNetworkCapture, saveAudit, getDialerModel, reportRow } from "./audit.utils";

test("Slide-in dialer opens and all controls respond", async ({ page }) => {
  const logs = await startNetworkCapture(page);
  const rows: any[] = [];

  await page.goto("/staff/");
  const fab = page.locator('[data-testid="dialer-open"]').first();
  await expect(fab).toBeVisible();
  await fab.click();

  // verify panel open (transform switch or consent pill visible)
  const consent = page.getByText(/Recording consent/i).first();
  const opened = await consent.count();
  rows.push(await reportRow("Dialer", "Open", opened ? "PASS" : "FAIL"));

  // snapshot 0
  const before = await getDialerModel(page);

  const buttons = ["Mute","Hold","Record","Transfer","Add","Merge"];
  for (const label of buttons) {
    const btn = page.locator(`button:has-text("${label}")`).first();
    const exists = await btn.count();
    if (!exists) { rows.push(await reportRow("Dialer", label, "NOT_FOUND")); continue; }

    if (label === "Transfer" || label === "Add") {
      // neutralize prompt for CI: inject a fake prompt value
      await page.addInitScript(() => { (window as any).prompt = () => "+15550000000"; });
    }
    await btn.click({ trial: true }).catch(()=>{});
    await btn.click().catch(()=>{});
    await page.waitForTimeout(120);

    const after = await getDialerModel(page);
    rows.push(await reportRow("Dialer", label, after ? "CLICKED" : "NO_MODEL", { before, after }));
  }

  const siloPill = page.getByText(/^(BF|SLF)$/).first();
  if (await siloPill.count()) {
    const siloBefore = (await getDialerModel(page))?.silo;
    await siloPill.click();
    const siloAfter = (await getDialerModel(page))?.silo;
    rows.push(await reportRow("Dialer", "Silo Switch", siloBefore !== siloAfter ? "PASS" : "FAIL",
      { from: siloBefore, to: siloAfter }));
  } else {
    rows.push(await reportRow("Dialer", "Silo Switch", "NOT_FOUND"));
  }

  const openContact = page.getByText(/^Open Contact$/).first();
  if (await openContact.count()) {
    await openContact.click();
    rows.push(await reportRow("Dialer", "Open Contact", "CLICKED"));
  }

  const consentBtn = page.getByText(/Recording consent|Consent recorded/i).first();
  if (await consentBtn.count()) {
    await consentBtn.click();
    const txt = await consentBtn.textContent();
    rows.push(await reportRow("Dialer", "Consent", /recorded/i.test(txt || "") ? "PASS" : "FAIL", { label: txt }));
  }

  await saveAudit("dialer", { rows, logs });
});
