/**
 * Office 365 Integration Service
 * Handles Calendar, Email, Contacts, Notifications
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationResult, ConfidentialClientApplication } from '@azure/msal-node';
import { db } from '../db/index';
import { o365Tokens, o365CalendarEvents, o365EmailThreads } from '../../shared/marketing-schema';
import { eq, and } from 'drizzle-orm';

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID || 'dummy-client-id',
    clientSecret: process.env.AZURE_CLIENT_SECRET || 'dummy-secret',
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}`
  }
};

let cca: ConfidentialClientApplication | null = null;

try {
  if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET) {
    cca = new ConfidentialClientApplication(msalConfig);
  }
} catch (error) {
  console.warn('⚠️ Office 365 integration disabled: Missing Azure credentials');
}

export class O365Service {
  private async getTokenForUser(userId: string): Promise<string | null> {
    try {
      const tokenRecord = await db.select().from(o365Tokens)
        .where(eq(o365Tokens.userId, userId))
        .limit(1);

      if (!tokenRecord.length) return null;

      const token = tokenRecord[0];
      
      // Check if token is expired
      if (new Date() >= token.expiresAt) {
        // Refresh token
        const refreshedToken = await this.refreshToken(token.refreshToken);
        if (!refreshedToken) return null;
        
        // Update database
        await db.update(o365Tokens)
          .set({
            accessToken: refreshedToken.accessToken,
            expiresAt: new Date(Date.now() + refreshedToken.expiresIn * 1000),
            updatedAt: new Date()
          })
          .where(eq(o365Tokens.userId, userId));
          
        return refreshedToken.accessToken;
      }

      return token.accessToken;
    } catch (error) {
      console.error('Error getting O365 token:', error);
      return null;
    }
  }

  private async refreshToken(refreshToken: string): Promise<AuthenticationResult | null> {
    try {
      if (!cca) {
        throw new Error('O365 client not initialized');
      }
      
      const refreshTokenRequest = {
        refreshToken: refreshToken,
        scopes: ['https://graph.microsoft.com/.default'],
      };

      return await cca.acquireTokenByRefreshToken(refreshTokenRequest);
    } catch (error) {
      console.error('Error refreshing O365 token:', error);
      return null;
    }
  }

  private async getGraphClient(userId: string): Promise<Client | null> {
    const accessToken = await this.getTokenForUser(userId);
    if (!accessToken) return null;

    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });
  }

  // CALENDAR EVENTS
  async getCalendarEvents(userId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      const graphClient = await this.getGraphClient(userId);
      if (!graphClient) throw new Error('No valid token');

      let query = graphClient.me.events;
      
      if (startDate && endDate) {
        const start = startDate.toISOString();
        const end = endDate.toISOString();
        query = query.filter(`start/dateTime ge '${start}' and end/dateTime le '${end}'`);
      }

      const events = await query
        .select('id,subject,body,start,end,location,attendees,importance,isAllDay')
        .orderby('start/dateTime')
        .get();

      // Store in database
      for (const event of events) {
        await db.insert(o365CalendarEvents)
          .values({
            eventId: event.id,
            userId: userId,
            subject: event.subject,
            body: event.body?.content || '',
            start: new Date(event.start.dateTime),
            end: new Date(event.end.dateTime),
            location: event.location?.displayName || '',
            attendees: event.attendees || [],
            isAllDay: event.isAllDay || false,
            importance: event.importance || 'normal'
          })
          .onConflictDoUpdate({
            target: [o365CalendarEvents.eventId, o365CalendarEvents.userId],
            set: {
              subject: event.subject,
              body: event.body?.content || '',
              start: new Date(event.start.dateTime),
              end: new Date(event.end.dateTime),
              location: event.location?.displayName || '',
              attendees: event.attendees || [],
              importance: event.importance || 'normal',
              updatedAt: new Date()
            }
          });
      }

      return events;
    } catch (error) {
      console.error('Error getting calendar events:', error);
      throw error;
    }
  }

  async createCalendarEvent(userId: string, eventData: {
    subject: string;
    body?: string;
    start: Date;
    end: Date;
    location?: string;
    attendees?: string[];
  }): Promise<any> {
    try {
      const graphClient = await this.getGraphClient(userId);
      if (!graphClient) throw new Error('No valid token');

      const event = {
        subject: eventData.subject,
        body: {
          contentType: 'HTML',
          content: eventData.body || ''
        },
        start: {
          dateTime: eventData.start.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: eventData.end.toISOString(),
          timeZone: 'UTC'
        },
        location: {
          displayName: eventData.location || ''
        },
        attendees: eventData.attendees?.map(email => ({
          emailAddress: {
            address: email,
            name: email
          }
        })) || []
      };

      const createdEvent = await graphClient.me.events.post(event);

      // Store in database
      await db.insert(o365CalendarEvents).values({
        eventId: createdEvent.id,
        userId: userId,
        subject: createdEvent.subject,
        body: createdEvent.body?.content || '',
        start: new Date(createdEvent.start.dateTime),
        end: new Date(createdEvent.end.dateTime),
        location: createdEvent.location?.displayName || '',
        attendees: createdEvent.attendees || [],
        isAllDay: createdEvent.isAllDay || false,
        importance: createdEvent.importance || 'normal'
      });

      return createdEvent;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  // EMAIL THREADS
  async getEmailThreads(userId: string, contactEmail?: string): Promise<any[]> {
    try {
      const graphClient = await this.getGraphClient(userId);
      if (!graphClient) throw new Error('No valid token');

      let query = graphClient.me.messages;
      
      if (contactEmail) {
        query = query.filter(`from/emailAddress/address eq '${contactEmail}' or to/any(t: t/emailAddress/address eq '${contactEmail}')`);
      }

      const messages = await query
        .select('id,conversationId,subject,from,toRecipients,receivedDateTime,body,importance,isRead')
        .orderby('receivedDateTime desc')
        .top(50)
        .get();

      // Group by conversation
      const conversations = new Map();
      for (const message of messages) {
        const convId = message.conversationId;
        if (!conversations.has(convId)) {
          conversations.set(convId, {
            threadId: convId,
            subject: message.subject,
            participants: new Set(),
            messages: [],
            lastMessageTime: message.receivedDateTime,
            isRead: message.isRead
          });
        }
        
        const conv = conversations.get(convId);
        conv.participants.add(message.from?.emailAddress?.address);
        message.toRecipients?.forEach((recipient: any) => {
          conv.participants.add(recipient.emailAddress?.address);
        });
        conv.messages.push(message);
        
        if (new Date(message.receivedDateTime) > new Date(conv.lastMessageTime)) {
          conv.lastMessageTime = message.receivedDateTime;
        }
      }

      // Convert to array and store in database
      const threads = Array.from(conversations.values()).map(conv => ({
        ...conv,
        participants: Array.from(conv.participants),
        messageCount: conv.messages.length
      }));

      for (const thread of threads) {
        await db.insert(o365EmailThreads)
          .values({
            threadId: thread.threadId,
            contactId: userId, // This should be mapped to actual contact
            subject: thread.subject,
            participants: thread.participants,
            messageCount: thread.messageCount,
            lastMessage: thread.messages[0]?.body?.content?.substring(0, 500) || '',
            lastMessageTime: new Date(thread.lastMessageTime),
            isRead: thread.isRead,
            importance: thread.messages[0]?.importance || 'normal'
          })
          .onConflictDoUpdate({
            target: [o365EmailThreads.threadId],
            set: {
              subject: thread.subject,
              participants: thread.participants,
              messageCount: thread.messageCount,
              lastMessage: thread.messages[0]?.body?.content?.substring(0, 500) || '',
              lastMessageTime: new Date(thread.lastMessageTime),
              isRead: thread.isRead,
              updatedAt: new Date()
            }
          });
      }

      return threads;
    } catch (error) {
      console.error('Error getting email threads:', error);
      throw error;
    }
  }

  // CONTACTS SYNC
  async syncContacts(userId: string): Promise<{ synced: number; created: number }> {
    try {
      const graphClient = await this.getGraphClient(userId);
      if (!graphClient) throw new Error('No valid token');

      const contacts = await graphClient.me.contacts
        .select('id,displayName,emailAddresses,businessPhones,mobilePhone,jobTitle,companyName')
        .get();

      let synced = 0;
      let created = 0;

      for (const contact of contacts) {
        const primaryEmail = contact.emailAddresses?.[0]?.address;
        if (!primaryEmail) continue;

        // Check if contact exists in CRM
        const existingContact = await db.select()
          .from(contacts as any) // This should reference your actual contacts table
          .where(eq((contacts as any).email, primaryEmail))
          .limit(1);

        if (!existingContact.length) {
          // Create new contact
          await db.insert(contacts as any).values({
            name: contact.displayName,
            email: primaryEmail,
            phone: contact.businessPhones?.[0] || contact.mobilePhone,
            company: contact.companyName,
            title: contact.jobTitle,
            source: 'outlook',
            metadata: { outlookId: contact.id }
          });
          created++;
        } else {
          // Update existing contact
          await db.update(contacts as any)
            .set({
              name: contact.displayName,
              phone: contact.businessPhones?.[0] || contact.mobilePhone,
              company: contact.companyName,
              title: contact.jobTitle,
              updatedAt: new Date()
            })
            .where(eq((contacts as any).email, primaryEmail));
          synced++;
        }
      }

      return { synced, created };
    } catch (error) {
      console.error('Error syncing contacts:', error);
      throw error;
    }
  }

  // AVAILABILITY/SLOT FINDER
  async getAvailability(userId: string, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const graphClient = await this.getGraphClient(userId);
      if (!graphClient) throw new Error('No valid token');

      const busyTimes = await graphClient.me.calendar.getSchedule({
        schedules: [`${userId}@${process.env.AZURE_TENANT_DOMAIN || 'outlook.com'}`],
        startTime: {
          dateTime: startDate.toISOString(),
          timeZone: 'UTC'
        },
        endTime: {
          dateTime: endDate.toISOString(),
          timeZone: 'UTC'
        },
        availabilityViewInterval: 60
      }).post();

      return busyTimes.value || [];
    } catch (error) {
      console.error('Error getting availability:', error);
      throw error;
    }
  }

  // WEBHOOK SUBSCRIPTIONS
  async createWebhookSubscription(userId: string, resource: string, notificationUrl: string): Promise<any> {
    try {
      const graphClient = await this.getGraphClient(userId);
      if (!graphClient) throw new Error('No valid token');

      const subscription = {
        changeType: 'created,updated',
        notificationUrl: notificationUrl,
        resource: resource, // e.g., '/me/messages', '/me/events'
        expirationDateTime: new Date(Date.now() + 4230 * 60 * 1000).toISOString(), // Max 4230 minutes
        clientState: `user_${userId}`
      };

      return await graphClient.subscriptions.post(subscription);
    } catch (error) {
      console.error('Error creating webhook subscription:', error);
      throw error;
    }
  }

  // AUTHENTICATION HELPERS
  async storeUserToken(userId: string, authResult: AuthenticationResult): Promise<void> {
    await db.insert(o365Tokens)
      .values({
        userId: userId,
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken!,
        expiresAt: new Date(Date.now() + authResult.expiresIn! * 1000),
        scope: authResult.scopes?.join(' ') || ''
      })
      .onConflictDoUpdate({
        target: [o365Tokens.userId],
        set: {
          accessToken: authResult.accessToken,
          refreshToken: authResult.refreshToken!,
          expiresAt: new Date(Date.now() + authResult.expiresIn! * 1000),
          scope: authResult.scopes?.join(' ') || '',
          updatedAt: new Date()
        }
      });
  }

  async revokeUserToken(userId: string): Promise<void> {
    await db.delete(o365Tokens).where(eq(o365Tokens.userId, userId));
  }
}

export const o365Service = new O365Service();