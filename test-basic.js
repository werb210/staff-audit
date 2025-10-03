// Basic Node.js test to verify runtime works
const express = require('express');
const app = express();

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'basic-test', time: new Date().toISOString() });
});

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Basic test server running on port ${port}`);
});