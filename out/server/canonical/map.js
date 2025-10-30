export const alias = {
    // product / amounts
    product_id: ['product_id', 'product.id', 'lenderProductId', 'selectedProductId'],
    country: ['country', 'business.country', 'headquartersState', 'businessState'],
    product_category: ['product_category', 'selectedCategory', 'loanProductCategory'],
    amount_requested: ['amount_requested', 'amount', 'fundingAmount', 'requestedAmount', 'loanAmount', 'step1.requestedAmount'],
    years_in_business: ['years_in_business', 'yearsInBusiness', 'businessAgeYears'],
    months_in_business: ['time_in_business_months'],
    annual_revenue: ['annual_revenue', 'revenueLastYear', 'estimatedYearlyRevenue', 'last12moRevenue', 'formData.businessInfo.revenue'],
    monthly_revenue: ['monthly_revenue', 'avgMonthlyRevenue', 'averageMonthlyRevenue', 'monthlyRevenue'],
    // business
    business_legal_name: ['business_legal_name', 'legalName', 'formData.businessInfo.legalName', 'businessName'],
    business_trade_name: ['operatingName', 'business_trade_name'],
    industry: ['industry', 'formData.businessInfo.industry'],
    business_street: ['businessStreetAddress', 'business.address.line1'],
    business_city: ['businessCity', 'business.address.city'],
    business_state: ['businessState', 'business.address.state', 'headquartersState'],
    business_postal_code: ['businessPostalCode', 'business.address.postal_code'],
    business_website: ['businessWebsite', 'website', 'formData.businessInfo.website'],
    // contact / applicant (combine if needed)
    contact_name: ['contact_name', 'step4.firstName + step4.lastName', 'formData.personalDetails.name'],
    contact_email: ['contact_email', 'step4.email', 'step4.applicantEmail', 'formData.personalDetails.email'],
    contact_phone: ['contact_phone', 'step4.phone', 'step4.applicantPhone', 'formData.personalDetails.phone'],
    applicant_first_name: ['step4.firstName'],
    applicant_last_name: ['step4.lastName'],
    // docs
    documents: ['documents', 'uploadedDocuments', 'formData.documents']
};
