#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, "..");
const checks = [];

function ensureFileExists(relativePath, description) {
  const target = path.resolve(root, relativePath);
  if (!fs.existsSync(target)) {
    checks.push({ ok: false, message: `${description} missing (${relativePath})` });
  } else {
    checks.push({ ok: true, message: `${description} present (${relativePath})` });
  }
}

ensureFileExists("shared/documentTypes.ts", "Document types registry");
ensureFileExists("shared/schema.ts", "Shared schema");
ensureFileExists("server/utils/pdfGenerator.ts", "Signed PDF generator");
ensureFileExists("server/utils/pureS3Upload.ts", "Pure S3 uploader");
ensureFileExists("server/utils/s3DirectStorage.ts", "Direct S3 storage util");

const documentTypesPath = path.resolve(root, "shared/documentTypes.ts");
try {
  const contents = fs.readFileSync(documentTypesPath, "utf8");
  const requiredTypes = ["signed_application", "bank_statements", "tax_returns"];
  for (const entry of requiredTypes) {
    if (!contents.includes(`'${entry}'`)) {
      checks.push({ ok: false, message: `Document type '${entry}' missing from shared/documentTypes.ts` });
    } else {
      checks.push({ ok: true, message: `Document type '${entry}' registered` });
    }
  }
} catch (error) {
  checks.push({ ok: false, message: `Unable to read ${documentTypesPath}: ${error.message}` });
}

const schemaPath = path.resolve(root, "shared/schema.ts");
try {
  const schemaContents = fs.readFileSync(schemaPath, "utf8");
  if (!schemaContents.includes("DOCUMENT_TYPES")) {
    checks.push({ ok: false, message: "shared/schema.ts does not reference DOCUMENT_TYPES" });
  } else {
    checks.push({ ok: true, message: "shared/schema.ts references DOCUMENT_TYPES" });
  }
} catch (error) {
  checks.push({ ok: false, message: `Unable to read ${schemaPath}: ${error.message}` });
}

const failing = checks.filter((result) => !result.ok);
for (const result of checks) {
  const icon = result.ok ? "✅" : "❌";
  console.log(`${icon} ${result.message}`);
}

if (failing.length > 0) {
  process.exitCode = 1;
}
