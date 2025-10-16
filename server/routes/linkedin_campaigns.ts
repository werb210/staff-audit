import { Router } from "express";
import { db } from "../db/drizzle.js";

const r = Router();

r.get("/", async (_req, res) => {
  const items = await db.linkedInMessageCampaign.findMany({
    include: {
      template: true,
      audience: true
    },
    orderBy: { updatedAt: "desc" }
  });
  res.json({ ok: true, items });
});

r.post("/", async (req: any, res: any) => {
  const {
    tenant = "bf",
    templateId,
    audienceId,
    mode = "ads",
    scheduleAt,
    budgetCents,
    adAccountUrn
  } = req.body || {};

  const item = await db.linkedInMessageCampaign.create({
    data: {
      tenant,
      templateId,
      audienceId,
      mode,
      scheduleAt: scheduleAt ? new Date(scheduleAt) : null,
      budgetCents,
      adAccountUrn,
      status: "draft"
    },
    include: {
      template: true,
      audience: true
    }
  });
  res.json({ ok: true, item });
});

r.put("/:id", async (req: any, res: any) => {
  const {
    templateId,
    audienceId,
    mode,
    scheduleAt,
    budgetCents,
    status,
    adAccountUrn,
    campaignUrn,
    meta
  } = req.body || {};

  const item = await db.linkedInMessageCampaign.update({
    where: { id: req.params.id },
    data: {
      ...(templateId ? { templateId } : {}),
      ...(audienceId ? { audienceId } : {}),
      ...(mode ? { mode } : {}),
      ...(scheduleAt !== undefined ? { scheduleAt: scheduleAt ? new Date(scheduleAt) : null } : {}),
      ...(budgetCents !== undefined ? { budgetCents } : {}),
      ...(status ? { status } : {}),
      ...(adAccountUrn !== undefined ? { adAccountUrn } : {}),
      ...(campaignUrn !== undefined ? { campaignUrn } : {}),
      ...(meta !== undefined ? { meta } : {}),
    },
    include: {
      template: true,
      audience: true
    }
  });
  res.json({ ok: true, item });
});

r.delete("/:id", async (req: any, res: any) => {
  await db.linkedInMessageCampaign.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

/** Launch campaign (stub - can be wired to LinkedIn API later) */
r.post("/:id/launch", async (req: any, res: any) => {
  const campaign = await db.linkedInMessageCampaign.findUnique({
    where: { id: req.params.id },
    include: { template: true, audience: true }
  });

  if (!campaign) return res.status(404).json({ ok: false, error: "not_found" });

  // Validate before launch
  if (!campaign.template) return res.status(400).json({ ok: false, error: "no_template" });
  if (!campaign.audience) return res.status(400).json({ ok: false, error: "no_audience" });
  if (campaign.mode === "ads" && !campaign.adAccountUrn) {
    return res.status(400).json({ ok: false, error: "ads_mode_requires_account" });
  }

  // Mock launch - update status to queued
  const item = await db.linkedInMessageCampaign.update({
    where: { id: campaign.id },
    data: {
      status: "queued",
      meta: {
        ...campaign.meta as any,
        queuedAt: new Date().toISOString(),
        note: "Queued for LinkedIn API integration"
      }
    },
    include: {
      template: true,
      audience: true
    }
  });

  res.json({ ok: true, item, note: "Campaign queued. LinkedIn API integration can be enabled when messaging scope is provisioned." });
});

export default r;