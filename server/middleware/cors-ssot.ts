import cors from "cors";
import { corsAllowlist } from "../security/csp";

export const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow curl/SSR/health checks
    const ok = corsAllowlist.some(rule =>
      typeof rule === "string" ? rule === origin : rule.test(origin)
    );
    return ok ? cb(null, true) : cb(new Error(`CORS blocked: ${origin}`));
  },
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Trace-Id","X-App-Schema","X-App-Version","X-Admin-Token","X-Lender-Id","X-Request-ID"],
  exposedHeaders: ["X-DB-Host","X-Instance"],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400
};

export const corsSsot = cors(corsOptions);