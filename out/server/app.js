// Express app instance for testing (without starting server)
import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
const app = express();
// Basic middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// Register all routes
registerRoutes(app);
export default app;
