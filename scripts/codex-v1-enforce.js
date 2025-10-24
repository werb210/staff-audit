#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const args = process.argv.slice(2);
const deploymentAttempt = args.includes("--deployment");
const reportsDir = "reports";

function readTodoRegistry() {
  const todoPath = path.resolve("codex/V1.todo.json");
  if (!fs.existsSync(todoPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(todoPath, "utf8"));
}

function formatResultLines(results) {
  return results.map(({ label, success }) => `${success ? "✅" : "❌"} ${label}`).join("\n");
}

async function sendNotifications({ summary, results, reportPath }) {
  const delivered = [];
  const errors = [];

  const plainSummary = `${summary}\n\n${results.map((r) => `${r.success ? "✅" : "❌"} ${r.label}`).join("\n")}`;

  const slackWebhook = process.env.CODEX_ALERT_SLACK_WEBHOOK_URL;
  if (slackWebhook) {
    try {
      const response = await fetch(slackWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: plainSummary }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      delivered.push("Slack");
    } catch (error) {
      errors.push(`Slack: ${error?.message ?? "unknown error"}`);
    }
  }

  const sendgridKey = process.env.SENDGRID_API_KEY;
  const emailTo = process.env.CODEX_ALERT_EMAIL_TO;
  const emailFrom = process.env.CODEX_ALERT_EMAIL_FROM;
  if (sendgridKey && emailTo && emailFrom) {
    try {
      const sgMailModule = await import("@sendgrid/mail");
      const sgMail = sgMailModule.default ?? sgMailModule;
      sgMail.setApiKey(sendgridKey);
      const recipients = emailTo.split(",").map((addr) => addr.trim()).filter(Boolean);
      await sgMail.send({
        to: recipients,
        from: emailFrom,
        subject: "Codex V1 Enforcement Failure",
        text: `${plainSummary}\n\nReport: ${reportPath}`,
        html: `<pre>${plainSummary}</pre><p>Report: ${reportPath}</p>`,
      });
      delivered.push("SendGrid");
    } catch (error) {
      errors.push(`SendGrid: ${error?.message ?? "unknown error"}`);
    }
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const smsTo = process.env.CODEX_ALERT_SMS_TO;
  const smsFrom = process.env.CODEX_ALERT_SMS_FROM;
  if (twilioSid && twilioToken && smsTo && smsFrom) {
    try {
      const twilioModule = await import("twilio");
      const twilioFactory = twilioModule.default ?? twilioModule;
      const client = twilioFactory(twilioSid, twilioToken);
      const body = `${summary} – ${results
        .map((r) => `${r.success ? "✅" : "❌"} ${r.label}`)
        .join("; ")}`;
      await client.messages.create({ to: smsTo, from: smsFrom, body });
      delivered.push("Twilio SMS");
    } catch (error) {
      errors.push(`Twilio: ${error?.message ?? "unknown error"}`);
    }
  }

  return { delivered, errors };
}

async function main() {
  const todo = readTodoRegistry();
  fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(
    reportsDir,
    `codex-v1-enforce-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`,
  );

  fs.appendFileSync(
    reportPath,
    `Boreal Staff App V1 Enforcement Run\n${new Date().toISOString()}\n`,
  );

  if (deploymentAttempt) {
    fs.appendFileSync(reportPath, "Mode: Deployment gate\n");
  }

  const tests = [
    { label: "Codex System Audit", command: "npm run codex:audit" },
    { label: "Codex Functional Verification", command: "npm run codex:functional" },
  ];

  const results = [];

  for (const { label, command } of tests) {
    try {
      execSync(command, { stdio: "pipe" });
      fs.appendFileSync(reportPath, `✅ ${label}\n`);
      results.push({ label, success: true });
    } catch (error) {
      const stdout = error?.stdout?.toString() ?? "";
      const stderr = error?.stderr?.toString() ?? "";
      fs.appendFileSync(reportPath, `❌ ${label}\n`);
      if (stdout.trim()) {
        fs.appendFileSync(reportPath, `${stdout.trim()}\n`);
      }
      if (stderr.trim()) {
        fs.appendFileSync(reportPath, `${stderr.trim()}\n`);
      }
      results.push({ label, success: false, stdout, stderr });
    }
  }

  fs.appendFileSync(reportPath, "\nFeature Coverage Check:\n");
  Object.entries(todo).forEach(([section, items]) => {
    fs.appendFileSync(reportPath, `\n[${section.toUpperCase()}]\n`);
    for (const item of items) {
      fs.appendFileSync(reportPath, `- [ ] ${item}\n`);
    }
  });

  const hadFailure = results.some((result) => !result.success);
  const summary = hadFailure
    ? deploymentAttempt
      ? "🚨 Codex enforcement failed during deployment gate"
      : "🚨 Codex enforcement run failed"
    : "✅ Codex enforcement run passed";

  if (hadFailure) {
    const notificationResult = await sendNotifications({ summary, results, reportPath });
    fs.appendFileSync(reportPath, "\nNotifications:\n");
    if (notificationResult.delivered.length) {
      fs.appendFileSync(
        reportPath,
        `Sent: ${notificationResult.delivered.join(", ")}\n`,
      );
    }
    if (notificationResult.errors.length) {
      fs.appendFileSync(
        reportPath,
        `Errors: ${notificationResult.errors.join("; ")}\n`,
      );
    }
    if (!notificationResult.delivered.length && !notificationResult.errors.length) {
      fs.appendFileSync(reportPath, "No notification channels configured.\n");
    }
  }

  console.log(
    `${summary}\n${formatResultLines(results)}\nReport written to ${reportPath}`,
  );

  if (hadFailure) {
    process.exitCode = 1;
  }
}

await main();
