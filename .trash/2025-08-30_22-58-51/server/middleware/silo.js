module.exports = function silo(requiredSilo){
  return function(req,res,next){
    const user = req.user || {};
    const allowed = new Set(user.allowedSilos || ["BOREAL"]);
    const target = requiredSilo || (req.headers["x-silo"] || "BOREAL");
    if(!allowed.has(target)) return res.status(403).json({message:"Forbidden: silo"});
    req.silo = target;
    next();
  }
}