# Build System Prevention Guide

## **How to Prevent Build Issues**

### 🛡️ **1. Pre-Deployment Checks**

**Always run this before deploying:**
```bash
node scripts/build-guard.js
```

This checks for:
- ❌ async/await in non-async functions  
- ❌ Missing imports (ErrorBoundary, etc.)
- ❌ CSS @import order issues
- ❌ Missing critical files

### 🔍 **2. Build Verification Endpoint**

Check if your build is actually live:
```bash
curl -s http://localhost:5000/api/_int/build-guard/verify-build | jq
```

Returns:
- ✅ Build timestamp & age
- ✅ Current file hashes  
- ✅ Server uptime
- ⚠️ Syntax issues found
- 📋 Recommendations

### 🚨 **3. Emergency Build Fix**

If changes aren't showing up:
```bash
curl -X POST http://localhost:5000/api/_int/build-guard/emergency-build
```

This will:
1. Check syntax issues
2. Force clean rebuild  
3. Verify build output
4. Restart if needed

### 🔧 **4. Common Issues & Fixes**

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Stale build** | Code changes not showing | Run emergency build endpoint |
| **Async/await error** | Build fails with "await in non-async" | Add `async` to event handlers |
| **Missing imports** | "X is not defined" errors | Add proper import statements |
| **CSS import order** | Style compilation fails | Move @import to top of CSS |

### 📋 **5. Daily Prevention Checklist**

Before any major changes:
- [ ] Run `node scripts/build-guard.js`
- [ ] Check build verification endpoint
- [ ] Test User Management page loads  
- [ ] Verify API endpoints respond correctly

### 🚀 **6. If You See "Staff SPA placeholder"**

This means static files aren't being served correctly:

1. **Check if build exists:**
   ```bash
   ls -la client/dist/index.html
   ```

2. **Force rebuild:**
   ```bash
   rm -rf client/dist && npm run build
   ```

3. **Restart workflow** to pick up new files

4. **Verify via endpoint:**
   ```bash
   curl -s http://localhost:5000/api/_int/build-guard/verify-build
   ```

### 📁 **7. File Structure Monitoring**

Critical files to watch for changes:
- `client/src/pages/staff/settings/UserManagementPage.tsx`
- `client/src/pages/staff/contacts/ContactsPage.tsx`  
- `server/boot.js` (actual server entry point)
- `client/dist/index.html` (build output)

### 🔄 **8. Server Entry Point Rules**

- **Production:** `server/boot.js` (compiled from boot.ts)
- **Development:** Same file, but TypeScript source  
- **Never manually edit** `server/boot.js` - edit `server/boot.ts`

---

## **Emergency Contact**

If build issues persist:
1. Check the verification endpoint first
2. Run the emergency build fix  
3. Check console logs for specific errors
4. Verify file permissions and disk space