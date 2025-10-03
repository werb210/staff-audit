import { Router } from 'express';
import { authMiddleware } from '../../middleware/authJwt';
import { tokenService } from '../../services/tokenService';

const router = Router();

// Apply authentication middleware
router.use(authMiddleware);

interface MSGraphResponse {
  value: any[];
}

// Helper function to make Microsoft Graph API calls
async function makeGraphApiCall(accessToken: string, endpoint: string): Promise<any> {
  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Graph API call failed: ${response.status} ${error}`);
  }

  return response.json();
}

// Get Office 365 Calendar Events
router.get('/calendar', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get stored Office 365 token
    const token = await tokenService.getActiveToken(userId, 'microsoft');
    if (!token) {
      return res.status(401).json({ 
        error: 'Office 365 not connected',
        connectUrl: `/api/auth/microsoft?userId=${userId}`
      });
    }

    // Fetch calendar events from Microsoft Graph
    const { top = 10, days = 7 } = req.query;
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + parseInt(days as string) * 24 * 60 * 60 * 1000).toISOString();
    
    const endpoint = `/me/calendar/events?$top=${top}&$filter=start/dateTime ge '${startTime}' and start/dateTime le '${endTime}'&$orderby=start/dateTime`;
    
    const data: MSGraphResponse = await makeGraphApiCall(token.accessToken, endpoint);

    const events = data.value.map((event: any) => ({
      id: event.id,
      subject: event.subject,
      start: event.start,
      end: event.end,
      location: event.location?.displayName,
      organizer: event.organizer?.emailAddress,
      attendees: event.attendees?.map((a: any) => ({
        name: a.emailAddress?.name,
        email: a.emailAddress?.address,
        status: a.status?.response
      })),
      isOnlineMeeting: event.isOnlineMeeting,
      webLink: event.webLink,
      body: event.body?.content ? event.body.content.substring(0, 200) + '...' : ''
    }));

    res.json({
      success: true,
      events,
      totalCount: data.value.length,
      connected: true,
      tokenValid: true
    });

  } catch (error: unknown) {
    console.error('Office 365 calendar sync error:', error);
    
    // Handle token expiration
    if (error instanceof Error && error instanceof Error ? error.message : String(error).includes('401')) {
      return res.status(401).json({ 
        error: 'Office 365 token expired',
        connected: false,
        tokenValid: false,
        reconnectUrl: `/api/auth/microsoft?userId=${req.user?.id}`
      });
    }

    res.status(500).json({ 
      error: 'Failed to fetch calendar events',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Get Office 365 Email Messages
router.get('/email', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get stored Office 365 token
    const token = await tokenService.getActiveToken(userId, 'microsoft');
    if (!token) {
      return res.status(401).json({ 
        error: 'Office 365 not connected',
        connectUrl: `/api/auth/microsoft?userId=${userId}`
      });
    }

    // Fetch emails from Microsoft Graph
    const { top = 10, folder = 'inbox' } = req.query;
    const endpoint = `/me/mailFolders/${folder}/messages?$top=${top}&$select=id,subject,from,receivedDateTime,bodyPreview,importance,isRead,hasAttachments&$orderby=receivedDateTime desc`;
    
    const data: MSGraphResponse = await makeGraphApiCall(token.accessToken, endpoint);

    const emails = data.value.map((email: any) => ({
      id: email.id,
      subject: email.subject,
      from: {
        name: email.from?.emailAddress?.name,
        email: email.from?.emailAddress?.address
      },
      receivedDateTime: email.receivedDateTime,
      bodyPreview: email.bodyPreview,
      importance: email.importance,
      isRead: email.isRead,
      hasAttachments: email.hasAttachments
    }));

    res.json({
      success: true,
      emails,
      totalCount: data.value.length,
      connected: true,
      tokenValid: true,
      folder
    });

  } catch (error: unknown) {
    console.error('Office 365 email sync error:', error);
    
    // Handle token expiration
    if (error instanceof Error && error instanceof Error ? error.message : String(error).includes('401')) {
      return res.status(401).json({ 
        error: 'Office 365 token expired',
        connected: false,
        tokenValid: false,
        reconnectUrl: `/api/auth/microsoft?userId=${req.user?.id}`
      });
    }

    res.status(500).json({ 
      error: 'Failed to fetch emails',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Get Office 365 connection status
router.get('/status', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const token = await tokenService.getToken(userId, 'microsoft');
    const isConnected = !!token;
    const isExpired = token ? tokenService.isTokenExpired(token) : false;

    res.json({
      connected: isConnected && !isExpired,
      tokenExists: isConnected,
      tokenExpired: isExpired,
      tokenCreatedAt: token?.createdAt,
      tokenExpiresAt: token?.expiresAt,
      connectUrl: `/api/auth/microsoft?userId=${userId}`
    });

  } catch (error: unknown) {
    console.error('Office 365 status check error:', error);
    res.status(500).json({ 
      error: 'Failed to check Office 365 status',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Test connection with user profile
router.get('/profile', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const token = await tokenService.getActiveToken(userId, 'microsoft');
    if (!token) {
      return res.status(401).json({ 
        error: 'Office 365 not connected',
        connectUrl: `/api/auth/microsoft?userId=${userId}`
      });
    }

    const profile = await makeGraphApiCall(token.accessToken, '/me');

    res.json({
      success: true,
      connected: true,
      profile: {
        id: profile.id,
        displayName: profile.displayName,
        mail: profile.mail,
        userPrincipalName: profile.userPrincipalName,
        jobTitle: profile.jobTitle,
        department: profile.department
      }
    });

  } catch (error: unknown) {
    console.error('Office 365 profile error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Office 365 profile',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

export default router;