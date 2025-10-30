import pino from "pino";
import pinoHttp from "pino-http";
import { v4 as uuid } from "uuid";
export const logger = pino({ level: process.env.LOG_LEVEL || "info" });
export const httpLogger = pinoHttp({
    logger,
    genReqId: (req) => req.headers["x-request-id"] || uuid(),
    customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
    customErrorMessage: (req, res, err) => `ERR ${req.method} ${req.url} -> ${res.statusCode} ${err?.message || ""}`,
});
