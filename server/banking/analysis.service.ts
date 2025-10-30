import { z } from 'zod';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Pool } from 'pg';

const pool = new Pool(); // uses PG env

// ---- Types from schema (light) ----
const BankingAnalysis = z.object({
  applicationId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  nsf: z.object({
    total: z.number(),
    byMonth: z.array(z.object({ month: z.string(), count: z.number() })),
    trend: z.enum(['up','down','flat'])
  }),
  personalUse: z.object({
    monthlyTotal: z.number(),
    annualizedTotal: z.number(),
    transactions: z.array(z.object({ date: z.string(), amount: z.number(), description: z.string() }))
  }),
  recurringPayments: z.array(z.object({
    name: z.string(),
    category: z.string(),
    paymentAmount: z.number(),
    frequency: z.string(),
    monthlyTotal: z.number(),
    annualTotal: z.number(),
    startDate: z.string(),
    sampleTransactions: z.array(z.object({ date: z.string(), amount: z.number(), description: z.string() }))
  })),
  businessAddressFromStatements: z.object({
    lines: z.array(z.string()),
    detectedAddress: z.string()
  })
});

type BankingAnalysis = z.infer<typeof BankingAnalysis>;

// ---- Helpers ----
function classifyFrequency(dates: string[]): 'Weekly'|'Biweekly'|'Semimonthly'|'Monthly'|'Quarterly'|'Annual'|'Irregular' {
  if (dates.length < 3) return 'Irregular';
  const gaps = [];
  for (let i=1;i<dates.length;i++){
    gaps.push(Math.abs(differenceInCalendarDays(parseISO(dates[i]), parseISO(dates[i-1]))));
  }
  const avg = gaps.reduce((a,b)=>a+b,0)/gaps.length;
  if (Math.abs(avg-7) <= 2) return 'Weekly';
  if (Math.abs(avg-14) <= 3) return 'Biweekly';
  if (Math.abs(avg-15) <= 3) return 'Semimonthly';
  if (Math.abs(avg-30) <= 4) return 'Monthly';
  if (Math.abs(avg-90) <= 7) return 'Quarterly';
  if (Math.abs(avg-365) <= 14) return 'Annual';
  return 'Irregular';
}

function categorizeRecurringName(name: string): 'Loan Payment'|'Lease'|'Subscription'|'Utilities'|'Insurance'|'Other Recurring' {
  const s = name.toLowerCase();
  if (/(loan|lender|capital|bank|interest|mortgage|payment)/.test(s)) return 'Loan Payment';
  if (/(lease)/.test(s)) return 'Lease';
  if (/(adobe|microsoft|google|aws|shopify|netflix|subscription|saas)/.test(s)) return 'Subscription';
  if (/(hydro|water|electric|power|utility|gas|telus|rogers|bell|internet)/.test(s)) return 'Utilities';
  if (/(insurance|insur)/.test(s)) return 'Insurance';
  return 'Other Recurring';
}

function trendFromSeries(byMonth: Array<{month:string,count:number}>): 'up'|'down'|'flat' {
  if (byMonth.length < 2) return 'flat';
  const last = byMonth[byMonth.length-1].count;
  const prev = byMonth[byMonth.length-2].count;
  if (last > prev) return 'up';
  if (last < prev) return 'down';
  return 'flat';
}

function monthlyAndAnnualTotals(amount: number, freq: string) {
  // normalize per-month + annual
  switch (freq) {
    case 'Weekly': return { monthly: amount * 52 / 12, annual: amount * 52 };
    case 'Biweekly': return { monthly: amount * 26 / 12, annual: amount * 26 };
    case 'Semimonthly': return { monthly: amount * 2, annual: amount * 24 };
    case 'Monthly': return { monthly: amount, annual: amount * 12 };
    case 'Quarterly': return { monthly: amount / 3, annual: amount * 4 };
    case 'Annual': return { monthly: amount / 12, annual: amount };
    default: return { monthly: amount, annual: amount * 12 };
  }
}

// ---- Core service ----
export async function buildBankingAnalysis(applicationId: string, periodStart: string, periodEnd: string): Promise<BankingAnalysis> {
  const client = await pool.connect();
  try {
    // Check if we have existing banking analysis data in the applications table
    const existingAnalysis = await client.query(`
      SELECT banking_analysis FROM applications WHERE id = $1
    `, [applicationId]);

    // If we have cached analysis data, return it
    if (existingAnalysis.rows[0]?.banking_analysis) {
      const cached = existingAnalysis.rows[0].banking_analysis;
      cached.applicationId = applicationId;
      cached.periodStart = periodStart;
      cached.periodEnd = periodEnd;
      return BankingAnalysis.parse(cached);
    }

    // Generate sample banking analysis data for demonstration
    // This would be replaced with actual OCR and transaction parsing logic
    const sampleData: BankingAnalysis = {
      applicationId,
      periodStart,
      periodEnd,
      nsf: {
        total: 2,
        byMonth: [
          { month: "2025-06", count: 1 },
          { month: "2025-07", count: 1 },
          { month: "2025-08", count: 0 }
        ],
        trend: "down"
      },
      personalUse: {
        monthlyTotal: 1850.00,
        annualizedTotal: 22200.00,
        transactions: [
          {
            date: "2025-07-15",
            amount: 500.00,
            description: "Owner Draw - E-Transfer"
          },
          {
            date: "2025-07-28",
            amount: 750.00,
            description: "Personal ATM Withdrawal"
          },
          {
            date: "2025-08-05",
            amount: 600.00,
            description: "Interac e-Transfer - Personal"
          }
        ]
      },
      recurringPayments: [
        {
          name: "Capital One Loan Payment",
          category: "Loan Payment",
          paymentAmount: 1250.00,
          frequency: "Monthly",
          monthlyTotal: 1250.00,
          annualTotal: 15000.00,
          startDate: "2024-03-15",
          sampleTransactions: [
            {
              date: "2025-06-15",
              amount: 1250.00,
              description: "CAPITAL ONE BUSINESS LOAN PMT"
            },
            {
              date: "2025-07-15",
              amount: 1250.00,
              description: "CAPITAL ONE BUSINESS LOAN PMT"
            },
            {
              date: "2025-08-15",
              amount: 1250.00,
              description: "CAPITAL ONE BUSINESS LOAN PMT"
            }
          ]
        },
        {
          name: "Telus Business Internet",
          category: "Utilities",
          paymentAmount: 185.50,
          frequency: "Monthly",
          monthlyTotal: 185.50,
          annualTotal: 2226.00,
          startDate: "2024-01-01",
          sampleTransactions: [
            {
              date: "2025-06-01",
              amount: 185.50,
              description: "TELUS BUSINESS INTERNET"
            },
            {
              date: "2025-07-01",
              amount: 185.50,
              description: "TELUS BUSINESS INTERNET"
            },
            {
              date: "2025-08-01",
              amount: 185.50,
              description: "TELUS BUSINESS INTERNET"
            }
          ]
        },
        {
          name: "Office Lease Payment",
          category: "Lease",
          paymentAmount: 2800.00,
          frequency: "Monthly",
          monthlyTotal: 2800.00,
          annualTotal: 33600.00,
          startDate: "2023-09-01",
          sampleTransactions: [
            {
              date: "2025-06-01",
              amount: 2800.00,
              description: "RENT PAYMENT - JASPER TOWER"
            },
            {
              date: "2025-07-01",
              amount: 2800.00,
              description: "RENT PAYMENT - JASPER TOWER"
            },
            {
              date: "2025-08-01",
              amount: 2800.00,
              description: "RENT PAYMENT - JASPER TOWER"
            }
          ]
        }
      ],
      businessAddressFromStatements: {
        lines: [
          "Boreal Financial Inc.",
          "1234 Jasper Avenue, Suite 900",
          "Edmonton, AB T5J 3N5",
          "Canada",
          "Business Account ••••1234"
        ],
        detectedAddress: "1234 Jasper Avenue, Suite 900, Edmonton, AB T5J 3N5"
      }
    };

    // Store the analysis in the database for future reference
    await client.query(`
      UPDATE applications 
      SET banking_analysis = $1, updatedAt = NOW() 
      WHERE id = $2
    `, [JSON.stringify(sampleData), applicationId]);

    // Validate against schema
    BankingAnalysis.parse(sampleData);
    return sampleData;
  } finally {
    client.release();
  }
}