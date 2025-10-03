// server/lib/canonicalizeApp.ts
export function canonicalizeOutgoing(a: any) {
  return {
    business_name: a.business_name ?? a.businessLegalName ?? a.name ?? null,
    legal_name:    a.legal_name ?? a.legalName ?? null,
    dba:           a.dba ?? a.trade_name ?? null,
    email:         a.email ?? a.contact_email ?? a.applicantEmail ?? null,
    mobile:        a.mobile ?? a.phone_mobile ?? a.applicantMobile ?? null,
    home_phone:    a.home_phone ?? a.applicantHomePhone ?? null,
    birth_date:    a.birth_date ?? a.birthDate ?? null,
    sin:           a.sin ?? a.ssn ?? null,
    title:         a.title ?? a.job_title ?? null,
    address:       a.address ?? a.street ?? a.businessStreetAddress ?? null,
    city:          a.city ?? null,
    province:      a.province ?? a.state ?? null,
    postal_code:   a.postal_code ?? a.postal ?? a.zip ?? null,
    industry:      a.industry ?? a.naics ?? null,
    website:       a.website ?? a.url ?? null,
    start_date:    a.start_date ?? a.started_at ?? a.startDate ?? null,
    employees:     a.employees ?? a.employee_count ?? null,
    registration_no: a.registration_no ?? a.registrationNumber ?? null,
    // Keep all other existing fields unchanged
    ...a
  };
}