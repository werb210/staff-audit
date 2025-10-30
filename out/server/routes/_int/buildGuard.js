import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
const router = Router();
// Track build timestamps and hashes to detect stale builds
const BUILD_TRACKING = {
    lastClientBuild: 0,
    lastServerRestart: Date.now(),
    buildHashes: new Map()
};
// Generate hash of critical files to detect changes
function getFileHash(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
    }
    catch {
        return 'missing';
    }
}
// Check if client build is fresh
function checkClientBuild() {
    const clientDist = path.resolve(process.cwd(), 'client/dist');
    const indexPath = path.join(clientDist, 'index.html');
    if (!fs.existsSync(indexPath)) {
        return { status: 'missing', error: 'Client dist/index.html not found' };
    }
    const indexStat = fs.statSync(indexPath);
    const buildTime = indexStat.mtime.getTime();
    if (buildTime > BUILD_TRACKING.lastClientBuild) {
        BUILD_TRACKING.lastClientBuild = buildTime;
    }
    return {
        status: 'ok',
        buildTime: new Date(buildTime).toISOString(),
        age: Math.round((Date.now() - buildTime) / 1000 / 60) + ' minutes ago'
    };
}
// Check for common syntax errors that block builds
function checkSyntaxIssues() {
    const issues = [];
    const filesToCheck = [
        'client/src/pages/staff/contacts/ContactsPage.tsx',
        'client/src/pages/staff/tasks/TasksCalendarPage.tsx',
        'client/src/pages/staff/settings/UserManagementPage.tsx'
    ];
    for (const file of filesToCheck) {
        const fullPath = path.resolve(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Check for await in non-async functions
            const awaitMatches = content.match(/(?<!async\s+.*?)(?:onClick|onChange|onSubmit)\s*=\s*\([^)]*\)\s*=>\s*{[^}]*await/g);
            if (awaitMatches) {
                issues.push(`${file}: async/await in non-async handler`);
            }
            // Check for missing imports
            if (content.includes('ErrorBoundary') && !content.includes('import.*ErrorBoundary')) {
                issues.push(`${file}: Missing ErrorBoundary import`);
            }
        }
    }
    return issues;
}
// Verify that code changes are actually live
router.get('/verify-build', (req, res) => {
    const clientBuild = checkClientBuild();
    const syntaxIssues = checkSyntaxIssues();
    const serverUptime = Math.round((Date.now() - BUILD_TRACKING.lastServerRestart) / 1000 / 60);
    // Get current file hashes
    const currentHashes = {
        userManagement: getFileHash('client/src/pages/staff/settings/UserManagementPage.tsx'),
        contacts: getFileHash('client/src/pages/staff/contacts/ContactsPage.tsx'),
        serverBoot: getFileHash('server/boot.js')
    };
    const verification = {
        timestamp: new Date().toISOString(),
        clientBuild,
        syntaxIssues,
        serverUptime: `${serverUptime} minutes`,
        fileHashes: currentHashes,
        recommendations: []
    };
    // Add recommendations based on findings
    if (clientBuild.status === 'missing') {
        verification.recommendations.push('Run: npm run build');
    }
    if (syntaxIssues.length > 0) {
        verification.recommendations.push('Fix syntax errors before building');
    }
    if (serverUptime > 60) {
        verification.recommendations.push('Consider restarting server for fresh state');
    }
    res.json(verification);
});
// Emergency build fix endpoint
router.post('/emergency-build', async (req, res) => {
    const steps = [];
    try {
        // 1. Check syntax first
        const issues = checkSyntaxIssues();
        if (issues.length > 0) {
            return res.status(400).json({
                error: 'Syntax issues must be fixed first',
                issues,
                step: 'syntax-check'
            });
        }
        steps.push('✅ Syntax check passed');
        // 2. Force clean build
        const { exec } = require('child_process');
        await new Promise((resolve, reject) => {
            exec('cd /home/runner/workspace && rm -rf client/dist && npm run build', (error, stdout, stderr) => {
                if (error)
                    reject(error);
                else
                    resolve(stdout);
            });
        });
        steps.push('✅ Clean build completed');
        // 3. Verify build output
        const verification = checkClientBuild();
        if (verification.status !== 'ok') {
            throw new Error('Build verification failed');
        }
        steps.push('✅ Build verification passed');
        res.json({
            success: true,
            steps,
            message: 'Emergency build completed successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Emergency build failed',
            message: error instanceof Error ? error.message : String(error),
            completedSteps: steps
        });
    }
});
export default router;
