/**
 * OpenAI Configuration and Helpers
 * Central OpenAI client and utilities for AI features
 */

import { OpenAI } from 'openai';

// Initialize OpenAI client
export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Check if OpenAI is configured
export const isOpenAIConfigured = (): boolean => {
  return !!process.env.OPENAI_API_KEY;
};

// Enhanced prompt builder for credit summaries
export function buildCreditSummaryPrompt(data: any): string {
  return `
You are a senior credit analyst writing a comprehensive credit summary. Analyze the following application data and create a professional credit write-up:

BUSINESS INFORMATION:
- Business Name: ${data.businessName || 'Not provided'}
- Industry: ${data.industry || 'Not specified'}
- Years in Business: ${data.yearsInBusiness || 'Not provided'}
- Annual Revenue: ${data.annualRevenue || 'Not provided'}
- Requested Amount: ${data.requestedAmount || 'Not specified'}
- Use of Funds: ${data.useOfFunds || 'Not specified'}

CONTACT INFORMATION:
- Primary Contact: ${data.contactName || 'Not provided'}
- Email: ${data.contactEmail || 'Not provided'}
- Phone: ${data.contactPhone || 'Not provided'}

OCR EXTRACTED DATA:
${data.ocrData ? JSON.stringify(data.ocrData, null, 2) : 'No OCR data available'}

BANKING ANALYSIS:
${data.bankingData ? JSON.stringify(data.bankingData, null, 2) : 'No banking data available'}

DOCUMENT COUNT: ${data.documentCount || 0} documents submitted

Please provide a structured credit summary with the following sections:
1. Executive Summary
2. Business Overview
3. Financial Analysis
4. Risk Assessment
5. Recommendation

Write in a professional, analytical tone suitable for senior leadership review.
`;
}

// Risk assessment prompt
export function buildRiskAssessmentPrompt(data: any): string {
  return `
As a senior credit risk analyst, assess the risk level for this loan application. Consider all available data:

BUSINESS PROFILE:
- Business Name: ${data.businessName || 'Unknown'}
- Industry: ${data.industry || 'Not specified'}
- Years in Business: ${data.yearsInBusiness || 'Unknown'}
- Annual Revenue: ${data.annualRevenue || 'Not provided'}
- Loan Amount: ${data.requestedAmount || 'Not specified'}

FINANCIAL INDICATORS:
${data.bankingData ? JSON.stringify(data.bankingData, null, 2) : 'Limited financial data'}

DOCUMENT QUALITY:
- Documents Submitted: ${data.documentCount || 0}
- OCR Quality Score: ${data.ocrQualityScore || 'Not assessed'}

Based on this information, classify the risk as one of:
- LOW RISK: Strong financials, established business, complete documentation
- MEDIUM RISK: Moderate concerns but manageable risks
- HIGH RISK: Significant red flags or insufficient information

Provide only the risk classification (LOW RISK, MEDIUM RISK, or HIGH RISK) followed by a brief 2-sentence explanation.
`;
}

// Next step suggestion prompt
export function buildNextStepPrompt(data: any): string {
  return `
You are an experienced loan processor reviewing this application. Based on the current status and available information, suggest the most logical next step:

APPLICATION STATUS: ${data.status || 'New'}
DOCUMENTS RECEIVED: ${data.documentCount || 0}
MISSING DOCUMENTS: ${data.missingDocuments?.join(', ') || 'None identified'}

CURRENT DATA COMPLETENESS:
- Business Info: ${data.businessName ? 'Complete' : 'Incomplete'}
- Financial Data: ${data.bankingData ? 'Available' : 'Missing'}
- Contact Info: ${data.contactEmail ? 'Complete' : 'Incomplete'}

OCR CONFLICTS: ${data.ocrConflicts || 0} unresolved conflicts

Suggest the single most important next action from these options:
- Request additional documentation
- Schedule verification call
- Conduct bank verification
- Review OCR conflicts
- Submit to underwriting
- Request clarification on specific items
- Approve for next stage

Provide a specific, actionable recommendation in 1-2 sentences.
`;
}

// Document matching prompt
export function buildDocumentMatchPrompt(documents: any[], requirements: string[]): string {
  return `
Analyze these uploaded documents and match them to the required document types:

UPLOADED DOCUMENTS:
${documents.map((doc, i) => `${i + 1}. ${doc.fileName} (${doc.documentType || 'Unknown type'})`).join('\n')}

REQUIRED DOCUMENTS:
${requirements.map((req, i) => `${i + 1}. ${req}`).join('\n')}

For each required document, identify:
1. Which uploaded document(s) satisfy this requirement
2. Quality assessment (Complete/Partial/Missing)
3. Any concerns or missing information

Provide a structured analysis in JSON format:
{
  "matches": [
    {
      "requirement": "Bank Statements",
      "matchedDocuments": ["document1.pdf"],
      "status": "Complete|Partial|Missing",
      "notes": "Additional context"
    }
  ],
  "unmatchedDocuments": [],
  "missingRequirements": []
}
`;
}

// Document summarization prompt
export function buildDocumentSummaryPrompt(documents: any[]): string {
  return `
Create a comprehensive summary of all uploaded documents for this loan application:

DOCUMENTS TO SUMMARIZE:
${documents.map((doc, i) => `${i + 1}. ${doc.fileName} - ${doc.documentType || 'Unknown'}`).join('\n')}

EXTRACTED TEXT CONTENT:
${documents.map(doc => doc.extractedText || 'No text extracted').join('\n\n')}

Provide a structured summary including:
1. Document Overview (what was submitted)
2. Key Financial Information extracted
3. Business Details discovered
4. Compliance/Legal notes
5. Red flags or concerns
6. Missing information that should be requested

Format as a professional document summary suitable for underwriting review.
`;
}

// Utility function for safe OpenAI calls
export async function callOpenAI(prompt: string, maxTokens: number = 1500): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI not configured - missing API key');
  }

  try {
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-5', // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: 'system',
          content: 'You are a senior credit analyst and loan processing expert. Provide accurate, professional analysis based on the provided data.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: maxTokens,
      temperature: 0.3
    });

    return completion.choices[0]?.message?.content || 'No response generated';
  } catch (error: unknown) {
    console.error('OpenAI API call failed:', error);
    throw new Error(`AI analysis failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'}`);
  }
}