import axios from "axios";
import { expect } from "vitest";
import { describe, it } from "vitest";

describe("Lender Products Schema Sync", () => {
  it("should match client canonical schema", async () => {
    try {
      const { data } = await axios.get("http://localhost:5000/api/lender-products");
      
      expect(data.success).toBe(true);
      expect(data.products).toBeDefined();
      expect(Array.isArray(data.products)).toBe(true);
      
      if (data.products.length > 0) {
        const firstProduct = data.products[0];
        
        // Verify exact 12 canonical fields are present
        const expectedFields = [
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
        ];
        
        const actualFields = Object.keys(firstProduct);
        
        // Check all required fields are present
        expectedFields.forEach(field => {
          expect(firstProduct).toHaveProperty(field);
        });
        
        // Verify no extra fields (strict schema compliance)
        expect(actualFields.sort()).toEqual(expectedFields.sort());
        
        console.log("✅ Schema validation passed: All 12 canonical fields present");
        console.log(`✅ Product sample: ${firstProduct.lenderName} - ${firstProduct.productName}`);
      }
    } catch (error) {
      console.error("❌ Schema test failed:", error.message);
      throw error;
    }
  });

  it("should return expected data format", async () => {
    const { data } = await axios.get("http://localhost:5000/api/lender-products");
    
    expect(data).toHaveProperty("success", true);
    expect(data).toHaveProperty("count");
    expect(data).toHaveProperty("products");
    expect(typeof data.count).toBe("number");
    expect(Array.isArray(data.products)).toBe(true);
  });

  it("should have properly typed fields", async () => {
    const { data } = await axios.get("http://localhost:5000/api/lender-products");
    
    if (data.products.length > 0) {
      const product = data.products[0];
      
      // String fields
      expect(typeof product.id).toBe("string");
      expect(typeof product.lenderName).toBe("string");
      expect(typeof product.productName).toBe("string");
      expect(typeof product.category).toBe("string");
      expect(typeof product.country).toBe("string");
      
      // Number fields
      expect(typeof product.minAmount).toBe("number");
      expect(typeof product.maxAmount).toBe("number");
      
      // Array field
      expect(Array.isArray(product.documentsRequired)).toBe(true);
      
      // String or number fields
      expect(["string", "number"].includes(typeof product.interestRate)).toBe(true);
      
      console.log("✅ Field type validation passed");
    }
  });
});