#!/bin/bash
set -euo pipefail

echo "=== staff-audit repo cleanup ==="

# Unsafe env files
git rm -f .env.deployment .env.dev .env.production .env.temp .env.test || true

# Obsolete ESLint configs
git rm -f .eslintrc-crm-contracts.js .eslintrc.console.json .eslintrc.cjs || true

# Trash/legacy/test directories
git rm -rf .trash-* || true
git rm -rf legacy || true
git rm -rf manual-tests || true
git rm -rf fixtures || true
git rm -rf test_docs || true
git rm -rf testdata || true
git rm -rf tests || true
git rm -rf audit || true
git rm -rf evidence || true
git rm -rf reports || true
git rm -rf golden || true
git rm -rf playwright-report || true
git rm -rf test-results || true

# Duplicate/bloated markdowns
git rm -f FINAL_* || true
git rm -f DEPLOYMENT_* || true
git rm -f DOCUMENT_* || true
git rm -f *_GUIDE.md || true
git rm -f *_INSTRUCTIONS.md || true
git rm -f *_STATUS.md || true
git rm -f *_SUMMARY.md || true

echo "=== Commit cleanup ==="
git commit -m "Repo cleanup: removed unsafe env files, obsolete configs, trash/test dirs, and markdown clutter"
