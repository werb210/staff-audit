export function optionalAuth(){
  return async (_req,_res,next)=> next();
}