const pick = (o, ...ks) => ks.reduce((a, k) => (o?.[k] != null ? (a[k] = o[k], a) : a), {});
export function normalizeSubmission(payload) {
    const f = payload?.financial || payload?.financialProfile || {};
    const b = payload?.business || payload?.businessDetails || {};
    const a = payload?.applicant || payload?.applicantInfo || {};
    const step1 = payload?.step1 || {};
    const step3 = payload?.step3 || {};
    const step4 = payload?.step4 || {};
    // Handle various amount field locations
    const amount = payload?.fundingAmount ??
        f?.fundingAmount ??
        b?.requestedAmount ??
        step1?.requestedAmount ??
        payload?.requestedAmount;
    return {
        businessName: b?.legalName ||
            b?.operatingName ||
            b?.businessName ||
            step3?.businessName ||
            payload?.company ||
            payload?.businessName ||
            'Unknown',
        operatingName: b?.operatingName || step3?.operatingName,
        legalName: b?.legalName || step3?.legalName || step3?.businessName,
        industry: b?.industry || step3?.industry,
        location: {
            country: b?.country || step3?.country || payload?.country,
            province: b?.state || b?.province || step3?.province || step3?.state,
            city: b?.city || step3?.city
        },
        requestedAmountCents: amount ? Math.round(Number(String(amount).replace(/[$, ]/g, '')) * 100) : undefined,
        employees: Number(b?.employeeCount ?? b?.employees ?? step3?.employees ?? step3?.numberOfEmployees ?? payload?.employees) || undefined,
        contact: {
            firstName: a?.firstName || step4?.firstName,
            lastName: a?.lastName || step4?.lastName,
            email: a?.email || b?.email || step4?.email || payload?.email,
            phone: a?.phone || b?.phone || step4?.phone || step3?.businessPhone || payload?.phone
        },
        ownershipPct: Number(a?.ownershipPercentage ?? a?.ownershipPct ?? step4?.ownershipPercentage) || undefined,
        propertyValue: Number(f?.fixedAssetsValue ?? b?.propertyValue) || undefined,
        mortgageBalance: Number(f?.mortgageBalance ?? b?.mortgageBalance) || undefined
    };
}
