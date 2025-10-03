import React from "react";

export default function Dashboard(){
  // Mock data for demonstration
  const stats = [
    { label: "Active Applications", value: "47", change: "+12%" },
    { label: "Pending Reviews", value: "23", change: "+5%" },
    { label: "This Month", value: "$2.1M", change: "+18%" },
    { label: "Conversion Rate", value: "73%", change: "+3%" }
  ];

  const recentActivity = [
    { id: 1, type: "Application", company: "Acme LLC", amount: "$150,000", status: "Review", time: "2 hours ago" },
    { id: 2, type: "Document", company: "Beta Corp", amount: "$82,000", status: "Approved", time: "4 hours ago" },
    { id: 3, type: "Call", company: "Delta Inc", amount: "$95,000", status: "Follow-up", time: "6 hours ago" },
    { id: 4, type: "Meeting", company: "Gamma Co", amount: "$210,000", status: "Scheduled", time: "1 day ago" }
  ];

  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h2 style={{margin:"8px 0"}}>Dashboard Overview</h2>
        <div style={{fontSize:12,opacity:.7}}>Last updated: {new Date().toLocaleTimeString()}</div>
      </div>

      {/* Stats Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:12}}>
        {stats.map(stat => (
          <div key={stat.label} style={statCard}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <div style={{fontSize:14,opacity:.7}}>{stat.label}</div>
              <div style={{fontSize:12,color:"#059669"}}>{stat.change}</div>
            </div>
            <div style={{fontSize:28,fontWeight:700,marginTop:4}}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div style={activityPanel}>
        <h3 style={{margin:"0 0 12px 0"}}>Recent Activity</h3>
        <div style={{display:"grid",gap:8}}>
          {recentActivity.map(item => (
            <div key={item.id} style={activityItem}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:600}}>{item.company}</div>
                  <div style={{fontSize:12,opacity:.7}}>{item.type} • {item.amount}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={getStatusStyle(item.status)}>{item.status}</div>
                  <div style={{fontSize:11,opacity:.6}}>{item.time}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getStatusStyle(status: string): React.CSSProperties {
  const baseStyle = { fontSize: 12, padding: "2px 8px", borderRadius: 12, fontWeight: 500 };
  switch(status) {
    case "Review": return { ...baseStyle, background: "#FEF3C7", color: "#92400E" };
    case "Approved": return { ...baseStyle, background: "#D1FAE5", color: "#065F46" };
    case "Follow-up": return { ...baseStyle, background: "#DBEAFE", color: "#1E40AF" };
    case "Scheduled": return { ...baseStyle, background: "#EDE9FE", color: "#5B21B6" };
    default: return { ...baseStyle, background: "#F3F4F6", color: "#374151" };
  }
}

const statCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb", 
  borderRadius: 12,
  padding: 16
};

const activityPanel: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16
};

const activityItem: React.CSSProperties = {
  border: "1px solid #f3f4f6",
  borderRadius: 8,
  padding: 12,
  background: "#fafafa"
};
