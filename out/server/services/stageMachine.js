import { smsOnStage, createFollowUpTask, logStageTransition } from './pipelineSms';
// Pipeline stage definitions
export const PIPELINE_STAGES = [
    'New',
    'In Review',
    'Requires Docs',
    'Off to Lender',
    'Accepted',
    'Declined'
];
// RBAC permissions for stage transitions
const STAGE_PERMISSIONS = {
    'New': ['agent', 'manager', 'admin'],
    'In Review': ['agent', 'manager', 'admin'],
    'Requires Docs': ['agent', 'manager', 'admin'],
    'Off to Lender': ['manager', 'admin'], // Restricted
    'Accepted': ['manager', 'admin'], // Restricted  
    'Declined': ['manager', 'admin'] // Restricted
};
// Valid stage transitions
const VALID_TRANSITIONS = {
    'New': ['In Review', 'Requires Docs'],
    'In Review': ['Requires Docs', 'Off to Lender'],
    'Requires Docs': ['In Review'],
    'Off to Lender': ['Accepted', 'Declined'],
    'Accepted': [], // Terminal
    'Declined': [] // Terminal
};
/**
 * Validate if a stage transition is allowed
 */
export function isTransitionAllowed(from, to) {
    return VALID_TRANSITIONS[from].includes(to);
}
/**
 * Check if user has permission for stage transition
 */
export function hasStagePermission(stage, userRole) {
    const allowedRoles = STAGE_PERMISSIONS[stage] || [];
    return allowedRoles.includes(userRole);
}
/**
 * Auto-evaluate stage transitions based on application state
 */
export function evaluateAutoTransitions(app) {
    const { currentStage, documentsCount = 0, rejectedDocsCount = 0 } = app;
    switch (currentStage) {
        case 'New':
            if (documentsCount === 0) {
                return { shouldMove: true, targetStage: 'Requires Docs', reason: 'No documents uploaded' };
            }
            if (documentsCount > 0 && rejectedDocsCount === 0) {
                return { shouldMove: true, targetStage: 'In Review', reason: 'Documents uploaded, none rejected' };
            }
            break;
        case 'In Review':
            if (rejectedDocsCount > 0) {
                return { shouldMove: true, targetStage: 'Requires Docs', reason: 'Rejected documents present' };
            }
            break;
        case 'Requires Docs':
            if (documentsCount > 0 && rejectedDocsCount === 0) {
                return { shouldMove: true, targetStage: 'In Review', reason: 'All documents present, none rejected' };
            }
            break;
        default:
            // No auto-transitions for other stages
            break;
    }
    return { shouldMove: false };
}
/**
 * Execute stage transition with all side effects
 */
export async function executeStageTransition(args) {
    const { app, contact, targetStage, reason, by, userRole } = args;
    // Validate transition
    if (!isTransitionAllowed(app.currentStage, targetStage)) {
        return { success: false, error: `Invalid transition from ${app.currentStage} to ${targetStage}` };
    }
    // Check permissions
    if (!hasStagePermission(targetStage, userRole)) {
        return { success: false, error: `Insufficient permissions for ${targetStage} (role: ${userRole})` };
    }
    try {
        // Log the transition
        await logStageTransition(app.id, app.currentStage, targetStage, by, reason);
        // Execute stage entry actions
        await executeStageEntryActions(targetStage, app, contact);
        // Start any timers for the new stage
        await startStageTimers(targetStage, app.id);
        console.log(`[STAGE-MACHINE] Successfully moved app ${app.id} from ${app.currentStage} to ${targetStage}`);
        return { success: true };
    }
    catch (error) {
        console.error(`[STAGE-MACHINE] Error executing transition:`, error);
        return { success: false, error: error.message };
    }
}
/**
 * Execute actions when entering a stage
 */
async function executeStageEntryActions(stage, app, contact) {
    const smsArgs = {
        contactPhone: contact.phone || '',
        firstName: contact.firstName,
        businessName: app.companyName
    };
    switch (stage) {
        case 'New':
            // OCR and Banking analysis would be triggered here
            await smsOnStage('New', smsArgs);
            console.log(`[STAGE-ENTRY] App ${app.id}: OCR/Banking queued`);
            break;
        case 'In Review':
            await smsOnStage('In Review', smsArgs);
            break;
        case 'Requires Docs':
            await smsOnStage('Requires Docs', smsArgs);
            await createFollowUpTask('Collect missing/updated documents', 'high');
            break;
        case 'Off to Lender':
            await smsOnStage('Off to Lender', smsArgs);
            // Analytics increment would happen here
            break;
        case 'Accepted':
            // Note: SMS is sent via smsOnFundsDisbursed, not stage SMS
            // Analytics increment would happen here
            break;
        case 'Declined':
            await smsOnStage('Declined', smsArgs);
            // Analytics increment would happen here
            break;
    }
}
/**
 * Start timers for stage-specific follow-ups
 */
async function startStageTimers(stage, appId) {
    // In a real implementation, these would be scheduled jobs
    console.log(`[STAGE-TIMERS] Starting timers for ${stage} on app ${appId}`);
    switch (stage) {
        case 'In Review':
            // 48h Review SLA timer
            console.log(`[STAGE-TIMERS] Review SLA timer started (48h) for app ${appId}`);
            break;
        case 'Requires Docs':
            // 72h document chase timer (repeating)
            console.log(`[STAGE-TIMERS] Document chase timer started (72h, repeating) for app ${appId}`);
            break;
        case 'Off to Lender':
            // 96h lender follow-up timer (repeating)
            console.log(`[STAGE-TIMERS] Lender follow-up timer started (96h, repeating) for app ${appId}`);
            break;
    }
}
