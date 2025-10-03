# 🎯 Step-by-Step Execution Guide - 28 Manual Button Proofs

## Quick Start (5 Minutes)

### 1. 🚀 Launch Framework
```bash
# Start development server and proof framework
./scripts/run-manual-proofs.sh
```

### 2. 📱 Open Test Interface
- Navigate to: `http://localhost:5000/manual-tests/proof-framework.html`
- Verify all sections are collapsible and functional
- Check recording controls are available

### 3. 🔐 Authenticate
- Open staff portal: `http://localhost:5000/portal`
- Login with staff credentials
- Verify dashboard loads properly

## Detailed Execution Workflow

### 📹 For Each Proof (Standard Process):

#### Step 1: Preparation
1. **Clear DevTools**: Open DevTools → Network tab → Clear all entries
2. **Ready Recording**: Ensure screen recording software is ready
3. **Start Framework**: Click "Start Proof X" button in framework

#### Step 2: Evidence Capture  
1. **Auto-Recording**: Framework starts screen recording automatically
2. **Follow Steps**: Complete all numbered test steps for the proof
3. **Capture Network**: HAR export is prepared automatically
4. **Document Issues**: Note any errors or unexpected behavior

#### Step 3: Completion
1. **Stop Recording**: Click "Stop Recording" when workflow complete
2. **Export HAR**: Click "Export HAR" to save network traffic
3. **Verify Files**: Confirm MP4 and HAR files are generated
4. **Mark Complete**: Framework automatically marks proof as complete

## Category-Specific Guidelines

### 🔐 Authentication & Navigation (Proofs 1-6)

**Special Considerations:**
- Use real staff credentials, not test accounts
- Verify JWT tokens in network traffic
- Ensure all navigation tabs load properly
- Test responsive behavior on different screen sizes

**Key Evidence Points:**
- Login form submission and response
- JWT token generation and validation
- Navigation state changes
- User profile information display

### 📋 Application Workflow (Proofs 7-14)

**Data Requirements:**
- Use realistic business data (not obviously fake)
- Create multiple application states for testing
- Ensure proper status transitions
- Test search with various criteria

**Critical Validations:**
- Database operations reflected in UI
- Status changes trigger appropriate notifications
- Export functionality generates valid files
- Assignment notifications work properly

### 📄 Document Management (Proofs 15-21)

**File Preparation:**
- Have sample documents ready (PDF, DOC, images)
- Use files of various sizes (small, medium, large)
- Test both successful and failed uploads
- Verify document security controls

**Security Focus:**
- Document access permissions
- Audit trail generation
- Approval workflow triggers
- Bulk operation safety checks

### 📞 Communication & Advanced (Proofs 22-28)

**Integration Testing:**
- Email sending and receiving
- SMS delivery confirmation
- Calendar synchronization
- Report generation accuracy
- Lender API connectivity
- Marketing campaign metrics
- System health monitoring

## Evidence Quality Standards

### 📹 MP4 Recording Requirements
- **Resolution**: Minimum 1280x720, prefer 1920x1080
- **Frame Rate**: 30fps minimum for smooth interaction capture
- **Duration**: Complete workflow start to finish
- **Audio**: Optional but helpful for narration
- **Focus**: Clear cursor movements and button clicks

### 🌐 HAR File Requirements
- **Complete Session**: From login to proof completion
- **Filtered Content**: Focus on API calls, minimize static assets
- **Security Check**: Verify no sensitive data in requests/responses
- **Network Timeline**: Show request/response timing
- **Error Capture**: Include any failed requests for debugging

### 📊 Validation Checklist

#### For Each Proof:
- [ ] MP4 file shows complete workflow without interruption
- [ ] HAR file contains relevant API calls
- [ ] No sensitive data (passwords, tokens) visible in recordings
- [ ] All test steps completed successfully
- [ ] Error states handled appropriately
- [ ] UI feedback and notifications captured

#### Overall Quality:
- [ ] Consistent naming convention followed
- [ ] Files organized by category (authentication, applications, etc.)
- [ ] No duplicate or corrupted files
- [ ] Total file count: 56+ (28 MP4 + 28 HAR minimum)
- [ ] Evidence report generated and complete

## Troubleshooting Common Issues

### 🔧 Recording Problems
**Issue**: Screen recording fails to start
**Solution**: Check browser permissions, try different recording software

**Issue**: HAR export not working
**Solution**: Manually export from DevTools → Network → Export HAR

### 🔒 Authentication Issues
**Issue**: Login fails during proof
**Solution**: Verify credentials, check server logs, restart if needed

**Issue**: JWT token expires during testing
**Solution**: Complete proofs faster or re-authenticate

### 🌐 Network Problems
**Issue**: API calls return unexpected errors
**Solution**: Check server status, verify database connection

**Issue**: Security guard blocking legitimate requests
**Solution**: Verify auth headers, check whitelist configuration

## Advanced Execution Tips

### 🎯 Efficiency Strategies
1. **Batch Similar Proofs**: Complete all navigation proofs together
2. **Prepare Test Data**: Have sample applications and documents ready
3. **Use Keyboard Shortcuts**: Speed up repetitive actions
4. **Monitor Progress**: Use framework progress tracker

### 🔍 Quality Assurance
1. **Review Immediately**: Check each proof's evidence before moving on
2. **Test Edge Cases**: Try invalid inputs and error conditions
3. **Verify Security**: Ensure protected endpoints remain secure
4. **Document Issues**: Note any bugs or unexpected behavior

### 📱 Multi-Device Testing
1. **Desktop**: Primary execution environment
2. **Tablet**: Test responsive layouts (optional)
3. **Mobile**: Verify mobile responsiveness (optional)

## Final Validation Process

### 🔎 Evidence Review
1. **File Integrity**: Verify all files open and play correctly
2. **Content Quality**: Ensure recordings show clear interactions
3. **Security Compliance**: No sensitive data exposed
4. **Completeness**: All 28 proofs have corresponding evidence

### 📋 Submission Preparation
1. **Organize Files**: Sort into category folders
2. **Generate Report**: Use framework's evidence report feature
3. **Create Archive**: ZIP all evidence files for delivery
4. **Quality Check**: Final review of all materials

### ✅ Completion Criteria
- **28/28 Proofs**: All proofs marked complete in framework
- **56+ Files**: Minimum evidence file count achieved
- **Quality Pass**: All evidence meets quality standards
- **Security Verified**: No sensitive data exposure confirmed
- **Report Generated**: Comprehensive evidence report created

---

## Support and Resources

**Framework URL**: `http://localhost:5000/manual-tests/proof-framework.html`

**Execution Script**: `./scripts/run-manual-proofs.sh`

**Evidence Validation**: `./scripts/run-manual-proofs.sh validate`

**Help**: Review `manual-tests/README.md` for detailed information