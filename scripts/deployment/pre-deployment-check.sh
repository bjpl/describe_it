#!/bin/bash

###############################################################################
# PRE-DEPLOYMENT CHECK SCRIPT
###############################################################################
# Comprehensive checks before staging deployment
# Usage: ./scripts/deployment/pre-deployment-check.sh
###############################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

PASSED=0
FAILED=0
WARNINGS=0

log_success() {
    echo -e "${GREEN}✓${NC} $@"
    ((PASSED++))
}

log_error() {
    echo -e "${RED}✗${NC} $@"
    ((FAILED++))
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $@"
    ((WARNINGS++))
}

print_header() {
    echo ""
    echo "============================================================"
    echo "$@"
    echo "============================================================"
}

check_node_version() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js not installed"
        return 1
    fi

    local version=$(node -v | cut -d'v' -f2)
    local required="20.11.0"

    if printf '%s\n%s\n' "$required" "$version" | sort -V -C; then
        log_success "Node.js $version (>= $required required)"
    else
        log_error "Node.js $version is below required $required"
        return 1
    fi
}

check_npm_version() {
    if ! command -v npm &> /dev/null; then
        log_error "npm not installed"
        return 1
    fi

    local version=$(npm -v)
    log_success "npm $version"
}

check_git_status() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not a git repository"
        return 1
    fi

    if [[ -n $(git status -s) ]]; then
        log_warning "Uncommitted changes detected"
        git status -s | head -5
        return 0
    fi

    log_success "Git working directory clean"
}

check_env_file() {
    if [[ -f "${PROJECT_ROOT}/.env.staging" ]]; then
        log_success ".env.staging file exists"
    else
        log_error ".env.staging not found"
        return 1
    fi
}

check_dependencies() {
    if [[ -d "${PROJECT_ROOT}/node_modules" ]]; then
        log_success "node_modules directory exists"
    else
        log_warning "node_modules not found - will install during deployment"
    fi
}

check_vercel_cli() {
    if command -v vercel &> /dev/null; then
        log_success "Vercel CLI installed"
    else
        log_warning "Vercel CLI not installed (required for deployment)"
    fi
}

check_disk_space() {
    local available=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    log_success "Available disk space: $available"
}

run_type_check() {
    cd "$PROJECT_ROOT"
    if npm run typecheck > /dev/null 2>&1; then
        log_success "TypeScript type checking passed"
    else
        log_error "TypeScript type checking failed"
        return 1
    fi
}

run_linting() {
    cd "$PROJECT_ROOT"
    if npm run lint > /dev/null 2>&1; then
        log_success "Linting passed"
    else
        log_warning "Linting issues detected"
    fi
}

run_tests() {
    cd "$PROJECT_ROOT"
    if npm run test:run > /dev/null 2>&1; then
        log_success "All tests passed"
    else
        log_error "Tests failed"
        return 1
    fi
}

check_security() {
    cd "$PROJECT_ROOT"
    if npm audit --audit-level=high > /dev/null 2>&1; then
        log_success "No high-severity security vulnerabilities"
    else
        log_warning "Security vulnerabilities detected"
        npm audit --audit-level=high | grep "found"
    fi
}

main() {
    print_header "PRE-DEPLOYMENT CHECKS"
    echo "Checking deployment readiness..."
    echo ""

    print_header "ENVIRONMENT CHECKS"
    check_node_version || true
    check_npm_version || true
    check_git_status || true
    check_env_file || true
    check_dependencies || true
    check_vercel_cli || true
    check_disk_space || true

    print_header "CODE QUALITY CHECKS"
    run_type_check || true
    run_linting || true
    run_tests || true
    check_security || true

    print_header "SUMMARY"
    echo ""
    log_success "Checks passed: $PASSED"

    if [[ $WARNINGS -gt 0 ]]; then
        log_warning "Warnings: $WARNINGS"
    fi

    if [[ $FAILED -gt 0 ]]; then
        log_error "Checks failed: $FAILED"
        echo ""
        echo "❌ Pre-deployment checks FAILED"
        exit 1
    fi

    echo ""
    echo "✅ All pre-deployment checks PASSED"
    echo "Ready for deployment!"
}

main "$@"
