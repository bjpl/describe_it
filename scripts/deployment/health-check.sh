#!/bin/bash

###############################################################################
# HEALTH CHECK SCRIPT
###############################################################################
# Comprehensive health checking for staging/production deployments
# Usage: ./scripts/deployment/health-check.sh <url> [options]
###############################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
DEPLOYMENT_URL="${1:-http://localhost:3000}"
TIMEOUT=10
MAX_RETRIES=5
RETRY_DELAY=5

###############################################################################
# UTILITY FUNCTIONS
###############################################################################

log_success() {
    echo -e "${GREEN}✓${NC} $@"
}

log_error() {
    echo -e "${RED}✗${NC} $@"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $@"
}

log_info() {
    echo -e "${NC}ℹ${NC} $@"
}

###############################################################################
# HEALTH CHECK FUNCTIONS
###############################################################################

check_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local description=$3

    log_info "Checking: $description"
    log_info "Endpoint: ${DEPLOYMENT_URL}${endpoint}"

    local response
    local status_code

    for i in $(seq 1 $MAX_RETRIES); do
        if response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "${DEPLOYMENT_URL}${endpoint}" 2>&1); then
            status_code=$(echo "$response" | tail -n1)

            if [[ "$status_code" == "$expected_status" ]]; then
                log_success "$description (HTTP $status_code)"
                return 0
            fi
        fi

        if [[ $i -lt $MAX_RETRIES ]]; then
            log_warning "Attempt $i failed, retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi
    done

    log_error "$description failed (HTTP ${status_code:-000})"
    return 1
}

check_health_endpoint() {
    log_info "=== Health Endpoint Check ==="

    if response=$(curl -s --max-time $TIMEOUT "${DEPLOYMENT_URL}/api/health"); then
        # Parse JSON response
        if echo "$response" | grep -q '"status":"ok"'; then
            log_success "Health endpoint is healthy"

            # Extract additional info
            if command -v jq &> /dev/null; then
                echo "$response" | jq '.'
            else
                echo "$response"
            fi
            return 0
        fi
    fi

    log_error "Health endpoint check failed"
    return 1
}

check_status_endpoint() {
    log_info "=== Status Endpoint Check ==="

    if response=$(curl -s --max-time $TIMEOUT "${DEPLOYMENT_URL}/api/status"); then
        if echo "$response" | grep -q '"environment"'; then
            log_success "Status endpoint is responsive"

            if command -v jq &> /dev/null; then
                echo "$response" | jq '.'
            else
                echo "$response"
            fi
            return 0
        fi
    fi

    log_error "Status endpoint check failed"
    return 1
}

check_api_endpoints() {
    log_info "=== API Endpoint Checks ==="

    local endpoints=(
        "/api/health:200:Health API"
        "/api/status:200:Status API"
    )

    local failed=0

    for endpoint_config in "${endpoints[@]}"; do
        IFS=':' read -r endpoint expected_status description <<< "$endpoint_config"

        if ! check_endpoint "$endpoint" "$expected_status" "$description"; then
            ((failed++))
        fi
    done

    if [[ $failed -eq 0 ]]; then
        log_success "All API endpoints are healthy"
        return 0
    else
        log_error "$failed API endpoint(s) failed"
        return 1
    fi
}

check_static_assets() {
    log_info "=== Static Asset Check ==="

    if check_endpoint "/" 200 "Homepage"; then
        log_success "Static assets are accessible"
        return 0
    else
        log_error "Static assets check failed"
        return 1
    fi
}

check_performance() {
    log_info "=== Performance Check ==="

    local start_time=$(date +%s%N)
    local response=$(curl -s -w "\n%{time_total}" --max-time $TIMEOUT "${DEPLOYMENT_URL}/api/health" 2>&1)
    local end_time=$(date +%s%N)

    local response_time=$(echo "$response" | tail -n1)
    local threshold=2.0

    log_info "Response time: ${response_time}s"

    if (( $(echo "$response_time < $threshold" | bc -l) )); then
        log_success "Performance is acceptable"
        return 0
    else
        log_warning "Response time exceeds threshold (${threshold}s)"
        return 1
    fi
}

check_ssl_certificate() {
    log_info "=== SSL Certificate Check ==="

    if [[ "$DEPLOYMENT_URL" =~ ^https:// ]]; then
        local domain=$(echo "$DEPLOYMENT_URL" | sed -e 's|^https://||' -e 's|/.*||')

        if openssl s_client -connect "${domain}:443" -servername "$domain" </dev/null 2>&1 | grep -q "Verify return code: 0"; then
            log_success "SSL certificate is valid"

            # Get certificate expiry
            local expiry=$(echo | openssl s_client -connect "${domain}:443" -servername "$domain" 2>&1 | openssl x509 -noout -enddate 2>&1 | cut -d= -f2)
            log_info "Certificate expires: $expiry"

            return 0
        else
            log_error "SSL certificate validation failed"
            return 1
        fi
    else
        log_info "Skipping SSL check (HTTP endpoint)"
        return 0
    fi
}

check_security_headers() {
    log_info "=== Security Headers Check ==="

    local headers=$(curl -s -I --max-time $TIMEOUT "${DEPLOYMENT_URL}/" 2>&1)

    local required_headers=(
        "X-Frame-Options"
        "X-Content-Type-Options"
        "X-XSS-Protection"
    )

    local missing_headers=()

    for header in "${required_headers[@]}"; do
        if ! echo "$headers" | grep -qi "$header:"; then
            missing_headers+=("$header")
        fi
    done

    if [[ ${#missing_headers[@]} -eq 0 ]]; then
        log_success "All security headers present"
        return 0
    else
        log_warning "Missing security headers: ${missing_headers[*]}"
        return 1
    fi
}

run_comprehensive_check() {
    log_info "==========================================="
    log_info "COMPREHENSIVE HEALTH CHECK"
    log_info "URL: $DEPLOYMENT_URL"
    log_info "==========================================="
    echo ""

    local total_checks=0
    local passed_checks=0
    local failed_checks=0

    # Run all checks
    local checks=(
        "check_health_endpoint"
        "check_status_endpoint"
        "check_api_endpoints"
        "check_static_assets"
        "check_performance"
        "check_ssl_certificate"
        "check_security_headers"
    )

    for check in "${checks[@]}"; do
        ((total_checks++))
        echo ""

        if $check; then
            ((passed_checks++))
        else
            ((failed_checks++))
        fi
    done

    # Summary
    echo ""
    log_info "==========================================="
    log_info "HEALTH CHECK SUMMARY"
    log_info "==========================================="
    log_info "Total checks: $total_checks"
    log_success "Passed: $passed_checks"

    if [[ $failed_checks -gt 0 ]]; then
        log_error "Failed: $failed_checks"
        echo ""
        log_error "Health check FAILED"
        return 1
    else
        echo ""
        log_success "All health checks PASSED"
        return 0
    fi
}

###############################################################################
# MAIN EXECUTION
###############################################################################

main() {
    if [[ -z "${1:-}" ]]; then
        echo "Usage: $0 <deployment-url>"
        echo "Example: $0 https://staging.describe-it.yourdomain.com"
        exit 1
    fi

    run_comprehensive_check
}

main "$@"
