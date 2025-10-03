import { tokenService } from './tokenService';

interface GraphApiResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
}

interface CalendarEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
  organizer?: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
}

interface EmailMessage {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
  receivedDateTime: string;
  isRead: boolean;
  importance: string;
  bodyPreview: string;
  hasAttachments: boolean;
}

export class Office365Service {
  private readonly baseUrl = 'https://graph.microsoft.com/v1.0';

  // Get access token for user
  private async getAccessToken(userId: string): Promise<string | null> {
    const token = await tokenService.getActiveToken(userId, 'microsoft');
    return token?.accessToken || null;
  }

  // Make authenticated request to Microsoft Graph API
  private async makeGraphRequest<T>(
    userId: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const accessToken = await this.getAccessToken(userId);
    
    if (!accessToken) {
      throw new Error('No valid Microsoft access token found');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Microsoft token expired or invalid');
      }
      throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Get user's calendar events
  async getCalendarEvents(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<CalendarEvent[]> {
    try {
      const { startDate, endDate, limit = 50 } = options;
      
      let endpoint = `/me/events?$top=${limit}&$orderby=start/dateTime`;
      
      // Add date filters if provided
      if (startDate || endDate) {
        const filters = [];
        if (startDate) {
          filters.push(`start/dateTime ge '${startDate.toISOString()}'`);
        }
        if (endDate) {
          filters.push(`end/dateTime le '${endDate.toISOString()}'`);
        }
        endpoint += `&$filter=${filters.join(' and ')}`;
      }

      const response = await this.makeGraphRequest<GraphApiResponse<CalendarEvent>>(
        userId,
        endpoint
      );

      return response.value;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  // Get user's email messages
  async getEmailMessages(
    userId: string,
    options: {
      folder?: string;
      limit?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<EmailMessage[]> {
    try {
      const { folder = 'inbox', limit = 25, unreadOnly = false } = options;
      
      let endpoint = `/me/mailFolders/${folder}/messages?$top=${limit}&$orderby=receivedDateTime desc`;
      
      if (unreadOnly) {
        endpoint += `&$filter=isRead eq false`;
      }

      const response = await this.makeGraphRequest<GraphApiResponse<EmailMessage>>(
        userId,
        endpoint
      );

      return response.value;
    } catch (error) {
      console.error('Error fetching email messages:', error);
      throw error;
    }
  }

  // Create a calendar event
  async createCalendarEvent(
    userId: string,
    event: {
      subject: string;
      start: string;
      end: string;
      timeZone?: string;
      location?: string;
      attendees?: string[];
      body?: string;
    }
  ): Promise<CalendarEvent> {
    try {
      const eventData = {
        subject: event.subject,
        start: {
          dateTime: event.start,
          timeZone: event.timeZone || 'UTC',
        },
        end: {
          dateTime: event.end,
          timeZone: event.timeZone || 'UTC',
        },
        ...(event.location && {
          location: {
            displayName: event.location,
          },
        }),
        ...(event.attendees && {
          attendees: event.attendees.map(email => ({
            emailAddress: {
              address: email,
            },
          })),
        }),
        ...(event.body && {
          body: {
            contentType: 'text',
            content: event.body,
          },
        }),
      };

      const response = await this.makeGraphRequest<CalendarEvent>(
        userId,
        '/me/events',
        {
          method: 'POST',
          body: JSON.stringify(eventData),
        }
      );

      return response;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  // Send an email
  async sendEmail(
    userId: string,
    email: {
      to: string[];
      subject: string;
      body: string;
      cc?: string[];
      bcc?: string[];
      isHtml?: boolean;
    }
  ): Promise<void> {
    try {
      const message = {
        message: {
          subject: email.subject,
          body: {
            contentType: email.isHtml ? 'html' : 'text',
            content: email.body,
          },
          toRecipients: email.to.map(address => ({
            emailAddress: { address },
          })),
          ...(email.cc && {
            ccRecipients: email.cc.map(address => ({
              emailAddress: { address },
            })),
          }),
          ...(email.bcc && {
            bccRecipients: email.bcc.map(address => ({
              emailAddress: { address },
            })),
          }),
        },
      };

      await this.makeGraphRequest(
        userId,
        '/me/sendMail',
        {
          method: 'POST',
          body: JSON.stringify(message),
        }
      );
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // Get user profile information
  async getUserProfile(userId: string): Promise<any> {
    try {
      const response = await this.makeGraphRequest(
        userId,
        '/me?$select=displayName,mail,userPrincipalName,id'
      );

      return response;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Check if user has valid token
  async isConnected(userId: string): Promise<boolean> {
    try {
      const token = await tokenService.getActiveToken(userId, 'microsoft');
      return !!token;
    } catch (error) {
      return false;
    }
  }

  // Test connection by making a simple API call
  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.getUserProfile(userId);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const office365Service = new Office365Service();