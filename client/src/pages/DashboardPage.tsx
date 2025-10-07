// client/src/pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';

interface PipelineStats {
  activeCalls: number;
  pendingTasks: number;
  pipelineStages: Record<string, number>;
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<PipelineStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch('/api/pipeline/stats');
      const data = await res.json();
      setStats(data);
    };
    fetchStats();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      {stats ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-100 rounded shadow">
            <h2 className="font-semibold">Active Calls</h2>
            <p className="text-xl">{stats.activeCalls}</p>
          </div>
          <div className="p-4 bg-gray-100 rounded shadow">
            <h2 className="font-semibold">Pending Tasks</h2>
            <p className="text-xl">{stats.pendingTasks}</p>
          </div>
          <div className="p-4 bg-gray-100 rounded shadow">
            <h2 className="font-semibold">Pipeline Stages</h2>
            <ul>
              {Object.entries(stats.pipelineStages).map(([stage, count]) => (
                <li key={stage}>
                  {stage}: {count}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p>Loading stats…</p>
      )}
    </div>
  );
};

export default DashboardPage;
