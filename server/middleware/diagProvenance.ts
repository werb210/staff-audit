import type { Request, Response, NextFunction } from 'express';
import { prov } from '../utils/provenance';

/**
 * Wrap res.json so when diag=1 we augment known payloads with _prov per record.
 * Does NOT create new routes; only decorates existing responses.
 */
export function diagProvenance() {
  return function (req: Request, res: Response, next: NextFunction) {
    const wantDiag = req.query.diag === '1' || String(req.headers['x-diag'] || '') === '1';
    if (!wantDiag) return next();

    const origJson = res.json.bind(res);
    res.json = (body: any) => {
      try {
        const path = req.path || '';

        // Helper: tag LENDER PRODUCT (legacy shape)
        const tagLegacyProduct = (p: any) => {
          // Heuristics for legacy fields -> adjust if your transformer differs
          const tagged = prov.attach(p, {
            id: prov.db(),
            productName: prov.db(),
            countryOffered:
              p.countryOffered == null
                ? prov.fallbackNull('missing legacy mapping')
                : prov.alias('country', 'legacy alias') as any,
            productCategory:
              p.productCategory == null
                ? prov.fallbackNull()
                : prov.alias('category'),
            minimumLendingAmount:
              p.minimumLendingAmount == null
                ? prov.fallbackNull()
                : prov.alias('min_amount'),
            maximumLendingAmount:
              p.maximumLendingAmount == null
                ? prov.fallbackNull()
                : prov.alias('max_amount'),
            min_time_in_business:
              p.min_time_in_business == null ? prov.fallbackNull() : prov.db(),
            min_monthly_revenue:
              p.min_monthly_revenue == null ? prov.fallbackNull() : prov.db(),
            required_documents:
              Array.isArray(p.required_documents) ? prov.db() : prov.fallbackNull(),
            excluded_industries:
              Array.isArray(p.excluded_industries) ? prov.db() : prov.fallbackNull(),
          });
          return tagged;
        };

        // Helper: tag V1 PRODUCT (.items[])
        const tagV1Product = (p: any) => prov.attach(p, {
          id: prov.db(),
          lender_id: prov.db(),
          product_name: prov.db(),
          country: p.country == null ? prov.fallbackNull() : prov.db(),
          category: p.category == null ? prov.fallbackNull() : prov.db(),
          min_amount: p.min_amount == null ? prov.fallbackNull() : prov.db(),
          max_amount: p.max_amount == null ? prov.fallbackNull() : prov.db(),
          min_time_in_business: p.min_time_in_business == null ? prov.fallbackNull() : prov.db(),
          min_monthly_revenue: p.min_monthly_revenue == null ? prov.fallbackNull() : prov.db(),
          required_documents: Array.isArray(p.required_documents) ? prov.db() : prov.fallbackNull(),
          excluded_industries: Array.isArray(p.excluded_industries) ? prov.db() : prov.fallbackNull(),
          active: typeof p.active === 'boolean' ? prov.db() : prov.fallbackNull(),
        });

        // Helper: tag LENDER (.items[] or array)
        const tagLender = (l: any) => prov.attach(l, {
          id: prov.db(),
          name: prov.db(),
          country: l.country == null ? prov.fallbackNull() : prov.db(),
          website: l.website == null ? prov.fallbackNull() : prov.db(),
          active: typeof l.active === 'boolean' ? prov.db() : prov.fallbackNull(),
        });

        // Helper: tag APPLICATION (validate-intake echo or created row)
        const tagApplication = (a: any) => prov.attach(a, {
          id: a.id ? prov.db('server-generated') : prov.computed('pre-submission'),
          product_id: a.product_id == null ? prov.fallbackNull() : prov.db(),
          submission_country: a.submission_country == null ? prov.fallbackNull() : prov.db(),
          amount: a.amount == null ? prov.fallbackNull() : prov.db(),
          timeInBusinessMonths: a.timeInBusinessMonths == null ? prov.fallbackNull() : prov.db(),
          monthlyRevenue: a.monthlyRevenue == null ? prov.fallbackNull() : prov.db(),
          industry: a.industry == null ? prov.fallbackNull() : prov.db(),
          product_snapshot: a.product_snapshot ? prov.db('snapshot persisted') : prov.fallbackNull(),
          required_documents: Array.isArray(a.required_documents) ? prov.db() : prov.fallbackNull(),
        });

        let augmented = body;
        // LEGACY products (structure: { total: X, products: [...] })
        if (body && body.products && Array.isArray(body.products) && path.includes('lender-products')) {
          const list = body.products.map(tagLegacyProduct);
          augmented = { ...body, products: list };
          (augmented as any)._diag = { counts: prov.summarize(list as any) };
        }
        // V1 products (direct array response)
        else if (Array.isArray(body) && path.includes('v1/products')) {
          const items = body.map(tagV1Product);
          augmented = items;
          (augmented as any)._diag = { counts: prov.summarize(items as any) };
        }
        // V1 lenders
        else if (body && body.items && path.includes('/api/v1/lenders')) {
          const items = Array.isArray(body.items) ? body.items.map(tagLender) : body.items;
          augmented = { ...body, items };
          (augmented as any)._diag = { counts: prov.summarize(items as any) };
        }
        // validate-intake (echo product + intake)
        else if (body && (path.includes('/applications/validate-intake') || path.endsWith('/applications'))) {
          if (body.product) body.product = tagV1Product(body.product);
          if (body.intake) body.intake = tagApplication(body.intake);
          if (body.application) body.application = tagApplication(body.application);
          (body as any)._diag = { counts: prov.summarize([body.product, body.intake, body.application].filter(Boolean) as any) };
          augmented = body;
        }

        return origJson(augmented);
      } catch (e) {
        // On any error, fall back to original body to avoid breaking prod.
        return origJson(body);
      }
    };
    next();
  };
}
export default diagProvenance;