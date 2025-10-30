import { Router } from "express";
const router = Router();
router.get("/openapi.json", (_req, res) => {
    res.json({
        openapi: "3.0.0",
        info: { title: "Boreal Lender API", version: "1.0.0" },
        paths: {
            "/api/lenders/outcome": {
                post: {
                    summary: "Report lender outcome",
                    security: [{ bearerAuth: [] }, { hmacHeader: [] }],
                    requestBody: { required: true, content: { "application/json": { schema: {
                                    type: "object",
                                    properties: {
                                        appId: { type: "string" },
                                        outcome: { type: "string", enum: ["Accepted", "Declined"] },
                                        fundsDisbursed: { type: "boolean" },
                                        amount: { type: "number" },
                                        idempotencyKey: { type: "string" }
                                    },
                                    required: ["appId", "outcome"]
                                } } } },
                    responses: { "200": { description: "OK" }, "401": { description: "Unauthorized" }, "403": { description: "Forbidden" } }
                }
            }
        },
        components: {
            securitySchemes: {
                bearerAuth: { type: "http", scheme: "bearer" },
                hmacHeader: { type: "apiKey", in: "header", name: "x-signature" }
            }
        }
    });
});
export default router;
