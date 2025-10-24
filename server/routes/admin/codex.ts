import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth, requireAdmin } from "../../middleware/authMiddleware";

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

type IssueStatus = "pass" | "fail" | "unknown";
interface AuditHistoryEntry {
  date: string;
  passes: number;
  failures: number;
  reports: string[];
}

interface IssueTrendEntry {
  report: string;
  status: IssueStatus;
  timestamp: string;
}

interface FeatureSummaryEntry {
  section: string;
  total: number;
  completed: number;
  percent: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");
const reportsDir = path.join(projectRoot, "reports");
const todoPath = path.join(projectRoot, "codex/V1.todo.json");

function listReportFiles(prefix: string): string[] {
  if (!fs.existsSync(reportsDir)) return [];
  return fs
    .readdirSync(reportsDir)
    .filter((file) => file.startsWith(prefix) && file.endsWith(".txt"))
    .sort();
}

function parseDateFromFilename(name: string): string {
  const match = name.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "unknown";
}

function countMarkers(content: string, marker: string): number {
  return (content.match(new RegExp(marker, "g")) ?? []).length;
}

function collectAuditHistory(): AuditHistoryEntry[] {
  if (!fs.existsSync(reportsDir)) return [];
  const files = fs
    .readdirSync(reportsDir)
    .filter((file) => file.startsWith("codex-") && file.endsWith(".txt"));
  const history = new Map<string, AuditHistoryEntry>();

  for (const file of files) {
    const content = fs.readFileSync(path.join(reportsDir, file), "utf8");
    const dateKey = parseDateFromFilename(file);
    const current = history.get(dateKey) ?? { date: dateKey, passes: 0, failures: 0, reports: [] };
    current.passes += countMarkers(content, "✅");
    current.failures += countMarkers(content, "❌");
    current.reports.push(file);
    history.set(dateKey, current);
  }

  return Array.from(history.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function collectIssueTrends(): { duplicateRouteScan: IssueTrendEntry[]; s3HealthCheck: IssueTrendEntry[] } {
  const duplicateRouteScan: IssueTrendEntry[] = [];
  const s3HealthCheck: IssueTrendEntry[] = [];

  const runFiles = listReportFiles("codex-run-").slice(-10);
  for (const file of runFiles) {
    const fullPath = path.join(reportsDir, file);
    const content = fs.readFileSync(fullPath, "utf8");
    const stats = fs.statSync(fullPath);
    const timestamp = stats.mtime.toISOString();

    const duplicateStatus: IssueStatus = content.includes("❌ Duplicate route scan")
      ? "fail"
      : content.includes("✅ Duplicate route scan")
      ? "pass"
      : "unknown";
    const s3Status: IssueStatus = content.includes("❌ S3 health check")
      ? "fail"
      : content.includes("✅ S3 health check")
      ? "pass"
      : "unknown";

    duplicateRouteScan.push({ report: file, status: duplicateStatus, timestamp });
    s3HealthCheck.push({ report: file, status: s3Status, timestamp });
  }

  return { duplicateRouteScan, s3HealthCheck };
}

function parseFeatureProgress(): {
  source: string | null;
  sections: Map<string, { completed: number; total: number }>;
} {
  const sections = new Map<string, { completed: number; total: number }>();
  const files = listReportFiles("codex-v1-enforce-");
  if (!files.length) {
    return { source: null, sections };
  }

  const latest = files[files.length - 1];
  const content = fs.readFileSync(path.join(reportsDir, latest), "utf8");
  let currentSection: string | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const sectionMatch = /^\[(.+)\]$/.exec(line);
    if (sectionMatch) {
      currentSection = sectionMatch[1].toLowerCase();
      if (!sections.has(currentSection)) {
        sections.set(currentSection, { completed: 0, total: 0 });
      }
      continue;
    }

    const itemMatch = /^-\s*\[(x|X| )\]\s+/.exec(line);
    if (itemMatch && currentSection) {
      const info = sections.get(currentSection) ?? { completed: 0, total: 0 };
      info.total += 1;
      if (/x/i.test(itemMatch[1])) {
        info.completed += 1;
      }
      sections.set(currentSection, info);
    }
  }

  return { source: latest, sections };
}

function buildFeatureCompletion(): { generatedFrom: string | null; summary: FeatureSummaryEntry[] } {
  const registry: Record<string, string[]> = fs.existsSync(todoPath)
    ? JSON.parse(fs.readFileSync(todoPath, "utf8"))
    : {};
  const parsed = parseFeatureProgress();
  const summary = Object.entries(registry).map<FeatureSummaryEntry>(([section, items]) => {
    const key = section.toLowerCase();
    const progress = parsed.sections.get(key) ?? { completed: 0, total: items.length };
    const total = items.length || progress.total;
    const completed = progress.completed;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    return {
      section,
      total,
      completed,
      percent,
    };
  });

  return { generatedFrom: parsed.source, summary };
}

router.get("/", (_req, res) => {
  try {
    const auditHistory = collectAuditHistory();
    const issueTrends = collectIssueTrends();
    const featureCompletion = buildFeatureCompletion();

    const latestReports = fs.existsSync(reportsDir)
      ? fs
          .readdirSync(reportsDir)
          .filter((file) => file.endsWith(".txt"))
          .sort()
          .slice(-10)
      : [];

    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      auditHistory,
      issueTrends,
      featureCompletion,
      reports: latestReports,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to load Codex metrics",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
