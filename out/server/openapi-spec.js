/**
 * OpenAPI 3.0 Specification for Lender Products Management System
 * Comprehensive API documentation for lending platform
 */
export const openApiDocument = {
    openapi: "3.0.3",
    info: {
        title: "Lender Products Management API",
        description: "Comprehensive API for managing lender products, applications, and document workflows",
        version: "2.0.0",
        contact: {
            name: "API Support",
            email: "support@boreal.com"
        }
    },
    servers: [
        {
            url: "https://staffportal.replit.app",
            description: "Production server"
        },
        {
            url: "http://localhost:5000",
            description: "Development server"
        }
    ],
    paths: {
        "/api/lender-products": {
            get: {
                summary: "Get all lender products",
                description: "Retrieve all lender products with optional filtering",
                tags: ["Lender Products"],
                parameters: [
                    {
                        name: "category",
                        in: "query",
                        description: "Filter by product category",
                        schema: {
                            type: "string",
                            enum: ["Business Line of Credit", "Term Loan", "Invoice Factoring", "Equipment Financing", "Purchase Order Financing", "Working Capital"]
                        }
                    },
                    {
                        name: "country",
                        in: "query",
                        description: "Filter by country",
                        schema: {
                            type: "string",
                            enum: ["United States", "Canada"]
                        }
                    }
                ],
                responses: {
                    "200": {
                        description: "List of lender products",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/LenderProduct" }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                summary: "Create new lender product",
                description: "Add a new lender product to the database",
                tags: ["Lender Products"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateLenderProduct" }
                        }
                    }
                },
                responses: {
                    "201": {
                        description: "Product created successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/LenderProduct" }
                            }
                        }
                    },
                    "400": {
                        description: "Invalid input data"
                    }
                }
            }
        },
        "/api/lender-products/{id}": {
            get: {
                summary: "Get lender product by ID",
                tags: ["Lender Products"],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" }
                    }
                ],
                responses: {
                    "200": {
                        description: "Lender product details",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/LenderProduct" }
                            }
                        }
                    },
                    "404": {
                        description: "Product not found"
                    }
                }
            },
            patch: {
                summary: "Update lender product",
                tags: ["Lender Products"],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateLenderProduct" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Product updated successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/LenderProduct" }
                            }
                        }
                    },
                    "404": {
                        description: "Product not found"
                    }
                }
            },
            delete: {
                summary: "Delete lender product",
                tags: ["Lender Products"],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" }
                    }
                ],
                responses: {
                    "204": {
                        description: "Product deleted successfully"
                    },
                    "404": {
                        description: "Product not found"
                    }
                }
            }
        },
        "/api/public/lenders": {
            get: {
                summary: "Get public lender products (CORS-enabled)",
                description: "Public endpoint for client applications to retrieve lender products",
                tags: ["Public API"],
                responses: {
                    "200": {
                        description: "List of public lender products",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/PublicLenderProduct" }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/applications": {
            get: {
                summary: "Get all applications",
                description: "Retrieve applications for sales pipeline",
                tags: ["Applications"],
                responses: {
                    "200": {
                        description: "List of applications",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/Application" }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/applications/draft": {
            post: {
                summary: "Create draft application",
                description: "Create a new application in draft status",
                tags: ["Applications"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateApplicationRequest" }
                        }
                    }
                },
                responses: {
                    "201": {
                        description: "Draft application created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Application" }
                            }
                        }
                    }
                }
            }
        }
    },
    components: {
        schemas: {
            LenderProduct: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    lendername: { type: "string", example: "Brookridge Funding LLV" },
                    productname: { type: "string", example: "Purchase Order Financing" },
                    productcategory: {
                        type: "string",
                        enum: ["Business Line of Credit", "Term Loan", "Invoice Factoring", "Equipment Financing", "Purchase Order Financing", "Working Capital"]
                    },
                    minamount: { type: "number", example: 50000 },
                    maxamount: { type: "number", example: 30000000 },
                    minratepct: { type: "number", format: "float", example: 2.5 },
                    maxratepct: { type: "number", format: "float", example: 3.0 },
                    mintermmonths: { type: "integer", example: 12 },
                    maxtermmonths: { type: "integer", example: 12 },
                    ratetype: { type: "string", enum: ["Fixed", "Floating"] },
                    ratefrequency: { type: "string", enum: ["Monthly", "Annually"] },
                    country: { type: "string", enum: ["United States", "Canada"] },
                    minavgmonthlyrevenue: { type: "number", nullable: true },
                    mincreditscore: { type: "integer", nullable: true },
                    requireddocuments: {
                        type: "array",
                        items: { type: "string" },
                        example: ["Bank Statements", "Balance Sheet", "Profit and Loss Statement"]
                    }
                },
                required: ["lendername", "productname", "productcategory", "minamount", "maxamount"]
            },
            CreateLenderProduct: {
                type: "object",
                properties: {
                    lendername: { type: "string" },
                    productname: { type: "string" },
                    productcategory: { type: "string" },
                    minamount: { type: "number" },
                    maxamount: { type: "number" },
                    minratepct: { type: "number", format: "float" },
                    maxratepct: { type: "number", format: "float" },
                    mintermmonths: { type: "integer" },
                    maxtermmonths: { type: "integer" },
                    ratetype: { type: "string", enum: ["Fixed", "Floating"] },
                    ratefrequency: { type: "string", enum: ["Monthly", "Annually"] },
                    country: { type: "string", enum: ["United States", "Canada"] },
                    minavgmonthlyrevenue: { type: "number", nullable: true },
                    mincreditscore: { type: "integer", nullable: true },
                    requireddocuments: { type: "array", items: { type: "string" } }
                },
                required: ["lendername", "productname", "productcategory", "minamount", "maxamount"]
            },
            UpdateLenderProduct: {
                type: "object",
                properties: {
                    lendername: { type: "string" },
                    productname: { type: "string" },
                    productcategory: { type: "string" },
                    minamount: { type: "number" },
                    maxamount: { type: "number" },
                    minratepct: { type: "number", format: "float" },
                    maxratepct: { type: "number", format: "float" },
                    mintermmonths: { type: "integer" },
                    maxtermmonths: { type: "integer" },
                    ratetype: { type: "string" },
                    ratefrequency: { type: "string" },
                    country: { type: "string" },
                    minavgmonthlyrevenue: { type: "number", nullable: true },
                    mincreditscore: { type: "integer", nullable: true },
                    requireddocuments: { type: "array", items: { type: "string" } }
                }
            },
            PublicLenderProduct: {
                type: "object",
                properties: {
                    lenderName: { type: "string" },
                    productName: { type: "string" },
                    productCategory: { type: "string" },
                    minAmount: { type: "number" },
                    maxAmount: { type: "number" },
                    minRate: { type: "number" },
                    maxRate: { type: "number" },
                    country: { type: "string" },
                    requiredDocuments: { type: "array", items: { type: "string" } }
                }
            },
            Application: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    businessName: { type: "string" },
                    ownerName: { type: "string" },
                    requestedAmount: { type: "number" },
                    status: { type: "string", enum: ["draft", "submitted", "under_review", "approved", "declined", "funded"] },
                    stage: { type: "string", enum: ["New", "In Review", "Requires Docs", "Off to Lender", "Accepted", "Denied"] },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" }
                }
            },
            CreateApplicationRequest: {
                type: "object",
                properties: {
                    businessName: { type: "string" },
                    ownerName: { type: "string" },
                    requestedAmount: { type: "number" },
                    businessAddress: { type: "string" },
                    phoneNumber: { type: "string" },
                    email: { type: "string", format: "email" },
                    taxId: { type: "string" },
                    businessType: { type: "string" },
                    industry: { type: "string" },
                    yearEstablished: { type: "integer" },
                    annualRevenue: { type: "number" },
                    monthlyRevenue: { type: "number" },
                    employees: { type: "integer" },
                    loanPurpose: { type: "string" }
                },
                required: ["businessName", "ownerName", "requestedAmount", "email"]
            }
        }
    },
    tags: [
        {
            name: "Lender Products",
            description: "CRUD operations for lender product management"
        },
        {
            name: "Public API",
            description: "Public endpoints with CORS support for client applications"
        },
        {
            name: "Applications",
            description: "Application management and sales pipeline operations"
        }
    ]
};
