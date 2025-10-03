const PROD = process.env.NODE_ENV === 'production';
export default function errorEnvelope(){
  // MUST be mounted AFTER routes
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, _next)=>{
    const status = Number(err.status || err.code || 500);
    const code   = (err.code && String(err.code)) || (err.name || 'internal_error');
    const payload = {
      error: code,
      message: PROD ? undefined : (err.message || 'error'),
      requestId: req?.id,
    };
    if (!PROD && err?.stack) payload.stack = String(err.stack);
    res.status(isFinite(status) ? status : 500).json(payload);
  };
}