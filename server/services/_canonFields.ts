// Helper functions for canonical field access
function get<T=unknown>(obj: any, path: string, dflt?: T): T {
  return path.split('.').reduce((o, k) => (o && k in o ? (o as any)[k] : undefined), obj) ?? (dflt as any);
}

function preferCanon(canon: any, legacy: any, path: string, fallbackPath?: string) {
  const v = get(canon, path);
  if (v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '')) return v;
  if (fallbackPath) return get(legacy, fallbackPath);
  return get(legacy, path);
}

export function buildPdfData(app: any) {
  const canon = app?.application_canon ?? {}; const legacy = app || {};
  return {
    id: app.id,
    businessName: preferCanon(canon, legacy, 'business.businessName', 'business_name'),
    industry:     preferCanon(canon, legacy, 'business.industry', 'industry'),
    requested:    preferCanon(canon, legacy, 'financial.requestedAmount', 'amount_requested'),
    useOfFunds:   preferCanon(canon, legacy, 'financial.useOfFunds', 'use_of_funds'),
    annualRevenue:preferCanon(canon, legacy, 'financial.annualRevenue', 'revenue'),
    contact: {
      firstName: preferCanon(canon, legacy, 'applicant.firstName', 'applicant_name'),
      email:     preferCanon(canon, legacy, 'applicant.email', 'applicant_email'),
      phone:     preferCanon(canon, legacy, 'applicant.phone', 'applicant_phone'),
    },
    submittedAt:  preferCanon(canon, legacy, 'system.submittedAt', 'createdAt'),
  };
}

export function buildCreditInput(app: any) {
  const canon = app?.application_canon ?? {}; const legacy = app || {};
  return {
    businessName:     preferCanon(canon, legacy, 'business.businessName', 'business_name'),
    yearsInBusiness:  preferCanon(canon, legacy, 'business.yearsInBusiness'),
    annualRevenue:    preferCanon(canon, legacy, 'financial.annualRevenue', 'revenue'),
    requestedAmount:  preferCanon(canon, legacy, 'financial.requestedAmount', 'amount_requested'),
    country:          preferCanon(canon, legacy, 'business.country', 'country'),
    industry:         preferCanon(canon, legacy, 'business.industry', 'industry'),
    accountsReceivableBalance: preferCanon(canon, legacy, 'financial.accountsReceivableBalance'),
    fundsPurpose:     preferCanon(canon, legacy, 'financial.useOfFunds', 'use_of_funds'),
    category:         preferCanon(canon, legacy, 'product.selectedCategory','product_category'),
  };
}

export function buildLenderExport(app: any, traceId?: string) {
  const canon = app?.application_canon ?? {}; const legacy = app || {};
  return {
    applicant: {
      name: [preferCanon(canon, legacy, 'applicant.firstName'), preferCanon(canon, legacy, 'applicant.lastName')].filter(Boolean).join(' ').trim(),
      email: preferCanon(canon, legacy, 'applicant.email', 'applicant_email'),
      phone: preferCanon(canon, legacy, 'applicant.phone', 'applicant_phone'),
    },
    business: {
      name: preferCanon(canon, legacy, 'business.businessName', 'business_name'),
      industry: preferCanon(canon, legacy, 'business.industry', 'industry'),
      country: preferCanon(canon, legacy, 'business.country', 'country'),
      revenue: preferCanon(canon, legacy, 'financial.annualRevenue', 'revenue'),
      yearsInBusiness: preferCanon(canon, legacy, 'business.yearsInBusiness'),
    },
    request: {
      amount:   preferCanon(canon, legacy, 'financial.requestedAmount', 'amount_requested'),
      purpose:  preferCanon(canon, legacy, 'financial.useOfFunds', 'use_of_funds'),
      category: preferCanon(canon, legacy, 'product.selectedCategory', 'product_category'),
    },
    traceId,
    version: app?.application_canon_version || 'v1',
  };
}