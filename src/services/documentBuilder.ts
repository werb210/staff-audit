interface Application {
  id: string;
  amount: number;
  country: string;
  timeInBusinessMonths: number;
  monthlyRevenue: number;
  industry: string;
  product_id?: string;
}

interface DocumentRequirement {
  document_type: string;
  display_name: string;
  description: string;
  required: boolean;
  step: number;
  category: string;
  acceptedFormats: string[];
  maxSizeKB: number;
  examples: string[];
}

export async function documentBuilder(app: Application): Promise<DocumentRequirement[]> {
  try {
    const documents: DocumentRequirement[] = [];
    
    // Step 1: Core Financial Documents (Always Required)
    documents.push({
      document_type: 'bank_statements',
      display_name: 'Bank Statements',
      description: 'Last 3 months of business bank statements',
      required: true,
      step: 1,
      category: 'Financial',
      acceptedFormats: ['PDF', 'CSV', 'XLS', 'XLSX'],
      maxSizeKB: 10240,
      examples: ['Monthly bank statements', 'Online banking exports', 'Bank-provided PDFs']
    });
    
    // Step 2: Business Tax Documents
    if (app.timeInBusinessMonths >= 12) {
      documents.push({
        document_type: 'tax_returns',
        display_name: 'Business Tax Returns',
        description: 'Most recent business tax return (T2 for Canada, 1120/1120S for US)',
        required: true,
        step: 2,
        category: 'Tax',
        acceptedFormats: ['PDF'],
        maxSizeKB: 15360,
        examples: ['T2 Corporate Tax Return', 'Form 1120', 'Form 1120S', 'Schedule K-1']
      });
    }
    
    // Step 3: Business Registration Documents
    documents.push({
      document_type: 'business_license',
      display_name: 'Business Registration',
      description: 'Business license, incorporation documents, or registration certificate',
      required: true,
      step: 3,
      category: 'Legal',
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSizeKB: 5120,
      examples: ['Business license', 'Articles of incorporation', 'Certificate of incorporation']
    });
    
    // Step 4: Financial Statements (Amount-based requirement)
    if (app.amount >= 100000) {
      documents.push({
        document_type: 'financial_statements',
        display_name: 'Financial Statements',
        description: 'Recent profit & loss statement and balance sheet',
        required: true,
        step: 4,
        category: 'Financial',
        acceptedFormats: ['PDF', 'XLS', 'XLSX'],
        maxSizeKB: 10240,
        examples: ['P&L Statement', 'Balance Sheet', 'Income Statement', 'CPA-prepared financials']
      });
    }
    
    // Industry-specific requirements
    addIndustrySpecificDocuments(app, documents);
    
    // Country-specific requirements
    addCountrySpecificDocuments(app, documents);
    
    // Product-specific requirements
    await addProductSpecificDocuments(app, documents);
    
    // Sort by step, then by required status
    return documents.sort((a, b) => {
      if (a.step !== b.step) return a.step - b.step;
      if (a.required !== b.required) return a.required ? -1 : 1;
      return a.display_name.localeCompare(b.display_name);
    });
    
  } catch (error) {
    console.error('Document builder error:', error);
    // Return minimal required documents as fallback
    return getMinimalDocuments();
  }
}

function addIndustrySpecificDocuments(app: Application, documents: DocumentRequirement[]) {
  const highRiskIndustries = ['Cannabis', 'Adult Entertainment', 'Gambling', 'Cryptocurrency'];
  
  if (highRiskIndustries.includes(app.industry)) {
    documents.push({
      document_type: 'other',
      display_name: 'Regulatory Compliance Documents',
      description: 'Industry-specific licenses and compliance documentation',
      required: true,
      step: 4,
      category: 'Regulatory',
      acceptedFormats: ['PDF'],
      maxSizeKB: 10240,
      examples: ['Industry licenses', 'Compliance certificates', 'Regulatory permits']
    });
  }
  
  if (app.industry === 'Construction' || app.industry === 'Manufacturing') {
    documents.push({
      document_type: 'other',
      display_name: 'Equipment List & Valuation',
      description: 'Inventory of business equipment and machinery',
      required: false,
      step: 4,
      category: 'Assets',
      acceptedFormats: ['PDF', 'XLS', 'XLSX'],
      maxSizeKB: 5120,
      examples: ['Equipment inventory', 'Machinery appraisals', 'Asset valuations']
    });
  }
}

function addCountrySpecificDocuments(app: Application, documents: DocumentRequirement[]) {
  if (app.country === 'CA') {
    // Canadian-specific documents
    documents.push({
      document_type: 'other',
      display_name: 'GST/HST Returns',
      description: 'Recent GST/HST filing or exemption certificate',
      required: false,
      step: 3,
      category: 'Tax',
      acceptedFormats: ['PDF'],
      maxSizeKB: 5120,
      examples: ['GST/HST return', 'GST/HST exemption certificate']
    });
  } else if (app.country === 'US') {
    // US-specific documents
    if (app.amount >= 150000) {
      documents.push({
        document_type: 'other',
        display_name: 'Personal Financial Statement',
        description: 'Personal financial statement of business owner(s)',
        required: true,
        step: 4,
        category: 'Personal',
        acceptedFormats: ['PDF'],
        maxSizeKB: 5120,
        examples: ['Personal financial statement', 'Personal balance sheet']
      });
    }
  }
}

async function addProductSpecificDocuments(app: Application, documents: DocumentRequirement[]) {
  if (!app.product_id) return;
  
  try {
    // Fetch product details to get specific requirements
    const response = await fetch(`http://localhost:5000/api/v1/products`);
    const products = await response.json();
    const product = products.find((p: any) => p.id === app.product_id);
    
    if (product && product.required_documents) {
      // Add product-specific documents not already included
      for (const docType of product.required_documents) {
        const existingDoc = documents.find(d => d.document_type === docType);
        
        if (!existingDoc) {
          documents.push({
            document_type: docType,
            display_name: formatDocumentDisplayName(docType),
            description: getDocumentDescription(docType),
            required: true,
            step: 4,
            category: 'Product-Specific',
            acceptedFormats: ['PDF'],
            maxSizeKB: 10240,
            examples: getDocumentExamples(docType)
          });
        }
      }
    }
  } catch (error) {
    console.warn('Failed to fetch product-specific documents:', error.message);
  }
}

function formatDocumentDisplayName(docType: string): string {
  return docType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function getDocumentDescription(docType: string): string {
  const descriptions: { [key: string]: string } = {
    'account_prepared_financials': 'Accountant-prepared financial statements',
    'pnl_statement': 'Profit and loss statement for the last 12 months',
    'articles_of_incorporation': 'Legal incorporation documents for your business'
  };
  
  return descriptions[docType] || `Required ${formatDocumentDisplayName(docType)} documentation`;
}

function getDocumentExamples(docType: string): string[] {
  const examples: { [key: string]: string[] } = {
    'account_prepared_financials': ['CPA-prepared P&L', 'Audited financial statements', 'Reviewed financial statements'],
    'pnl_statement': ['Income statement', 'Profit & loss report', 'Revenue and expense statement'],
    'articles_of_incorporation': ['Certificate of incorporation', 'Corporate charter', 'Incorporation documents']
  };
  
  return examples[docType] || [`${formatDocumentDisplayName(docType)} document`];
}

function getMinimalDocuments(): DocumentRequirement[] {
  return [
    {
      document_type: 'bank_statements',
      display_name: 'Bank Statements',
      description: 'Last 3 months of business bank statements',
      required: true,
      step: 1,
      category: 'Financial',
      acceptedFormats: ['PDF'],
      maxSizeKB: 10240,
      examples: ['Monthly bank statements']
    },
    {
      document_type: 'business_license',
      display_name: 'Business License',
      description: 'Business registration or license document',
      required: true,
      step: 2,
      category: 'Legal',
      acceptedFormats: ['PDF'],
      maxSizeKB: 5120,
      examples: ['Business license']
    }
  ];
}