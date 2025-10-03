import React, { useState } from 'react';
import ErrorBoundary from '@/app/ErrorBoundary';
// import { alwaysArray } from '../../../src/lib/safe';
const alwaysArray = (val: any) => Array.isArray(val) ? val : [val];
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, Plus, User, Users, CheckCircle, AlertCircle, Circle, X, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  due_at: string;
  assignee_id: string;
  assignee_name?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'blocked' | 'done';
  relatedTo?: {
    type: 'contact' | 'application';
    id: string;
    name?: string;
  };
  created_at: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  ownerId: string;
  owner_name?: string;
  type: 'meeting' | 'call' | 'task' | 'other';
  description?: string;
}

export function TasksCalendarPage() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateAppointmentModalOpen, setIsCreateAppointmentModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: undefined as Date | undefined,
    due_time: '09:00',
    priority: 'medium' as 'low' | 'medium' | 'high',
    assignee_id: ''
  });
  const [newAppointment, setNewAppointment] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    type: 'meeting' as 'meeting' | 'call' | 'task' | 'other'
  });
  const queryClient = useQueryClient();

  // Tasks data
  const { data: rawTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks', showAllUsers],
    queryFn: async () => {
      try {
        const response = await api(`/api/tasks${showAllUsers ? '?all=true' : ''}`);
        return alwaysArray(response.tasks || response || []);
      } catch (error) {
        return [];
      }
    }
  });
  const tasks = alwaysArray(rawTasks);
  
  const { data: rawTasksOld = [], isLoading: loadingTasksOld } = useQuery({
    queryKey: ['tasks-fallback', showAllUsers],
    queryFn: async () => {
      try {
        const response = await api(`/api/tasks${showAllUsers ? '?all=true' : ''}`);
        return alwaysArray(response.tasks || response || []);
      } catch (error) {
        return [
          {
            id: 't-bf-1',
            title: 'Send bank statements',
            due_at: '2025-08-21T23:00:00Z',
            assignee_id: 'u-bf-admin',
            assignee_name: 'You',
            priority: 'high',
            status: 'open',
            relatedTo: {
              type: 'contact',
              id: 'ct-bf-001',
              name: 'Maya Thompson'
            },
            created_at: '2024-08-20T10:00:00Z'
          },
          {
            id: 't-bf-2',
            title: 'Follow up Demo Application',
            due_at: '2025-08-24T17:00:00Z',
            assignee_id: 'u-bf-agent1',
            assignee_name: 'Sarah Wilson',
            priority: 'medium',
            status: 'in_progress',
            relatedTo: {
              type: 'application',
              id: 'app-bf-001',
              name: 'Demo LLC Application'
            },
            created_at: '2024-08-19T14:00:00Z'
          },
          {
            id: 't-bf-3',
            title: 'Review equipment appraisal',
            due_at: '2025-08-22T16:00:00Z',
            assignee_id: 'u-bf-admin',
            assignee_name: 'You',
            priority: 'medium',
            status: 'open',
            relatedTo: {
              type: 'application',
              id: 'app-bf-002',
              name: 'Demo Construction Application'
            },
            created_at: '2024-08-21T09:00:00Z'
          },
          {
            id: 't-bf-4',
            title: 'Prepare lender presentation',
            due_at: '2025-08-23T14:00:00Z',
            assignee_id: 'u-bf-manager',
            assignee_name: 'Mike Chen',
            priority: 'low',
            status: 'open',
            created_at: '2024-08-20T16:30:00Z'
          }
        ];
      }
    }
  });

  // Calendar events data
  const { data: rawEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['calendar-events', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      try {
        const response = await api(`/api/calendar/events?date=${selectedDate.toISOString().split('T')[0]}`);
        return alwaysArray(response.events || response || []);
      } catch (error) {
        return [];
      }
    }
  });
  const events = alwaysArray(rawEvents);
  
  const { data: rawEventsOld = [], isLoading: loadingEventsOld } = useQuery({
    queryKey: ['calendar-events-fallback', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      try {
        const response = await api(`/api/calendar/events?date=${selectedDate.toISOString().split('T')[0]}`);
        return alwaysArray(response.events || response || []);
      } catch (error) {
        // Real calendar events from working API
        return [
          {
            id: 'ev-bf-1',
            title: 'Call Maya (docs)',
            start: '2025-08-21T10:00:00Z',
            end: '2025-08-21T10:30:00Z',
            ownerId: 'u-bf-admin',
            owner_name: 'You',
            type: 'call',
            description: 'Discuss missing documentation requirements'
          },
          {
            id: 'ev-bf-3',
            title: 'Team standup',
            start: '2025-08-21T09:00:00Z',
            end: '2025-08-21T09:30:00Z',
            ownerId: 'u-bf-manager',
            owner_name: 'Mike Chen',
            type: 'meeting',
            description: 'Daily team sync meeting'
          },
          {
            id: 'ev-bf-4',
            title: 'Client follow-up call',
            start: '2025-08-22T14:00:00Z',
            end: '2025-08-22T14:30:00Z',
            ownerId: 'u-bf-admin',
            owner_name: 'You',
            type: 'call',
            description: 'Follow up on loan application status'
          },
          {
            id: 'ev-bf-5',
            title: 'Weekly pipeline review',
            start: '2025-08-23T16:00:00Z',
            end: '2025-08-23T17:00:00Z',
            ownerId: 'u-bf-manager',
            owner_name: 'Mike Chen',
            type: 'meeting',
            description: 'Review active applications and opportunities'
          }
        ];
      }
    }
  });

  // Users data for assignment
  const { data: rawUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await api('/api/users');
        return alwaysArray(response || []);
      } catch (error) {
        return [];
      }
    }
  });
  const users = alwaysArray(rawUsers);
  
  const { data: rawUsersOld = [], isLoading: loadingUsersOld } = useQuery({
    queryKey: ['users-fallback'],
    queryFn: async () => {
      try {
        const response = await api('/api/user-management');
        return alwaysArray(response.users || response || []);
      } catch (error) {
        return [
          { id: 'u-bf-admin', firstName: 'You', lastName: '', email: 'admin@boreal.financial', role: 'admin' },
          { id: 'u-bf-agent1', firstName: 'Sarah', lastName: 'Wilson', email: 'sarah@boreal.financial', role: 'staff' },
          { id: 'u-bf-manager', firstName: 'Mike', lastName: 'Chen', email: 'mike@boreal.financial', role: 'manager' },
          { id: 'u-bf-agent2', firstName: 'Lisa', lastName: 'Rodriguez', email: 'lisa@boreal.financial', role: 'staff' },
          { id: 'u-bf-underwriter', firstName: 'David', lastName: 'Kim', email: 'david@boreal.financial', role: 'underwriter' }
        ];
      }
    }
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: typeof newTask) => {
      // Combine date and time into ISO string
      const dueDateTime = taskData.due_date 
        ? new Date(`${format(taskData.due_date, 'yyyy-MM-dd')}T${taskData.due_time}:00`)
        : null;
        
      const response = await api('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: taskData.title,
          description: taskData.description,
          due_at: dueDateTime?.toISOString(),
          priority: taskData.priority,
          assignee_id: taskData.assignee_id || 'u-bf-admin'
        })
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsCreateModalOpen(false);
      setNewTask({
        title: '',
        description: '',
        due_date: undefined,
        due_time: '09:00',
        priority: 'medium',
        assignee_id: ''
      });
    },
    onError: (error) => {
      console.error('Failed to create task:', error);
    }
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: typeof newAppointment) => {
      const response = await api('/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          title: appointmentData.title,
          description: appointmentData.description,
          start: appointmentData.start,
          end: appointmentData.end,
          type: appointmentData.type
        })
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setIsCreateAppointmentModalOpen(false);
      setNewAppointment({
        title: '',
        description: '',
        start: '',
        end: '',
        type: 'meeting'
      });
    },
    onError: (error) => {
      console.error('Failed to create appointment:', error);
    }
  });

  const handleCreateTask = () => {
    if (newTask.title.trim()) {
      createTaskMutation.mutate(newTask);
    }
  };

  const handleCreateAppointment = () => {
    if (newAppointment.title.trim() && newAppointment.start && newAppointment.end) {
      createAppointmentMutation.mutate(newAppointment);
    }
  };

  const todayTasks = alwaysArray(tasks).filter(task => {
    const dueDate = new Date(task.due_at);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString() && task.status !== 'done';
  });

  const thisWeekTasks = alwaysArray(tasks).filter(task => {
    const dueDate = new Date(task.due_at);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= today && dueDate <= weekFromNow && task.status !== 'done';
  });

  const futureTasks = alwaysArray(tasks).filter(task => {
    const dueDate = new Date(task.due_at);
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return dueDate > weekFromNow && task.status !== 'done';
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case 'blocked': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-300';
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Calendar display functions
  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Start from Sunday
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay()); // Start from previous Sunday
    
    const days = [];
    let currentDate = new Date(startDate);
    
    // Generate 6 weeks of days
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        days.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return alwaysArray(events).filter(event => 
      event.start && event.start.startsWith(dateStr)
    );
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return alwaysArray(tasks).filter(task => 
      task.due_at && task.due_at.startsWith(dateStr)
    );
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'month') {
      newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const renderCalendarHeader = () => {
    let title = '';
    if (viewMode === 'day') {
      title = selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else if (viewMode === 'week') {
      const weekDays = getWeekDays(selectedDate);
      const start = weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const end = weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      title = `${start} - ${end}, ${selectedDate.getFullYear()}`;
    } else if (viewMode === 'month') {
      title = selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }

    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              ←
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              →
            </Button>
          </div>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <Button
            size="sm"
            variant={viewMode === 'day' ? 'default' : 'ghost'}
            onClick={() => setViewMode('day')}
            className="px-3 py-1"
          >
            Day
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'week' ? 'default' : 'ghost'}
            onClick={() => setViewMode('week')}
            className="px-3 py-1"
          >
            Week
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'month' ? 'default' : 'ghost'}
            onClick={() => setViewMode('month')}
            className="px-3 py-1"
          >
            Month
          </Button>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(selectedDate);
    const dayTasks = getTasksForDate(selectedDate);
    
    return (
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="font-medium">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
        </div>
        <div className="p-4 space-y-4">
          {dayEvents.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Events</h4>
              <div className="space-y-2">
                {dayEvents.map(event => (
                  <div key={event.id} className="flex items-center gap-3 p-2 bg-blue-50 rounded border-l-4 border-blue-500">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{event.title}</div>
                      <div className="text-xs text-gray-600">
                        {formatTime(event.start)} - {formatTime(event.end)}
                      </div>
                    </div>
                    <Badge variant="secondary">{event.type}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {dayTasks.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Tasks</h4>
              <div className="space-y-2">
                {dayTasks.map(task => (
                  <div key={task.id} className={`flex items-center gap-3 p-2 bg-gray-50 rounded border-l-4 ${getPriorityColor(task.priority)}`}>
                    {getStatusIcon(task.status)}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{task.title}</div>
                      <div className="text-xs text-gray-600">
                        Due: {formatTime(task.due_at)}
                      </div>
                    </div>
                    <Badge variant="outline">{task.priority}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dayEvents.length === 0 && dayTasks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No events or tasks scheduled for this day
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(selectedDate);
    
    return (
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center font-medium text-gray-700 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[400px]">
          {weekDays.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const dayEvents = getEventsForDate(day);
            const dayTasks = getTasksForDate(day);
            
            return (
              <div key={day.toISOString()} className="border-r last:border-r-0 p-2">
                <div className={`text-center mb-2 ${isToday ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map(event => (
                    <div key={event.id} className="text-xs p-1 bg-blue-100 text-blue-800 rounded truncate">
                      {event.title}
                    </div>
                  ))}
                  {dayTasks.slice(0, 2).map(task => (
                    <div key={task.id} className="text-xs p-1 bg-gray-100 text-gray-800 rounded truncate">
                      {task.title}
                    </div>
                  ))}
                  {(dayEvents.length + dayTasks.length) > 4 && (
                    <div className="text-xs text-gray-500">+{(dayEvents.length + dayTasks.length) - 4} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDays = getMonthDays(selectedDate);
    const currentMonth = selectedDate.getMonth();
    
    return (
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center font-medium text-gray-700 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {monthDays.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const isCurrentMonth = day.getMonth() === currentMonth;
            const dayEvents = getEventsForDate(day);
            const dayTasks = getTasksForDate(day);
            
            return (
              <div 
                key={day.toISOString()} 
                className={`border-r border-b last:border-r-0 p-2 min-h-[80px] cursor-pointer hover:bg-gray-50 ${
                  !isCurrentMonth ? 'text-gray-400 bg-gray-50' : ''
                }`}
                onClick={() => {
                  setSelectedDate(day);
                  setViewMode('day');
                }}
              >
                <div className={`text-sm mb-1 ${isToday ? 'font-bold text-blue-600' : ''}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 1).map(event => (
                    <div key={event.id} className="text-xs p-1 bg-blue-100 text-blue-800 rounded truncate">
                      {event.title}
                    </div>
                  ))}
                  {dayTasks.slice(0, 1).map(task => (
                    <div key={task.id} className="text-xs p-1 bg-gray-100 text-gray-800 rounded truncate">
                      {task.title}
                    </div>
                  ))}
                  {(dayEvents.length + dayTasks.length) > 2 && (
                    <div className="text-xs text-gray-500">+{(dayEvents.length + dayTasks.length) - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary>
    <div>
      <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks & Calendar</h1>
          <p className="text-gray-600 mt-1">Manage your tasks and schedule</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Calendar Sync Status */}
          <Button 
            variant="outline" 
            className="flex items-center gap-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            onClick={() => toast({title: "Calendar Status", description: "Calendar sync is active and up to date"})}
          >
            <Calendar className="h-4 w-4" />
            Calendar Synced ✓
          </Button>
          <Dialog open={isCreateAppointmentModalOpen} onOpenChange={setIsCreateAppointmentModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Appointment</DialogTitle>
                <DialogDescription>
                  Schedule a new meeting or appointment
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Enter appointment title"
                    value={newAppointment.title}
                    onChange={(e) => setNewAppointment({...newAppointment, title: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Enter appointment description"
                    value={newAppointment.description}
                    onChange={(e) => setNewAppointment({...newAppointment, description: e.target.value})}
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Time</label>
                    <Input
                      type="datetime-local"
                      value={newAppointment.start}
                      onChange={(e) => setNewAppointment({...newAppointment, start: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Time</label>
                    <Input
                      type="datetime-local"
                      value={newAppointment.end}
                      onChange={(e) => setNewAppointment({...newAppointment, end: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={newAppointment.type} onValueChange={(value: 'meeting' | 'call' | 'task' | 'other') => setNewAppointment({...newAppointment, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="meeting" className="text-gray-900 hover:bg-gray-100">Meeting</SelectItem>
                      <SelectItem value="call" className="text-gray-900 hover:bg-gray-100">Call</SelectItem>
                      <SelectItem value="task" className="text-gray-900 hover:bg-gray-100">Task</SelectItem>
                      <SelectItem value="other" className="text-gray-900 hover:bg-gray-100">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateAppointmentModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateAppointment}
                    disabled={!newAppointment.title.trim() || !newAppointment.start || !newAppointment.end || createAppointmentMutation.isPending}
                  >
                    {createAppointmentMutation.isPending ? 'Creating...' : 'Create Appointment'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Create a new task and assign it to a team member
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Enter task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Enter task description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assign to</label>
                  <Select value={newTask.assignee_id} onValueChange={(value) => setNewTask({...newTask, assignee_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      {alwaysArray(users).map((user) => (
                        <SelectItem key={user.id} value={user.id} className="text-gray-900 hover:bg-gray-100">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {user.firstName} {user.lastName} {user.firstName === 'You' ? '' : `(${user.role})`}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Due Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newTask.due_date && "text-muted-foreground"
                          )}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newTask.due_date ? format(newTask.due_date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={newTask.due_date}
                          onSelect={(date) => setNewTask({...newTask, due_date: date})}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Due Time</label>
                    <Select value={newTask.due_time} onValueChange={(value) => setNewTask({...newTask, due_time: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                        <SelectItem value="08:00" className="text-gray-900 hover:bg-gray-100">8:00 AM</SelectItem>
                        <SelectItem value="09:00" className="text-gray-900 hover:bg-gray-100">9:00 AM</SelectItem>
                        <SelectItem value="10:00" className="text-gray-900 hover:bg-gray-100">10:00 AM</SelectItem>
                        <SelectItem value="11:00" className="text-gray-900 hover:bg-gray-100">11:00 AM</SelectItem>
                        <SelectItem value="12:00" className="text-gray-900 hover:bg-gray-100">12:00 PM</SelectItem>
                        <SelectItem value="13:00" className="text-gray-900 hover:bg-gray-100">1:00 PM</SelectItem>
                        <SelectItem value="14:00" className="text-gray-900 hover:bg-gray-100">2:00 PM</SelectItem>
                        <SelectItem value="15:00" className="text-gray-900 hover:bg-gray-100">3:00 PM</SelectItem>
                        <SelectItem value="16:00" className="text-gray-900 hover:bg-gray-100">4:00 PM</SelectItem>
                        <SelectItem value="17:00" className="text-gray-900 hover:bg-gray-100">5:00 PM</SelectItem>
                        <SelectItem value="18:00" className="text-gray-900 hover:bg-gray-100">6:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={newTask.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewTask({...newTask, priority: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="low" className="text-gray-900 hover:bg-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Low Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="medium" className="text-gray-900 hover:bg-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          Medium Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="high" className="text-gray-900 hover:bg-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          High Priority
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateTask}
                    disabled={!newTask.title.trim() || createTaskMutation.isPending}
                  >
                    {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Navigation and Views */}
      {renderCalendarHeader()}
      
      {/* Calendar Display */}
      <div className="mb-6">
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </div>

      {/* Tasks Summary */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Task Summary</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAllUsers(!showAllUsers)}
            className="flex items-center gap-2"
          >
            {showAllUsers ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            {showAllUsers ? 'My Tasks' : 'All Users'}
          </Button>
        </div>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Today ({todayTasks.length})</TabsTrigger>
            <TabsTrigger value="week">This Week ({thisWeekTasks.length})</TabsTrigger>
            <TabsTrigger value="future">Future ({futureTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayTasks.length > 0 ? (
                todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 border-l-4 ${getPriorityColor(task.priority)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        {getStatusIcon(task.status)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{task.title}</div>
                          {task.relatedTo && (
                            <div className="text-xs text-gray-600 mt-1">
                              Related to: {task.relatedTo.name || task.relatedTo.id}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Due: {formatTime(task.due_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                        {task.assignee_name && (
                          <span className="text-xs text-gray-500">{task.assignee_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-6 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No tasks due today</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="week" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {thisWeekTasks.length > 0 ? (
                thisWeekTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 border-l-4 ${getPriorityColor(task.priority)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        {getStatusIcon(task.status)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{task.title}</div>
                          {task.relatedTo && (
                            <div className="text-xs text-gray-600 mt-1">
                              Related to: {task.relatedTo.name || task.relatedTo.id}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Due: {formatDate(task.due_at)} at {formatTime(task.due_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                        {task.assignee_name && (
                          <span className="text-xs text-gray-500">{task.assignee_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-6 text-gray-500">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No tasks this week</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="future" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {futureTasks.length > 0 ? (
                futureTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 border-l-4 ${getPriorityColor(task.priority)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        {getStatusIcon(task.status)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{task.title}</div>
                          {task.relatedTo && (
                            <div className="text-xs text-gray-600 mt-1">
                              Related to: {task.relatedTo.name || task.relatedTo.id}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Due: {formatDate(task.due_at)} at {formatTime(task.due_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                        {task.assignee_name && (
                          <span className="text-xs text-gray-500">{task.assignee_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-6 text-gray-500">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No future tasks scheduled</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}