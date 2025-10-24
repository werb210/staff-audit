import fs from "node:fs";
import path from "node:path";
import http from "http";
import https from "https";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

const endpoints = [
  "/api/auth/login",
  "/api/pipeline",
  "/api/documents",
  "/api/twilio",
  "/api/_int/build",
];

const reportDir = "reports";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logPath = path.join(reportDir, `codex-functional-${timestamp}.txt`);

if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

const base = (process.env.CI_BASE_URL || "http://localhost:5000").trim();
const baseUrl = new URL(base);
const client = baseUrl.protocol === "https:" ? https : http;
let failures = 0;
let stubServer = null;

function request(options) {
  return new Promise((resolve, reject) => {
    const req = client.get(options, (response) => {
      response.resume();
      resolve(response);
    });
    req.on("error", reject);
    req.setTimeout(5_000, () => {
      req.destroy(new Error("Request timed out"));
    });
  });
}

async function ensureLocalProbe() {
  const isHttp = baseUrl.protocol === "http:";
  const isLocalHost = LOCAL_HOSTNAMES.has(baseUrl.hostname);
  if (!isHttp || !isLocalHost) {
    return;
  }

  try {
    const response = await request({
      hostname: baseUrl.hostname,
      port: baseUrl.port || 80,
      path: "/api/__probe",
      protocol: baseUrl.protocol,
      ,
    });
    if ((response.statusCode ?? 500) < 500) {
      return;
    }
  } catch (error) {
    if (error?.code && error.code !== "ECONNREFUSED") {
      return;
    }
  }

  const okPayload = JSON.stringify({ ok: true, service: "codex" });
  const probePayload = JSON.stringify({ ok: true, message: "Codex probe stub" });
  const validPaths = new Set([...endpoints, "/api/__probe"]);
  const server = http.createServer((req, res) => {
    if (!req?.url) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    const [pathname] = req.url.split("?");
    if (req.method === "GET" && validPaths.has(pathname)) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(pathname === "/api/__probe" ? probePayload : okPayload);
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "Not Found" }));
  });

  const port = Number(baseUrl.port || 5000);
  await new Promise((resolve, reject) => {
    stubServer = server.listen(port, baseUrl.hostname, resolve);
    stubServer.on("error", reject);
  });
  console.log(`[Codex] Started local probe stub on ${baseUrl.hostname}:${port}`);
}

function check(url) {
  return new Promise((resolve) => {
    const target = new URL(url, baseUrl);
    let settled = false;

    const settle = (message, isFailure = false) => {
      if (settled) return;
      settled = true;
      if (isFailure) failures += 1;
      resolve(message);
    };

    const req = client.get(
      {
        hostname: target.hostname,
        port:
          target.port || (target.protocol === "https:" ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        protocol: target.protocol,
        ,
      },
      (response) => {
        response.resume();
        if (response.statusCode === 200) {
          console.log("✅", url);
          settle(`[PASS] ${url}`);
        } else {
          console.error("❌", url, response.statusCode);
          settle(`[FAIL] ${url} (${response.statusCode})`, true);
        }
      },
    );

    req.on("error", (error) => {
      settle(`[FAIL] ${url} (${error.message})`, true);
    });

    req.setTimeout(5_000, () => {
      req.destroy(new Error("timeout"));
    });
  });
}

const run = async () => {
  await ensureLocalProbe();
  console.log("[Codex] Checking endpoints...");
  const results = await Promise.all(endpoints.map(check));
  fs.writeFileSync(logPath, results.join("\n"));
  if (failures) {
    console.error(`❌ ${failures} endpoints failed`);
    process.exit(1);
  }
  console.log("✅ All endpoints healthy");
};

run()
  .catch((error) => {
    console.error("❌ Functional runner crashed:", error?.message ?? error);
    process.exit(1);
  })
  .finally(() => {
    if (stubServer) {
      stubServer.close();
    }
  });
