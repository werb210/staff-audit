// All aliases we will tolerate from server/client payloads.
// Left side = UI key; right side = "first match wins" aliases.
export const FIELD_MAP: Record<string, string[]> = {
  firstName: ["first_name", "applicantFirstName", "firstName"],
  lastName: ["last_name", "applicantLastName", "lastName"],
  email: ["email", "contact_email", "applicantEmail"],
  mobile: ["mobile", "phone_mobile", "applicantMobile"],
  homePhone: ["home_phone", "applicantHomePhone"],

  businessName: ["business_name", "businessLegalName", "name"],
  legalName: ["legal_name", "legalName"],
  dba: ["dba", "trade_name"],
  industry: ["industry", "naics"],
  website: ["website", "url"],
  startDate: ["start_date", "started_at", "startDate"],
  employees: ["employees", "employee_count"],
  registration: ["registration_no", "registrationNumber"],

  address: ["address", "street", "businessStreetAddress"],
  city: ["city"],
  province: ["province", "state"],
  postal: ["postal_code", "postal", "zip"],

  ownershipPct: ["ownership_pct", "ownershipPercent"],
  rentOrOwn: ["rent_or_own", "occupancy"],
  propertyVal: ["property_value"],
  mortgageBal: ["mortgage_balance"]
};