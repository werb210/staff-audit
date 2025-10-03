import { useEffect, useState } from 'react';
import { api } from '@/lib/queryClient';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  type: 'meeting' | 'call' | 'deadline' | 'follow-up' | 'other';
  contactId?: string;
  contactName?: string;
  createdBy: string;
  createdAt: string;
}

interface EventForm {
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  type: string;
  contactId: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventForm, setEventForm] = useState<EventForm>({
    title: '',
    startTime: '',
    endTime: '',
    location: '',
    description: '',
    type: 'meeting',
    contactId: ''
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [currentDate, viewMode]);

  const loadEvents = async () => {
    try {
      const startDate = getViewStartDate();
      const endDate = getViewEndDate();
      const response = await api(`/api/calendar/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
      setEvents(response.items || []);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const getViewStartDate = () => {
    if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      return start;
    } else {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      return start;
    }
  };

  const getViewEndDate = () => {
    if (viewMode === 'week') {
      const end = new Date(currentDate);
      end.setDate(end.getDate() + (6 - end.getDay()));
      end.setHours(23, 59, 59, 999);
      return end;
    } else {
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return end;
    }
  };

  const saveEvent = async () => {
    if (!eventForm.title || !eventForm.startTime || !eventForm.endTime) return;
    
    setLoading(true);
    try {
      if (editingEvent) {
        await api(`/api/calendar/events/${editingEvent.id}`, {
          method: 'PUT',
          body: eventForm
        });
      } else {
        await api('/api/calendar/events', {
          method: 'POST',
          body: eventForm
        });
      }
      
      resetForm();
      await loadEvents();
    } catch (error) {
      console.error('Failed to save event:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await api(`/api/calendar/events/${eventId}`, { method: 'DELETE' });
      await loadEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const editEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location || '',
      description: event.description || '',
      type: event.type,
      contactId: event.contactId || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEventForm({
      title: '',
      startTime: '',
      endTime: '',
      location: '',
      description: '',
      type: 'meeting',
      contactId: ''
    });
    setEditingEvent(null);
    setShowForm(false);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'call': return 'bg-green-100 text-green-700 border-green-200';
      case 'deadline': return 'bg-red-100 text-red-700 border-red-200';
      case 'follow-up': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatEventTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getDateRangeDisplay = () => {
    if (viewMode === 'week') {
      const start = getViewStartDate();
      const end = getViewEndDate();
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  return (
    <div>
      <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar & Tasks</h1>
          <p className="text-gray-600">Manage meetings, calls, and deadlines</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-sm ${viewMode === 'week' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-sm ${viewMode === 'month' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Month
            </button>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            + Add Event
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigateDate('prev')}>
            ← Previous
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" onClick={() => navigateDate('next')}>
            Next →
          </Button>
        </div>
        <h2 className="text-lg font-semibold">{getDateRangeDisplay()}</h2>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📅</div>
            <div>No events scheduled for this period</div>
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className={`border rounded-lg p-4 ${getEventTypeColor(event.type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{event.title}</h3>
                    <span className="text-xs px-2 py-1 rounded bg-white/50 capitalize">
                      {event.type}
                    </span>
                  </div>
                  <div className="text-sm mb-2">
                    {formatEventTime(event.startTime, event.endTime)}
                  </div>
                  {event.location && (
                    <div className="text-sm text-gray-600 mb-1">📍 {event.location}</div>
                  )}
                  {event.contactName && (
                    <div className="text-sm text-gray-600 mb-1">👤 {event.contactName}</div>
                  )}
                  {event.description && (
                    <div className="text-sm text-gray-600">{event.description}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editEvent(event)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteEvent(event.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingEvent ? 'Edit Event' : 'Add New Event'}
              </h3>
              <Button variant="outline" size="sm" onClick={resetForm}>
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Title *</label>
                <Input
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="Event title"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <select
                  value={eventForm.type}
                  onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="meeting">Meeting</option>
                  <option value="call">Call</option>
                  <option value="deadline">Deadline</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Start Time *</label>
                  <Input
                    type="datetime-local"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">End Time *</label>
                  <Input
                    type="datetime-local"
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Location</label>
                <Input
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder="Meeting location or video link"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <Textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Event details and notes"
                  className="mt-1 min-h-[80px]"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                onClick={saveEvent}
                disabled={loading || !eventForm.title || !eventForm.startTime || !eventForm.endTime}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Saving...' : (editingEvent ? 'Update Event' : 'Add Event')}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}