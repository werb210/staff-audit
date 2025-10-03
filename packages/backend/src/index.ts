import express from "express";
import cors from "cors";
import { setupAuth } from "./middleware/auth.js";
import routes from "./routes/index.js";

const app = express();

// Middleware

  origin: process.env.NODE_ENV === 'production' 
    ? process.env.REPLIT_DOMAINS?.split(',').map(domain => `https://${domain}`) 
    : true,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup authentication
await setupAuth(app);

// API routes
app.use('/api', routes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Start server
const PORT = parseInt(process.env.PORT || '8000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});
