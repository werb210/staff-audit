import { Router } from "express";
import smsRouter from "./sms";
import callsRouter from "./calls";
import emailRouter from "./email";
import templatesRouter from "./templates";
import threadsRouter from "./threads";
import slaRouter from "./sla";
import automationsRouter from "./automations";
import outboxRouter from "./outbox";

const router = Router();
router.use("/sms", smsRouter);
router.use("/calls", callsRouter);
router.use("/email", emailRouter);
router.use("/templates", templatesRouter);
router.use("/threads", threadsRouter);
router.use("/sla", slaRouter);
router.use("/automations", automationsRouter);
router.use("/outbox", outboxRouter);

export default router;