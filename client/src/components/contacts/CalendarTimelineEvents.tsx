import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ExternalLink, Users, MapPin, Clock } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  externalUrl?: string;
  metadata?: {
    location?: string;
    attendees?: Array<{ email: string; name?: string }>;
    organizer?: { email: string; name?: string };
    startTime: string;
    endTime: string;
    timeZone?: string;
  };
}

interface CalendarTimelineEventsProps {
  events: CalendarEvent[];
  contactName?: string;
}

export default function CalendarTimelineEvents({ events, contactName }: CalendarTimelineEventsProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2" />
        <p>No calendar events found</p>
        <p className="text-sm">Events will appear here when Office 365 sync is active</p>
      </div>
    );
  }

  const formatEventTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `${startStr} - ${endStr}`;
  };

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="border rounded-lg p-4 bg-card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <Badge className="bg-blue-100 text-blue-800">Office 365 Event</Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(event.timestamp).toLocaleDateString()}
                </span>
              </div>
              
              <h4 className="font-semibold text-lg mb-2">{event.title}</h4>
              
              {event.metadata && (
                <div className="space-y-2 text-sm">
                  {/* Event Time */}
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {formatEventTime(event.metadata.startTime, event.metadata.endTime)}
                      {event.metadata.timeZone && ` (${event.metadata.timeZone})`}
                    </span>
                  </div>
                  
                  {/* Location */}
                  {event.metadata.location && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{event.metadata.location}</span>
                    </div>
                  )}
                  
                  {/* Attendees */}
                  {event.metadata.attendees && event.metadata.attendees.length > 0 && (
                    <div className="flex items-start space-x-2 text-muted-foreground">
                      <Users className="h-4 w-4 mt-0.5" />
                      <div>
                        <span className="block">Attendees:</span>
                        <div className="ml-2 space-y-1">
                          {event.metadata.attendees.slice(0, 3).map((attendee, index) => (
                            <div key={index} className="text-xs">
                              {attendee.name || attendee.email}
                              {attendee.name && (
                                <span className="text-muted-foreground ml-1">({attendee.email})</span>
                              )}
                            </div>
                          ))}
                          {event.metadata.attendees.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{event.metadata.attendees.length - 3} more attendees
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Organizer */}
                  {event.metadata.organizer && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <span className="text-xs">
                        Organized by: {event.metadata.organizer.name || event.metadata.organizer.email}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Description */}
              {event.description && (
                <div className="mt-3 p-3 bg-muted/50 rounded text-sm">
                  {event.description.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="mb-2 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
            </div>
            
            {/* External Link */}
            {event.externalUrl && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="ml-4"
              >
                <a
                  href={event.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View in Outlook</span>
                </a>
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}