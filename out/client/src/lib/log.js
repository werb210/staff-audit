const DEV = import.meta.env.DEV === true || import.meta.env.MODE === "development";
export const log = {
    debug: (...a) => {
        if (DEV)
            console.debug(...a);
    },
    info: (...a) => {
        if (DEV)
            console.info(...a);
    },
    warn: (...a) => {
        if (DEV)
            console.warn(...a);
    },
    error: (...a) => {
        if (DEV)
            console.error(...a);
    },
};
export default log;
