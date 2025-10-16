import { useState, useEffect } from 'react';

interface BuildInfo {
  buildId?: string;
  time?: string;
  rand?: string;
}

export default function BuildBadge() {
  const [info, setInfo] = useState<BuildInfo | null>(null);
  const [lastId, setLastId] = useState('');

  useEffect(() => {
    const fetchBuildInfo = async () => {
      try {
        const response = await fetch('/api/_int/build', {});
        if (response.ok) {
          const buildInfo = await response.json();
          setInfo(buildInfo);
          
          // Auto-reload on build change
          if (lastId && lastId !== buildInfo.buildId && lastId !== buildInfo.time) {
            console.log('🔄 [BUILD-CHANGE] New build detected, reloading...');
            setTimeout(() => window.location.reload(), 1000);
          }
          setLastId(buildInfo.buildId || buildInfo.time || '');
        }
      } catch (err) {
        // Silently fail - badge not critical
      }
    };

    fetchBuildInfo();
    
    // Check for build changes every 5 seconds
    const interval = setInterval(fetchBuildInfo, 5000);
    return () => clearInterval(interval);
  }, [lastId]);

  if (!info) return null;

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return timestamp?.slice(-8) || 'unknown';
    }
  };

  const buildDisplay = info.buildId?.slice(-8) || info.time?.slice(-8) || info.rand || 'dev';
  const timeDisplay = info.time ? formatTime(info.time) : 'live';

  return (
    <div 
      style={{
        position: 'fixed',
        right: 8,
        bottom: 8,
        padding: '6px 10px',
        fontSize: 12,
        background: '#0f172a',
        color: '#cbd5e1',
        borderRadius: 8,
        opacity: 0.85,
        zIndex: 9999,
        fontFamily: 'monospace',
        border: '1px solid #334155',
        userSelect: 'none',
        cursor: 'pointer'
      }}
      title={`Build: ${buildDisplay}\nTime: ${timeDisplay}\nClick to refresh`}
      onClick={() => window.location.reload()}
    >
      🏗️ {buildDisplay} • {timeDisplay}
    </div>
  );
}