import express from "express";
import { BUILD_INFO } from "../../lib/buildInfo";
const r = express.Router();
r.get("/build", (_req,res)=> res.json(BUILD_INFO));
export default r;