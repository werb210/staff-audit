import React from 'react';
export default function UserManagementFallback(){
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-2">User Management (Dev Fallback)</h2>
      <p className="text-sm opacity-70">This fallback renders while the real module is unavailable. All security is off in dev.</p>
    </div>
  );
}