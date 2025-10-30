/**
 * Microsoft Graph API Service
 * Handles calendar, tasks, and email operations with Office 365
 */
import { db } from '../db';
import { sql } from 'drizzle-orm';
class MicrosoftGraphService {
    baseUrl = 'https://graph.microsoft.com/v1.0';
    /**
     * Get valid access token for user, refresh if expired
     */
    async getValidToken(userId) {
        const tokenData = await db.execute(sql `
      SELECT access_token, refresh_token, expires_at 
      FROM o365_tokens 
      WHERE user_id = ${userId}
    `);
        if (tokenData.rows.length === 0) {
            throw new Error('Office 365 account not connected');
        }
        const token = tokenData.rows[0];
        const now = new Date();
        const expiresAt = new Date(token.expires_at);
        // If token is not expired, return it
        if (now < expiresAt) {
            return token.access_token;
        }
        // Token expired, refresh it
        console.log(`🔄 [GRAPH-TOKEN] Refreshing expired token for user: ${userId}`);
        const refreshResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.O365_CLIENT_ID,
                client_secret: process.env.O365_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: token.refresh_token
            })
        });
        if (!refreshResponse.ok) {
            console.error('❌ [GRAPH-TOKEN] Failed to refresh token');
            throw new Error('Failed to refresh Office 365 token');
        }
        const newTokens = await refreshResponse.json();
        // Update tokens in database
        await db.execute(sql `
      UPDATE o365_tokens 
      SET 
        access_token = ${newTokens.access_token},
        refresh_token = ${newTokens.refresh_token || token.refresh_token},
        expires_at = ${new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString()},
        updatedAt = NOW()
      WHERE user_id = ${userId}
    `);
        console.log(`✅ [GRAPH-TOKEN] Token refreshed successfully for user: ${userId}`);
        return newTokens.access_token;
    }
    /**
     * Make authenticated request to Microsoft Graph API
     */
    async graphRequest(userId, endpoint, options = {}) {
        const accessToken = await this.getValidToken(userId);
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ [GRAPH-API] Request failed: ${endpoint}`, errorText);
            throw new Error(`Microsoft Graph API error: ${response.status}`);
        }
        return response.json();
    }
    // Calendar Methods
    /**
     * Get calendar events for user
     */
    async getCalendarEvents(userId, startDate, endDate) {
        console.log(`📅 [GRAPH-CALENDAR] Getting events for user: ${userId}`);
        const start = startDate || new Date().toISOString();
        const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
        const params = new URLSearchParams({
            startDateTime: start,
            endDateTime: end,
            $select: 'id,subject,start,end,location,attendees,body,isAllDay,webLink',
            $orderby: 'start/dateTime'
        });
        const data = await this.graphRequest(userId, `/me/calendarview?${params}`);
        return data.value || [];
    }
    /**
     * Create calendar event
     */
    async createCalendarEvent(userId, event) {
        console.log(`📅 [GRAPH-CALENDAR] Creating event for user: ${userId}`);
        return this.graphRequest(userId, '/me/events', {
            method: 'POST',
            body: JSON.stringify(event)
        });
    }
    /**
     * Update calendar event
     */
    async updateCalendarEvent(userId, eventId, updates) {
        console.log(`📅 [GRAPH-CALENDAR] Updating event ${eventId} for user: ${userId}`);
        return this.graphRequest(userId, `/me/events/${eventId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }
    /**
     * Delete calendar event
     */
    async deleteCalendarEvent(userId, eventId) {
        console.log(`📅 [GRAPH-CALENDAR] Deleting event ${eventId} for user: ${userId}`);
        await this.graphRequest(userId, `/me/events/${eventId}`, {
            method: 'DELETE'
        });
    }
    // Tasks Methods
    /**
     * Get todo lists for user
     */
    async getTodoLists(userId) {
        console.log(`✅ [GRAPH-TASKS] Getting todo lists for user: ${userId}`);
        const data = await this.graphRequest(userId, '/me/todo/lists');
        return data.value || [];
    }
    /**
     * Get tasks from a specific list
     */
    async getTasks(userId, listId) {
        console.log(`✅ [GRAPH-TASKS] Getting tasks from list ${listId} for user: ${userId}`);
        const data = await this.graphRequest(userId, `/me/todo/lists/${listId}/tasks`);
        return data.value || [];
    }
    /**
     * Create new task
     */
    async createTask(userId, listId, task) {
        console.log(`✅ [GRAPH-TASKS] Creating task in list ${listId} for user: ${userId}`);
        return this.graphRequest(userId, `/me/todo/lists/${listId}/tasks`, {
            method: 'POST',
            body: JSON.stringify(task)
        });
    }
    /**
     * Update task
     */
    async updateTask(userId, listId, taskId, updates) {
        console.log(`✅ [GRAPH-TASKS] Updating task ${taskId} for user: ${userId}`);
        return this.graphRequest(userId, `/me/todo/lists/${listId}/tasks/${taskId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }
    /**
     * Delete task
     */
    async deleteTask(userId, listId, taskId) {
        console.log(`✅ [GRAPH-TASKS] Deleting task ${taskId} for user: ${userId}`);
        await this.graphRequest(userId, `/me/todo/lists/${listId}/tasks/${taskId}`, {
            method: 'DELETE'
        });
    }
    // Email Methods
    /**
     * Send email using Microsoft Graph
     */
    async sendEmail(userId, email) {
        console.log(`📧 [GRAPH-EMAIL] Sending email for user: ${userId}`);
        const message = {
            subject: email.subject,
            body: {
                contentType: email.bodyType === 'html' ? 'html' : 'text',
                content: email.body
            },
            toRecipients: email.to.map(addr => ({
                emailAddress: { address: addr }
            })),
            ccRecipients: email.cc?.map(addr => ({
                emailAddress: { address: addr }
            })) || [],
            bccRecipients: email.bcc?.map(addr => ({
                emailAddress: { address: addr }
            })) || []
        };
        await this.graphRequest(userId, '/me/sendMail', {
            method: 'POST',
            body: JSON.stringify({ message })
        });
    }
    /**
     * Get user profile information
     */
    async getUserProfile(userId) {
        console.log(`👤 [GRAPH-PROFILE] Getting profile for user: ${userId}`);
        return this.graphRequest(userId, '/me');
    }
}
export const microsoftGraphService = new MicrosoftGraphService();
