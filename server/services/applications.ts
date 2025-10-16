import { db } from '../db';
import { applications, documents } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Validation schemas
export const applicationCreateSchema = z.object({
  applicantData: z.object({
    business_name: z.string().min(1, "Business name is required"),
    business_type: z.string().min(1, "Business type is required"),
    contact_email: z.string().email("Valid email is required"),
    contact_first_name: z.string().optional(),
    contact_last_name: z.string().optional(),
    business_phone: z.string().optional(),
    business_address: z.string().optional(),
    years_in_business: z.number().optional(),
    annual_revenue: z.number().optional(),
    number_of_employees: z.number().optional(),
  }),
  requested_amount: z.number().min(1000, "Minimum amount is $1,000"),
  product_id: z.string().uuid("Valid product ID required"),
  country: z.enum(['US', 'CA'], { required_error: "Country must be US or CA" }),
});

export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;

export class ApplicationsService {
  async createApplication(data: ApplicationCreateInput) {
    try {
      console.log('📝 [APPLICATIONS] Creating new application:', {
        business: data.applicantData.business_name,
        amount: data.requested_amount,
        country: data.country,
        product_id: data.product_id
      });

      // Validate input
      const validatedData = applicationCreateSchema.parse(data);

      // Create application record using ACTUAL database column names
      const [newApplication] = await db.insert(applications).values({
        legal_business_name: validatedData.applicantData.business_name,
        business_type: validatedData.applicantData.business_type,
        contact_email: validatedData.applicantData.contact_email,
        contact_first_name: validatedData.applicantData.contact_first_name,
        contact_last_name: validatedData.applicantData.contact_last_name,
        business_phone: validatedData.applicantData.business_phone,
        business_address: validatedData.applicantData.business_address,
        years_in_business: validatedData.applicantData.years_in_business,
        annual_revenue: validatedData.applicantData.annual_revenue,
        number_of_employees: validatedData.applicantData.number_of_employees,
        requested_amount: validatedData.requested_amount, // Use snake_case column name
        product_id: validatedData.product_id, // Use snake_case column name
        stage: 'New', // Use valid pipeline_stage enum value (capital case)
        status: 'draft', // Use valid application_status enum value
        form_data: validatedData.applicantData, // Use snake_case column name
        // Note: No tenant/tenantId columns in actual database
      }).returning();

      console.log('✅ [APPLICATIONS] Application created successfully:', newApplication.id);

      return {
        id: newApplication.id,
        status: newApplication.status
      };
    } catch (error) {
      console.error('❌ [APPLICATIONS] Failed to create application:', error);
      throw error;
    }
  }

  async getApplication(id: string) {
    try {
      const [application] = await db.select().from(applications).where(eq(applications.id, id));
      
      if (!application) {
        throw new Error('Application not found');
      }

      return application;
    } catch (error) {
      console.error('❌ [APPLICATIONS] Failed to get application:', error);
      throw error;
    }
  }

  async updateApplicationStatus(id: string, status: string, stage?: string) {
    try {
      const updateData: any = { status, updatedAt: new Date() };
      if (stage) updateData.stage = stage;

      const [updatedApplication] = await db
        .update(applications)
        .set(updateData)
        .where(eq(applications.id, id))
        .returning();

      if (!updatedApplication) {
        throw new Error('Application not found');
      }

      console.log('✅ [APPLICATIONS] Application status updated:', {
        id,
        status,
        stage
      });

      return updatedApplication;
    } catch (error) {
      console.error('❌ [APPLICATIONS] Failed to update application status:', error);
      throw error;
    }
  }

  async submitApplication(id: string) {
    try {
      console.log('📤 [APPLICATIONS] Submitting application:', id);

      // Update application to submitted status
      const updatedApplication = await this.updateApplicationStatus(id, 'submitted', 'In Review'); // Use correct enum case

      // Mark as ready for lenders (skip if columns don't exist)
      // await db
      //   .update(applications)
      //   .set({
      //     is_ready_for_lenders: true,
      //     submitted_at: new Date()
      //   })
      //   .where(eq(applications.id, id));

      console.log('✅ [APPLICATIONS] Application submitted successfully:', id);

      return {
        id: updatedApplication.id,
        status: 'submitted'
      };
    } catch (error) {
      console.error('❌ [APPLICATIONS] Failed to submit application:', error);
      throw error;
    }
  }
}

export const applicationsService = new ApplicationsService();