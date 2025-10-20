const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

app.get('/api/pipeline/cards', (req, res) => {
  res.json([
    { id: '1', stage: 'New', businessName: 'Sample Business', amount: 50000 },
    { id: '2', stage: 'Requires Docs', businessName: 'Test Co', amount: 25000 },
  ]);
});

app.get('/', (req, res) => {
  res.send('Boreal Staff API is running');
});

// Required for Vercel
module.exports = app;
