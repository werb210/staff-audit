import fs from "node:fs";
import path from "node:path";

const reportDir = "reports";
const outFile = path.join(reportDir, "staff_codex_master_report.md");
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

const entries = fs
  .readdirSync(reportDir)
  .filter((file) => file.startsWith("codex-") && file.endsWith(".txt"))
  .map((file) => {
    const fullPath = path.join(reportDir, file);
    const stat = fs.statSync(fullPath);
    return { file, fullPath, stat };
  });

const groupByCategory = (fileName) => {
  const base = fileName.replace(/^codex-/, "").replace(/\.txt$/, "");
  const parts = base.split("-");
  const tsIndex = parts.findIndex((part) => /^\d{4}/.test(part));
  const categoryParts = tsIndex === -1 ? parts : parts.slice(0, tsIndex);
  const category = categoryParts.length > 0 ? categoryParts.join("-") : base;
  return category;
};

const groups = new Map();
for (const entry of entries) {
  const category = groupByCategory(entry.file);
  if (!groups.has(category)) {
    groups.set(category, []);
  }
  groups.get(category)?.push(entry);
}

const analyzeReport = (entry) => {
  const raw = fs.readFileSync(entry.fullPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const hasFail = /\bFAIL\b|❌/iu.test(raw);
  const hasWarn = /⚠️|\bWARN\b/iu.test(raw);

  let status = "pass";
  if (hasFail) {
    status = "fail";
  } else if (hasWarn) {
    status = "warn";
  }

  const findLine = (predicate) => {
    const line = lines.find((item) => predicate(item.trim())) ?? "";
    return line.trim();
  };

  const noteSource =
    status === "fail"
      ? findLine((line) => line.includes("❌") || /\bFAIL\b/i.test(line))
      : status === "warn"
      ? findLine((line) => line.includes("⚠️") || /\bWARN\b/i.test(line))
      : findLine((line) => line.includes("✅") || /\bPASS\b/i.test(line)) ||
        findLine((line) => Boolean(line));

  const note = noteSource.replace(/\|/g, "\\|").trim();

  return { ...entry, status, note, raw };
};

const latestByCategory = [];
for (const [category, items] of groups) {
  const sorted = [...items].sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
  const latest = analyzeReport(sorted[0]);
  latestByCategory.push({ category, ...latest });
}

latestByCategory.sort((a, b) => {
  if (a.category === b.category) return 0;
  return a.category < b.category ? -1 : 1;
});

const totals = { pass: 0, warn: 0, fail: 0 };
for (const item of latestByCategory) {
  totals[item.status] += 1;
}

const statusLabel = (status) => {
  switch (status) {
    case "fail":
      return "❌ Fail";
    case "warn":
      return "⚠️ Warn";
    default:
      return "✅ Pass";
  }
};

const summaryLines = [
  "# Staff Codex Master Report",
  "",
  `Generated at ${new Date().toISOString()}`,
  "",
  `Latest reports analysed: ${entries.length}`,
  `Status totals — ✅ Pass: ${totals.pass}, ⚠️ Warn: ${totals.warn}, ❌ Fail: ${totals.fail}`,
  "",
  "| Area | Status | Latest Report | Notes |",
  "|------|--------|---------------|-------|",
];

for (const item of latestByCategory) {
  const formattedDate = new Date(item.stat.mtime).toISOString();
  const note = item.note.length > 180 ? `${item.note.slice(0, 177)}…` : item.note;
  summaryLines.push(
    `| ${item.category} | ${statusLabel(item.status)} | ${item.file} (${formattedDate}) | ${note || ""} |`
  );
}

if (latestByCategory.length === 0) {
  summaryLines.push("| _No Codex reports found_ |  |  |  |");
}

summaryLines.push("", "## Detailed report listing", "");

const detailedEntries = [...entries].sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
for (const entry of detailedEntries) {
  const analysed = analyzeReport(entry);
  const label = statusLabel(analysed.status);
  const snippet = analysed.raw
    .split(/\r?\n/)
    .slice(0, 5)
    .map((line) => `> ${line}`)
    .join("\n");
  summaryLines.push(`### ${entry.file}`, "", `- Status: ${label}`, `- Size: ${analysed.stat.size} bytes`, "", snippet, "");
}

fs.writeFileSync(outFile, `${summaryLines.join("\n")}\n`);
console.log("✅ Master report generated:", outFile);
