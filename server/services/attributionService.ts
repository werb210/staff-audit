/**
 * Attribution Service
 * Tracks customer journey across all marketing channels
 */

import { db } from '../db/index';
import { attributionEvents, marketingCampaigns } from '../../shared/marketing-schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import type { AttributionEvent, AttributionJourney } from '../../shared/marketing-schema';

export class AttributionService {
  async trackEvent(eventData: {
    contactId: string;
    applicationId?: string;
    eventType: string;
    source: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
    gclid?: string;
    gbraid?: string;
    fbclid?: string;
    liClickId?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
    value?: number;
    revenue?: number;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await db.insert(attributionEvents).values({
        contactId: eventData.contactId,
        applicationId: eventData.applicationId,
        eventType: eventData.eventType,
        source: eventData.source,
        medium: eventData.medium,
        campaign: eventData.campaign,
        content: eventData.content,
        term: eventData.term,
        gclid: eventData.gclid,
        gbraid: eventData.gbraid,
        fbclid: eventData.fbclid,
        liClickId: eventData.liClickId,
        utmSource: eventData.utmSource,
        utmMedium: eventData.utmMedium,
        utmCampaign: eventData.utmCampaign,
        utmContent: eventData.utmContent,
        utmTerm: eventData.utmTerm,
        value: eventData.value?.toString(),
        revenue: eventData.revenue?.toString(),
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        metadata: eventData.metadata,
        eventTime: new Date()
      });

      console.log(`📊 Attribution event tracked: ${eventData.eventType} for contact ${eventData.contactId}`);
    } catch (error) {
      console.error('Error tracking attribution event:', error);
      throw error;
    }
  }

  async getContactJourney(contactId: string): Promise<AttributionJourney | null> {
    try {
      const events = await db.select()
        .from(attributionEvents)
        .where(eq(attributionEvents.contactId, contactId))
        .orderBy(desc(attributionEvents.eventTime));

      if (!events.length) return null;

      const firstTouch = events[events.length - 1];
      const lastTouch = events[0];
      
      const totalValue = events.reduce((sum, event) => {
        return sum + (parseFloat(event.value || '0'));
      }, 0);

      const totalRevenue = events.reduce((sum, event) => {
        return sum + (parseFloat(event.revenue || '0'));
      }, 0);

      const conversionPath = events.map(event => `${event.source}/${event.medium || 'unknown'}`);
      
      const timeToConversion = firstTouch && lastTouch 
        ? Math.ceil((lastTouch.eventTime.getTime() - firstTouch.eventTime.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        contactId,
        events,
        firstTouch,
        lastTouch,
        totalValue: totalRevenue || totalValue,
        conversionPath,
        timeToConversion
      };
    } catch (error) {
      console.error('Error getting contact journey:', error);
      return null;
    }
  }

  async getChannelPerformance(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const events = await db.select()
        .from(attributionEvents)
        .where(and(
          gte(attributionEvents.eventTime, startDate),
          lte(attributionEvents.eventTime, endDate)
        ));

      const channelStats = new Map();

      for (const event of events) {
        const channel = `${event.source}/${event.medium || 'unknown'}`;
        
        if (!channelStats.has(channel)) {
          channelStats.set(channel, {
            channel,
            source: event.source,
            medium: event.medium,
            events: 0,
            clicks: 0,
            conversions: 0,
            revenue: 0,
            contacts: new Set()
          });
        }

        const stats = channelStats.get(channel);
        stats.events++;
        stats.contacts.add(event.contactId);

        if (event.eventType === 'click') {
          stats.clicks++;
        }

        if (event.eventType === 'conversion') {
          stats.conversions++;
        }

        if (event.revenue) {
          stats.revenue += parseFloat(event.revenue);
        }
      }

      return Array.from(channelStats.values()).map(stats => ({
        ...stats,
        uniqueContacts: stats.contacts.size,
        conversionRate: stats.clicks > 0 ? (stats.conversions / stats.clicks * 100).toFixed(2) : '0.00'
      }));
    } catch (error) {
      console.error('Error getting channel performance:', error);
      return [];
    }
  }

  async getCampaignAttribution(campaignId: string): Promise<any> {
    try {
      const events = await db.select()
        .from(attributionEvents)
        .where(eq(attributionEvents.campaign, campaignId))
        .orderBy(desc(attributionEvents.eventTime));

      const summary = {
        campaignId,
        totalEvents: events.length,
        uniqueContacts: new Set(events.map(e => e.contactId)).size,
        totalRevenue: events.reduce((sum, e) => sum + parseFloat(e.revenue || '0'), 0),
        conversions: events.filter(e => e.eventType === 'conversion').length,
        clicks: events.filter(e => e.eventType === 'click').length,
        firstEvent: events[events.length - 1],
        lastEvent: events[0],
        eventBreakdown: {}
      };

      // Group by event type
      const eventTypes = events.reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      summary.eventBreakdown = eventTypes;

      return summary;
    } catch (error) {
      console.error('Error getting campaign attribution:', error);
      return null;
    }
  }

  async getTopConvertingPaths(startDate: Date, endDate: Date, limit: number = 10): Promise<any[]> {
    try {
      const events = await db.select()
        .from(attributionEvents)
        .where(and(
          gte(attributionEvents.eventTime, startDate),
          lte(attributionEvents.eventTime, endDate)
        ))
        .orderBy(desc(attributionEvents.eventTime));

      // Group by contact to get their journey
      const contactJourneys = new Map();
      
      for (const event of events) {
        if (!contactJourneys.has(event.contactId)) {
          contactJourneys.set(event.contactId, []);
        }
        contactJourneys.get(event.contactId).push(event);
      }

      // Create conversion paths
      const pathStats = new Map();
      
      for (const [contactId, journey] of contactJourneys) {
        const hasConversion = journey.some((e: any) => e.eventType === 'conversion');
        if (!hasConversion) continue;

        const path = journey
          .reverse() // Start from first touch
          .map((e: any) => `${e.source}/${e.medium || 'unknown'}`)
          .join(' → ');

        if (!pathStats.has(path)) {
          pathStats.set(path, {
            path,
            conversions: 0,
            revenue: 0,
            contacts: new Set()
          });
        }

        const pathData = pathStats.get(path);
        pathData.conversions++;
        pathData.contacts.add(contactId);
        
        const totalRevenue = journey.reduce((sum: number, e: any) => 
          sum + parseFloat(e.revenue || '0'), 0);
        pathData.revenue += totalRevenue;
      }

      return Array.from(pathStats.values())
        .map(stats => ({
          ...stats,
          uniqueContacts: stats.contacts.size,
          avgRevenue: stats.revenue / stats.conversions
        }))
        .sort((a, b) => b.conversions - a.conversions)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting top converting paths:', error);
      return [];
    }
  }

  // Track UTM parameters from landing page
  async trackLanding(req: any, contactId?: string): Promise<void> {
    try {
      const {
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        gclid,
        gbraid,
        fbclid,
        li_fat_id
      } = req.query;

      if (!utm_source && !gclid && !gbraid && !fbclid && !li_fat_id) {
        return; // No tracking parameters
      }

      const eventData = {
        contactId: contactId || 'anonymous',
        eventType: 'landing',
        source: utm_source || this.getSourceFromClickId(gclid, gbraid, fbclid, li_fat_id),
        medium: utm_medium,
        campaign: utm_campaign,
        content: utm_content,
        term: utm_term,
        gclid,
        gbraid,
        fbclid,
        liClickId: li_fat_id,
        utmSource: utm_source,
        utmMedium: utm_medium,
        utmCampaign: utm_campaign,
        utmContent: utm_content,
        utmTerm: utm_term,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: {
          referer: req.get('Referer'),
          url: req.originalUrl
        }
      };

      await this.trackEvent(eventData);
    } catch (error) {
      console.error('Error tracking landing:', error);
    }
  }

  private getSourceFromClickId(gclid?: string, gbraid?: string, fbclid?: string, liClickId?: string): string {
    if (gclid || gbraid) return 'google';
    if (fbclid) return 'facebook';
    if (liClickId) return 'linkedin';
    return 'unknown';
  }

  // Generate attribution report
  async generateReport(startDate: Date, endDate: Date): Promise<any> {
    try {
      const [
        channelPerformance,
        topPaths,
        totalEvents,
        totalRevenue
      ] = await Promise.all([
        this.getChannelPerformance(startDate, endDate),
        this.getTopConvertingPaths(startDate, endDate),
        db.select().from(attributionEvents)
          .where(and(
            gte(attributionEvents.eventTime, startDate),
            lte(attributionEvents.eventTime, endDate)
          )),
        db.select().from(attributionEvents)
          .where(and(
            gte(attributionEvents.eventTime, startDate),
            lte(attributionEvents.eventTime, endDate),
            eq(attributionEvents.eventType, 'conversion')
          ))
      ]);

      const report = {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        summary: {
          totalEvents: totalEvents.length,
          totalConversions: totalRevenue.length,
          totalRevenue: totalRevenue.reduce((sum, e) => sum + parseFloat(e.revenue || '0'), 0),
          uniqueContacts: new Set(totalEvents.map(e => e.contactId)).size
        },
        channelPerformance,
        topConvertingPaths: topPaths,
        generatedAt: new Date().toISOString()
      };

      return report;
    } catch (error) {
      console.error('Error generating attribution report:', error);
      throw error;
    }
  }
}

export const attributionService = new AttributionService();