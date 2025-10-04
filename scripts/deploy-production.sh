#!/bin/bash

# Production Deployment Script for Vercel
# This script handles production deployments with proper checks and rollback capabilities

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-}"
VERCEL_ORG_ID="${VERCEL_ORG_ID:-}"
VERCEL_TOKEN="${VERCEL_TOKEN:-}"
PRODUCTION_URL="https://describe-it-lovat.vercel.app"
BACKUP_DIR="./deployment-backups"
LOG_FILE="./logs/deployment-$(date +%Y%m%d-%H%M%S).log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

# Success message
success() {
    log "${GREEN}SUCCESS: $1${NC}"
}

# Warning message
warning() {
    log "${YELLOW}WARNING: $1${NC}"
}

# Info message
info() {
    log "${BLUE}INFO: $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        warning "Vercel CLI not found. Installing..."
        npm install -g vercel@latest || error_exit "Failed to install Vercel CLI"
    fi
    
    # Check if required environment variables are set
    if [[ -z "$VERCEL_TOKEN" ]]; then
        error_exit "VERCEL_TOKEN environment variable is required"
    fi
    
    if [[ -z "$VERCEL_PROJECT_ID" ]]; then
        error_exit "VERCEL_PROJECT_ID environment variable is required"
    fi
    
    if [[ -z "$VERCEL_ORG_ID" ]]; then
        error_exit "VERCEL_ORG_ID environment variable is required"
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_NODE_VERSION="20.11.0"
    if [[ "$(printf '%s\n' "$REQUIRED_NODE_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_NODE_VERSION" ]]; then
        error_exit "Node.js version $REQUIRED_NODE_VERSION or higher is required. Current: $NODE_VERSION"
    fi
    
    success "Prerequisites check passed"
}

# Backup current deployment
backup_deployment() {
    info "Creating deployment backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Get current deployment info
    CURRENT_DEPLOYMENT=$(vercel ls --token="$VERCEL_TOKEN" | grep "$PRODUCTION_URL" | head -n1 | awk '{print $1}') || true
    
    if [[ -n "$CURRENT_DEPLOYMENT" ]]; then
        echo "$CURRENT_DEPLOYMENT" > "$BACKUP_DIR/previous-deployment-$(date +%Y%m%d-%H%M%S).txt"
        success "Backup created: $CURRENT_DEPLOYMENT"
    else
        warning "No current deployment found to backup"
    fi
}

# Run pre-deployment checks
pre_deployment_checks() {
    info "Running pre-deployment checks..."
    
    # Install dependencies
    info "Installing dependencies..."
    npm ci --prefer-offline --no-audit || error_exit "Failed to install dependencies"
    
    # Type checking
    info "Running type checking..."
    npm run typecheck || error_exit "Type checking failed"
    
    # Linting
    info "Running linting..."
    npm run lint || error_exit "Linting failed"
    
    # Security audit
    info "Running security audit..."
    npm audit --audit-level=moderate || warning "Security audit found issues"
    
    # Run tests
    info "Running test suite..."
    npm run test:run || error_exit "Tests failed"
    
    # Environment validation
    info "Validating environment variables..."
    npm run validate:env:prod || error_exit "Environment validation failed"
    
    success "Pre-deployment checks passed"
}

# Build application
build_application() {
    info "Building application for production..."
    
    # Set production environment
    export NODE_ENV=production
    export NODE_OPTIONS="--max-old-space-size=4096"
    export NEXT_TELEMETRY_DISABLED=1
    
    # Build with Vercel
    vercel build --prod --token="$VERCEL_TOKEN" || error_exit "Build failed"
    
    success "Application built successfully"
}

# Deploy to production
deploy_to_production() {
    info "Deploying to production..."
    
    # Deploy with Vercel
    DEPLOYMENT_URL=$(vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN") || error_exit "Deployment failed"
    
    info "Deployment URL: $DEPLOYMENT_URL"
    echo "$DEPLOYMENT_URL" > "$BACKUP_DIR/latest-deployment-$(date +%Y%m%d-%H%M%S).txt"
    
    success "Deployed to production: $DEPLOYMENT_URL"
}

# Wait for deployment to be ready
wait_for_deployment() {
    info "Waiting for deployment to be ready..."
    
    # Wait for the deployment to be accessible
    TIMEOUT=300 # 5 minutes
    COUNTER=0
    
    while [ $COUNTER -lt $TIMEOUT ]; do
        if curl -s -f "$PRODUCTION_URL" > /dev/null; then
            success "Deployment is ready and responding"
            return 0
        fi
        
        sleep 10
        COUNTER=$((COUNTER + 10))
        info "Waiting... ($COUNTER/$TIMEOUT seconds)"
    done
    
    error_exit "Deployment did not become ready within $TIMEOUT seconds"
}

# Post-deployment validation
post_deployment_validation() {
    info "Running post-deployment validation..."
    
    # Health check
    info "Running health check..."
    HEALTH_RESPONSE=$(curl -s -f "$PRODUCTION_URL/api/health" || echo "FAILED")
    if [[ "$HEALTH_RESPONSE" == *"status"*"ok"* ]]; then
        success "Health check passed"
    else
        error_exit "Health check failed: $HEALTH_RESPONSE"
    fi
    
    # Smoke tests
    info "Running smoke tests..."
    TEST_URL="$PRODUCTION_URL" npm run test:smoke || warning "Smoke tests failed"
    
    # Performance check
    info "Running performance check..."
    npm run test:vitals || warning "Performance check failed"
    
    success "Post-deployment validation completed"
}

# Generate deployment report
generate_report() {
    info "Generating deployment report..."
    
    REPORT_FILE="$BACKUP_DIR/deployment-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "deployment_url": "$PRODUCTION_URL",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "node_version": "$(node --version)",
  "npm_version": "$(npm --version)",
  "deployment_duration": "$(($(date +%s) - $START_TIME)) seconds",
  "log_file": "$LOG_FILE",
  "status": "success"
}
EOF
    
    success "Deployment report generated: $REPORT_FILE"
}

# Cleanup function
cleanup() {
    info "Cleaning up temporary files..."
    
    # Remove old logs (keep last 10)
    find ./logs -name "deployment-*.log" -type f | sort | head -n -10 | xargs rm -f 2>/dev/null || true
    
    # Remove old backups (keep last 20)
    find "$BACKUP_DIR" -name "*.txt" -type f | sort | head -n -20 | xargs rm -f 2>/dev/null || true
    
    success "Cleanup completed"
}

# Main deployment function
main() {
    START_TIME=$(date +%s)
    
    info "Starting production deployment..."
    info "Deployment ID: deploy-$(date +%Y%m%d-%H%M%S)"
    
    # Trap to ensure cleanup on exit
    trap cleanup EXIT
    
    # Run deployment steps
    check_prerequisites
    backup_deployment
    pre_deployment_checks
    build_application
    deploy_to_production
    wait_for_deployment
    post_deployment_validation
    generate_report
    
    DEPLOYMENT_TIME=$(($(date +%s) - $START_TIME))
    success "Production deployment completed successfully in $DEPLOYMENT_TIME seconds!"
    success "🚀 Live at: $PRODUCTION_URL"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "check")
        check_prerequisites
        ;;
    "validate")
        post_deployment_validation
        ;;
    "backup")
        backup_deployment
        ;;
    *)
        echo "Usage: $0 [deploy|check|validate|backup]"
        echo "  deploy   - Full production deployment (default)"
        echo "  check    - Check prerequisites only"
        echo "  validate - Run post-deployment validation only"
        echo "  backup   - Create deployment backup only"
        exit 1
        ;;
esac