import { Router } from "express";
import { Client } from "@microsoft/microsoft-graph-client";
import { AuthenticationProvider } from "@microsoft/microsoft-graph-client";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";

const router = Router();

class SimpleAuthProvider implements AuthenticationProvider {
  constructor(private accessToken: string) {}
  
  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

// OAuth connect endpoint
router.get("/connect", (req: any, res: any) => {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = `${process.env.BASE_URL || 'https://localhost:5000'}/api/o365/callback`;
  const scopes = "openid profile email offline_access Mail.Send Calendars.ReadWrite";
  
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
    `client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}&response_mode=query`;
  
  res.redirect(authUrl);
});

// OAuth callback
router.get("/callback", async (req: any, res: any) => {
  try {
    const { code } = req.query;
    const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        code: code as string,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.BASE_URL || 'https://localhost:5000'}/api/o365/callback`
      })
    });
    
    const tokens = await tokenResponse.json();
    
    if (tokens.access_token) {
      // Store tokens in database (for demo, using a dummy user ID)
      const userId = "demo-user"; // In real app, get from JWT token
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      
      await db.execute(sql`
        INSERT INTO o365_tokens(user_id, access_token, refresh_token, expires_at, updated_at)
        VALUES(${userId}, ${tokens.access_token}, ${tokens.refresh_token || null}, ${expiresAt}, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `);
      
      res.redirect("/?connected=true");
    } else {
      throw new Error("No access token received");
    }
  } catch (error: unknown) {
    console.error('[O365 CALLBACK ERROR]', error);
    res.redirect("/?error=oauth_failed");
  }
});

// Send email
router.post("/sendMail", async (req: any, res: any) => {
  try {
    const { to, subject, body } = req.body;
    const userId = "demo-user"; // Get from JWT in real app
    
    // Get stored token
    const { rows } = await db.execute(sql`
      SELECT access_token FROM o365_tokens WHERE user_id=${userId} LIMIT 1
    `);
    
    if (!rows?.[0]?.access_token) {
      return res.status(401).json({ error: "Not connected to Office 365" });
    }
    
    const graphClient = Client.initWithMiddleware({
      authProvider: new SimpleAuthProvider(rows[0].access_token)
    });
    
    const mail = {
      message: {
        subject,
        body: {
          contentType: "Text",
          content: body
        },
        toRecipients: [{
          emailAddress: {
            address: to
          }
        }]
      }
    };
    
    await graphClient.api('/me/sendMail').post(mail);
    
    res.json({ ok: true });
  } catch (error: unknown) {
    console.error('[SEND MAIL ERROR]', error);
    res.status(500).json({ error: String(error) });
  }
});

// Create Teams meeting
router.post("/meeting", async (req: any, res: any) => {
  try {
    const { attendee, title, date, start, duration } = req.body;
    const userId = "demo-user"; // Get from JWT in real app
    
    // Get stored token
    const { rows } = await db.execute(sql`
      SELECT access_token FROM o365_tokens WHERE user_id=${userId} LIMIT 1
    `);
    
    if (!rows?.[0]?.access_token) {
      return res.status(401).json({ error: "Not connected to Office 365" });
    }
    
    const graphClient = Client.initWithMiddleware({
      authProvider: new SimpleAuthProvider(rows[0].access_token)
    });
    
    const startDateTime = new Date(`${date}T${start}:00`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
    
    const event = {
      subject: title,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "UTC"
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "UTC"
      },
      attendees: [{
        emailAddress: {
          address: attendee,
          name: attendee
        },
        type: "required"
      }],
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness"
    };
    
    const createdEvent = await graphClient.api('/me/events').post(event);
    
    res.json({ 
      ok: true, 
      meetingUrl: createdEvent.onlineMeeting?.joinUrl,
      eventId: createdEvent.id 
    });
  } catch (error: unknown) {
    console.error('[CREATE MEETING ERROR]', error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;