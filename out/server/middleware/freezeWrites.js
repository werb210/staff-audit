export function freezeWrites(req, res, next) {
    const on = String(process.env.FREEZE_WRITES || "false") === "true";
    const mut = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    if (on && mut)
        return res.status(503).json({ ok: false, error: "writes_frozen_for_investigation" });
    next();
}
