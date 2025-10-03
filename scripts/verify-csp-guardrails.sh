#!/bin/bash
# CSP Guardrails - prevent multiple CSP sources

echo "🔒 Verifying CSP guardrails..."

# Check for meta CSP tags
echo "Checking for meta CSP tags..."
if grep -r "http-equiv.*Content-Security-Policy" client public 2>/dev/null; then
    echo "❌ ERROR: Found meta CSP tags - these will override server headers"
    exit 1
fi

# Check for manual CSP headers
echo "Checking for manual CSP headers..."
if grep -r "setHeader.*Content-Security-Policy" server 2>/dev/null; then
    echo "⚠️  WARNING: Found manual CSP headers - verify only one is active"
fi

# Check for multiple helmet CSP configs
echo "Checking for multiple helmet CSP configurations..."
CSP_COUNT=$(grep -r "contentSecurityPolicy.*{" server 2>/dev/null | wc -l)
if [ "$CSP_COUNT" -gt 1 ]; then
    echo "⚠️  WARNING: Found $CSP_COUNT CSP configurations - only one should be active"
fi

echo "✅ CSP guardrails verification complete"