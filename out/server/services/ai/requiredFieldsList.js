export const REQUIRED_FIELDS = [
    // Business Information
    {
        label: 'Business Name',
        category: 'business',
        aliases: ['Legal Business Name', 'Company Name', 'Business Entity'],
        required: true
    },
    {
        label: 'Business Address',
        category: 'business',
        aliases: ['Business Location', 'Company Address', 'Registered Address'],
        required: true
    },
    {
        label: 'Website URL',
        category: 'business',
        aliases: ['Website', 'Company Website', 'Web Address'],
        pattern: '(https?://[^\\s]+)',
        required: false
    },
    {
        label: 'Industry Code',
        category: 'business',
        aliases: ['NAICS Code', 'SIC Code', 'Industry Classification'],
        required: false
    },
    // Financial Information  
    {
        label: 'Revenue Last Year',
        category: 'financial',
        aliases: ['Annual Revenue', 'Gross Revenue', 'Total Revenue'],
        pattern: '\\$?([0-9,]+(?:\\.[0-9]{2})?)',
        required: true
    },
    {
        label: 'Revenue YTD',
        category: 'financial',
        aliases: ['Year to Date Revenue', 'YTD Sales', 'Current Year Revenue'],
        pattern: '\\$?([0-9,]+(?:\\.[0-9]{2})?)',
        required: true
    },
    {
        label: 'Monthly Revenue',
        category: 'financial',
        aliases: ['Monthly Sales', 'Average Monthly Revenue', 'Monthly Income'],
        pattern: '\\$?([0-9,]+(?:\\.[0-9]{2})?)',
        required: false
    },
    {
        label: 'Bank Balance',
        category: 'financial',
        aliases: ['Account Balance', 'Current Balance', 'Cash Balance'],
        pattern: '\\$?([0-9,]+(?:\\.[0-9]{2})?)',
        required: false
    },
    // Compliance & Tax
    {
        label: 'GST Number',
        category: 'compliance',
        aliases: ['GST/HST Number', 'Tax Number', 'Business Number'],
        pattern: '([0-9]{9}RT[0-9]{4})',
        required: true
    },
    {
        label: 'SIN',
        category: 'personal',
        aliases: ['Social Insurance Number', 'Personal SIN'],
        pattern: '([0-9]{3}[-\\s]?[0-9]{3}[-\\s]?[0-9]{3})',
        required: false
    },
    // Banking Information
    {
        label: 'Account Number',
        category: 'financial',
        aliases: ['Bank Account', 'Account #'],
        pattern: '([0-9]{7,12})',
        required: false
    },
    {
        label: 'Transit Number',
        category: 'financial',
        aliases: ['Branch Transit', 'Transit #'],
        pattern: '([0-9]{5})',
        required: false
    },
    // Dates
    {
        label: 'Incorporation Date',
        category: 'business',
        aliases: ['Date of Incorporation', 'Business Start Date'],
        pattern: '([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{4})',
        required: false
    }
];
// Get fields by category
export const getFieldsByCategory = (category) => {
    return REQUIRED_FIELDS.filter(field => field.category === category);
};
// Get required fields only
export const getRequiredFields = () => {
    return REQUIRED_FIELDS.filter(field => field.required);
};
// Find field by label or alias
export const findField = (searchTerm) => {
    const term = searchTerm.toLowerCase();
    return REQUIRED_FIELDS.find(field => field.label.toLowerCase() === term ||
        field.aliases?.some(alias => alias.toLowerCase() === term));
};
