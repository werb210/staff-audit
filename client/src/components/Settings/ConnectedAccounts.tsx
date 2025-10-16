import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface IntegrationStatus {
  google: boolean;
  microsoft: boolean;
  linkedin: boolean;
}

export default function ConnectedAccounts() {
  const [status, setStatus] = useState<IntegrationStatus>({
    google: false,
    microsoft: false,
    linkedin: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await axios.get('/api/settings/integrations/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to load integration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const connect = (service: string) => {
    // Redirect to OAuth start endpoint
    window.location.href = `/api/auth/${service}/start`;
  };

  const disconnect = async (service: string) => {
    try {
      await axios.post(`/api/settings/integrations/${service}/disconnect`);
      setStatus(prev => ({ ...prev, [service]: false }));
    } catch (error) {
      console.error(`Failed to disconnect ${service}:`, error);
    }
  };

  if (loading) {
    return <div>Loading connected accounts...</div>;
  }

  return (
    <div className="space-y-4 p-6">
      <h3 className="text-lg font-semibold">Connected Accounts</h3>
      <p className="text-sm text-gray-600 mb-4">
        Manage your OAuth connections for external services
      </p>
      
      {(['google', 'microsoft', 'linkedin'] as const).map(service => (
        <div key={service} className="flex justify-between items-center p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              status[service] ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <span className="font-medium capitalize">{service}</span>
            <span className="text-sm text-gray-500">
              {status[service] ? 'Connected' : 'Not connected'}
            </span>
          </div>
          
          {status[service] ? (
            <button 
              onClick={() => disconnect(service)} 
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md border border-red-200"
            >
              Disconnect
            </button>
          ) : (
            <button 
              onClick={() => connect(service)} 
              className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200"
            >
              Connect
            </button>
          )}
        </div>
      ))}
    </div>
  );
}