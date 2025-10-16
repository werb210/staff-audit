export type TenantId = string; // UUID in existing schema
export type Role = "admin"|"manager"|"agent"|"marketing"|"lender"|"referrer"|"viewer";
export type Stage = "New"|"In Review"|"Requires Docs"|"Off to Lender"|"Accepted"|"Declined";

// Interfaces that map to existing database structure
export interface User { 
  id: string; 
  tenant_id?: TenantId; 
  email: string; 
  name?: string; 
  role: Role; 
  active?: boolean; 
  created_at?: string;
  updated_at?: string;
}

export interface Contact { 
  id: string; 
  tenant_id?: TenantId; 
  full_name?: string; 
  email?: string; 
  phone?: string; 
  role?: string;
  company_name?: string; 
  application_id?: string;
  slf_contact_id?: string;
  slf_lead_status?: string;
  slf_last_sync?: string;
  source?: string;
  status?: string;
  job_title?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Application { 
  id: string; 
  tenant_id?: TenantId; 
  business_name?: string; 
  contact_id?: string; 
  contact_phone?: string; 
  requested_amount?: number; 
  assigned_lender_id?: string; 
  stage?: Stage; 
  outcome?: string|null; 
  funded_amount?: number|null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LenderProduct { 
  id: string; 
  tenant_id?: TenantId; 
  lender_id: string; 
  name: string; 
  category?: string; 
  min_amount?: number; 
  max_amount?: number; 
  rate_apr?: number; 
  term_months?: number; 
  data?: any; 
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LenderReport { 
  id: string; 
  tenant_id?: TenantId; 
  lender_id: string; 
  name: string; 
  type: "link"|"iframe"|"pdf"|"csv"; 
  url?: string; 
  embed_url?: string;
  created_at?: string;
}

export interface ReportPrefs { 
  tenant_id?: TenantId; 
  lender_id: string; 
  reports: string[];
  updated_at?: string;
}

export interface IntakeEvent { 
  id: string; 
  tenant_id?: TenantId; 
  contact_id?: string; 
  app_id?: string; 
  source: string; 
  campaign?: string; 
  medium?: string; 
  created_at?: string; 
}

export interface MarketingCost { 
  id: string; 
  tenant_id?: TenantId; 
  campaign: string; 
  month: string; 
  cost: number; 
}

export type LenderRecStatus = 'sent'|'viewed'|'underwriting'|'declined'|'funded';
export interface LenderRecommendation { id:string; appId:string; lenderId:string; status:LenderRecStatus; sentAt:string; updatedAt:string; }
export interface Task { id:string; contactId:string; title:string; dueAt:string; assigneeId:string; priority:'none'|'low'|'medium'|'high'|'urgent'; type:'todo'|'call'|'email'|'meeting'; notes?:string; createdAt:string; }
export interface Note { id:string; contactId:string; authorId:string; html:string; createdAt:string; followUpTaskId?:string; }