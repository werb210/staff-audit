module.exports = (req, res) => {
  if (req.url === '/api/health') {
    return res.status(200).json({ ok: true });
  }
  res.status(404).json({ error: 'Not Found' });
};
