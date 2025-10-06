@echo off
REM E2E Authentication Tests Runner (Windows)
REM Runs comprehensive E2E tests for all authentication flows

echo =====================================
echo E2E Authentication Tests
echo =====================================
echo.

REM Check if .env.test exists
if not exist .env.test (
    echo Warning: .env.test not found
    echo Creating .env.test from example...
    copy .env.test.example .env.test
    echo Please edit .env.test with your test credentials
    echo.
)

REM Create directories
if not exist tests\e2e\screenshots mkdir tests\e2e\screenshots
if not exist docs\reports mkdir docs\reports

echo Starting development server...
echo.

REM Start dev server in background
start /B npm run dev

REM Wait for server to start
echo Waiting for server to start...
timeout /t 10 /nobreak > nul

REM Check if server is running
curl -f http://localhost:3000/api/health > nul 2>&1
if %errorlevel% equ 0 (
    echo [92m✓ Server is running[0m
) else (
    echo [93m⚠ Health check failed, but continuing...[0m
)

echo.
echo Running E2E authentication tests...
echo =====================================
echo.

REM Run tests
npx playwright test tests/e2e/auth-flows.spec.ts --reporter=list --reporter=html --reporter=json --output=test-results/e2e-auth-results.json

set TEST_EXIT_CODE=%errorlevel%

echo.
echo =====================================
echo Test run completed
echo =====================================
echo.

REM Kill dev server
taskkill /F /IM node.exe /FI "WINDOWTITLE eq npm*" > nul 2>&1

REM Check results
if exist test-results\e2e-auth-results.json (
    echo [92m✓ Test results saved[0m
)

REM Count screenshots
for /f %%A in ('dir /b tests\e2e\screenshots\*.png 2^>nul ^| find /c /v ""') do set SCREENSHOT_COUNT=%%A
if %SCREENSHOT_COUNT% gtr 0 (
    echo [92m✓ %SCREENSHOT_COUNT% screenshots captured[0m
)

REM Open report
if exist playwright-report\index.html (
    echo.
    echo Opening test report...
    start playwright-report\index.html
)

exit /b %TEST_EXIT_CODE%
