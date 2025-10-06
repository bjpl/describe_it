#!/bin/bash

# E2E Authentication Tests Runner
# Runs comprehensive E2E tests for all authentication flows

set -e

echo "====================================="
echo "E2E Authentication Tests"
echo "====================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.test exists
if [ ! -f .env.test ]; then
    echo -e "${YELLOW}Warning: .env.test not found${NC}"
    echo "Creating .env.test from example..."
    cp .env.test.example .env.test
    echo -e "${YELLOW}Please edit .env.test with your test credentials${NC}"
    echo ""
fi

# Create screenshots directory
mkdir -p tests/e2e/screenshots
mkdir -p docs/reports

# Load test environment
if [ -f .env.test ]; then
    export $(cat .env.test | grep -v '^#' | xargs)
fi

echo "Starting development server..."
echo ""

# Start dev server in background
npm run dev &
DEV_SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to start..."
sleep 10

# Verify server is running
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${YELLOW}⚠ Health check failed, but continuing...${NC}"
fi

echo ""
echo "Running E2E authentication tests..."
echo "====================================="
echo ""

# Run tests with detailed output
npx playwright test tests/e2e/auth-flows.spec.ts \
    --reporter=list \
    --reporter=html \
    --reporter=json \
    --output=test-results/e2e-auth-results.json \
    || TEST_EXIT_CODE=$?

echo ""
echo "====================================="
echo "Test run completed"
echo "====================================="
echo ""

# Kill dev server
echo "Stopping development server..."
kill $DEV_SERVER_PID 2>/dev/null || true

# Generate report
if [ -f test-results/e2e-auth-results.json ]; then
    echo -e "${GREEN}✓ Test results saved to test-results/e2e-auth-results.json${NC}"
fi

# Check screenshots
SCREENSHOT_COUNT=$(find tests/e2e/screenshots -name "*.png" 2>/dev/null | wc -l)
if [ $SCREENSHOT_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓ $SCREENSHOT_COUNT screenshots captured${NC}"
fi

# Open HTML report
if [ -f playwright-report/index.html ]; then
    echo ""
    echo "Opening test report..."
    npx playwright show-report
fi

# Exit with test exit code
exit ${TEST_EXIT_CODE:-0}
