import { z } from "zod";

export const countrySchema = z.enum(["US","CA"]);
export const categoriesQuery = z.object({
  amount: z.coerce.number().positive(),
  country: z.string().transform(s=>s.toUpperCase()).pipe(countrySchema),
  includeInactive: z.enum(["0","1"]).default("1").optional()
});

export const exportQuery = z.object({
  country: z.string().optional().transform(s => (s||"").toUpperCase()),
  amount: z.coerce.number().positive().optional(),
  lenderId: z.string().uuid().optional(),
  includeInactive: z.enum(["0","1"]).default("1").optional()
});

export function validate(schema, pick="query"){
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[pick]);
      req[pick] = parsed;
      next();
    } catch (err) {
      const first = err?.issues?.[0];
      return res.status(412).json({
        error: "validation_error",
        message: first ? `${first.path?.join(".")}: ${first.message}` : "Invalid input",
        requestId: req?.id
      });
    }
  };
}