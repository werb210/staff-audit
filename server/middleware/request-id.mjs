import { randomUUID } from 'crypto';
export default function requestId(){
  return (req,res,next)=>{
    const id = req.headers['x-request-id']?.toString() || randomUUID();
    req.id = id;
    res.setHeader('X-Request-Id', id);
    next();
  };
}