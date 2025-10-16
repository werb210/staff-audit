import express from 'express';
const app = express();
app.use(express.json({ limit: '1mb' }));
app.post('/applications', (req, res) => {
  const keys = Object.keys(req.body || {});
  console.log('📤 Mock lender received', keys.length, 'keys');
  res.json({ ok: true, receivedKeys: keys });
});
app.listen(4010, () => console.log('⚙️  Mock lender listening on http://localhost:4010'));