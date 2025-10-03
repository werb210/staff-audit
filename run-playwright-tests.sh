#!/bin/bash

# Playwright Test Runner Script
# This script installs Playwright browsers and runs all tests

echo "🎭 Playwright Testing Suite for Financial Lending Platform"
echo "==========================================================="

# Install Playwright browsers if not already installed
echo "📦 Installing Playwright browsers..."
npx playwright install

# Function to run specific test suites
run_test_suite() {
    local suite=$1
    local file=$2
    echo ""
    echo "🧪 Running $suite tests..."
    echo "----------------------------------------"
    npx playwright test $file --reporter=line
}

# Check if specific test was requested
if [ "$1" != "" ]; then
    case $1 in
        "auth")
            run_test_suite "Authentication" "tests/e2e/01-authentication.spec.ts"
            ;;
        "bf")
            run_test_suite "BF Applications" "tests/e2e/02-bf-applications.spec.ts"
            ;;
        "slf")
            run_test_suite "SLF Silo" "tests/e2e/03-slf-silo.spec.ts"
            ;;
        "security")
            run_test_suite "API Security" "tests/e2e/04-api-security.spec.ts"
            ;;
        "cross-silo")
            run_test_suite "Cross-Silo Protection" "tests/e2e/05-cross-silo-protection.spec.ts"
            ;;
        "docs")
            run_test_suite "Document Workflow" "tests/e2e/06-document-workflow.spec.ts"
            ;;
        "performance")
            run_test_suite "Performance" "tests/e2e/07-performance.spec.ts"
            ;;
        "ui")
            echo "🎭 Running tests with UI mode..."
            npx playwright test --ui
            ;;
        "headed")
            echo "🎭 Running tests in headed mode..."
            npx playwright test --headed
            ;;
        "debug")
            echo "🎭 Running tests in debug mode..."
            npx playwright test --debug
            ;;
        *)
            echo "❌ Unknown test suite: $1"
            echo "Available options: auth, bf, slf, security, cross-silo, docs, performance, ui, headed, debug"
            exit 1
            ;;
    esac
else
    # Run all tests
    echo "🚀 Running full test suite..."
    echo "This will test:"
    echo "  ✅ Authentication flows"
    echo "  ✅ BF silo functionality" 
    echo "  ✅ SLF silo functionality"
    echo "  ✅ API security & auth walls"
    echo "  ✅ Cross-silo protection"
    echo "  ✅ Document workflows"
    echo "  ✅ Performance metrics"
    echo ""
    
    npx playwright test --reporter=html
    
    echo ""
    echo "📊 Test Results:"
    echo "  - HTML Report: playwright-report/index.html"
    echo "  - JSON Results: test-results/test-results.json"
    echo "  - JUnit XML: test-results/results.xml"
fi

echo ""
echo "✅ Playwright testing complete!"
echo "📖 Usage examples:"
echo "  ./run-playwright-tests.sh auth      # Run only authentication tests"
echo "  ./run-playwright-tests.sh bf        # Run only BF silo tests"
echo "  ./run-playwright-tests.sh ui        # Run with UI mode"
echo "  ./run-playwright-tests.sh           # Run all tests"