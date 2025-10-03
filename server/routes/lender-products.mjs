import express from "express";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = express.Router();

// REMOVED: Conflicting lender-products route moved to canonical lenders-api.ts

export default router;