import { Request, Response, NextFunction } from "express";
import twilio from "twilio";

export function requireTwilioSignature(req:Request,res:Response,next:NextFunction){
  const sig=req.get("X-Twilio-Signature"); 
  const url = (process.env.PUBLIC_WEBHOOK_BASE ?? "") + req.originalUrl;
  const valid = sig && url && twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN||"", sig, url, req.body || {});
  if(!valid){ return res.status(401).json({error:"invalid_twillio_signature"}); }
  next();
}