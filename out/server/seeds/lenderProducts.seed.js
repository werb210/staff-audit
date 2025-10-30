// server/seeds/lenderProducts.seed.ts - Add PO Financing products for testing
export const PO_FINANCING_PRODUCTS = [
    {
        lenderName: "Capital Plus",
        productName: "Purchase Order Financing",
        productCategory: "Purchase Order Financing",
        minimumLendingAmount: 10000,
        maximumLendingAmount: 500000,
        countryOffered: "US",
        isActive: true,
        industryRestriction: ["Retail", "Manufacturing"],
        advanceRatePct: 80,
        description: "Finance your purchase orders to fulfill customer demand"
    },
    {
        lenderName: "Trade Finance Partners",
        productName: "PO Advance Program",
        productCategory: "Purchase Order Financing",
        minimumLendingAmount: 25000,
        maximumLendingAmount: 1000000,
        countryOffered: "US",
        isActive: true,
        industryRestriction: ["Retail", "Manufacturing"],
        advanceRatePct: 75,
        description: "Large scale purchase order funding for established businesses"
    }
];
export function seedPOFinancingProducts() {
    return PO_FINANCING_PRODUCTS;
}
