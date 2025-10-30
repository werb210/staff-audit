import { test, expect } from '@playwright/test';
// Simple verification tests for core functionality
test.describe('Core Application Verification', () => {
    test.beforeEach(async ({ page }) => {
        // Basic error handling
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('Console error:', msg.text());
            }
        });
    });
    test('Application loads successfully', async ({ page }) => {
        await page.goto('/staff/dashboard');
        // Wait for page to load
        await page.waitForLoadState('networkidle').catch(() => { });
        // Check if page loaded without major errors
        const title = await page.title().catch(() => 'Error');
        expect(title).not.toBe('Error');
        // Look for any content indication the app loaded
        const hasContent = await page.locator('body').textContent();
        expect(hasContent).toBeTruthy();
        expect(hasContent.length).toBeGreaterThan(10);
    });
    test('API endpoints respond', async ({ page }) => {
        // Test key API endpoints
        const responses = await Promise.allSettled([
            page.request.get('/api/health'),
            page.request.get('/api/_int/build-guard/verify-build'),
            page.request.get('/api/users'),
            page.request.get('/api/contacts')
        ]);
        // At least 3 out of 4 endpoints should respond successfully
        const successCount = responses.filter(r => r.status === 'fulfilled' && r.value.ok()).length;
        expect(successCount).toBeGreaterThanOrEqual(3);
    });
    test('Navigation routes work', async ({ page }) => {
        const routes = [
            '/staff/dashboard',
            '/staff/pipeline',
            '/staff/contacts',
            '/staff/tasks-calendar',
            '/staff/lenders'
        ];
        for (const route of routes) {
            await page.goto(route);
            await page.waitForLoadState('domcontentloaded').catch(() => { });
            // Check that we're on the expected route
            const url = page.url();
            expect(url).toContain(route);
            // Check that some content loaded
            const bodyText = await page.locator('body').textContent().catch(() => '');
            expect(bodyText.length).toBeGreaterThan(50);
        }
    });
    test('Build verification endpoint confirms fresh build', async ({ page }) => {
        const response = await page.request.get('/api/_int/build-guard/verify-build');
        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.clientBuild?.status).toBe('ok');
        expect(data.clientBuild?.buildTime).toBeTruthy();
        // Build should be relatively fresh (within last hour)
        const buildTime = new Date(data.clientBuild.buildTime);
        const now = new Date();
        const ageMinutes = (now.getTime() - buildTime.getTime()) / (1000 * 60);
        expect(ageMinutes).toBeLessThan(60);
    });
});
