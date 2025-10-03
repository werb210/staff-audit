import { execSync } from "node:child_process";

const startedAt = new Date().toISOString();
let git = "nogit";
try { git = execSync("git rev-parse --short HEAD", {stdio:["ignore","pipe","ignore"]}).toString().trim(); } catch {}

export const BUILD_INFO = {
  pid: process.pid,
  startedAt,
  git,
  node: process.version,
  note: "If this doesn't change after restart, you're not hitting the server you edited."
};