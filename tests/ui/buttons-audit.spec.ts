import { test, expect } from '@playwright/test';

const UI_BASE = process.env.UI_BASE || 'http://localhost:5000';

test.describe('UI Button Connectivity Audit', () => {
  
  test('Contacts Page - Action Buttons', async ({ page }) => {
    await page.goto(`${UI_BASE}/staff/contacts`);
    await page.waitForLoadState('networkidle');
    
    // Check for Add Contact button
    const addButton = page.locator('[data-testid="add-contact"], button:has-text("Add")');
    await expect(addButton).toBeVisible();
    
    // Check if contact cards are rendered
    const contactCards = page.locator('[data-testid="contact-card"], .contact-card');
    const cardCount = await contactCards.count();
    console.log(`Found ${cardCount} contact cards`);
    
    if (cardCount > 0) {
      // Test clicking first contact
      await contactCards.first().click();
      await page.waitForTimeout(1000);
      
      // Check for contact action buttons
      const editButton = page.locator('[data-testid="edit-contact"], button:has-text("Edit")');
      const deleteButton = page.locator('[data-testid="delete-contact"], button:has-text("Delete")');
      
      // These should be visible after selecting a contact
      await expect(editButton).toBeVisible();
      await expect(deleteButton).toBeVisible();
    }
  });

  test('Pipeline Page - Card Actions', async ({ page }) => {
    await page.goto(`${UI_BASE}/staff/pipeline`);
    await page.waitForLoadState('networkidle');
    
    // Check if pipeline lanes are rendered
    const pipelineLanes = page.locator('[data-testid="pipeline-lane"], .pipeline-lane');
    const laneCount = await pipelineLanes.count();
    console.log(`Found ${laneCount} pipeline lanes`);
    
    // Check for pipeline cards
    const pipelineCards = page.locator('[data-testid="pipeline-card"], .pipeline-card');
    const cardCount = await pipelineCards.count();
    console.log(`Found ${cardCount} pipeline cards`);
    
    if (cardCount > 0) {
      // Test clicking first card
      await pipelineCards.first().click();
      await page.waitForTimeout(1000);
      
      // Check for card action buttons
      const approveButton = page.locator('[data-testid="approve-application"], button:has-text("Approve")');
      const sendButton = page.locator('[data-testid="send-to-lender"], button:has-text("Send")');
      const timelineButton = page.locator('[data-testid="view-timeline"], button:has-text("Timeline")');
      
      // At least one action should be available
      const hasActions = await approveButton.isVisible() || 
                        await sendButton.isVisible() || 
                        await timelineButton.isVisible();
      expect(hasActions).toBe(true);
    }
  });

  test('Communications Hub - Action Buttons', async ({ page }) => {
    await page.goto(`${UI_BASE}/staff/communications`);
    await page.waitForLoadState('networkidle');
    
    // Check for communication action buttons
    const callButton = page.locator('[data-testid="make-call"], button:has-text("Call")');
    const smsButton = page.locator('[data-testid="send-sms"], button:has-text("SMS")');
    const emailButton = page.locator('[data-testid="send-email"], button:has-text("Email")');
    const meetingButton = page.locator('[data-testid="schedule-meeting"], button:has-text("Meeting")');
    const taskButton = page.locator('[data-testid="create-task"], button:has-text("Task")');
    const noteButton = page.locator('[data-testid="add-note"], button:has-text("Note")');
    const linkedinButton = page.locator('[data-testid="linkedin-message"], button:has-text("LinkedIn")');
    
    // Count available communication methods
    const commButtons = [callButton, smsButton, emailButton, meetingButton, taskButton, noteButton, linkedinButton];
    let availableCount = 0;
    
    for (const button of commButtons) {
      if (await button.isVisible()) availableCount++;
    }
    
    console.log(`Found ${availableCount} communication buttons`);
    expect(availableCount).toBeGreaterThan(0);
  });

  test('Lenders Management - CRUD Operations', async ({ page }) => {
    await page.goto(`${UI_BASE}/staff/lenders`);
    await page.waitForLoadState('networkidle');
    
    // Check for lender management buttons
    const addLenderButton = page.locator('[data-testid="add-lender"], button:has-text("Add Lender")');
    const editButton = page.locator('[data-testid="edit-lender"], button:has-text("Edit")');
    const deleteButton = page.locator('[data-testid="delete-lender"], button:has-text("Delete")');
    const validateButton = page.locator('[data-testid="validate-lender"], button:has-text("Validate")');
    
    // Check if lender table/cards are rendered
    const lenderItems = page.locator('[data-testid="lender-item"], .lender-card, .lender-row');
    const lenderCount = await lenderItems.count();
    console.log(`Found ${lenderCount} lender items`);
    
    expect(lenderCount).toBeGreaterThan(0);
  });

  test('Documents & OCR - Upload and Processing', async ({ page }) => {
    await page.goto(`${UI_BASE}/staff/documents`);
    await page.waitForLoadState('networkidle');
    
    // Check for document upload and processing buttons
    const uploadButton = page.locator('[data-testid="upload-document"], input[type="file"], button:has-text("Upload")');
    const ocrButton = page.locator('[data-testid="run-ocr"], button:has-text("OCR")');
    const bankingButton = page.locator('[data-testid="banking-analysis"], button:has-text("Banking")');
    const downloadButton = page.locator('[data-testid="download-document"], button:has-text("Download")');
    
    // At least upload functionality should be available
    const hasUpload = await uploadButton.isVisible();
    expect(hasUpload).toBe(true);
  });

  test('AI Features - Control Panel', async ({ page }) => {
    await page.goto(`${UI_BASE}/staff/ai-control`);
    await page.waitForLoadState('networkidle');
    
    // Check for AI control buttons
    const creditSummaryButton = page.locator('[data-testid="ai-credit-summary"], button:has-text("Credit Summary")');
    const riskScoreButton = page.locator('[data-testid="ai-risk-score"], button:has-text("Risk Score")');
    const lenderRecsButton = page.locator('[data-testid="ai-lender-recs"], button:has-text("Recommendations")');
    const docSummaryButton = page.locator('[data-testid="ai-doc-summary"], button:has-text("Summarize")');
    const emergencyDisableButton = page.locator('[data-testid="ai-emergency-disable"], button:has-text("Emergency Disable")');
    
    // AI dashboard should have some controls
    const aiButtons = [creditSummaryButton, riskScoreButton, lenderRecsButton, docSummaryButton, emergencyDisableButton];
    let aiCount = 0;
    
    for (const button of aiButtons) {
      if (await button.isVisible()) aiCount++;
    }
    
    console.log(`Found ${aiCount} AI control buttons`);
    expect(aiCount).toBeGreaterThan(0);
  });

  test('Settings & Configuration', async ({ page }) => {
    await page.goto(`${UI_BASE}/staff/settings`);
    await page.waitForLoadState('networkidle');
    
    // Check for settings toggles and buttons
    const userMgmtButton = page.locator('[data-testid="user-management"], button:has-text("User Management")');
    const integrationButton = page.locator('[data-testid="integrations"], button:has-text("Integrations")');
    const systemButton = page.locator('[data-testid="system-settings"], button:has-text("System")');
    const saveButton = page.locator('[data-testid="save-settings"], button:has-text("Save")');
    
    // Settings toggles
    const toggles = page.locator('[data-testid*="toggle"], input[type="checkbox"]');
    const toggleCount = await toggles.count();
    console.log(`Found ${toggleCount} setting toggles`);
    
    // Should have some configuration options
    const hasSettings = await userMgmtButton.isVisible() || 
                       await integrationButton.isVisible() || 
                       toggleCount > 0;
    expect(hasSettings).toBe(true);
  });
});