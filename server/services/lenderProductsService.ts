import { db } from "../db";

export interface LenderProduct {
  id: string;
  lenderName: string;
  productName: string;
  category: string;
  country: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  termLength: string;
  documentsRequired: string[];
  description?: string;
  updatedAt: string;
}

export class LenderProductsService {
  async getAllActiveProducts(): Promise<LenderProduct[]> {
    try {
      // Query active lender products from database
      const result = await db.query(`
        SELECT 
          id,
          name,
          category,
          country,
          min_amount,
          max_amount,
          interest_rate,
          term_months,
          required_documents,
          description,
          updated_at
        FROM lender_products 
        WHERE is_active = true
        ORDER BY name ASC
      `);

      return result.rows.map(product => ({
        id: product.id,
        lenderName: product.name,
        productName: product.name,
        category: product.category,
        country: product.country || 'US',
        minAmount: product.min_amount,
        maxAmount: product.max_amount,
        interestRate: product.interest_rate || 8.5,
        termLength: product.term_months ? `${product.term_months} months` : "24 months",
        documentsRequired: product.required_documents || [],
        description: product.description || "",
        updatedAt: product.updated_at ? new Date(product.updated_at).toISOString() : new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error fetching lender products:', error);
      throw new Error('Failed to fetch lender products');
    }
  }

  async getProductById(id: string): Promise<LenderProduct | null> {
    try {
      const result = await db.query(`
        SELECT 
          id,
          name,
          category,
          country,
          min_amount,
          max_amount,
          interest_rate,
          term_months,
          required_documents,
          description,
          updated_at
        FROM lender_products 
        WHERE id = $1 AND is_active = true
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const product = result.rows[0];
      return {
        id: product.id,
        lenderName: product.name,
        productName: product.name,
        category: product.category,
        country: product.country || 'US',
        minAmount: product.min_amount,
        maxAmount: product.max_amount,
        interestRate: product.interest_rate || 8.5,
        termLength: product.term_months ? `${product.term_months} months` : "24 months",
        documentsRequired: product.required_documents || [],
        description: product.description || "",
        updatedAt: product.updated_at ? new Date(product.updated_at).toISOString() : new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching lender product by ID:', error);
      throw new Error('Failed to fetch lender product');
    }
  }
}

export const lenderProductsService = new LenderProductsService();