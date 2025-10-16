import React from "react";
import { useQuery } from "@tanstack/react-query";

export function AutomationDashboard() {
  const { data: queuedReminders = [], isLoading } = useQuery({
    queryKey: ["/api/automations/queue"], // This endpoint would need to be created
    refetchInterval: 30000,
  });

  const { data: slaViolations = [] } = useQuery({
    queryKey: ["/api/comms/sla/violations"], // This endpoint would need to be created
    refetchInterval: 10000,
  });

  if (isLoading) return <div className="p-4">Loading automation dashboard...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">SLA & Automation Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SLA Status Overview */}
        <div className="border rounded-lg p-4 bg-white shadow">
          <h2 className="text-lg font-semibold mb-3">SLA Violations</h2>
          <div className="space-y-2">
            {slaViolations.length === 0 ? (
              <div className="text-green-600">✅ No SLA violations</div>
            ) : (
              slaViolations.map((violation: any) => (
                <div key={violation.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                  <div>
                    <div className="font-medium">{violation.contact_name}</div>
                    <div className="text-sm text-gray-600">
                      {violation.policy_name} - Due: {new Date(violation.due_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-red-600 font-bold">
                    {Math.floor((Date.now() - new Date(violation.due_at).getTime()) / (1000 * 60))}m overdue
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Automation Queue */}
        <div className="border rounded-lg p-4 bg-white shadow">
          <h2 className="text-lg font-semibold mb-3">Pending Reminders</h2>
          <div className="space-y-2">
            {queuedReminders.length === 0 ? (
              <div className="text-gray-600">No pending reminders</div>
            ) : (
              queuedReminders.map((reminder: any) => (
                <div key={reminder.id} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                  <div>
                    <div className="font-medium">{reminder.target_type}</div>
                    <div className="text-sm text-gray-600">
                      {reminder.channel.toUpperCase()} • Scheduled: {new Date(reminder.scheduled_for).toLocaleString()}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    reminder.status === 'queued' ? 'bg-yellow-100 text-yellow-800' :
                    reminder.status === 'sent' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {reminder.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Business Hours Configuration */}
      <div className="mt-6 border rounded-lg p-4 bg-white shadow">
        <h2 className="text-lg font-semibold mb-3">Automation Settings</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Business Hours:</strong> {process.env.BIZ_HOURS_START || "09:00"} - {process.env.BIZ_HOURS_END || "18:00"}
          </div>
          <div>
            <strong>Business Days:</strong> Mon-Fri
          </div>
          <div>
            <strong>First Response SLA:</strong> {process.env.SLA_FIRST_RESPONSE_MINUTES || 15} minutes
          </div>
          <div>
            <strong>Max Unread SLA:</strong> {process.env.SLA_MAX_UNREAD_MINUTES || 60} minutes
          </div>
        </div>
      </div>
    </div>
  );
}