
// import_lender_products_all_in_one.mjs
// Single-file importer: embeds data + mapping + DB import.
// Usage:
//   DATABASE_URL="postgres://USER:PASS@HOST:5432/DB" node import_lender_products_all_in_one.mjs

import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const { Client } = pg;

// ---------- Embedded Source Data (from your provided export) ----------
const SOURCE_DATA = {
  products: [
    {"id":39,"lenderName":"Baker Garrington Capital","productName":"Factor+ - (Short-term notes with BG Factoring)","productCategory":"Invoice Factoring","minimumLendingAmount":1,"maximumLendingAmount":1000000,"interestRateMinimum":10,"interestRateMaximum":18,"termMinimum":12,"termMaximum":12,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Accountant Prepared Financials","Balance Sheet","Profit and Loss Statement"],"lastUpdated":"2025-06-18T14:53:37.819Z","isActive":true},
    {"id":38,"lenderName":"Baker Garrington Capital","productName":"Factor+ - (Short-term notes with BG Factoring)","productCategory":"Invoice Factoring","minimumLendingAmount":1,"maximumLendingAmount":1000000,"interestRateMinimum":10,"interestRateMaximum":18,"termMinimum":12,"termMaximum":12,"countryOffered":"Canada","description":"","documentsRequired":["Bank Statements","Accountant Prepared Financials","Balance Sheet","Profit and Loss Statement"],"lastUpdated":"2025-06-18T14:53:44.957Z","isActive":true},
    {"id":37,"lenderName":"Baker Garrington Capital","productName":"Asset-Based Lending","productCategory":"Invoice Factoring","minimumLendingAmount":3000000,"maximumLendingAmount":20000000,"interestRateMinimum":12,"interestRateMaximum":16,"termMinimum":12,"termMaximum":12,"countryOffered":"Canada","description":"","documentsRequired":["Bank Statements","Income Statement","Balance Sheet","Profit and Loss Statement","Accountant Prepared Financials"],"lastUpdated":"2025-06-18T14:53:52.211Z","isActive":true},
    {"id":36,"lenderName":"Baker Garrington Capital","productName":"Asset-Based Lending","productCategory":"Business Line of Credit","minimumLendingAmount":3000000,"maximumLendingAmount":20000000,"interestRateMinimum":12,"interestRateMaximum":16,"termMinimum":12,"termMaximum":12,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Balance Sheet","Income Statement","Accountant Prepared Financials","Profit and Loss Statement"],"lastUpdated":"2025-06-18T14:53:57.181Z","isActive":true},
    {"id":33,"lenderName":"Baker Garrington Capital","productName":"Accounts Receivable Factoring","productCategory":"Invoice Factoring","minimumLendingAmount":10000,"maximumLendingAmount":30000000,"interestRateMinimum":1,"interestRateMaximum":3,"termMinimum":12,"termMaximum":12,"countryOffered":"Canada","description":"","documentsRequired":["Bank Statements","Accountant Prepared Financials","Articles of Incorporation","Profit and Loss Statement","Balance Sheet"],"lastUpdated":"2025-06-18T14:54:43.115Z","isActive":true},
    {"id":32,"lenderName":"Baker Garrington Capital","productName":"Accounts Receivable Factoring","productCategory":"Invoice Factoring","minimumLendingAmount":10000,"maximumLendingAmount":30000000,"interestRateMinimum":1,"interestRateMaximum":3,"termMinimum":12,"termMaximum":12,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Accountant Prepared Financials","Articles of Incorporation","Profit and Loss Statement","Balance Sheet"],"lastUpdated":"2025-06-18T14:55:09.315Z","isActive":true},
    {"id":31,"lenderName":"Pathward ","productName":"ABL Working Capital","productCategory":"Business Line of Credit","minimumLendingAmount":1000000,"maximumLendingAmount":20000000,"interestRateMinimum":2,"interestRateMaximum":4,"termMinimum":12,"termMaximum":12,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Accountant Prepared Financials","Balance Sheet","Profit and Loss Statement"],"lastUpdated":"2025-06-18T14:55:18.176Z","isActive":true},
    {"id":30,"lenderName":"Pathward ","productName":"ABL Working Capital Revolver","productCategory":"Business Line of Credit","minimumLendingAmount":1000000,"maximumLendingAmount":20000000,"interestRateMinimum":2,"interestRateMaximum":4,"termMinimum":12,"termMaximum":12,"countryOffered":"Canada","description":"","documentsRequired":["Bank Statements","Accountant Prepared Financials","Profit and Loss Statement","Balance Sheet"],"lastUpdated":"2025-06-18T14:55:25.719Z","isActive":true},
    {"id":41,"lenderName":"Revenued","productName":"Flex Line","productCategory":"Business Line of Credit","minimumLendingAmount":20000,"maximumLendingAmount":149999,"interestRateMinimum":1,"interestRateMaximum":1,"termMinimum":12,"termMaximum":12,"countryOffered":"Canada","description":"","documentsRequired":["Bank Statements"],"lastUpdated":"2025-06-19T22:14:59.018Z","isActive":true},
    {"id":57,"lenderName":"Revenued","productName":"Flexline","productCategory":"Term Loan","minimumLendingAmount":250000,"maximumLendingAmount":500000,"interestRateMinimum":1.25,"interestRateMaximum":1.45,"termMinimum":3,"termMaximum":9,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Profit and Loss Statement","Balance Sheet","Accountant Prepared Financials"],"lastUpdated":"2025-06-18T14:49:55.928Z","isActive":true},
    {"id":52,"lenderName":"Quantum LS","productName":"Term Loan","productCategory":"Term Loan","minimumLendingAmount":200000,"maximumLendingAmount":250000,"interestRateMinimum":16.99,"interestRateMaximum":35.99,"termMinimum":12,"termMaximum":48,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Balance Sheet","Profit and Loss Statement","Accountant Prepared Financials"],"lastUpdated":"2025-06-18T14:51:01.876Z","isActive":true},
    {"id":55,"lenderName":"Revenued","productName":"Flexline","productCategory":"Term Loan","minimumLendingAmount":20000,"maximumLendingAmount":149999,"interestRateMinimum":1.25,"interestRateMaximum":1.45,"termMinimum":3,"termMaximum":9,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Profit and Loss Statement","Balance Sheet","Accountant Prepared Financials"],"lastUpdated":"2025-06-18T14:50:21.720Z","isActive":true},
    {"id":44,"lenderName":"Quantum LS","productName":"Term Loan","productCategory":"Term Loan","minimumLendingAmount":10000,"maximumLendingAmount":150000,"interestRateMinimum":16.99,"interestRateMaximum":35.99,"termMinimum":12,"termMaximum":48,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements"],"lastUpdated":"2025-06-18T14:52:33.549Z","isActive":true},
    {"id":43,"lenderName":"Revenued","productName":"Flex Line","productCategory":"Business Line of Credit","minimumLendingAmount":250000,"maximumLendingAmount":500000,"interestRateMinimum":1,"interestRateMaximum":1,"termMinimum":12,"termMaximum":12,"countryOffered":"Canada","description":"","documentsRequired":["Bank Statements","Accountant Prepared Financials","Profit and Loss Statement","Balance Sheet"],"lastUpdated":"2025-06-18T14:52:50.266Z","isActive":true},
    {"id":51,"lenderName":"Quantum LS","productName":"Term Loan","productCategory":"Term Loan","minimumLendingAmount":150001,"maximumLendingAmount":199999,"interestRateMinimum":16.99,"interestRateMaximum":35.99,"termMinimum":12,"termMaximum":48,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Profit and Loss Statement","Balance Sheet","Accountant Prepared Financials"],"lastUpdated":"2025-06-18T14:51:11.845Z","isActive":true},
    {"id":49,"lenderName":"Revenued","productName":"Flex Line","productCategory":"Business Line of Credit","minimumLendingAmount":250000,"maximumLendingAmount":500000,"interestRateMinimum":1.25,"interestRateMaximum":1.45,"termMinimum":10,"termMaximum":10,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Balance Sheet","Profit and Loss Statement","Accountant Prepared Financials"],"lastUpdated":"2025-06-18T14:51:40.422Z","isActive":true},
    {"id":48,"lenderName":"Revenued","productName":"Flex Line","productCategory":"Business Line of Credit","minimumLendingAmount":150000,"maximumLendingAmount":249999,"interestRateMinimum":1.25,"interestRateMaximum":1.45,"termMinimum":10,"termMaximum":10,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Balance Sheet","Accountant Prepared Financials","Profit and Loss Statement"],"lastUpdated":"2025-06-18T14:51:57.434Z","isActive":true},
    {"id":59,"lenderName":"Pearl Capital Final ","productName":"MCA","productCategory":"Term Loan","minimumLendingAmount":35000,"maximumLendingAmount":149999,"interestRateMinimum":1.24,"interestRateMaximum":1.45,"termMinimum":3,"termMaximum":9,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Profit and Loss Statement","Balance Sheet","Accountant Prepared Financials"],"lastUpdated":"2025-06-18T14:49:39.013Z","isActive":true},
    {"id":46,"lenderName":"Revenued","productName":"Flex Line","productCategory":"Business Line of Credit","minimumLendingAmount":3000,"maximumLendingAmount":19999,"interestRateMinimum":1.25,"interestRateMaximum":1.45,"termMinimum":10,"termMaximum":10,"countryOffered":"Canada","description":"","documentsRequired":["Bank Statements"],"lastUpdated":"2025-06-18T14:52:18.084Z","isActive":true},
    {"id":62,"lenderName":"Mobilization Funding","productName":"Mobilization Funding","productCategory":"Business Line of Credit","minimumLendingAmount":100000,"maximumLendingAmount":5000000,"interestRateMinimum":1,"interestRateMaximum":1,"termMinimum":12,"termMaximum":12,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Profit and Loss Statement","Balance Sheet","Accountant Prepared Financials"],"lastUpdated":"2025-06-18T14:49:09.678Z","isActive":true},
    {"id":58,"lenderName":"Pearl Capital Final ","productName":"MCA","productCategory":"Term Loan","minimumLendingAmount":10000,"maximumLendingAmount":34999,"interestRateMinimum":1.24,"interestRateMaximum":1.45,"termMinimum":3,"termMaximum":9,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements"],"lastUpdated":"2025-06-18T14:49:44.569Z","isActive":true},
    {"id":42,"lenderName":"Revenued","productName":"Flex Line","productCategory":"Business Line of Credit","minimumLendingAmount":150000,"maximumLendingAmount":249999,"interestRateMinimum":1,"interestRateMaximum":1,"termMinimum":12,"termMaximum":12,"countryOffered":"Canada","description":"","documentsRequired":["Bank Statements","Accountant Prepared Financials","Profit and Loss Statement","Balance Sheet"],"lastUpdated":"2025-06-18T14:53:03.096Z","isActive":true},
    {"id":61,"lenderName":"Pearl Capital Final ","productName":"MCA","productCategory":"Term Loan","minimumLendingAmount":250000,"maximumLendingAmount":1000000,"interestRateMinimum":1.24,"interestRateMaximum":1.45,"termMinimum":3,"termMaximum":9,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Profit and Loss Statement","Balance Sheet","Accountant Prepared Financials"],"lastUpdated":"2025-06-18T14:49:19.134Z","isActive":true},
    {"id":63,"lenderName":"Mobilization Funding","productName":"Contract Financing","productCategory":"Invoice Factoring","minimumLendingAmount":100000,"maximumLendingAmount":5000000,"interestRateMinimum":1.9,"interestRateMaximum":3,"termMinimum":12,"termMaximum":12,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Profit and Loss Statement","Balance Sheet","Accountant Prepared Financials"],"lastUpdated":"2025-06-18T14:48:58.253Z","isActive":true},
    {"id":60,"lenderName":"Pearl Capital Final ","productName":"MCA","productCategory":"Term Loan","minimumLendingAmount":150000,"maximumLendingAmount":249999,"interestRateMinimum":1.24,"interestRateMaximum":1.45,"termMinimum":3,"termMaximum":9,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Profit and Loss Statement","Balance Sheet","Accountant Prepared Financials"],"lastUpdated":"2025-06-18T14:49:27.318Z","isActive":true},
    {"id":40,"lenderName":"Revenued","productName":"Flex Line","productCategory":"Business Line of Credit","minimumLendingAmount":3000,"maximumLendingAmount":19999,"interestRateMinimum":1,"interestRateMaximum":1,"termMinimum":12,"termMaximum":12,"countryOffered":"Canada","description":"","documentsRequired":["Bank Statements"],"lastUpdated":"2025-06-18T14:53:27.504Z","isActive":true},
    {"id":35,"lenderName":"Baker Garrington Capital","productName":"Equipment Financing ","productCategory":"Equipment Financing","minimumLendingAmount":1000000,"maximumLendingAmount":20000000,"interestRateMinimum":12,"interestRateMaximum":16,"termMinimum":72,"termMaximum":12,"countryOffered":"Canada","description":"","documentsRequired":["Bank Statements","Accountant Prepared Financials","Balance Sheet","Personal Financial Statement","Profit and Loss Statement","Purchase order/Invoice of equipment to be financed"],"lastUpdated":"2025-06-18T14:54:12.302Z","isActive":true},
    {"id":34,"lenderName":"Baker Garrington Capital","productName":"Equipment Financing","productCategory":"Equipment Financing","minimumLendingAmount":1000000,"maximumLendingAmount":20000000,"interestRateMinimum":12,"interestRateMaximum":16,"termMinimum":72,"termMaximum":12,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Accountant Prepared Financials","Balance Sheet","Profit and Loss Statement","Purchase order/Invoice of equipment to be financed"],"lastUpdated":"2025-06-18T14:54:29.518Z","isActive":true},
    {"id":29,"lenderName":"Brookridge Funding LLV","productName":"Purchase Order Financing","productCategory":"Purchase Order Financing","minimumLendingAmount":50000,"maximumLendingAmount":30000000,"interestRateMinimum":2.5,"interestRateMaximum":3,"termMinimum":12,"termMaximum":12,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Accountant Prepared Financials","Articles of Incorporation","Balance Sheet","Profit and Loss Statement"],"lastUpdated":"2025-06-18T14:55:37.331Z","isActive":true},
    {"id":56,"lenderName":"Revenued","productName":"Flexline","productCategory":"Term Loan","minimumLendingAmount":150000,"maximumLendingAmount":249000,"interestRateMinimum":1.25,"interestRateMaximum":1.45,"termMinimum":3,"termMaximum":9,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Profit and Loss Statement","Balance Sheet","Accountant Prepared Financials"],"lastUpdated":"2025-06-18T14:50:09.299Z","isActive":true},
    {"id":50,"lenderName":"Quantum LS","productName":"Term Loan","productCategory":"Term Loan","minimumLendingAmount":10000,"maximumLendingAmount":150000,"interestRateMinimum":16.99,"interestRateMaximum":35.99,"termMinimum":12,"termMaximum":48,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements"],"lastUpdated":"2025-06-18T14:51:17.810Z","isActive":true},
    {"id":47,"lenderName":"Revenued","productName":"Flex Line","productCategory":"Business Line of Credit","minimumLendingAmount":20000,"maximumLendingAmount":149999,"interestRateMinimum":1.25,"interestRateMaximum":1.45,"termMinimum":10,"termMaximum":10,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Profit and Loss Statement","Balance Sheet","Accountant Prepared Financials"],"lastUpdated":"2025-06-18T14:52:13.001Z","isActive":true},
    {"id":45,"lenderName":"Quantum LS","productName":"Flex Line","productCategory":"Working Capital","minimumLendingAmount":150001,"maximumLendingAmount":199999,"interestRateMinimum":16.99,"interestRateMaximum":35.99,"termMinimum":12,"termMaximum":48,"countryOffered":"Canada","description":"","documentsRequired":["Bank Statements","Balance Sheet","Accountant Prepared Financials","Profit and Loss Statement"],"lastUpdated":"2025-06-18T14:52:27.404Z","isActive":true},
    {"id":66,"lenderName":"Accord","productName":"Small Business Revolver - No Borrowing Base","productCategory":"Business Line of Credit","minimumLendingAmount":25000,"maximumLendingAmount":250000,"interestRateMinimum":10,"interestRateMaximum":35,"termMinimum":12,"termMaximum":12,"countryOffered":"Canada","description":"","documentsRequired":["Bank Statements","Profit and Loss Statement","Balance Sheet","Personal Financial Statement","Accountant Prepared Financials"],"lastUpdated":"2025-06-18T14:47:31.628Z","isActive":true},
    {"id":65,"lenderName":"Accord","productName":"AccordAccess","productCategory":"Working Capital","minimumLendingAmount":5000,"maximumLendingAmount":50000,"interestRateMinimum":19.99,"interestRateMaximum":49.99,"termMinimum":6,"termMaximum":24,"countryOffered":"Canada","description":"","documentsRequired":["Bank Statements"],"lastUpdated":"2025-06-18T14:47:38.483Z","isActive":true},
    {"id":64,"lenderName":"Mobilization Funding","productName":"PO Financing","productCategory":"Purchase Order Financing","minimumLendingAmount":100000,"maximumLendingAmount":5000000,"interestRateMinimum":1,"interestRateMaximum":1,"termMinimum":12,"termMaximum":12,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Profit and Loss Statement","Balance Sheet","Accountant Prepared Financials"],"lastUpdated":"2025-06-18T14:47:55.342Z","isActive":true},
    {"id":54,"lenderName":"Revenued","productName":"Flexline","productCategory":"Business Line of Credit","minimumLendingAmount":5000,"maximumLendingAmount":19999,"interestRateMinimum":1.25,"interestRateMaximum":1.45,"termMinimum":3,"termMaximum":9,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements"],"lastUpdated":"2025-06-18T14:50:27.553Z","isActive":true},
    {"id":53,"lenderName":"Quantum LS","productName":"Line of credit ","productCategory":"Business Line of Credit","minimumLendingAmount":10000,"maximumLendingAmount":150000,"interestRateMinimum":1.9,"interestRateMaximum":3,"termMinimum":12,"termMaximum":12,"countryOffered":"United States","description":"","documentsRequired":["Bank Statements","Profit and Loss Statement","Balance Sheet","Accountant Prepared Financials"],"lastUpdated":"2025-06-18T14:50:51.209Z","isActive":true},
    {"id":82,"lenderName":"Meridian OneCap Credit Corp.","productName":"Equipment Finance","productCategory":"Equipment Financing","minimumLendingAmount":25000,"maximumLendingAmount":2000000,"interestRateMinimum":6.5,"interestRateMaximum":12,"termMinimum":12,"termMaximum":81,"countryOffered":"Canada","description":null,"documentsRequired":["Bank Statements","Profit and Loss Statement","Personal Financial Statement","Balance Sheet","Accountant Prepared Financials","Purchase order/Invoice of equipment to be financed"],"lastUpdated":"2025-06-18T14:46:04.221Z","isActive":true},
    {"id":81,"lenderName":"Dynamic Capital Equipment Finance","productName":"Equipment Finance","productCategory":"Equipment Financing","minimumLendingAmount":35000,"maximumLendingAmount":2000000,"interestRateMinimum":6.5,"interestRateMaximum":20,"termMinimum":12,"termMaximum":72,"countryOffered":"Canada","description":null,"documentsRequired":["Bank Statements","Profit and Loss Statement","Balance Sheet","Accountant Prepared Financials","Purchase order/Invoice of equipment to be financed"],"lastUpdated":"2025-06-18T14:46:45.801Z","isActive":true},
    {"id":80,"lenderName":"Accord Financial Corp.","productName":"Equipment Finance","productCategory":"Equipment Financing","minimumLendingAmount":20000,"maximumLendingAmount":1500000,"interestRateMinimum":9,"interestRateMaximum":20,"termMinimum":12,"termMaximum":72,"countryOffered":"Canada","description":null,"documentsRequired":["Balance Sheet","Accountant Prepared Financials","Profit and Loss Statement","Bank Statements","Purchase order/Invoice of equipment to be financed"],"lastUpdated":"2025-06-18T14:47:04.675Z","isActive":true},
    {"id":79,"lenderName":"Stride Capital Corp.","productName":"Equipment Finance","productCategory":"Equipment Financing","minimumLendingAmount":25000,"maximumLendingAmount":1500000,"interestRateMinimum":6.5,"interestRateMaximum":15,"termMinimum":12,"termMaximum":72,"countryOffered":"Canada","description":null,"documentsRequired":["Balance Sheet","Accountant Prepared Financials","Profit and Loss Statement","Bank Statements","Purchase order/Invoice of equipment to be financed"],"lastUpdated":"2025-06-18T14:47:18.429Z","isActive":true}
  ]
};

// ---------- Helpers ----------
function randomId() {
  return (crypto.randomUUID && crypto.randomUUID()) || (
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    })
  );
}

function normalizeCountry(countryStr) {
  if (!countryStr) return 'US'; // Default fallback for null/undefined
  const c = countryStr.toLowerCase().trim();
  if (c === 'united states' || c === 'us' || c === 'usa') return 'US';
  if (c === 'canada' || c === 'ca' || c === 'can') return 'CA';
  return 'US'; // default fallback
}

function normalizeCategory(p) {
  const name = (p.productName || '').toLowerCase();
  const cat = (p.productCategory || '').toLowerCase().trim();

  if (name.includes('mca') || cat === 'mca' || name.includes('merchant cash')) return 'Term Loan';
  if (cat === 'business line of credit' || cat === 'line of credit' || cat === 'loc' || name.includes('flex line') || name.includes('flexline')) return 'Business Line of Credit';
  if (cat === 'invoice factoring' || name.includes('factoring')) return 'Invoice Factoring';
  if (cat === 'purchase order financing' || name.includes('purchase order') || name.includes('po financing')) return 'Purchase Order Financing';
  if (cat === 'equipment financing' || name.includes('equipment finance')) return 'Equipment Financing';
  if (cat === 'term loan') return 'Term Loan';
  if (cat === 'working capital') return 'Working Capital';
  return p.productCategory || 'Working Capital';
}

function numOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Attempt to find a column among aliases in existing table columns
function pickColumn(existing, aliases) {
  for (const a of aliases) if (existing.has(a)) return a;
  return null;
}

async function getExistingColumns(client, table) {
  const res = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=$1
  `, [table]);
  return new Set(res.rows.map(r => r.column_name));
}

async function findOrCreateLender(client, name) {
  // Try common shapes: lenders(id,name) where id is text/uuid
  const sel = await client.query(
    'SELECT id FROM lenders WHERE LOWER(name)=LOWER($1) LIMIT 1',
    [name]
  );
  if (sel.rows[0]?.id) return sel.rows[0].id;

  // Insert
  try {
    const ins = await client.query(
      'INSERT INTO lenders (id, name) VALUES ($1, $2) RETURNING id',
      [randomId(), name]
    );
    return ins.rows[0].id;
  } catch (e) {
    // Fallback: try without explicit id (if default exists)
    const ins2 = await client.query(
      'INSERT INTO lenders (name) VALUES ($1) RETURNING id',
      [name]
    );
    return ins2.rows[0].id;
  }
}

async function insertProductDynamic(client, colsMap, p, lenderId) {
  const payload = {
    id: `${p.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Truly unique ID based on source data + timestamp
    lender_id: lenderId,
    external_id: String(p.id),
    name: `${p.lenderName} - ${p.productName || 'Unknown Product'} (${normalizeCountry(p.countryOffered)})`, // Required field - make unique per lender+country
    category: normalizeCategory(p), // Required field
    tenant_id: '11111111-1111-1111-1111-111111111111', // Use consistent BF tenant ID
    product_name: p.productName,
    lender_name: p.lenderName,
    product_category: normalizeCategory(p),
    min_amount: numOrNull(p.minimumLendingAmount),
    max_amount: numOrNull(p.maximumLendingAmount),
    rate_min: numOrNull(p.interestRateMinimum),
    rate_max: numOrNull(p.interestRateMaximum),
    term_min_months: numOrNull(p.termMinimum),
    term_max_months: numOrNull(p.termMaximum),
    country: normalizeCountry(p.countryOffered),
    country_offered: p.countryOffered || 'United States',
    is_active: !!p.isActive,
    documents_json: JSON.stringify(p.documentsRequired || []),
    description: p.description || null,
    updated_at: p.lastUpdated ? new Date(p.lastUpdated) : new Date()
  };

  const wanted = {
    id: ['id'],
    lender_id: ['lender_id','lenderId'],
    external_id: ['external_id','externalId','source_id','legacy_id'],
    name: ['name','product_name','productName'],
    category: ['category','product_category','productCategory'],
    tenant_id: ['tenant_id','tenantId'],
    product_name: ['product_name','productName'],
    lender_name: ['lender_name','lenderName'],
    product_category: ['product_category','category','productCategory'],
    min_amount: ['min_amount','minimum_amount','minimum_lending_amount','minimumLendingAmount'],
    max_amount: ['max_amount','maximum_amount','maximum_lending_amount','maximumLendingAmount'],
    rate_min: ['rate_min','interest_rate_min','interestRateMinimum'],
    rate_max: ['rate_max','interest_rate_max','interestRateMaximum'],
    term_min_months: ['term_min_months','term_min','termMinimum'],
    term_max_months: ['term_max_months','term_max','termMaximum'],
    country: ['country','country_offered','countryOffered'],
    is_active: ['is_active','active'],
    documents_json: ['documents_json','documents','documentsRequired'],
    description: ['description'],
    updated_at: ['updated_at','last_updated']
  };

  const columns = [];
  const values = [];
  const params = [];
  let i = 1;

  for (const [canon, aliases] of Object.entries(wanted)) {
    const col = pickColumn(colsMap, aliases);
    if (!col) continue; // skip if destination column absent
    columns.push('"' + col + '"');
    values.push(`$${i++}`);
    params.push(payload[canon]);
  }

  const sql = `INSERT INTO lender_products (${columns.join(',')}) VALUES (${values.join(',')}) ON CONFLICT DO NOTHING RETURNING id`;
  const result = await client.query(sql, params);
  
  return result.rowCount > 0; // Return whether insert was successful
}

async function main() {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('❌ DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    // Inspect destination table shape
    const lpCols = await getExistingColumns(client, 'lender_products');
    if (lpCols.size === 0) {
      console.error('❌ Table "lender_products" not found in public schema.');
      process.exit(1);
    }

    console.log('🔎 lender_products columns:', Array.from(lpCols).sort().join(', '));

    // Clean slate
    await client.query('BEGIN');
    try {
      await client.query('TRUNCATE TABLE lender_products RESTART IDENTITY CASCADE');
    } catch {
      await client.query('TRUNCATE TABLE lender_products CASCADE');
    }

    // Import loop
    let ok = 0, fail = 0;
    const byCat = new Map();
    const byLender = new Map();

    for (const p of SOURCE_DATA.products) {
      try {
        const lenderId = await findOrCreateLender(client, p.lenderName.trim());
        await insertProductDynamic(client, lpCols, p, lenderId);
        ok++;

        const cat = normalizeCategory(p);
        byCat.set(cat, (byCat.get(cat) || 0) + 1);
        byLender.set(p.lenderName.trim(), (byLender.get(p.lenderName.trim()) || 0) + 1);
      } catch (e) {
        fail++;
        console.error(`❌ Failed to import "${p.productName}" (${p.lenderName}):`, e.message);
      }
    }

    await client.query('COMMIT');

    // Summary
    console.log('\n✅ IMPORT COMPLETE');
    console.log('Imported:', ok, 'Failed:', fail);
    console.log('\nBy Category:');
    for (const [k,v] of Array.from(byCat.entries()).sort()) console.log(`  - ${k}: ${v}`);
    console.log('\nBy Lender:');
    for (const [k,v] of Array.from(byLender.entries()).sort()) console.log(`  - ${k}: ${v}`);

    console.log('\n🔎 Verify:');
    console.log('curl -s http://localhost:5000/api/lender-products | jq ".products | length"');
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('❌ Import aborted:', e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
