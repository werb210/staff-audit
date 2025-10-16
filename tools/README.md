# Build Stability Tools

## Deduplication Scanner

Run `./tools/dedup-check.sh` to scan for critical duplication issues:

- CSP header conflicts
- Router mount duplicates  
- Twilio SDK loading conflicts
- Service worker registration conflicts
- Invalid iframe sandbox flags

## Integration with Build Process

The existing build process already includes duplication checks:

```bash
npm run check:dup       # Run existing duplication checker
npm run build:strict    # Build with duplication checks
```

Our scanner complements the existing `scripts/dup_guard.mjs` by focusing on runtime conflicts.