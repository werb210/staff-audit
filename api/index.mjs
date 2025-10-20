export default async function handler(req, res) {
  if (req.url === "/api/health") {
    res.status(200).json({ ok: true });
  } else {
    res.status(404).json({ error: "Not Found" });
  }
}
