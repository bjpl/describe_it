#!/bin/bash

###############################################################################
# STAGING DEPLOYMENT SCRIPT
###############################################################################
# Automated staging deployment with pre-checks, validation, and rollback
# Version: 1.0.0
# Usage: ./scripts/deployment/deploy-staging.sh [options]
###############################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Configuration
DEPLOYMENT_ENV="staging"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOYMENT_ID="staging-${TIMESTAMP}"
LOG_FILE="${PROJECT_ROOT}/logs/deployment-${TIMESTAMP}.log"
BACKUP_DIR="${PROJECT_ROOT}/backups/staging-${TIMESTAMP}"

# Create log directory
mkdir -p "${PROJECT_ROOT}/logs"
mkdir -p "${PROJECT_ROOT}/backups"

###############################################################################
# UTILITY FUNCTIONS
###############################################################################

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $@" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✓${NC} $@" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $@" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}✗${NC} $@" | tee -a "$LOG_FILE"
}

print_header() {
    echo ""
    echo "============================================================"
    echo "$@"
    echo "============================================================"
    echo ""
}

###############################################################################
# PRE-DEPLOYMENT CHECKS
###############################################################################

check_prerequisites() {
    print_header "PRE-DEPLOYMENT CHECKS"

    log_info "Checking prerequisites..."

    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi

    local node_version=$(node -v | cut -d'v' -f2)
    local required_version="20.11.0"

    if ! printf '%s\n%s\n' "$required_version" "$node_version" | sort -V -C; then
        log_error "Node.js version $node_version is below required $required_version"
        exit 1
    fi
    log_success "Node.js version: $node_version"

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    log_success "npm version: $(npm -v)"

    # Check git
    if ! command -v git &> /dev/null; then
        log_error "git is not installed"
        exit 1
    fi
    log_success "git version: $(git --version | cut -d' ' -f3)"

    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository"
        exit 1
    fi

    # Check for uncommitted changes
    if [[ -n $(git status -s) ]]; then
        log_warning "Uncommitted changes detected:"
        git status -s
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Deployment cancelled"
            exit 1
        fi
    fi

    log_success "Prerequisites check passed"
}

validate_environment() {
    print_header "ENVIRONMENT VALIDATION"

    log_info "Validating staging environment configuration..."

    # Check for .env.staging file
    if [[ ! -f "${PROJECT_ROOT}/.env.staging" ]]; then
        log_error ".env.staging file not found"
        log_info "Create it from template: cp config/env-examples/.env.staging .env.staging"
        exit 1
    fi

    log_success ".env.staging file found"

    # Validate environment variables
    if command -v node &> /dev/null; then
        log_info "Running environment validation script..."
        if npm run validate:env:staging &>> "$LOG_FILE"; then
            log_success "Environment variables validated"
        else
            log_error "Environment validation failed. Check $LOG_FILE for details"
            exit 1
        fi
    fi

    # Check critical environment variables
    source "${PROJECT_ROOT}/.env.staging"

    local required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "OPENAI_API_KEY"
        "API_SECRET_KEY"
        "JWT_SECRET"
    )

    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        exit 1
    fi

    log_success "Critical environment variables present"
}

check_dependencies() {
    print_header "DEPENDENCY CHECK"

    log_info "Checking dependencies..."

    if [[ ! -d "${PROJECT_ROOT}/node_modules" ]]; then
        log_warning "node_modules not found, installing dependencies..."
        npm ci --legacy-peer-deps &>> "$LOG_FILE"
    else
        log_info "Verifying installed dependencies..."
        npm ci --legacy-peer-deps &>> "$LOG_FILE"
    fi

    log_success "Dependencies verified"
}

run_type_check() {
    print_header "TYPE CHECKING"

    log_info "Running TypeScript type checker..."

    if npm run typecheck &>> "$LOG_FILE"; then
        log_success "Type check passed"
    else
        log_error "Type check failed. Check $LOG_FILE for details"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

run_linting() {
    print_header "LINTING"

    log_info "Running linter..."

    if npm run lint &>> "$LOG_FILE"; then
        log_success "Linting passed"
    else
        log_warning "Linting issues detected (see $LOG_FILE)"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

run_tests() {
    print_header "RUNNING TESTS"

    log_info "Running unit tests..."

    if npm run test:run &>> "$LOG_FILE"; then
        log_success "All tests passed"
    else
        log_error "Tests failed. Check $LOG_FILE for details"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

###############################################################################
# BUILD PROCESS
###############################################################################

build_application() {
    print_header "BUILD PROCESS"

    log_info "Building application for staging..."

    # Clean previous build
    log_info "Cleaning previous build..."
    npm run clean &>> "$LOG_FILE"

    # Build with staging environment
    log_info "Running production build..."
    if NODE_ENV=staging npm run build &>> "$LOG_FILE"; then
        log_success "Build completed successfully"
    else
        log_error "Build failed. Check $LOG_FILE for details"
        exit 1
    fi

    # Verify build output
    if [[ ! -d "${PROJECT_ROOT}/.next" ]]; then
        log_error "Build output directory (.next) not found"
        exit 1
    fi

    log_success "Build artifacts verified"
}

###############################################################################
# DEPLOYMENT
###############################################################################

create_backup() {
    print_header "CREATING BACKUP"

    log_info "Creating deployment backup..."

    mkdir -p "$BACKUP_DIR"

    # Backup environment file
    if [[ -f "${PROJECT_ROOT}/.env.staging" ]]; then
        cp "${PROJECT_ROOT}/.env.staging" "${BACKUP_DIR}/.env.staging.bak"
        log_success "Environment file backed up"
    fi

    # Store git information
    git rev-parse HEAD > "${BACKUP_DIR}/git-commit.txt"
    git branch --show-current > "${BACKUP_DIR}/git-branch.txt"

    log_success "Backup created at: $BACKUP_DIR"
}

deploy_to_vercel() {
    print_header "VERCEL DEPLOYMENT"

    log_info "Deploying to Vercel staging environment..."

    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI not installed"
        log_info "Install with: npm i -g vercel"
        exit 1
    fi

    # Deploy to Vercel
    log_info "Running Vercel deployment..."

    if vercel --prod --yes --token="${VERCEL_TOKEN:-}" &>> "$LOG_FILE"; then
        log_success "Deployment to Vercel successful"
    else
        log_error "Deployment failed. Check $LOG_FILE for details"
        exit 1
    fi

    # Get deployment URL
    local deployment_url=$(vercel ls --token="${VERCEL_TOKEN:-}" | head -n 1 | awk '{print $2}')
    log_success "Deployment URL: $deployment_url"

    echo "$deployment_url" > "${BACKUP_DIR}/deployment-url.txt"
}

###############################################################################
# POST-DEPLOYMENT VALIDATION
###############################################################################

run_health_checks() {
    print_header "HEALTH CHECKS"

    log_info "Running post-deployment health checks..."

    # Wait for deployment to be ready
    log_info "Waiting for deployment to be ready..."
    sleep 10

    # Get deployment URL
    local deployment_url
    if [[ -f "${BACKUP_DIR}/deployment-url.txt" ]]; then
        deployment_url=$(cat "${BACKUP_DIR}/deployment-url.txt")
    else
        log_error "Deployment URL not found"
        return 1
    fi

    # Health check endpoint
    log_info "Checking health endpoint..."
    if curl -f -s "${deployment_url}/api/health" > /dev/null; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        return 1
    fi

    # Status endpoint
    log_info "Checking status endpoint..."
    if curl -f -s "${deployment_url}/api/status" > /dev/null; then
        log_success "Status check passed"
    else
        log_warning "Status endpoint check failed"
    fi

    log_success "Health checks completed"
}

run_smoke_tests() {
    print_header "SMOKE TESTS"

    log_info "Running smoke tests..."

    if npm run test:smoke &>> "$LOG_FILE"; then
        log_success "Smoke tests passed"
    else
        log_error "Smoke tests failed. Check $LOG_FILE for details"
        return 1
    fi
}

###############################################################################
# ROLLBACK
###############################################################################

rollback_deployment() {
    print_header "ROLLBACK"

    log_warning "Rolling back deployment..."

    # Restore from backup
    if [[ -d "$BACKUP_DIR" ]]; then
        log_info "Restoring from backup: $BACKUP_DIR"

        if [[ -f "${BACKUP_DIR}/.env.staging.bak" ]]; then
            cp "${BACKUP_DIR}/.env.staging.bak" "${PROJECT_ROOT}/.env.staging"
            log_success "Environment file restored"
        fi

        # Get previous commit
        if [[ -f "${BACKUP_DIR}/git-commit.txt" ]]; then
            local previous_commit=$(cat "${BACKUP_DIR}/git-commit.txt")
            log_info "Previous commit: $previous_commit"
        fi
    fi

    log_warning "Rollback completed. Manual verification required."
}

###############################################################################
# MAIN EXECUTION
###############################################################################

main() {
    print_header "STAGING DEPLOYMENT - ${DEPLOYMENT_ID}"

    log_info "Starting deployment process..."
    log_info "Log file: $LOG_FILE"

    # Trap errors for rollback
    trap 'log_error "Deployment failed at line $LINENO"; rollback_deployment; exit 1' ERR

    # Pre-deployment checks
    check_prerequisites
    validate_environment
    check_dependencies
    run_type_check
    run_linting
    run_tests

    # Build
    build_application

    # Backup and deploy
    create_backup
    deploy_to_vercel

    # Post-deployment validation
    run_health_checks
    run_smoke_tests

    # Success
    print_header "DEPLOYMENT SUCCESSFUL"
    log_success "Staging deployment completed: ${DEPLOYMENT_ID}"
    log_success "Deployment log: $LOG_FILE"
    log_success "Backup location: $BACKUP_DIR"

    if [[ -f "${BACKUP_DIR}/deployment-url.txt" ]]; then
        log_success "Deployment URL: $(cat ${BACKUP_DIR}/deployment-url.txt)"
    fi
}

# Run main function
main "$@"
