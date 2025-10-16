import { Router } from "express";

const router = Router();

// Schema endpoint for lender products
router.get("/api/schema/lender-products", (req: any, res: any) => {
  const schema = {
    success: true,
    schema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          format: "uuid",
          description: "Unique identifier for the lender product"
        },
        lenderName: {
          type: "string",
          minLength: 1,
          description: "Name of the lending institution"
        },
        productName: {
          type: "string", 
          minLength: 1,
          description: "Name of the specific lending product"
        },
        category: {
          type: "string",
          enum: ["LOC", "Term Loan", "Factoring", "Working Capital"],
          description: "Category of the lending product"
        },
        country: {
          type: "string",
          enum: ["Canada", "USA", "US"],
          description: "Country where the product is available"
        },
        minAmount: {
          type: "number",
          minimum: 0,
          description: "Minimum loan amount"
        },
        maxAmount: {
          type: "number", 
          minimum: 0,
          description: "Maximum loan amount"
        },
        interestRate: {
          type: "number",
          minimum: 0,
          description: "Interest rate percentage"
        },
        termLength: {
          type: "string",
          minLength: 1,
          description: "Loan term length (e.g., '12 months')"
        },
        documentsRequired: {
          type: "array",
          items: {
            type: "string"
          },
          description: "List of required documents"
        },
        description: {
          type: "string",
          description: "Product description"
        },
        updatedAt: {
          type: "string",
          format: "date-time",
          description: "Last update timestamp"
        }
      },
      required: [
        "id", 
        "lenderName", 
        "productName", 
        "category", 
        "country", 
        "minAmount", 
        "maxAmount", 
        "interestRate", 
        "termLength", 
        "documentsRequired", 
        "description", 
        "updatedAt"
      ],
      additionalProperties: false
    },
    version: "1.0.0",
    lastUpdated: new Date().toISOString()
  };

  res.json(schema);
});

export default router;