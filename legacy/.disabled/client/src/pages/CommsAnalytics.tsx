import React from "react";

export default function CommsAnalytics(){
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  async function load(){
    setLoading(true);
    try {
      const r = await fetch("/api/analytics/comms", { credentials:"include" });
      const j = await r.json();
      setData(j);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }
  
  React.useEffect(()=>{ load(); },[]);

  if (loading) return <div className="p-4">Loading analytics...</div>;
  if (!data) return <div className="p-4">Failed to load analytics data</div>;

  return (
    <div className="p-4 space-y-6">
      <div className="font-semibold text-xl">Communications Analytics</div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded p-4">
          <div className="text-sm text-gray-500">Total Communications</div>
          <div className="text-2xl font-bold">{data.communications.total}</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-gray-500">Open Tasks</div>
          <div className="text-2xl font-bold">{data.tasks.open}</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-gray-500">Avg Response Time</div>
          <div className="text-2xl font-bold">{data.metrics.avgResponseTime}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded p-4">
          <div className="font-semibold mb-3">Communication Breakdown</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>SMS Messages</span>
              <span className="font-medium">{data.communications.sms}</span>
            </div>
            <div className="flex justify-between">
              <span>Email Messages</span>
              <span className="font-medium">{data.communications.email}</span>
            </div>
            <div className="flex justify-between">
              <span>Voice Calls</span>
              <span className="font-medium">{data.communications.calls}</span>
            </div>
            <div className="flex justify-between">
              <span>Call Transcripts</span>
              <span className="font-medium">{data.communications.transcripts}</span>
            </div>
          </div>
        </div>

        <div className="border rounded p-4">
          <div className="font-semibold mb-3">Task Status</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Open Tasks</span>
              <span className="font-medium text-orange-600">{data.tasks.open}</span>
            </div>
            <div className="flex justify-between">
              <span>Completed Tasks</span>
              <span className="font-medium text-green-600">{data.tasks.completed}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Tasks</span>
              <span className="font-medium">{data.tasks.total}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border rounded p-4">
        <div className="font-semibold mb-3">Busy Hours</div>
        <div className="flex gap-2">
          {data.metrics.busyHours.map((hour: string) => (
            <span key={hour} className="px-3 py-1 bg-blue-100 rounded text-sm">
              {hour}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}