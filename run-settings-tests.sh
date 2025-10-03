#!/bin/bash
# Settings Test Suite Runner
echo "🧪 Running Settings API Tests..."
BASE_URL=http://localhost:5000 npx playwright test tests/ui/settings.api.spec.ts

echo ""
echo "🧪 Running Settings Smoke Tests (requires manual 2FA handling)..."
echo "Note: Smoke tests will pause at SMS verification - enter real verification code when prompted"
BASE_URL=http://localhost:5000 TEST_EMAIL=todd.w@boreal.financial TEST_PASSWORD=password123 npx playwright test tests/ui/settings.smoke.spec.ts --headed

