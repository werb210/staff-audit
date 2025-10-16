#!/bin/bash
set -eo pipefail

if rg -n "http-equiv=\"Content-Security-Policy\"" -S . >/dev/null 2>&1; then
  DUP_CSP_META=$(rg -n "http-equiv=\"Content-Security-Policy\"" -S . | wc -l)
else
  DUP_CSP_META=0
fi

if rg -n "Content-Security-Policy" server >/dev/null 2>&1; then
  DUP_CSP_SETTERS=$(rg -n "Content-Security-Policy" server | wc -l)
else
  DUP_CSP_SETTERS=0
fi

if [ "$DUP_CSP_META" != "0" ]; then echo "Found CSP <meta>; remove it."; exit 1; fi
if [ "$DUP_CSP_SETTERS" -gt 3 ]; then echo "Multiple CSP setters detected."; exit 1; fi
echo "CSP de-dup ✅"