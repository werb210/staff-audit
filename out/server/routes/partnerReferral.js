import express from 'express';
import { getContactsByRole, enrichContactFromAPI, getLeadSources } from '../services/partnerReferralService';
// REMOVED: async (req: any, res: any) =>
const router = express.Router();
/**
 * GET /api/partner-referral/contacts
 * Get contacts filtered by user role (role-based access control)
 */
router.get('/contacts', async (req, res) => {
    console.log('🔍 [PARTNER-REFERRAL] Fetching contacts with role filtering');
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        console.log(`👤 [PARTNER-REFERRAL] User role: ${user.role}, ID: ${user.id}`);
        // Get contacts filtered by role
        const contacts = await getContactsByRole(user.role, user.id);
        res.json({
            success: true,
            contacts,
            userRole: user.role,
            count: contacts.length,
            message: user.role === 'referral_agent'
                ? 'Showing partner referral contacts only'
                : 'Showing all contacts'
        });
    }
    catch (error) {
        console.error('❌ [PARTNER-REFERRAL] Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch contacts',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
/**
 * POST /api/partner-referral/enrich-contact
 * Enrich existing contact with additional data
 */
router.post('/enrich-contact', async (req, res) => async (req, res) => {
    console.log('🔄 [PARTNER-REFERRAL] Contact enrichment request');
    try {
        const { phone, enrichmentData } = req.body;
        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }
        if (!enrichmentData || typeof enrichmentData !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Enrichment data is required'
            });
        }
        const updatedContact = await enrichContactFromAPI(phone, enrichmentData);
        if (!updatedContact) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found'
            });
        }
        res.json({
            success: true,
            contact: updatedContact,
            message: 'Contact enriched successfully'
        });
    }
    catch (error) {
        console.error('❌ [PARTNER-REFERRAL] Error enriching contact:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to enrich contact',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
/**
 * GET /api/partner-referral/lead-sources
 * Get all active lead sources configuration
 */
router.get('/lead-sources', async (req, res) => {
    console.log('🎯 [PARTNER-REFERRAL] Fetching lead sources configuration');
    try {
        const user = req.user;
        // Only admin and staff can view lead sources configuration
        if (!user || !['admin', 'staff'].includes(user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied - admin or staff role required'
            });
        }
        const leadSources = await getLeadSources();
        res.json({
            success: true,
            leadSources,
            count: leadSources.length,
            message: 'Lead sources configuration retrieved'
        });
    }
    catch (error) {
        console.error('❌ [PARTNER-REFERRAL] Error fetching lead sources:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch lead sources',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
/**
 * GET /api/partner-referral/pipeline-view
 * Role-restricted pipeline view - shows different data based on user role
 */
router.get('/pipeline-view', async (req, res) => async (req, res) => {
    console.log('📋 [PARTNER-REFERRAL] Pipeline view request');
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        // Get contacts and enrich with pipeline data
        const contacts = await getContactsByRole(user.role, user.id);
        // Transform contacts for pipeline view
        const pipelineData = contacts.map(contact => ({
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            businessName: contact.businessName,
            source: contact.source,
            status: contact.status,
            role: contact.role,
            referralId: contact.referralId,
            createdAt: contact.createdAt,
            stage: determineStage(contact),
            priority: determinePriority(contact)
        }));
        // Role-based filtering and sorting
        let filteredPipeline = pipelineData;
        if (user.role === 'referral_agent') {
            // Referral agents only see partner_referral contacts
            filteredPipeline = pipelineData.filter(item => item.source === 'partner_referral');
        }
        // Sort by priority and creation date
        filteredPipeline.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority; // High priority first
            }
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(); // Newest first
        });
        res.json({
            success: true,
            pipeline: filteredPipeline,
            userRole: user.role,
            count: filteredPipeline.length,
            totalContacts: contacts.length,
            filters: {
                roleRestricted: user.role === 'referral_agent',
                sourceFilter: user.role === 'referral_agent' ? 'partner_referral' : 'all'
            }
        });
    }
    catch (error) {
        console.error('❌ [PARTNER-REFERRAL] Error fetching pipeline view:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pipeline view',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
/**
 * Helper function to determine pipeline stage from contact data
 */
function determineStage(contact) {
    if (!contact.email && !contact.businessName) {
        return 'lead'; // Basic contact info only
    }
    if (contact.status === 'unhandled') {
        return 'new';
    }
    if (contact.businessName && contact.email) {
        return 'qualified';
    }
    if (contact.referralId) {
        return 'referred';
    }
    return 'contact';
}
/**
 * Helper function to determine priority from contact data
 */
function determinePriority(contact) {
    let priority = 1; // Base priority
    // Partner referrals get higher priority
    if (contact.source === 'partner_referral') {
        priority += 2;
    }
    // Business contacts get higher priority
    if (contact.businessName) {
        priority += 1;
    }
    // Unhandled contacts get higher priority
    if (contact.status === 'unhandled') {
        priority += 1;
    }
    return Math.min(5, priority); // Cap at 5
}
/**
 * GET /api/partner-referral/status
 * System status and health check
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        service: 'Partner Referral System',
        status: 'operational',
        timestamp: new Date().toISOString(),
        features: {
            roleBasedAccess: true,
            contactEnrichment: true,
            pipelineFiltering: true,
            leadSourceConfiguration: true,
            twilioIntegration: true
        },
        endpoints: {
            contacts: 'GET /api/partner-referral/contacts',
            enrichContact: 'POST /api/partner-referral/enrich-contact',
            leadSources: 'GET /api/partner-referral/lead-sources',
            pipelineView: 'GET /api/partner-referral/pipeline-view',
            status: 'GET /api/partner-referral/status'
        }
    });
});
export default router;
