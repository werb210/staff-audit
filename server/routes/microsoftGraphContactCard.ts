/**
 * Microsoft Graph/Office 365 Integration for CRM Contact Card
 * Phase 3: Email Send/Receive and OAuth Implementation
 */

import { Router } from 'express';
import { db } from '../db';
import { 
  contacts, 
  emailAccounts, 
  emailThreads, 
  emailMessages2, 
  contactLogs 
} from '../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';
import { getCallbackUrl } from '../utils/baseUrl';

const router = Router();

// Microsoft Graph API configuration
const MSGRAPH_CLIENT_ID = process.env.MSGRAPH_CLIENT_ID || 'e62aed67-c241-465a-9efb-c656800c7428';
// Dynamic redirect URI generation moved to individual routes
const MSGRAPH_MODE = process.env.MSGRAPH_MODE || 'public';

/**
 * GET /api/msgraph/oauth
 * Initiate Microsoft OAuth flow
 */
router.get('/oauth', (req: any, res: any) => {
  try {
    const { staffUserId, type } = req.query;
    const state = crypto.randomBytes(16).toString('hex');
    
    if (!MSGRAPH_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        error: 'Microsoft OAuth not configured. Please set MSGRAPH_CLIENT_ID.'
      });
    }
    
    console.log(`🔐 [MSGRAPH-OAUTH] Initiating OAuth for staff user: ${staffUserId} (type: ${type || 'personal'})`);
    
    // Store state for verification (in production, use Redis or session)
    req.session = req.session || {};
    req.session.oauthState = state;
    req.session.staffUserId = staffUserId;
    req.session.emailType = type || 'personal';
    
    const redirectUri = process.env.MSGRAPH_REDIRECT_URI || getCallbackUrl('/api/msgraph/callback', req);
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` + 
      `client_id=${MSGRAPH_CLIENT_ID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent('https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access')}&` +
      `state=${state}`;
    
    console.log(`🔗 [MSGRAPH-OAUTH] Redirecting to Microsoft OAuth`);
    
    res.redirect(authUrl);
    
  } catch (error: unknown) {
    console.error('❌ [MSGRAPH-OAUTH] OAuth initiation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate OAuth flow'
    });
  }
});

/**
 * GET /api/msgraph/callback
 * Handle Microsoft OAuth callback
 */
router.get('/callback', async (req: any, res: any) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      console.error('❌ [MSGRAPH-CALLBACK] OAuth error:', error);
      return res.status(400).json({
        success: false,
        error: `OAuth error: ${error}`
      });
    }
    
    // Verify state
    if (!req.session?.oauthState || req.session.oauthState !== state) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OAuth state'
      });
    }
    
    const staffUserId = req.session.staffUserId;
    
    console.log(`🔐 [MSGRAPH-CALLBACK] Processing OAuth callback for staff: ${staffUserId}`);
    
    // Exchange code for tokens (public client mode - no secret required)
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: MSGRAPH_CLIENT_ID!,
        code: code as string,
        redirect_uri: MSGRAPH_REDIRECT_URI,
        grant_type: 'authorization_code',
        scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access'
      })
    });
    
    const tokens = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokens.error_description}`);
    }
    
    // Get user profile
    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });
    
    const profile = await profileResponse.json();
    
    // Store email account in database
    const [emailAccount] = await db
      .insert(emailAccounts)
      .values({
        staffUserId,
        microsoftId: profile.id,
        emailAddress: profile.mail || profile.userPrincipalName,
        displayName: profile.displayName,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
        status: 'active'
      })
      .returning();
    
    console.log(`✅ [MSGRAPH-CALLBACK] Email account connected: ${emailAccount.emailAddress}`);
    
    // Clear session state
    delete req.session.oauthState;
    delete req.session.staffUserId;
    
    // Redirect back to staff portal
    res.redirect('/dashboard/settings?email_connected=true');
    
  } catch (error: unknown) {
    console.error('❌ [MSGRAPH-CALLBACK] OAuth callback failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete OAuth flow',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/msgraph/send
 * Send email to contact
 */
router.post('/send', async (req: any, res: any) => {
  try {
    const { contactId, to, subject, body, fromAccountId } = req.body;
    const staffUserId = req.user?.id || 'system';
    
    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'To, subject, and body are required'
      });
    }
    
    console.log(`📧 [MSGRAPH-SEND] Sending email to: ${to}`);
    
    // Get email account
    let emailAccount;
    if (fromAccountId) {
      const accounts = await db
        .select()
        .from(emailAccounts)
        .where(and(
          eq(emailAccounts.id, fromAccountId),
          eq(emailAccounts.staffUserId, staffUserId)
        ))
        .limit(1);
      emailAccount = accounts[0];
    } else {
      // Use default account for this staff user
      const accounts = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.staffUserId, staffUserId))
        .limit(1);
      emailAccount = accounts[0];
    }
    
    if (!emailAccount) {
      return res.status(400).json({
        success: false,
        error: 'No email account configured. Please connect your Office 365 account first.'
      });
    }
    
    // Check if token needs refresh
    if (new Date() >= new Date(emailAccount.tokenExpiresAt!)) {
      // TODO: Implement token refresh
      return res.status(401).json({
        success: false,
        error: 'Email account token expired. Please reconnect your account.'
      });
    }
    
    // Create tracking pixel URL
    const trackingId = crypto.randomUUID();
    const trackingPixelUrl = getCallbackUrl(`/track/email-open/${trackingId}`, req);
    
    // Prepare email with tracking pixel
    const emailBody = body.includes('<html>') 
      ? body.replace('</body>', `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" /></body>`)
      : `${body}\n\n<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" />`;
    
    // Send email via Microsoft Graph
    const emailMessage = {
      message: {
        subject,
        body: {
          contentType: body.includes('<html>') ? 'HTML' : 'Text',
          content: emailBody
        },
        toRecipients: [
          {
            emailAddress: {
              address: to
            }
          }
        ],
        from: {
          emailAddress: {
            address: emailAccount.emailAddress
          }
        }
      },
      saveToSentItems: true
    };
    
    const sendResponse = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${emailAccount.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailMessage)
    });
    
    if (!sendResponse.ok) {
      const error = await sendResponse.json();
      throw new Error(`Failed to send email: ${error.error?.message || 'Unknown error'}`);
    }
    
    // Log email in database
    const [emailLog] = await db
      .insert(emailMessages2)
      .values({
        contactId,
        staffUserId,
        fromAddress: emailAccount.emailAddress,
        toAddresses: [to],
        subject,
        body: emailBody,
        direction: 'outbound',
        openTrackingPixelUrl: trackingPixelUrl,
        sentAt: new Date()
      })
      .returning();
    
    // Add to contact timeline
    if (contactId) {
      await db
        .insert(contactLogs)
        .values({
          contactId,
          type: 'email',
          direction: 'outbound',
          content: `Email sent: ${subject}`,
          staffUserId,
          metadata: { 
            emailId: emailLog.id,
            trackingId,
            toAddress: to
          }
        });
    }
    
    console.log(`✅ [MSGRAPH-SEND] Email sent successfully to: ${to}`);
    
    res.json({
      success: true,
      email: emailLog,
      trackingId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    console.error('❌ [MSGRAPH-SEND] Failed to send email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/msgraph/inbox
 * Poll inbox for new emails
 */
router.get('/inbox', async (req: any, res: any) => {
  try {
    const staffUserId = req.user?.id || 'system';
    const { limit = 10 } = req.query;
    
    console.log(`📬 [MSGRAPH-INBOX] Polling inbox for staff: ${staffUserId}`);
    
    // Get email accounts for this staff user
    const emailAccounts = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.staffUserId, staffUserId));
    
    if (emailAccounts.length === 0) {
      return res.json({
        success: true,
        messages: [],
        total: 0,
        message: 'No email accounts configured'
      });
    }
    
    const allMessages = [];
    
    for (const account of emailAccounts) {
      try {
        // Check if token needs refresh
        if (new Date() >= new Date(account.tokenExpiresAt!)) {
          console.log(`⚠️ [MSGRAPH-INBOX] Token expired for: ${account.emailAddress}`);
          continue;
        }
        
        // Fetch recent emails
        const inboxResponse = await fetch(
          `https://graph.microsoft.com/v1.0/me/messages?$top=${limit}&$orderby=receivedDateTime desc`,
          {
            headers: {
              'Authorization': `Bearer ${account.accessToken}`
            }
          }
        );
        
        if (!inboxResponse.ok) {
          console.error(`❌ [MSGRAPH-INBOX] Failed to fetch emails for: ${account.emailAddress}`);
          continue;
        }
        
        const inboxData = await inboxResponse.json();
        
        for (const message of inboxData.value) {
          allMessages.push({
            accountId: account.id,
            accountEmail: account.emailAddress,
            messageId: message.id,
            subject: message.subject,
            from: message.from?.emailAddress?.address,
            bodyPreview: message.bodyPreview,
            receivedDateTime: message.receivedDateTime,
            isRead: message.isRead,
            hasAttachments: message.hasAttachments
          });
        }
        
      } catch (error: unknown) {
        console.error(`❌ [MSGRAPH-INBOX] Error processing account ${account.emailAddress}:`, error);
      }
    }
    
    // Sort by received date
    allMessages.sort((a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime());
    
    console.log(`✅ [MSGRAPH-INBOX] Retrieved ${allMessages.length} messages`);
    
    res.json({
      success: true,
      messages: allMessages,
      total: allMessages.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    console.error('❌ [MSGRAPH-INBOX] Failed to poll inbox:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to poll inbox'
    });
  }
});

/**
 * GET /track/email-open/:trackingId
 * Track email opens
 */
router.get('/track/email-open/:trackingId', async (req: any, res: any) => {
  try {
    const { trackingId } = req.params;
    
    console.log(`👁️ [EMAIL-TRACKING] Email opened: ${trackingId}`);
    
    // Update email open tracking
    await db
      .update(emailMessages2)
      .set({
        openCount: db.select({ count: emailMessages2.openCount }).from(emailMessages2).where(eq(emailMessages2.openTrackingPixelUrl, `%${trackingId}%`)),
        firstOpenedAt: new Date(),
        lastOpenedAt: new Date()
      })
      .where(eq(emailMessages2.openTrackingPixelUrl, `%${trackingId}%`));
    
    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    
    res.send(pixel);
    
  } catch (error: unknown) {
    console.error('❌ [EMAIL-TRACKING] Failed to track email open:', error);
    res.status(500).send('Error');
  }
});

/**
 * GET /api/msgraph/accounts
 * Get connected email accounts for staff user
 */
router.get('/accounts', async (req: any, res: any) => {
  try {
    const staffUserId = req.user?.id || 'system';
    
    console.log(`📧 [MSGRAPH-ACCOUNTS] Fetching accounts for staff: ${staffUserId}`);
    
    // Use Drizzle's type-safe query builder instead of raw SQL
    const accounts = await db.select({
      id: emailAccounts.id,
      email: emailAccounts.emailAddress,
      displayName: emailAccounts.displayName,
      provider: emailAccounts.status, // Using status as provider equivalent
      isActive: emailAccounts.status, // We'll map this in the response
      createdAt: emailAccounts.createdAt
    })
    .from(emailAccounts)
    .where(eq(emailAccounts.staffUserId, staffUserId));
    
    // Map the results to match expected API response format
    const mappedAccounts = accounts.map(account => ({
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      provider: 'office365', // Default provider for Microsoft Graph integration
      isActive: account.isActive === 'active',
      createdAt: account.createdAt
    }));
    
    console.log(`📧 [MSGRAPH-ACCOUNTS] Found ${mappedAccounts.length} email accounts`);
    
    res.json({
      success: true,
      accounts: mappedAccounts,
      total: mappedAccounts.length,
      timestamp: new Date().toISOString(),
      staffUserId
    });
    
  } catch (error: unknown) {
    console.error('❌ [MSGRAPH-ACCOUNTS] Failed to fetch accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email accounts',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req: any, res: any) => {
  res.json({
    success: true,
    status: 'operational',
    service: 'Microsoft Graph Contact Card Integration',
    oauthConfigured: !!(MSGRAPH_CLIENT_ID),
    clientId: MSGRAPH_CLIENT_ID ? `${MSGRAPH_CLIENT_ID.substring(0, 8)}...` : 'Not configured',
    redirectUri: MSGRAPH_REDIRECT_URI,
    mode: MSGRAPH_MODE,
    timestamp: new Date().toISOString()
  });
});

export default router;