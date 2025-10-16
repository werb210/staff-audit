const DEV = import.meta.env.DEV === true || import.meta.env.MODE === "development";

export const log = {
  debug: (...a: any[]) => { if (DEV) console.debug(...a); },
  info:  (...a: any[]) => { if (DEV) console.info(...a); },
  warn:  (...a: any[]) => { if (DEV) console.warn(...a); },
  error: (...a: any[]) => { if (DEV) console.error(...a); },
};
export default log;