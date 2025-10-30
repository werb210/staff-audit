export const CATEGORY_BASELINES = {
    "Working Capital": {
        min_amount: 25000,
        max_amount: 500000,
        required_documents: [
            "Bank Statements (6 months)",
            "Business Tax Returns",
            "Accountant-Prepared Financial Statements"
        ]
    },
    "Equipment Financing": {
        min_amount: 10000,
        max_amount: 2000000,
        required_documents: [
            "Equipment Quote/Invoice",
            "Equipment Appraisal (if used)",
            "Bank Statements (6 months)"
        ]
    },
    "Line of Credit": {
        min_amount: 15000,
        max_amount: 750000,
        required_documents: [
            "Bank Statements (6 months)",
            "Business Tax Returns",
            "Cash Flow Statement"
        ]
    },
    "Term Loan": {
        min_amount: 50000,
        max_amount: 1500000,
        required_documents: [
            "Bank Statements (6 months)",
            "Business Tax Returns",
            "Financial Statements"
        ]
    },
    "Business Loan": {
        min_amount: 25000,
        max_amount: 1000000,
        required_documents: [
            "Bank Statements (6 months)",
            "Business Tax Returns",
            "Profit & Loss Statement",
            "Business License"
        ]
    }
};
