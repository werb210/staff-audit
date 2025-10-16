/**
 * Canonical application schema with precedence rules.
 * We treat all input as strings/numbers/booleans and normalize to a single JSON.
 */
export type CanonicalApplication = {
  country?: string;
  province?: string;               // e.g., AB, BC, MB
  industry?: string;
  category?: string;               // fundsPurpose normalized (working_capital, equipment, expansion, etc.)
  requested_amount?: number;
  annual_revenue?: number;         // precedence: annualRevenue > estimatedYearlyRevenue > revenueLastYear
  revenue_last_year?: number;
  avg_monthly_revenue?: number;
  ar_balance?: number;
  fixed_assets_value?: number;
  equipment_value?: number;

  legal_name?: string;
  operating_name?: string;
  display_name?: string;           // best-of businessName/operatingName/legalName

  business: {
    street?: string;
    city?: string;
    state?: string;
    postal?: string;
    phone?: string;
    website?: string;
    start_date?: string;           // ISO
    structure?: string;            // corporation, etc.
    employees?: number;
    years_in_business?: number;
    headquarters_state?: string;
  };

  applicant: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postal?: string;
    dob?: string;                  // ISO
    ownership_pct?: number;
    has_partner?: boolean;
  };

  sales_history?: string;          // e.g., "3+yr"
  looking_for?: string;            // capital, equipment, etc.
};

const pick = <T>(...vals: (T|undefined|null)[]) => vals.find(v => v !== undefined && v !== null && v !== "");

export function mapToCanonical(payload: Record<string, any>): { canonical: CanonicalApplication, unmapped: string[], coverage: number } {
  const keys = Object.keys(payload || {});
  const used = new Set<string>();

  const num = (v:any) => (v === null || v === undefined || v === '') ? undefined : Number(v);
  const str = (v:any) => (v === null || v === undefined) ? undefined : String(v);
  const bool = (v:any) => (v === null || v === undefined) ? undefined : (v === true || v === "true");

  const country = pick(payload.country, payload.businessLocation, payload.headquarters);
  if (country !== undefined) used.add(country === payload.country ? "country" : (country === payload.businessLocation ? "businessLocation" : "headquarters"));

  const province = pick(payload.businessState, payload.headquartersState);
  if (province !== undefined) used.add(province === payload.businessState ? "businessState" : "headquartersState");

  const requested_amount = num(pick(payload.requestedAmount, payload.fundingAmount, payload['Funding Amount']));

  const annual_revenue = num(pick(payload.annualRevenue, payload.estimatedYearlyRevenue, payload.revenueLastYear, payload['Revenue Last Year'], payload['Estimated Yearly Revenue']));
  const revenue_last_year = num(pick(payload.revenueLastYear, payload['Revenue Last Year']));
  const avg_monthly_revenue = num(pick(payload.averageMonthlyRevenue, payload['Average Monthly Revenue']));
  const ar_balance = num(pick(payload.accountsReceivableBalance, payload['Accounts Receivable Balance']));
  const fixed_assets_value = num(pick(payload.fixedAssetsValue, payload['Fixed Assets Value']));
  const equipment_value = num(pick(payload.equipmentValue, payload['Equipment Value']));

  const legal_name = str(pick(payload.legalName, payload['Legal Name']));
  const operating_name = str(pick(payload.operatingName, payload['Operating Name']));
  const display_name = str(pick(payload.businessName, payload['Business Name'], payload.operatingName, payload['Operating Name'], payload.legalName, payload['Legal Name']));

  const category = str(pick(payload.fundsPurpose, payload['Funding Purpose']));
  const industry = str(pick(payload.industry, payload['Industry']));
  const looking_for = str(payload.lookingFor);
  const sales_history = str(pick(payload.salesHistory, payload['Sales History']));

  const business = {
    street: str(pick(payload.businessStreetAddress, payload['Business Address'])),
    city:   str(payload.businessCity),
    state:  str(payload.businessState),
    postal: str(payload.businessPostalCode),
    phone:  str(pick(payload.businessPhone, payload['Business Phone'])),
    website:str(pick(payload.businessWebsite, payload['Business Website'])),
    start_date: str(pick(payload.businessStartDate, payload['Business Start Date'])),
    structure:  str(pick(payload.businessStructure, payload['Business Structure'], payload.businessType)),
    employees:  num(pick(payload.employeeCount, payload['Employee Count'])),
    years_in_business: num(payload.yearsInBusiness),
    headquarters_state: str(payload.headquartersState),
  };

  const applicant = {
    first_name: str(pick(payload.applicantFirstName, payload['First Name'])),
    last_name:  str(pick(payload.applicantLastName, payload['Last Name'])),
    email:      str(pick(payload.applicantEmail, payload['Email'])),
    phone:      str(pick(payload.applicantPhone, payload['Phone'])),
    address:    str(pick(payload.applicantAddress, payload['Address'])),
    city:       str(payload.applicantCity),
    state:      str(payload.applicantState),
    postal:     str(payload.applicantZipCode),
    dob:        str(pick(payload.applicantDateOfBirth, payload['Date of Birth'])),
    ownership_pct: num(pick(payload.ownershipPercentage, payload['Ownership Percentage'])),
    has_partner:   bool(pick(payload.hasPartner, payload['Has Partner'])),
  };

  // track used keys (including space-separated field names from form submission)
  [
    "country","businessLocation","headquarters",
    "businessState","headquartersState",
    "requestedAmount","fundingAmount","Funding Amount",
    "annualRevenue","estimatedYearlyRevenue","revenueLastYear","Revenue Last Year","Estimated Yearly Revenue",
    "averageMonthlyRevenue","Average Monthly Revenue","accountsReceivableBalance","Accounts Receivable Balance","fixedAssetsValue","Fixed Assets Value","equipmentValue","Equipment Value",
    "legalName","Legal Name","operatingName","Operating Name","businessName","Business Name",
    "fundsPurpose","Funding Purpose","industry","Industry","lookingFor","salesHistory","Sales History",
    "businessStreetAddress","Business Address","businessCity","businessState","businessPostalCode","businessPhone","Business Phone","businessWebsite","Business Website","businessStartDate","Business Start Date","businessStructure","Business Structure","businessType","employeeCount","Employee Count","yearsInBusiness",
    "applicantFirstName","First Name","applicantLastName","Last Name","applicantEmail","Email","applicantPhone","Phone","applicantAddress","Address","applicantCity","applicantState","applicantZipCode","applicantDateOfBirth","Date of Birth","ownershipPercentage","Ownership Percentage","hasPartner","Has Partner"
  ].forEach(k=> { if (k in payload) used.add(k); });

  const canonical: CanonicalApplication = {
    country: str(country),
    province: str(province),
    industry,
    category,
    requested_amount,
    annual_revenue,
    revenue_last_year,
    avg_monthly_revenue,
    ar_balance,
    fixed_assets_value,
    equipment_value,
    legal_name,
    operating_name,
    display_name,
    business,
    applicant,
    sales_history,
    looking_for,
  };

  // coverage
  const recognized = Array.from(used);
  const unmapped = keys.filter(k => !recognized.includes(k));
  const coverage = keys.length ? Number(((recognized.length / keys.length) * 100).toFixed(2)) : 0;

  return { canonical, unmapped, coverage };
}