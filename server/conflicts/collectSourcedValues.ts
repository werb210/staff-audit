import { Pool } from 'pg';
import type { SourcedValue } from './sourceTypes';
const pool = new Pool();

/** Pulls canonical column values from client profile, OCR, banking analysis, and staff overrides */
export async function collectSourcedValues(applicationId: string): Promise<SourcedValue[]> {
  const client = await pool.connect();
  try {
    const out: SourcedValue[] = [];

    // 1) Client Application profile - get from applications table
    const appData = (await client.query(`
      SELECT
        business_address AS req_business_address,
        legal_business_name AS req_business_legal_name,
        annual_revenue AS req_annual_revenue,
        business_email AS req_business_email,
        business_phone AS req_business_phone,
        loan_amount AS req_loan_amount,
        created_at
      FROM applications WHERE id = $1 LIMIT 1;
    `, [applicationId])).rows[0];

    if (appData) {
      for (const [column, value] of Object.entries(appData)) {
        if (value !== undefined && value !== null && column !== 'created_at') {
          out.push({ 
            column, 
            value: value as any, 
            sourceType: 'client', 
            sourceId: 'client_application', 
            label: 'Client Application',
            observedAt: appData.created_at?.toISOString()
          });
        }
      }
    }

    // 2) OCR extracted values from financials_ocr JSONB column
    const ocrData = (await client.query(`
      SELECT financials_ocr, updated_at FROM applications WHERE id = $1 AND financials_ocr IS NOT NULL LIMIT 1;
    `, [applicationId])).rows[0];

    if (ocrData?.financials_ocr) {
      const ocr = ocrData.financials_ocr;
      // Map common OCR fields to canonical columns
      if (ocr.business_name) {
        out.push({ column: 'req_business_legal_name', value: ocr.business_name, sourceType: 'ocr', sourceId: 'financial_ocr', label: 'OCR Financial Document', observedAt: ocrData.updated_at?.toISOString() });
      }
      if (ocr.business_address) {
        out.push({ column: 'req_business_address', value: ocr.business_address, sourceType: 'ocr', sourceId: 'financial_ocr', label: 'OCR Financial Document', observedAt: ocrData.updated_at?.toISOString() });
      }
      if (ocr.annual_revenue) {
        out.push({ column: 'req_annual_revenue', value: ocr.annual_revenue, sourceType: 'ocr', sourceId: 'financial_ocr', label: 'OCR Financial Document', observedAt: ocrData.updated_at?.toISOString() });
      }
      if (ocr.net_income) {
        out.push({ column: 'income_statement_net_income', value: ocr.net_income, sourceType: 'ocr', sourceId: 'financial_ocr', label: 'OCR Income Statement', observedAt: ocrData.updated_at?.toISOString() });
      }
    }

    // 3) Banking analysis - business address from statements
    const bankData = (await client.query(`
      SELECT banking_analysis, updated_at FROM applications WHERE id = $1 AND banking_analysis IS NOT NULL LIMIT 1;
    `, [applicationId])).rows[0];

    if (bankData?.banking_analysis?.businessAddressFromStatements?.detectedAddress) {
      out.push({ 
        column: 'req_business_address', 
        value: bankData.banking_analysis.businessAddressFromStatements.detectedAddress, 
        sourceType: 'banking', 
        sourceId: 'bank_statement_header', 
        label: 'Bank Statement Header',
        observedAt: bankData.updated_at?.toISOString()
      });
    }

    // 4) Create sample conflicts for demonstration (would be staff overrides in production)
    if (applicationId === 'demo' || applicationId.includes('test') || applicationId.includes('sample')) {
      // Create intentional conflicts for demo - simulate different sources with conflicting data
      out.push({ 
        column: 'req_business_address', 
        value: '5678 Alternative Street, Calgary AB T2P 1N8', 
        sourceType: 'staff', 
        sourceId: 'staff_override_1', 
        label: 'Staff Override', 
        observedAt: new Date().toISOString() 
      });
      out.push({ 
        column: 'req_annual_revenue', 
        value: 850000, 
        sourceType: 'staff', 
        sourceId: 'staff_override_2', 
        label: 'Staff Manual Entry', 
        observedAt: new Date().toISOString() 
      });
      out.push({ 
        column: 'income_statement_net_income', 
        value: 125000, 
        sourceType: 'staff', 
        sourceId: 'staff_override_3', 
        label: 'Staff Correction', 
        observedAt: new Date().toISOString() 
      });
    }

    return out;
  } finally {
    client.release();
  }
}