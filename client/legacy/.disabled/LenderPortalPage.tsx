import React from "react";

export default function LenderPortalPage(){
  const [portal, setPortal] = React.useState<any>(null);
  const [reports, setReports] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  async function loadPortal(){
    try {
      const j = await (await fetch("/api/lender-portal/dashboard")).json();
      if(j.ok) {
        setPortal(j);
      } else {
        console.error("Lender access denied:", j.error);
      }
    } catch (error) {
      console.error("Failed to load lender dashboard:", error);
    }
    setLoading(false);
  }

  async function loadReports(){
    try {
      const j = await (await fetch("/api/lender-portal/reports")).json();
      if(j.ok) {
        setReports(j.reports || []);
      }
    } catch (error) {
      console.error("Failed to load reports:", error);
    }
  }

  React.useEffect(() => { 
    loadPortal();
    loadReports();
  }, []);

  if(loading) {
    return (
      <div className="p-4">
        <div className="text-center">Loading lender portal...</div>
      </div>
    );
  }

  if(!dashboard) {
    return (
      <div className="p-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You don't have access to the lender portal.</p>
          <p className="text-sm text-gray-500 mt-1">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Lender Portal</h1>
        <p className="text-gray-600">{dashboard.lender?.name} • {dashboard.lender?.role}</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{dashboard.stats?.total_matched || 0}</div>
          <div className="text-sm text-gray-600">Matched Applications</div>
          <div className="text-xs text-gray-500">Last 30 days</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{dashboard.stats?.total_funded || 0}</div>
          <div className="text-sm text-gray-600">Funded Deals</div>
          <div className="text-xs text-gray-500">Last 30 days</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            ${(dashboard.stats?.total_volume || 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Volume</div>
          <div className="text-xs text-gray-500">Last 30 days</div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Recent Applications</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Amount</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Funded</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.applications?.map((app: any) => (
                <tr key={app.id} className="border-t">
                  <td className="px-4 py-2">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    ${(app.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      app.status === 'approved' ? 'bg-green-100 text-green-800' :
                      app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {app.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {app.funded ? (
                      <span className="text-green-600 font-medium">✓ Yes</span>
                    ) : (
                      <span className="text-gray-500">No</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!dashboard.applications || dashboard.applications.length === 0) && (
                <tr>
                  <td className="px-4 py-4 text-gray-500 text-center" colSpan={4}>
                    No recent applications
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Reports */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Monthly Reports</h2>
        </div>
        <div className="p-4">
          {reports.length > 0 ? (
            <div className="space-y-2">
              {reports.map((report: any) => (
                <div key={report.period} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <div className="font-medium">{report.period}</div>
                    <div className="text-sm text-gray-600">
                      {report.matched_count} matched, {report.funded_count} funded
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(report.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-4">
              No monthly reports available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}