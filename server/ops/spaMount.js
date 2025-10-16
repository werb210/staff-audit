"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountSpa = mountSpa;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const connect_history_api_fallback_1 = __importDefault(require("connect-history-api-fallback"));
function sha256(p) {
    return crypto_1.default.createHash("sha256").update(fs_1.default.readFileSync(p)).digest("hex");
}
function mountSpa(app, clientDir) {
    const indexPath = path_1.default.join(clientDir, "index.html");
    if (!fs_1.default.existsSync(indexPath))
        throw new Error(`index.html missing in ${clientDir}`);
    const indexHash = sha256(indexPath);
    app.use((0, connect_history_api_fallback_1.default)({
        disableDotRule: true,
        htmlAcceptHeaders: ["text/html", "application/xhtml+xml"],
        rewrites: [{ from: /^\/api\/.*$/, to: ctx => ctx.parsedUrl.path }]
    }));
    app.use((req, res, next) => {
        res.setHeader("X-Served-From", clientDir);
        res.setHeader("X-Index-Hash", indexHash);
        next();
    });
    app.use(require("express").static(clientDir, {
        setHeaders(res, file) {
            if (file.endsWith("index.html"))
                res.setHeader("Cache-Control", "no-store");
        }
    }));
    app.get("*", (_req, res) => {
        let html = fs_1.default.readFileSync(indexPath, "utf8");
        if (!html.includes("<base "))
            html = html.replace("<head>", `<head><base href="/">`);
        const wantBanner = process.env.SHOW_DEBUG_BANNER === "1" || _req.query.debug === "1";
        if (wantBanner) {
            const banner = `
<style>
#__ops-banner{position:fixed;top:0;left:0;right:0;background:#c1121f;color:#fff;padding:8px 12px;
font:600 12px system-ui;z-index:2147483647;box-shadow:0 1px 0 rgba(0,0,0,.25)}
#__ops-banner .pill{display:inline-block;background:rgba(255,255,255,.2);padding:2px 8px;border-radius:999px;margin-right:6px}
#__ops-spacer{height:34px}
</style>
<div id="__ops-banner">
  <span class="pill">BUILD ${indexHash.slice(0, 8)}</span>
  <span class="pill">ROUTE <span id="__ops-r"></span></span>
  <span class="pill">SERVED ${path_1.default.basename(clientDir)}</span>
</div><div id="__ops-spacer"></div>
<script>document.getElementById("__ops-r").textContent=location.pathname;</script>`;
            html = html.replace(/<body([^>]*)>/i, `<body$1>${banner}`);
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.send(html);
    });
}
