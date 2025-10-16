// Helper for canonical-first field access in pipeline cards

function get<T=unknown>(obj: any, path: string, dflt?: T): T {
  return path.split('.').reduce((o, k) => (o && k in o ? (o as any)[k] : undefined), obj) ?? (dflt as any);
}

function preferCanon(canon: any, legacy: any, path: string, fallbackPath?: string) {
  const v = get(canon, path);
  if (v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '')) return v;
  if (fallbackPath) return get(legacy, fallbackPath);
  return get(legacy, path);
}

export function cardFields(application: any) {
  const canon = application?.application_canon ?? {};
  const legacy = application || {};
  return {
    businessName: preferCanon(canon, legacy, 'business.businessName', 'business_name'),
    industry:     preferCanon(canon, legacy, 'business.industry', 'industry'),
    requestedAmt: preferCanon(canon, legacy, 'financial.requestedAmount', 'amount_requested'),
    annualRev:    preferCanon(canon, legacy, 'financial.annualRevenue', 'revenue'),
    status:       legacy.status,
  };
}