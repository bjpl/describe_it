#!/bin/bash

# Deployment Validation Script
# Comprehensive validation suite for production deployments

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_URL="${PRODUCTION_URL:-https://describe-it-lovat.vercel.app}"
STAGING_URL="${STAGING_URL:-https://staging-describe-it.vercel.app}"
LOG_FILE="./logs/validation-$(date +%Y%m%d-%H%M%S).log"
RESULTS_FILE="./logs/validation-results-$(date +%Y%m%d-%H%M%S).json"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Test results storage
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
declare -a FAILED_TEST_NAMES

# Logging function
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Test result functions
test_start() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    log "${BLUE}🧪 TEST: $1${NC}"
}

test_pass() {
    PASSED_TESTS=$((PASSED_TESTS + 1))
    log "${GREEN}✅ PASS: $1${NC}"
}

test_fail() {
    FAILED_TESTS=$((FAILED_TESTS + 1))
    FAILED_TEST_NAMES+=("$1")
    log "${RED}❌ FAIL: $1${NC}"
}

test_warn() {
    log "${YELLOW}⚠️  WARN: $1${NC}"
}

info() {
    log "${PURPLE}ℹ️  INFO: $1${NC}"
}

# Health check validation
validate_health_endpoints() {
    test_start "Health Endpoints"
    
    local health_passed=true
    
    # Main health endpoint
    if curl -s -f "$PRODUCTION_URL/api/health" | grep -q "ok"; then
        test_pass "Main health endpoint responding"
    else
        test_fail "Main health endpoint failed"
        health_passed=false
    fi
    
    # Alternative health endpoint
    if curl -s -f "$PRODUCTION_URL/healthz" | grep -q "ok"; then
        test_pass "Alternative health endpoint responding"
    else
        test_fail "Alternative health endpoint failed"
        health_passed=false
    fi
    
    # Check response time
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' "$PRODUCTION_URL/api/health")
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        test_pass "Health endpoint response time acceptable ($response_time seconds)"
    else
        test_fail "Health endpoint response time too slow ($response_time seconds)"
        health_passed=false
    fi
    
    return $([[ "$health_passed" == "true" ]] && echo 0 || echo 1)
}

# API endpoints validation
validate_api_endpoints() {
    test_start "API Endpoints"
    
    local api_passed=true
    
    # Test each API endpoint
    local endpoints=(
        "/api/health"
        "/api/descriptions/generate"
        "/api/qa/generate"
        "/api/phrases/extract"
        "/api/images/search"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local url="$PRODUCTION_URL$endpoint"
        
        if [[ "$endpoint" == "/api/health" ]]; then
            # GET request for health
            if curl -s -f "$url" > /dev/null; then
                test_pass "API endpoint $endpoint accessible"
            else
                test_fail "API endpoint $endpoint not accessible"
                api_passed=false
            fi
        else
            # OPTIONS request for CORS check
            local status=$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "$url")
            if [[ "$status" == "200" || "$status" == "204" ]]; then
                test_pass "API endpoint $endpoint CORS configured"
            else
                test_warn "API endpoint $endpoint CORS check returned $status"
            fi
        fi
    done
    
    return $([[ "$api_passed" == "true" ]] && echo 0 || echo 1)
}

# SSL/TLS validation
validate_ssl() {
    test_start "SSL/TLS Configuration"
    
    local ssl_passed=true
    
    # Check SSL certificate
    local ssl_info=$(curl -s -I "$PRODUCTION_URL" | head -n 1)
    if echo "$ssl_info" | grep -q "200"; then
        test_pass "SSL certificate valid"
    else
        test_fail "SSL certificate issues detected"
        ssl_passed=false
    fi
    
    # Check HTTPS redirect
    local redirect_status=$(curl -s -o /dev/null -w '%{http_code}' "http://describe-it-lovat.vercel.app")
    if [[ "$redirect_status" == "301" || "$redirect_status" == "308" ]]; then
        test_pass "HTTP to HTTPS redirect working"
    else
        test_fail "HTTP to HTTPS redirect not working (status: $redirect_status)"
        ssl_passed=false
    fi
    
    # Check security headers
    local headers=$(curl -s -I "$PRODUCTION_URL")
    
    if echo "$headers" | grep -qi "strict-transport-security"; then
        test_pass "HSTS header present"
    else
        test_fail "HSTS header missing"
        ssl_passed=false
    fi
    
    if echo "$headers" | grep -qi "x-content-type-options.*nosniff"; then
        test_pass "X-Content-Type-Options header present"
    else
        test_fail "X-Content-Type-Options header missing"
        ssl_passed=false
    fi
    
    return $([[ "$ssl_passed" == "true" ]] && echo 0 || echo 1)
}

# Performance validation
validate_performance() {
    test_start "Performance Metrics"
    
    local perf_passed=true
    
    # Page load time
    local load_time=$(curl -o /dev/null -s -w '%{time_total}' "$PRODUCTION_URL")
    if (( $(echo "$load_time < 3.0" | bc -l) )); then
        test_pass "Page load time acceptable ($load_time seconds)"
    else
        test_warn "Page load time could be improved ($load_time seconds)"
    fi
    
    # First byte time
    local ttfb=$(curl -o /dev/null -s -w '%{time_starttransfer}' "$PRODUCTION_URL")
    if (( $(echo "$ttfb < 1.0" | bc -l) )); then
        test_pass "Time to first byte acceptable ($ttfb seconds)"
    else
        test_warn "Time to first byte could be improved ($ttfb seconds)"
    fi
    
    # Content size
    local content_size=$(curl -s -I "$PRODUCTION_URL" | grep -i content-length | awk '{print $2}' | tr -d '\r')
    if [[ -n "$content_size" && "$content_size" -lt 1048576 ]]; then # 1MB
        test_pass "Content size reasonable ($(($content_size / 1024))KB)"
    else
        test_warn "Content size might be large"
    fi
    
    return 0 # Performance issues are warnings, not failures
}

# Functional validation
validate_functionality() {
    test_start "Core Functionality"
    
    local func_passed=true
    
    # Check if main page loads
    if curl -s "$PRODUCTION_URL" | grep -q "<!DOCTYPE html"; then
        test_pass "Main page renders HTML"
    else
        test_fail "Main page not rendering properly"
        func_passed=false
    fi
    
    # Check for essential assets
    local static_assets=(
        "/_next/static/"
        "/favicon.ico"
    )
    
    for asset in "${static_assets[@]}"; do
        local status=$(curl -s -o /dev/null -w '%{http_code}' "$PRODUCTION_URL$asset")
        if [[ "$status" == "200" ]]; then
            test_pass "Static asset $asset accessible"
        else
            test_warn "Static asset $asset returned status $status"
        fi
    done
    
    return $([[ "$func_passed" == "true" ]] && echo 0 || echo 1)
}

# Database connectivity (if applicable)
validate_database() {
    test_start "Database Connectivity"
    
    # This would test database connections if the app uses one
    # For now, we'll test if any database-dependent endpoints respond
    
    local db_test_url="$PRODUCTION_URL/api/health"
    if curl -s "$db_test_url" | grep -q "database.*ok"; then
        test_pass "Database connectivity confirmed"
    else
        test_warn "Database status unclear from health endpoint"
    fi
    
    return 0
}

# External service validation
validate_external_services() {
    test_start "External Services"
    
    local services_passed=true
    
    # Test if external APIs are accessible (without making actual requests)
    local external_services=(
        "https://api.openai.com"
        "https://api.unsplash.com"
    )
    
    for service in "${external_services[@]}"; do
        if curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$service" | grep -q "200\|401\|403"; then
            test_pass "External service $service reachable"
        else
            test_warn "External service $service might be unreachable"
        fi
    done
    
    return 0 # External service issues are warnings
}

# Accessibility validation
validate_accessibility() {
    test_start "Basic Accessibility"
    
    local content=$(curl -s "$PRODUCTION_URL")
    
    # Check for basic accessibility features
    if echo "$content" | grep -q "<title>"; then
        test_pass "Page title present"
    else
        test_fail "Page title missing"
    fi
    
    if echo "$content" | grep -q 'lang='; then
        test_pass "Language attribute present"
    else
        test_warn "Language attribute missing"
    fi
    
    if echo "$content" | grep -q 'meta.*description'; then
        test_pass "Meta description present"
    else
        test_warn "Meta description missing"
    fi
    
    return 0
}

# SEO validation
validate_seo() {
    test_start "SEO Basics"
    
    local content=$(curl -s "$PRODUCTION_URL")
    
    # Check for SEO essentials
    if echo "$content" | grep -q 'meta.*viewport'; then
        test_pass "Viewport meta tag present"
    else
        test_fail "Viewport meta tag missing"
    fi
    
    if echo "$content" | grep -q 'canonical'; then
        test_pass "Canonical URL present"
    else
        test_warn "Canonical URL missing"
    fi
    
    # Check robots.txt
    local robots_status=$(curl -s -o /dev/null -w '%{http_code}' "$PRODUCTION_URL/robots.txt")
    if [[ "$robots_status" == "200" ]]; then
        test_pass "Robots.txt accessible"
    else
        test_warn "Robots.txt not found (status: $robots_status)"
    fi
    
    return 0
}

# Generate validation report
generate_report() {
    info "Generating validation report..."
    
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    
    cat > "$RESULTS_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "production_url": "$PRODUCTION_URL",
  "validation_summary": {
    "total_tests": $TOTAL_TESTS,
    "passed_tests": $PASSED_TESTS,
    "failed_tests": $FAILED_TESTS,
    "success_rate": "$success_rate%"
  },
  "failed_tests": [$(printf '"%s",' "${FAILED_TEST_NAMES[@]}" | sed 's/,$//')]],
  "log_file": "$LOG_FILE",
  "status": "$([ $FAILED_TESTS -eq 0 ] && echo 'PASS' || echo 'FAIL')"
}
EOF
    
    info "Validation report saved to: $RESULTS_FILE"
}

# Display summary
display_summary() {
    echo
    log "${PURPLE}===========================================${NC}"
    log "${PURPLE}         VALIDATION SUMMARY${NC}"
    log "${PURPLE}===========================================${NC}"
    log "${BLUE}Total Tests: $TOTAL_TESTS${NC}"
    log "${GREEN}Passed: $PASSED_TESTS${NC}"
    log "${RED}Failed: $FAILED_TESTS${NC}"
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        log "${GREEN}🎉 ALL VALIDATIONS PASSED!${NC}"
        log "${GREEN}✅ Deployment is healthy and ready for production${NC}"
    else
        log "${RED}⚠️  SOME VALIDATIONS FAILED${NC}"
        log "${RED}❌ Please review failed tests:${NC}"
        for test_name in "${FAILED_TEST_NAMES[@]}"; do
            log "${RED}   - $test_name${NC}"
        done
    fi
    
    log "${PURPLE}===========================================${NC}"
    
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    log "${BLUE}Success Rate: $success_rate%${NC}"
    log "${BLUE}Results: $RESULTS_FILE${NC}"
    log "${BLUE}Logs: $LOG_FILE${NC}"
}

# Main validation function
main() {
    local target_url="${1:-$PRODUCTION_URL}"
    PRODUCTION_URL="$target_url"
    
    info "Starting deployment validation for: $PRODUCTION_URL"
    
    # Run all validation suites
    validate_health_endpoints
    validate_api_endpoints
    validate_ssl
    validate_performance
    validate_functionality
    validate_database
    validate_external_services
    validate_accessibility
    validate_seo
    
    # Generate report and display summary
    generate_report
    display_summary
    
    # Exit with appropriate code
    if [[ $FAILED_TESTS -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Handle script arguments
case "${1:-validate}" in
    "validate")
        main "$PRODUCTION_URL"
        ;;
    "staging")
        main "$STAGING_URL"
        ;;
    "health")
        validate_health_endpoints
        ;;
    "api")
        validate_api_endpoints
        ;;
    "ssl")
        validate_ssl
        ;;
    "performance")
        validate_performance
        ;;
    *)
        if [[ "$1" =~ ^https?:// ]]; then
            main "$1"
        else
            echo "Usage: $0 [validate|staging|health|api|ssl|performance|URL]"
            echo "  validate    - Full validation suite on production (default)"
            echo "  staging     - Full validation suite on staging"
            echo "  health      - Health checks only"
            echo "  api         - API endpoints only"
            echo "  ssl         - SSL/TLS checks only"
            echo "  performance - Performance checks only"
            echo "  URL         - Validate specific URL"
            exit 1
        fi
        ;;
esac