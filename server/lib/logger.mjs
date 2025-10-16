const PROD = process.env.NODE_ENV === 'production';
function noop(){}
export const log = {
  debug: PROD ? noop : (...a)=>console.debug('[D]', ...a),
  info:  PROD ? noop : (...a)=>console.info('[I]', ...a),
  warn:  (...a)=>console.warn('[W]', ...a),
  error: (...a)=>console.error('[E]', ...a),
};
export default log;