import { Router } from "express";

export const marketingRouter = Router();

function hasConsent(c: any) {
  return Boolean(c?.marketingConsent === true || c?.gdpr_optin === true);
}

marketingRouter.post("/campaigns/send", (req: any, res: any) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ ok: false, error: "disabled_in_prod" });
  }
  
  const { contact } = req.body || {};
  if (!hasConsent(contact)) {
    return res.status(400).json({ ok: false, error: "no_consent" });
  }
  
  return res.json({ ok: true, preview: true });
});

marketingRouter.post("/subscriptions/unsubscribe", (req: any, res: any) => {
  const { email } = req.body || {};
  return res.json({ ok: true, email });
});

export default marketingRouter;