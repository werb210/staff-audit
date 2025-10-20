export default function handler(req, res) {
  // Allow both GitHub Pages and localhost
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  res.status(200).json([
    { id: "1", stage: "New", businessName: "Sample Business", amount: 50000 },
    { id: "2", stage: "Requires Docs", businessName: "Test Co", amount: 25000 },
  ]);
}
