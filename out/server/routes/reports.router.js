import { Router } from "express";
export const reportsRouter = Router();
reportsRouter.get("/summary", (req, res) => {
    return res.json({
        ok: true,
        totals: {
            applications: 71,
            contacts: 120,
            lenders: 30
        }
    });
});
reportsRouter.get("/export.csv", (req, res) => {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=staff-report.csv");
    res.send("type,count\napplications,71\ncontacts,120\nlenders,30\n");
});
export default reportsRouter;
