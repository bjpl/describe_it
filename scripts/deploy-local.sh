#!/bin/bash

# Local Development Deployment Script
# This script sets up and runs the application locally with production-like settings

set -e  # Exit on any error

echo "🚀 Starting local deployment setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required files exist
check_requirements() {
    echo "🔍 Checking requirements..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Make sure you're in the project root."
        exit 1
    fi
    
    if [ ! -f ".env.local" ]; then
        print_warning ".env.local not found. Creating from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            echo "📝 Please edit .env.local with your actual environment variables."
        else
            print_error ".env.example not found. Cannot create .env.local."
            exit 1
        fi
    fi
    
    print_status "Requirements check completed"
}

# Install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_status "Dependencies installed"
}

# Run health checks
run_health_checks() {
    echo "🏥 Running health checks..."
    
    # Check Node.js version
    node_version=$(node --version)
    echo "Node.js version: $node_version"
    
    # Check npm version
    npm_version=$(npm --version)
    echo "npm version: $npm_version"
    
    # Run type checking
    echo "🔍 Running TypeScript type checking..."
    npm run typecheck
    
    # Run linting
    echo "🧹 Running ESLint..."
    npm run lint
    
    # Run tests
    echo "🧪 Running tests..."
    npm run test -- --run
    
    print_status "Health checks completed"
}

# Build the application
build_application() {
    echo "🏗️  Building application..."
    
    # Clean previous builds
    if [ -d ".next" ]; then
        rm -rf .next
        echo "🧹 Cleaned previous build"
    fi
    
    # Build for production
    npm run build
    
    print_status "Application built successfully"
}

# Start the application
start_application() {
    echo "🚀 Starting application..."
    
    # Check if port 3000 is already in use
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port 3000 is already in use. Attempting to kill existing process..."
        kill $(lsof -t -i:3000) || true
        sleep 2
    fi
    
    echo "🌐 Application will be available at: http://localhost:3000"
    echo "📊 Health check endpoint: http://localhost:3000/api/health"
    echo ""
    echo "Press Ctrl+C to stop the application"
    echo ""
    
    # Start the production server
    npm start
}

# Docker deployment option
deploy_docker() {
    echo "🐳 Setting up Docker deployment..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Build Docker image
    echo "🏗️  Building Docker image..."
    docker build -t describe-it:latest .
    
    # Stop existing container if running
    if docker ps -q -f name=describe-it-container | grep -q .; then
        print_warning "Stopping existing container..."
        docker stop describe-it-container
        docker rm describe-it-container
    fi
    
    # Run Docker container
    echo "🚀 Starting Docker container..."
    docker run -d \
        --name describe-it-container \
        -p 3000:3000 \
        --env-file .env.local \
        describe-it:latest
    
    # Wait for container to be ready
    echo "⏳ Waiting for container to be ready..."
    sleep 10
    
    # Check health
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        print_status "Docker container is running and healthy!"
        echo "🌐 Application: http://localhost:3000"
        echo "📊 Health check: http://localhost:3000/api/health"
        echo "🐳 Container logs: docker logs describe-it-container"
        echo "🛑 Stop container: docker stop describe-it-container"
    else
        print_error "Container is not responding to health checks"
        echo "📋 Container logs:"
        docker logs describe-it-container
        exit 1
    fi
}

# Main script logic
main() {
    echo "🎯 Describe It - Local Deployment Script"
    echo "========================================"
    echo ""
    
    # Parse command line arguments
    DOCKER_MODE=false
    SKIP_TESTS=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --docker)
                DOCKER_MODE=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --docker      Deploy using Docker"
                echo "  --skip-tests  Skip running tests during deployment"
                echo "  -h, --help    Show this help message"
                echo ""
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Run deployment steps
    check_requirements
    install_dependencies
    
    if [ "$SKIP_TESTS" = false ]; then
        run_health_checks
    else
        print_warning "Skipping tests as requested"
    fi
    
    if [ "$DOCKER_MODE" = true ]; then
        deploy_docker
    else
        build_application
        start_application
    fi
}

# Run main function
main "$@"