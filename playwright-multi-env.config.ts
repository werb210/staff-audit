import { defineConfig, devices } from '@playwright/test';

/**
 * Multi-Environment Playwright Configuration
 * Supports LOCAL and PRODUCTION testing for security verification
 */

// Environment-specific configuration
const getBaseURL = () => {
  if (process.env.CI && process.env.STAFF_BASE) {
    return process.env.STAFF_BASE; // Production testing
  }
  return process.env.BASE_URL || 'http://localhost:5000'; // Local testing
};

const getEnvironmentName = () => {
  if (process.env.STAFF_BASE?.includes('boreal.financial')) {
    return 'PRODUCTION';
  }
  return 'LOCAL';
};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60000,
  expect: { timeout: 15000 },
  
  reporter: [
    ['html', { 
      outputFolder: `playwright-report-${getEnvironmentName().toLowerCase()}`,
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    ['json', { 
      outputFile: `test-results/results-${getEnvironmentName().toLowerCase()}.json` 
    }],
    ['junit', { 
      outputFile: `test-results/junit-${getEnvironmentName().toLowerCase()}.xml` 
    }],
    ['line']
  ],
  
  use: {
    baseURL: getBaseURL(),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 60000,
    extraHTTPHeaders: {
      'Accept': 'application/json, text/html',
      'User-Agent': `Playwright-SecurityTests-${getEnvironmentName()}`,
    },
  },

  projects: [
    // Security-focused testing
    {
      name: 'security-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      testMatch: [
        '**/04-api-security.spec.ts',
        '**/05-cross-silo-protection.spec.ts'
      ]
    },
    
    // Authentication testing
    {
      name: 'auth-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
      testMatch: [
        '**/01-authentication.spec.ts'
      ]
    },
    
    // Application workflow testing
    {
      name: 'workflow-webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      },
      testMatch: [
        '**/02-bf-applications.spec.ts',
        '**/03-slf-silo.spec.ts',
        '**/06-document-workflow.spec.ts'
      ]
    },
    
    // Mobile testing for production
    {
      name: 'mobile-security',
      use: { 
        ...devices['iPhone 12'],
      },
      testMatch: [
        '**/04-api-security.spec.ts'
      ]
    }
  ],

  // Only start local server if not testing production
  ...(process.env.STAFF_BASE ? {} : {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:5000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    }
  }),
});