// Clear browser cookies endpoint
const express = require('express');
const app = express();

app.get('/clear-cookies', (req, res) => {
  res.clearCookie('bf_auth', { path: '/', domain: req.hostname });
  res.clearCookie('auth_token', { path: '/', domain: req.hostname });
  res.clearCookie('bf_auth', { path: '/', secure: true, sameSite: 'none' });
  res.clearCookie('auth_token', { path: '/', secure: true, sameSite: 'none' });
  
  res.json({ 
    success: true, 
    message: 'All authentication cookies cleared',
    redirect: '/login'
  });
});

module.exports = app;