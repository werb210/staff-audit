import { db } from '../db';
import { oauthTokens, contacts, crmTimelineEvents } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { tokenService } from './tokenService';

interface CalendarEvent {
  id: string;
  subject: string;
  bodyPreview?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
  }>;
  webLink?: string;
  location?: {
    displayName?: string;
  };
  organizer?: {
    emailAddress: {
      address: string;
      name?: string;
    };
  };
}

export class Office365CalendarService {
  // Sync calendar events for a user
  async syncCalendarEvents(userId: string): Promise<{ synced: number; errors: string[] }> {
    console.log(`[O365-CAL] Starting calendar sync for user ${userId}`);
    
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      // Get valid Office 365 token for user
      const token = await tokenService.getValidToken(userId, 'office365');
      if (!token) {
        throw new Error('No valid Office 365 token found');
      }

      // Fetch recent calendar events (last 30 days + next 30 days)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const events = await this.fetchCalendarEvents(token, startDate, endDate);
      console.log(`[O365-CAL] Found ${events.length} calendar events`);

      // Process each event
      for (const event of events) {
        try {
          const contactMatches = await this.findMatchingContacts(event);
          
          for (const contact of contactMatches) {
            await this.createTimelineEvent(contact.id, event, userId);
            syncedCount++;
          }
        } catch (eventError) {
          const errorMsg = `Failed to process event ${event.id}: ${eventError instanceof Error ? eventError.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error('[O365-CAL]', errorMsg);
        }
      }

      console.log(`[O365-CAL] Sync completed: ${syncedCount} events synced, ${errors.length} errors`);
      return { synced: syncedCount, errors };

    } catch (error) {
      const errorMsg = `Calendar sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('[O365-CAL]', errorMsg);
      return { synced: syncedCount, errors };
    }
  }

  // Fetch calendar events from Microsoft Graph API
  private async fetchCalendarEvents(accessToken: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const startDateTime = startDate.toISOString();
    const endDateTime = endDate.toISOString();
    
    const url = `https://graph.microsoft.com/v1.0/me/calendar/events?` +
      `$filter=start/dateTime ge '${startDateTime}' and end/dateTime le '${endDateTime}'` +
      `&$select=id,subject,bodyPreview,start,end,attendees,webLink,location,organizer` +
      `&$orderby=start/dateTime desc` +
      `&$top=500`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Graph API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data.value || [];

    } catch (error) {
      console.error('[O365-CAL] Failed to fetch calendar events:', error);
      throw error;
    }
  }

  // Find contacts that match the calendar event
  private async findMatchingContacts(event: CalendarEvent): Promise<any[]> {
    const matches: any[] = [];
    
    try {
      // Get all contacts to match against
      const allContacts = await db.select().from(contacts);
      
      // Match by email addresses in attendees
      if (event.attendees) {
        for (const attendee of event.attendees) {
          const email = attendee.emailAddress.address.toLowerCase();
          const contact = allContacts.find(c => 
            c.email?.toLowerCase() === email ||
            c.secondaryEmail?.toLowerCase() === email
          );
          if (contact && !matches.find(m => m.id === contact.id)) {
            matches.push(contact);
          }
        }
      }

      // Match by organizer email
      if (event.organizer) {
        const organizerEmail = event.organizer.emailAddress.address.toLowerCase();
        const contact = allContacts.find(c => 
          c.email?.toLowerCase() === organizerEmail ||
          c.secondaryEmail?.toLowerCase() === organizerEmail
        );
        if (contact && !matches.find(m => m.id === contact.id)) {
          matches.push(contact);
        }
      }

      // Match by company name in subject
      if (event.subject) {
        const subjectLower = event.subject.toLowerCase();
        for (const contact of allContacts) {
          if (contact.company && 
              subjectLower.includes(contact.company.toLowerCase()) &&
              !matches.find(m => m.id === contact.id)) {
            matches.push(contact);
          }
        }
      }

      return matches;

    } catch (error) {
      console.error('[O365-CAL] Error finding matching contacts:', error);
      return [];
    }
  }

  // Create CRM timeline event
  private async createTimelineEvent(contactId: string, event: CalendarEvent, userId: string): Promise<void> {
    try {
      // Check if event already exists to avoid duplicates
      const existingEvent = await db
        .select()
        .from(crmTimelineEvents)
        .where(
          and(
            eq(crmTimelineEvents.contactId, contactId),
            eq(crmTimelineEvents.externalId, event.id)
          )
        )
        .limit(1);

      if (existingEvent.length > 0) {
        console.log(`[O365-CAL] Event ${event.id} already exists for contact ${contactId}`);
        return;
      }

      // Create timeline event
      await db.insert(crmTimelineEvents).values({
        contactId,
        type: 'calendar',
        source: 'office365',
        title: event.subject || 'Office 365 Calendar Event',
        description: this.formatEventDescription(event),
        timestamp: new Date(event.start.dateTime),
        metadata: {
          eventId: event.id,
          webLink: event.webLink,
          location: event.location?.displayName,
          attendees: event.attendees?.map(a => ({
            email: a.emailAddress.address,
            name: a.emailAddress.name
          })),
          organizer: event.organizer ? {
            email: event.organizer.emailAddress.address,
            name: event.organizer.emailAddress.name
          } : undefined,
          startTime: event.start.dateTime,
          endTime: event.end.dateTime,
          timeZone: event.start.timeZone
        },
        externalId: event.id,
        externalUrl: event.webLink,
        createdBy: userId
      });

      console.log(`[O365-CAL] Created timeline event for contact ${contactId}: ${event.subject}`);

    } catch (error) {
      console.error(`[O365-CAL] Failed to create timeline event:`, error);
      throw error;
    }
  }

  // Format event description for timeline
  private formatEventDescription(event: CalendarEvent): string {
    const parts: string[] = [];
    
    if (event.bodyPreview) {
      parts.push(event.bodyPreview.substring(0, 200));
    }
    
    if (event.location?.displayName) {
      parts.push(`📍 ${event.location.displayName}`);
    }
    
    if (event.attendees && event.attendees.length > 0) {
      const attendeeNames = event.attendees
        .map(a => a.emailAddress.name || a.emailAddress.address)
        .slice(0, 3)
        .join(', ');
      parts.push(`👥 ${attendeeNames}${event.attendees.length > 3 ? '...' : ''}`);
    }
    
    const startTime = new Date(event.start.dateTime).toLocaleString();
    const endTime = new Date(event.end.dateTime).toLocaleTimeString();
    parts.push(`🕐 ${startTime} - ${endTime}`);
    
    return parts.join('\n\n');
  }

  // Get calendar sync status for user
  async getSyncStatus(userId: string): Promise<{
    hasToken: boolean;
    lastSync?: Date;
    totalEvents: number;
    recentEvents: any[];
  }> {
    try {
      // Check if user has valid Office 365 token
      const token = await tokenService.getValidToken(userId, 'office365');
      
      // Get recent calendar timeline events
      const recentEvents = await db
        .select()
        .from(crmTimelineEvents)
        .where(
          and(
            eq(crmTimelineEvents.source, 'office365'),
            eq(crmTimelineEvents.type, 'calendar'),
            eq(crmTimelineEvents.createdBy, userId)
          )
        )
        .limit(10);

      // Count total calendar events
      const totalEventsResult = await db
        .select()
        .from(crmTimelineEvents)
        .where(
          and(
            eq(crmTimelineEvents.source, 'office365'),
            eq(crmTimelineEvents.type, 'calendar'),
            eq(crmTimelineEvents.createdBy, userId)
          )
        );

      return {
        hasToken: !!token,
        lastSync: recentEvents.length > 0 ? recentEvents[0].createdAt : undefined,
        totalEvents: totalEventsResult.length,
        recentEvents: recentEvents.map(e => ({
          id: e.id,
          contactId: e.contactId,
          title: e.title,
          timestamp: e.timestamp,
          externalUrl: e.externalUrl
        }))
      };

    } catch (error) {
      console.error('[O365-CAL] Error getting sync status:', error);
      return {
        hasToken: false,
        totalEvents: 0,
        recentEvents: []
      };
    }
  }

  // Manual sync trigger
  async triggerSync(userId: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log(`[O365-CAL] Manual sync triggered for user ${userId}`);
      
      const result = await this.syncCalendarEvents(userId);
      
      return {
        success: result.errors.length === 0,
        message: `Sync completed: ${result.synced} events synced${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const office365CalendarService = new Office365CalendarService();