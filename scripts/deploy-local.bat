@echo off
REM Local Development Deployment Script for Windows
REM This script sets up and runs the application locally with production-like settings

setlocal enabledelayedexpansion

echo 🚀 Starting local deployment setup...

REM Function to print status messages
call :print_status "Starting deployment process"

REM Check if required files exist
call :check_requirements
if errorlevel 1 goto :error

REM Install dependencies
call :install_dependencies
if errorlevel 1 goto :error

REM Parse command line arguments
set DOCKER_MODE=false
set SKIP_TESTS=false

:parse_args
if "%~1"=="--docker" (
    set DOCKER_MODE=true
    shift
    goto :parse_args
)
if "%~1"=="--skip-tests" (
    set SKIP_TESTS=true
    shift
    goto :parse_args
)
if "%~1"=="--help" (
    goto :show_help
)
if "%~1"=="/?" (
    goto :show_help
)
if "%~1" neq "" (
    echo ❌ Unknown option: %~1
    echo Use --help for usage information
    exit /b 1
)

REM Run health checks
if "%SKIP_TESTS%"=="false" (
    call :run_health_checks
    if errorlevel 1 goto :error
) else (
    echo ⚠️  Skipping tests as requested
)

REM Deploy based on mode
if "%DOCKER_MODE%"=="true" (
    call :deploy_docker
    if errorlevel 1 goto :error
) else (
    call :build_application
    if errorlevel 1 goto :error
    call :start_application
)

goto :end

:check_requirements
echo 🔍 Checking requirements...

if not exist "package.json" (
    echo ❌ package.json not found. Make sure you're in the project root.
    exit /b 1
)

if not exist ".env.local" (
    echo ⚠️  .env.local not found. Creating from .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env.local" >nul
        echo 📝 Please edit .env.local with your actual environment variables.
    ) else (
        echo ❌ .env.example not found. Cannot create .env.local.
        exit /b 1
    )
)

echo ✅ Requirements check completed
exit /b 0

:install_dependencies
echo 📦 Installing dependencies...

if exist "package-lock.json" (
    npm ci
) else (
    npm install
)

if errorlevel 1 (
    echo ❌ Failed to install dependencies
    exit /b 1
)

echo ✅ Dependencies installed
exit /b 0

:run_health_checks
echo 🏥 Running health checks...

echo Node.js version:
node --version

echo npm version:
npm --version

echo 🔍 Running TypeScript type checking...
npm run typecheck
if errorlevel 1 (
    echo ❌ TypeScript type checking failed
    exit /b 1
)

echo 🧹 Running ESLint...
npm run lint
if errorlevel 1 (
    echo ❌ ESLint failed
    exit /b 1
)

echo 🧪 Running tests...
npm run test -- --run
if errorlevel 1 (
    echo ❌ Tests failed
    exit /b 1
)

echo ✅ Health checks completed
exit /b 0

:build_application
echo 🏗️  Building application...

if exist ".next" (
    rmdir /s /q ".next"
    echo 🧹 Cleaned previous build
)

npm run build
if errorlevel 1 (
    echo ❌ Build failed
    exit /b 1
)

echo ✅ Application built successfully
exit /b 0

:start_application
echo 🚀 Starting application...

REM Check if port 3000 is already in use
netstat -ano | findstr :3000 >nul
if not errorlevel 1 (
    echo ⚠️  Port 3000 is already in use. Please stop any running applications on port 3000.
    echo You can check what's running with: netstat -ano | findstr :3000
)

echo 🌐 Application will be available at: http://localhost:3000
echo 📊 Health check endpoint: http://localhost:3000/api/health
echo.
echo Press Ctrl+C to stop the application
echo.

npm start
exit /b 0

:deploy_docker
echo 🐳 Setting up Docker deployment...

docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker first.
    exit /b 1
)

echo 🏗️  Building Docker image...
docker build -t describe-it:latest .
if errorlevel 1 (
    echo ❌ Docker build failed
    exit /b 1
)

REM Stop existing container if running
docker ps -q -f name=describe-it-container >nul 2>&1
if not errorlevel 1 (
    echo ⚠️  Stopping existing container...
    docker stop describe-it-container >nul
    docker rm describe-it-container >nul
)

echo 🚀 Starting Docker container...
docker run -d --name describe-it-container -p 3000:3000 --env-file .env.local describe-it:latest
if errorlevel 1 (
    echo ❌ Failed to start Docker container
    exit /b 1
)

echo ⏳ Waiting for container to be ready...
timeout /t 10 /nobreak >nul

REM Check health (simplified for Windows)
echo ✅ Docker container is running!
echo 🌐 Application: http://localhost:3000
echo 📊 Health check: http://localhost:3000/api/health
echo 🐳 Container logs: docker logs describe-it-container
echo 🛑 Stop container: docker stop describe-it-container

exit /b 0

:show_help
echo Usage: %0 [OPTIONS]
echo.
echo Options:
echo   --docker      Deploy using Docker
echo   --skip-tests  Skip running tests during deployment
echo   --help        Show this help message
echo.
exit /b 0

:print_status
echo ✅ %~1
exit /b 0

:error
echo ❌ Deployment failed!
exit /b 1

:end
echo ✅ Deployment completed successfully!
endlocal