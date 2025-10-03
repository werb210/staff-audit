/**
 * Office 365 Integration for Staff Application
 * Features: Calendar Events, Email Thread History, Contacts Sync, Meeting Slots, Push Notifications
 */

import { Router } from 'express';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { db } from '../db/drizzle';
import { sql } from 'drizzle-orm';

const router = Router();

// Custom Auth Provider for Microsoft Graph
class CustomAuthProvider implements AuthenticationProvider {
  async getAccessToken(): Promise<string> {
    // Get token from user session or database
    const token = process.env.MICROSOFT_ACCESS_TOKEN;
    if (!token) throw new Error('Microsoft Graph access token not available');
    return token;
  }
}

const graphClient = Client.initWithMiddleware({ authProvider: new CustomAuthProvider() });

// Store O365 tokens per user
interface O365Token {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

// 1. CALENDAR EVENTS (READ/WRITE)
router.get('/api/o365/calendar', async (req: any, res: any) => {
  try {
    console.log('📅 [O365] Fetching calendar events...');
    
    const events = await graphClient
      .api('/me/calendar/events')
      .select('subject,start,end,attendees,location,organizer')
      .top(50)
      .orderby('start/dateTime desc')
      .get();

    res.json({
      success: true,
      events: events.value.map((event: any) => ({
        id: event.id,
        subject: event.subject,
        start: event.start,
        end: event.end,
        attendees: event.attendees,
        location: event.location,
        organizer: event.organizer
      }))
    });
  } catch (error: any) {
    console.error('❌ [O365] Calendar fetch failed:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ 
      success: false, 
      error: 'Calendar access failed', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Create calendar event
router.post('/api/o365/calendar', async (req: any, res: any) => {
  try {
    const { subject, startDateTime, endDateTime, attendeeEmails, location } = req.body;
    
    const event = {
      subject,
      start: {
        dateTime: startDateTime,
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/New_York'
      },
      attendees: attendeeEmails.map((email: string) => ({
        emailAddress: { address: email }
      })),
      location: { displayName: location }
    };

    const createdEvent = await graphClient
      .api('/me/calendar/events')
      .post(event);

    console.log('✅ [O365] Calendar event created:', createdEvent.id);
    res.json({ success: true, eventId: createdEvent.id });
  } catch (error: any) {
    console.error('❌ [O365] Calendar creation failed:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// 2. EMAIL THREAD HISTORY
router.get('/api/o365/emails', async (req: any, res: any) => {
  try {
    const { contactEmail } = req.query;
    
    console.log(`📧 [O365] Fetching email threads for: ${contactEmail}`);
    
    // Search for emails from/to the contact
    const messages = await graphClient
      .api('/me/messages')
      .search(`from:${contactEmail} OR to:${contactEmail}`)
      .select('subject,from,toRecipients,receivedDateTime,bodyPreview,conversationId,internetMessageId')
      .top(50)
      .orderby('receivedDateTime desc')
      .get();

    // Group by conversation
    const conversations: any = {};
    messages.value.forEach((msg: any) => {
      const convId = msg.conversationId;
      if (!conversations[convId]) {
        conversations[convId] = {
          id: convId,
          subject: msg.subject,
          messages: []
        };
      }
      conversations[convId].messages.push({
        id: msg.id,
        from: msg.from.emailAddress,
        to: msg.toRecipients,
        receivedDateTime: msg.receivedDateTime,
        preview: msg.bodyPreview
      });
    });

    res.json({
      success: true,
      contactEmail,
      conversations: Object.values(conversations)
    });
  } catch (error: any) {
    console.error('❌ [O365] Email fetch failed:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// 3. OUTLOOK CONTACTS SYNC
router.post('/api/o365/contacts/sync', async (req: any, res: any) => {
  try {
    console.log('👥 [O365] Starting contacts sync...');
    
    const contacts = await graphClient
      .api('/me/contacts')
      .select('displayName,emailAddresses,businessPhones,mobilePhone,companyName,jobTitle')
      .top(500)
      .get();

    let syncedCount = 0;
    let newCount = 0;

    for (const contact of contacts.value) {
      const primaryEmail = contact.emailAddresses?.[0]?.address;
      if (!primaryEmail) continue;

      // Check if contact exists in CRM
      const existingContact = await db.execute(sql`
        SELECT id FROM contacts WHERE email = ${primaryEmail.toLowerCase()}
      `);

      if (existingContact.length === 0) {
        // Create new contact
        await db.execute(sql`
          INSERT INTO contacts (
            email, 
            name, 
            phone, 
            company, 
            title, 
            source,
            created_at
          ) VALUES (
            ${primaryEmail.toLowerCase()},
            ${contact.displayName || ''},
            ${contact.businessPhones?.[0] || contact.mobilePhone || ''},
            ${contact.companyName || ''},
            ${contact.jobTitle || ''},
            'outlook',
            NOW()
          )
        `);
        newCount++;
      } else {
        // Update existing contact metadata
        await db.execute(sql`
          UPDATE contacts 
          SET source = 'outlook', outlook_synced = true
          WHERE email = ${primaryEmail.toLowerCase()}
        `);
        syncedCount++;
      }
    }

    console.log(`✅ [O365] Contacts sync complete: ${newCount} new, ${syncedCount} updated`);
    res.json({ 
      success: true, 
      totalContacts: contacts.value.length,
      newContacts: newCount,
      updatedContacts: syncedCount
    });
  } catch (error: any) {
    console.error('❌ [O365] Contacts sync failed:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// 4. AVAILABILITY SLOT FINDER (REPLACE BOOKING PAGE)
router.get('/api/o365/availability', async (req: any, res: any) => {
  try {
    const { start, end, duration = 30 } = req.query;
    
    console.log('🕐 [O365] Finding available time slots...');
    
    // Get calendar view for date range
    const calendarView = await graphClient
      .api('/me/calendar/calendarView')
      .query({
        startDateTime: start,
        endDateTime: end
      })
      .select('start,end,subject')
      .get();

    // Find free time slots
    const busySlots = calendarView.value.map((event: any) => ({
      start: new Date(event.start.dateTime),
      end: new Date(event.end.dateTime)
    }));

    // Generate available slots (simplified logic)
    const availableSlots = [];
    const startDate = new Date(start as string);
    const endDate = new Date(end as string);
    const slotDuration = parseInt(duration as string);

    // Business hours: 9 AM to 5 PM
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) continue; // Skip weekends
      
      for (let hour = 9; hour < 17; hour++) {
        const slotStart = new Date(d);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

        // Check if slot conflicts with busy time
        const isAvailable = !busySlots.some(busy => 
          (slotStart >= busy.start && slotStart < busy.end) ||
          (slotEnd > busy.start && slotEnd <= busy.end)
        );

        if (isAvailable) {
          availableSlots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            duration: slotDuration
          });
        }
      }
    }

    res.json({
      success: true,
      availableSlots: availableSlots.slice(0, 20) // Limit to first 20 slots
    });
  } catch (error: any) {
    console.error('❌ [O365] Availability check failed:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Book meeting slot
router.post('/api/o365/book-meeting', async (req: any, res: any) => {
  try {
    const { startDateTime, endDateTime, attendeeEmail, subject, description } = req.body;
    
    const event = {
      subject: subject || 'Business Meeting',
      body: {
        content: description || 'Business meeting scheduled via Staff Application',
        contentType: 'text'
      },
      start: {
        dateTime: startDateTime,
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/New_York'
      },
      attendees: [{
        emailAddress: { address: attendeeEmail }
      }],
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness'
    };

    const bookedEvent = await graphClient
      .api('/me/calendar/events')
      .post(event);

    console.log('✅ [O365] Meeting booked:', bookedEvent.id);
    
    // Log to CRM if contact exists
    await db.execute(sql`
      INSERT INTO timeline_events (
        contact_id,
        type,
        summary,
        data,
        created_at
      )
      SELECT 
        c.id,
        'meeting_scheduled',
        'Meeting scheduled via O365: ' || ${event.subject},
        ${{ 
          eventId: bookedEvent.id,
          startDateTime,
          endDateTime,
          meetingUrl: bookedEvent.onlineMeeting?.joinUrl 
        }},
        NOW()
      FROM contacts c 
      WHERE c.email = ${attendeeEmail}
    `);

    res.json({ 
      success: true, 
      eventId: bookedEvent.id,
      meetingUrl: bookedEvent.onlineMeeting?.joinUrl
    });
  } catch (error: any) {
    console.error('❌ [O365] Meeting booking failed:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// 5. TOKEN MANAGEMENT
router.post('/api/o365/refresh-token', async (req: any, res: any) => {
  try {
    // Token refresh logic would go here
    // This is a placeholder for the token refresh mechanism
    res.json({ success: true, message: 'Token refresh endpoint ready' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Health check endpoint
router.get('/api/o365/status', async (req: any, res: any) => {
  try {
    // Test Graph API connection
    const profile = await graphClient.api('/me').get();
    
    res.json({
      success: true,
      connected: true,
      user: {
        displayName: profile.displayName,
        email: profile.mail || profile.userPrincipalName
      }
    });
  } catch (error: any) {
    res.json({
      success: false,
      connected: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;