mkdir -p /workspaces/staff-audit/express/api
cat > /workspaces/staff-audit/express/api/pipeline.js <<'EOF'
export default function handler(req, res) {
  if (req.url.endsWith('/cards')) {
    return res.status(200).json([
      { id: "1", stage: "New", businessName: "Sample Business", amount: 50000 },
      { id: "2", stage: "Requires Docs", businessName: "Test Co", amount: 25000 }
    ]);
  }
  res.status(404).json({ error: "Not Found" });
}
EOF
