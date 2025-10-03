export function normalizeSubmission(p: any) {
  const s1 = p.step1 ?? {}, s3 = p.step3 ?? {}, s4 = p.step4 ?? {};
  const businessName = s3.legalName || s3.businessName;
  const email = s4.email;

  if (!businessName) throw new Error('businessName required');
  if (!email) throw new Error('contact email required');

  return {
    businessName,
    dba: s3.operatingName ?? s3.dba ?? null,
    requestedAmount: Number(s1.requestedAmount) || 0,
    industry: s1.industry || s3.industry || null,
    address: {
      street: s3.street, 
      city: s3.city, 
      province: s3.state,
      postal: s3.postalCode, 
      country: s3.country || 'CA'
    },
    owner: {
      firstName: s4.firstName, 
      lastName: s4.lastName,
      percent: Number(s4.ownershipPct) || 100, 
      dob: s4.dob ?? null
    },
    contact: { 
      email, 
      phone: s3.phone || s4.phone || null 
    },
  };
}