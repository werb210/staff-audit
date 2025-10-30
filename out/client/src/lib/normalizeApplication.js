export function normalizeApplication(a) {
    return {
        // Applicant
        firstName: a.first_name ?? a.applicantFirstName ?? a.firstName ?? "",
        lastName: a.last_name ?? a.applicantLastName ?? a.lastName ?? "",
        email: a.email ?? a.contact_email ?? a.applicantEmail ?? "",
        mobile: a.mobile ?? a.phone_mobile ?? a.applicantMobile ?? "",
        homePhone: a.home_phone ?? a.applicantHomePhone ?? "",
        birthDate: a.birth_date ?? a.birthDate ?? "",
        sin: a.sin ?? a.ssn ?? "",
        title: a.title ?? a.job_title ?? "",
        // Business
        businessName: a.business_name ?? a.businessLegalName ?? a.name ?? "",
        legalName: a.legal_name ?? a.legalName ?? "",
        dba: a.dba ?? a.trade_name ?? "",
        industry: a.industry ?? a.naics ?? "",
        website: a.website ?? a.url ?? "",
        startDate: a.start_date ?? a.started_at ?? a.startDate ?? "",
        employees: a.employees ?? a.employee_count ?? "",
        registration: a.registration_no ?? a.registrationNumber ?? a.registration ?? "",
        // Address
        address: a.address ?? a.street ?? a.businessStreetAddress ?? "",
        city: a.city ?? "",
        province: a.province ?? a.state ?? "",
        postal: a.postal_code ?? a.postal ?? a.zip ?? "",
        // Ownership & Property
        ownershipPct: a.ownership_pct ?? a.ownershipPercent ?? "",
        rentOrOwn: a.rent_or_own ?? a.occupancy ?? "",
        propertyVal: a.property_value ?? "",
        mortgageBal: a.mortgage_balance ?? "",
    };
}
