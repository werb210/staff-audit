import { Router } from "express";
const r = Router();
r.get("/config", (_req, res) => {
    res.json({
        ok: true,
        lenders: [
            {
                id: "l1",
                name: "Boreal Bank",
                active: true,
                sendVia: "email",
                email: "apps@borealbank.com"
            },
            {
                id: "l2",
                name: "Huron Capital",
                active: false,
                sendVia: "api",
                apiUrl: "https://api.huron.example"
            },
            {
                id: "l3",
                name: "Stride Funding",
                active: true,
                sendVia: "email",
                email: "applications@stridefunding.com"
            }
        ]
    });
});
r.put("/:id", (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    // In production, you'd update the database
    // For now, just echo the update
    res.json({
        ok: true,
        id,
        message: 'Lender updated successfully',
        ...updates
    });
});
export default r;
