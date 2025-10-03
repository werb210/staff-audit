# Lender Products API Specification

## Public Client Endpoint

### GET /api/public/lenders

**Base URL:** `https://staffportal.replit.app`
**Full Endpoint:** `https://staffportal.replit.app/api/public/lenders`

**Authentication:** None required (public endpoint)
**CORS:** Enabled for `https://clientportal.replit.app`

### Request Headers
```
Origin: https://clientportal.replit.app
Content-Type: application/json
```

### Response Format

**Success Response (200):**
```json
{
  "success": true,
  "products": [
    {
      "id": "80747a6e-317c-45a5-a933-dc2c82fffb86",
      "productName": "Purchase Order Financing",
      "lenderName": "Brookridge Funding LLV",
      "category": "purchase_order_financing",
      "geography": ["US"],
      "amountRange": {
        "min": "50000.00",
        "max": "30000000.00"
      },
      "requirements": {
        "minMonthlyRevenue": "50000.00",
        "industries": null
      },
      "description": "purchase_order_financing - Rate: 2.5% - 3% | 12-12 months | Docs: Bank Statements, Accountant Prepared Financials, Articles of Incorporation, Balance Sheet"
    }
  ],
  "count": 43
}
```

### Product Schema

Each product object contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique product identifier (UUID) |
| `productName` | string | Display name of the product |
| `lenderName` | string | Name of the lending institution |
| `category` | string | Product category (enum) |
| `geography` | string[] | Array of supported countries/regions |
| `amountRange` | object | Funding amount limits |
| `amountRange.min` | number | Minimum funding amount |
| `amountRange.max` | number | Maximum funding amount |
| `requirements` | object | Eligibility requirements |
| `requirements.minMonthlyRevenue` | number | Minimum monthly revenue required |
| `requirements.industries` | string[] \| null | Supported industries (null = all) |
| `description` | string | Detailed product description |

### Product Categories

Available categories:
- `invoice_factoring` (6 products)
- `line_of_credit` (15 products)  
- `equipment_financing` (6 products)
- `working_capital` (2 products)
- `term_loan` (11 products)
- `purchase_order_financing` (2 products)

### Geography Codes
- `CA` - Canada
- `US` - United States

### Current Dataset
- **Total Products:** 43 authentic lender products
- **Last Updated:** July 2, 2025
- **Data Source:** Production database with real lender information

### Error Handling

**Error Response (4xx/5xx):**
```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

### Sample Integration Code

**JavaScript/TypeScript:**
```javascript
async function fetchLenderProducts() {
  try {
    const response = await fetch('https://staffportal.replit.app/api/public/lenders', {
      method: 'GET',
      headers: {
        'Origin': 'https://clientportal.replit.app',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.products) {
      return data.products; // Array of 43 lender products
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Failed to fetch lender products:', error);
    throw error;
  }
}
```

### Performance Characteristics
- **Response Time:** ~160ms average
- **Data Size:** ~50KB JSON payload
- **Cache Control:** No caching headers (real-time data)
- **Rate Limiting:** None currently implemented

### Support & Troubleshooting

**Common Issues:**
1. **CORS Error:** Ensure Origin header is set to `https://clientportal.replit.app`
2. **Empty Response:** Check network connectivity and endpoint availability
3. **Timeout:** Default timeout should be set to 10+ seconds

**Health Check:**
The endpoint returns consistent 200 responses with 43 products when operational.

**Contact:**
For API issues or questions, refer to the staff portal development team.