#!/bin/bash

##############################################################################
# CI/CD Validation Script
#
# This script validates the complete CI/CD setup including:
# - GitHub secrets configuration
# - Workflow files syntax and structure
# - Branch protection rules
# - Environment configuration
# - Deployment target connectivity
#
# Usage:
#   ./scripts/validate-cicd.sh [OPTIONS]
#
# Options:
#   --secrets-only      Validate only GitHub secrets
#   --workflows-only    Validate only workflow files
#   --environments-only Validate only environment config
#   --dry-run          Show what would be checked without executing
#   --help             Show this help message
#
# Exit Codes:
#   0 - All validations passed
#   1 - One or more validations failed
#   2 - Script error or missing dependencies
##############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Output directory
OUTPUT_DIR=".cicd-validation"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${OUTPUT_DIR}/report_${TIMESTAMP}.txt"
DETAILED_LOG="${OUTPUT_DIR}/detailed_${TIMESTAMP}.log"

# Parse command line arguments
DRY_RUN=false
SECRETS_ONLY=false
WORKFLOWS_ONLY=false
ENVIRONMENTS_ONLY=false

##############################################################################
# Helper Functions
##############################################################################

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

print_failure() {
    echo -e "${RED}❌ $1${NC}"
    echo "$1" >> "${OUTPUT_DIR}/failures.txt"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    echo "$1" >> "${OUTPUT_DIR}/warnings.txt"
    ((WARNING_CHECKS++))
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_detail() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$DETAILED_LOG"
}

##############################################################################
# Dependency Checks
##############################################################################

check_dependencies() {
    print_header "Checking Dependencies"

    local deps_ok=true

    # Check for gh CLI
    if command -v gh &> /dev/null; then
        local gh_version=$(gh --version | head -n1)
        print_success "GitHub CLI installed: $gh_version"
    else
        print_failure "GitHub CLI (gh) not installed"
        deps_ok=false
    fi

    # Check for jq
    if command -v jq &> /dev/null; then
        print_success "jq installed"
    else
        print_failure "jq not installed (required for JSON parsing)"
        deps_ok=false
    fi

    # Check for Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        print_success "Node.js installed: $node_version"
    else
        print_warning "Node.js not installed (some checks will be skipped)"
    fi

    # Check for Docker (optional)
    if command -v docker &> /dev/null; then
        print_success "Docker installed"
    else
        print_warning "Docker not installed (Docker build validation will be skipped)"
    fi

    # Check gh authentication
    if gh auth status &> /dev/null; then
        print_success "GitHub CLI authenticated"
    else
        print_failure "GitHub CLI not authenticated. Run: gh auth login"
        deps_ok=false
    fi

    if [ "$deps_ok" = false ]; then
        echo -e "\n${RED}Please install missing dependencies and try again.${NC}"
        exit 2
    fi
}

##############################################################################
# Secret Validation
##############################################################################

validate_secrets() {
    print_header "Validating GitHub Secrets"

    # Define required secrets
    local critical_secrets=(
        "VERCEL_TOKEN"
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
    )

    local important_secrets=(
        "OPENAI_API_KEY"
        "API_SECRET_KEY"
        "JWT_SECRET"
        "SESSION_SECRET"
    )

    local optional_secrets=(
        "CODECOV_TOKEN"
        "LHCI_GITHUB_APP_TOKEN"
        "SENTRY_DSN"
        "SENTRY_AUTH_TOKEN"
        "NEXT_PUBLIC_UNSPLASH_ACCESS_KEY"
        "GH_PAT"
    )

    # Get list of configured secrets
    print_info "Fetching configured secrets..."
    local configured_secrets=$(gh secret list --json name -q '.[].name')
    log_detail "Configured secrets: $configured_secrets"

    # Check critical secrets
    print_info "\nChecking critical secrets (required for CI/CD)..."
    for secret in "${critical_secrets[@]}"; do
        if echo "$configured_secrets" | grep -q "^${secret}$"; then
            print_success "Critical secret configured: $secret"
        else
            print_failure "Critical secret missing: $secret"
        fi
    done

    # Check important secrets
    print_info "\nChecking important secrets (recommended)..."
    for secret in "${important_secrets[@]}"; do
        if echo "$configured_secrets" | grep -q "^${secret}$"; then
            print_success "Important secret configured: $secret"
        else
            print_warning "Important secret missing: $secret (recommended but not critical)"
        fi
    done

    # Check optional secrets
    print_info "\nChecking optional secrets (enhanced features)..."
    for secret in "${optional_secrets[@]}"; do
        if echo "$configured_secrets" | grep -q "^${secret}$"; then
            print_success "Optional secret configured: $secret"
        else
            print_info "Optional secret not configured: $secret (feature may be limited)"
        fi
    done

    # Check for unexpected secrets
    print_info "\nChecking for undefined secrets..."
    local all_known_secrets=("${critical_secrets[@]}" "${important_secrets[@]}" "${optional_secrets[@]}")
    while IFS= read -r secret; do
        local is_known=false
        for known_secret in "${all_known_secrets[@]}"; do
            if [ "$secret" = "$known_secret" ]; then
                is_known=true
                break
            fi
        done
        if [ "$is_known" = false ]; then
            print_warning "Unexpected secret found: $secret (not documented in setup guide)"
        fi
    done <<< "$configured_secrets"
}

##############################################################################
# Workflow Validation
##############################################################################

validate_workflows() {
    print_header "Validating Workflow Files"

    local workflow_dir=".github/workflows"

    # Check if workflows directory exists
    if [ ! -d "$workflow_dir" ]; then
        print_failure "Workflows directory not found: $workflow_dir"
        print_info "Workflows may be in .github/workflows.disabled/"
        return
    fi

    # Check for workflow files
    local workflow_files=$(find "$workflow_dir" -name "*.yml" -o -name "*.yaml")

    if [ -z "$workflow_files" ]; then
        print_warning "No workflow files found in $workflow_dir"
        return
    fi

    print_info "Found workflow files:"
    echo "$workflow_files" | while read -r file; do
        echo "  - $(basename "$file")"
    done

    # Validate each workflow file
    echo "$workflow_files" | while read -r workflow_file; do
        local workflow_name=$(basename "$workflow_file")
        print_info "\nValidating: $workflow_name"

        # Check YAML syntax
        if command -v yamllint &> /dev/null; then
            if yamllint "$workflow_file" &> /dev/null; then
                print_success "YAML syntax valid: $workflow_name"
            else
                print_failure "YAML syntax errors in: $workflow_name"
                yamllint "$workflow_file" >> "$DETAILED_LOG"
            fi
        else
            # Basic YAML check with Python
            if python3 -c "import yaml; yaml.safe_load(open('$workflow_file'))" 2>/dev/null; then
                print_success "YAML syntax valid: $workflow_name"
            else
                print_failure "YAML syntax errors in: $workflow_name"
            fi
        fi

        # Check for required fields
        if grep -q "^name:" "$workflow_file"; then
            print_success "Workflow name defined: $workflow_name"
        else
            print_warning "No workflow name in: $workflow_name"
        fi

        if grep -q "^on:" "$workflow_file"; then
            print_success "Workflow triggers defined: $workflow_name"
        else
            print_failure "No workflow triggers in: $workflow_name"
        fi

        # Check for secret usage
        local secrets_used=$(grep -o '\${{ secrets\.[A-Z_]* }}' "$workflow_file" | sed 's/\${{ secrets\.\(.*\) }}/\1/' | sort -u)
        if [ -n "$secrets_used" ]; then
            print_info "Secrets referenced in $workflow_name:"
            echo "$secrets_used" | while read -r secret; do
                echo "    - $secret"
                log_detail "Workflow $workflow_name uses secret: $secret"
            done
        fi
    done

    # Check workflow permissions
    print_info "\nChecking workflow permissions configuration..."
    if gh api repos/:owner/:repo/actions/permissions -q '.default_workflow_permissions' | grep -q "write"; then
        print_success "Workflow permissions: Read and write"
    else
        print_warning "Workflow permissions may be too restrictive"
    fi
}

##############################################################################
# Environment Validation
##############################################################################

validate_environments() {
    print_header "Validating GitHub Environments"

    # Get list of environments
    local environments=$(gh api repos/:owner/:repo/environments -q '.environments[].name' 2>/dev/null || echo "")

    if [ -z "$environments" ]; then
        print_warning "No environments configured"
        print_info "Consider creating: production, staging, preview"
        return
    fi

    print_info "Configured environments:"
    echo "$environments" | while read -r env; do
        echo "  - $env"
    done

    # Check for recommended environments
    local recommended_envs=("production" "staging" "preview")
    for env in "${recommended_envs[@]}"; do
        if echo "$environments" | grep -q "^${env}$"; then
            print_success "Recommended environment configured: $env"

            # Get environment details
            local env_data=$(gh api repos/:owner/:repo/environments/"$env")

            # Check protection rules
            local reviewers=$(echo "$env_data" | jq -r '.protection_rules[] | select(.type=="required_reviewers") | .reviewers | length')
            if [ "$env" = "production" ]; then
                if [ "$reviewers" -gt 0 ]; then
                    print_success "Production has required reviewers: $reviewers"
                else
                    print_warning "Production environment has no required reviewers"
                fi
            fi

        else
            print_warning "Recommended environment not configured: $env"
        fi
    done
}

##############################################################################
# Branch Protection Validation
##############################################################################

validate_branch_protection() {
    print_header "Validating Branch Protection Rules"

    # Check main branch protection
    print_info "Checking protection for 'main' branch..."
    if gh api repos/:owner/:repo/branches/main/protection &> /dev/null; then
        print_success "Branch protection enabled for 'main'"

        local protection=$(gh api repos/:owner/:repo/branches/main/protection)

        # Check specific protections
        local required_pr=$(echo "$protection" | jq -r '.required_pull_request_reviews.required_approving_review_count')
        if [ "$required_pr" -gt 0 ]; then
            print_success "Required approvals: $required_pr"
        else
            print_warning "No required approvals for pull requests"
        fi

        local status_checks=$(echo "$protection" | jq -r '.required_status_checks.contexts[]' 2>/dev/null || echo "")
        if [ -n "$status_checks" ]; then
            print_success "Required status checks configured"
            print_info "Required checks:"
            echo "$status_checks" | while read -r check; do
                echo "    - $check"
            done
        else
            print_warning "No required status checks configured"
        fi

        local enforce_admins=$(echo "$protection" | jq -r '.enforce_admins.enabled')
        if [ "$enforce_admins" = "true" ]; then
            print_success "Branch protection enforced for administrators"
        else
            print_warning "Administrators can bypass branch protection"
        fi

    else
        print_failure "No branch protection for 'main' branch"
        print_info "Configure at: Settings → Branches → Add rule"
    fi

    # Check develop branch (if exists)
    if gh api repos/:owner/:repo/branches/develop &> /dev/null; then
        print_info "\nChecking protection for 'develop' branch..."
        if gh api repos/:owner/:repo/branches/develop/protection &> /dev/null; then
            print_success "Branch protection enabled for 'develop'"
        else
            print_warning "No branch protection for 'develop' branch"
        fi
    fi
}

##############################################################################
# Deployment Target Validation
##############################################################################

validate_deployment_targets() {
    print_header "Validating Deployment Targets"

    # Check if Vercel token is available
    print_info "Testing Vercel connectivity..."
    if command -v vercel &> /dev/null; then
        # Note: Can't actually test token without exposing it
        print_success "Vercel CLI installed"
        print_info "Manual test required: vercel --token=\$VERCEL_TOKEN ls"
    else
        print_warning "Vercel CLI not installed locally (deployment will work in CI)"
    fi

    # Check Supabase connectivity
    print_info "\nTesting Supabase connectivity..."
    if command -v supabase &> /dev/null; then
        print_success "Supabase CLI installed"

        # Check if project is linked
        if [ -f ".supabase/config.toml" ]; then
            print_success "Supabase project linked"
        else
            print_warning "Supabase project not linked locally"
            print_info "Run: supabase link --project-ref YOUR_PROJECT_REF"
        fi
    else
        print_warning "Supabase CLI not installed locally"
    fi
}

##############################################################################
# Docker Build Validation
##############################################################################

validate_docker_build() {
    print_header "Validating Docker Configuration"

    if [ ! -f "Dockerfile" ] && [ ! -f "config/docker/Dockerfile" ]; then
        print_warning "No Dockerfile found (skipping Docker validation)"
        return
    fi

    local dockerfile="Dockerfile"
    if [ -f "config/docker/Dockerfile" ]; then
        dockerfile="config/docker/Dockerfile"
    fi

    print_success "Dockerfile found: $dockerfile"

    # Validate Dockerfile syntax
    if command -v docker &> /dev/null; then
        print_info "Validating Dockerfile syntax..."
        if docker build --dry-run -f "$dockerfile" . &> /dev/null; then
            print_success "Dockerfile syntax valid"
        else
            print_failure "Dockerfile has syntax errors"
            docker build --dry-run -f "$dockerfile" . >> "$DETAILED_LOG" 2>&1
        fi
    fi

    # Check for .dockerignore
    if [ -f ".dockerignore" ]; then
        print_success ".dockerignore file present"
    else
        print_warning "No .dockerignore file (may result in larger images)"
    fi
}

##############################################################################
# Generate Summary Report
##############################################################################

generate_report() {
    print_header "Validation Summary"

    echo "CI/CD Validation Report - $(date)" > "$REPORT_FILE"
    echo "========================================" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "Total Checks: $TOTAL_CHECKS" >> "$REPORT_FILE"
    echo "Passed: $PASSED_CHECKS" >> "$REPORT_FILE"
    echo "Failed: $FAILED_CHECKS" >> "$REPORT_FILE"
    echo "Warnings: $WARNING_CHECKS" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"

    local success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo "Success Rate: ${success_rate}%" >> "$REPORT_FILE"

    # Print summary to console
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Total Checks:${NC} $TOTAL_CHECKS"
    echo -e "${GREEN}Passed:${NC} $PASSED_CHECKS"
    echo -e "${RED}Failed:${NC} $FAILED_CHECKS"
    echo -e "${YELLOW}Warnings:${NC} $WARNING_CHECKS"
    echo -e "${BLUE}Success Rate:${NC} ${success_rate}%"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

    # Add recommendations
    if [ $FAILED_CHECKS -gt 0 ]; then
        echo -e "${RED}⚠️  CRITICAL ISSUES FOUND${NC}"
        echo -e "Review failures in: ${OUTPUT_DIR}/failures.txt\n"
        cat "${OUTPUT_DIR}/failures.txt"
    fi

    if [ $WARNING_CHECKS -gt 0 ]; then
        echo -e "\n${YELLOW}⚠️  WARNINGS FOUND${NC}"
        echo -e "Review warnings in: ${OUTPUT_DIR}/warnings.txt\n"
    fi

    # Save full report
    echo -e "\n${BLUE}Full report saved to:${NC} $REPORT_FILE"
    echo -e "${BLUE}Detailed logs saved to:${NC} $DETAILED_LOG"

    # Copy to summary file
    cp "$REPORT_FILE" "${OUTPUT_DIR}/summary.txt"
}

##############################################################################
# Main Execution
##############################################################################

show_help() {
    cat << EOF
CI/CD Validation Script

Usage: $0 [OPTIONS]

Options:
    --secrets-only       Validate only GitHub secrets
    --workflows-only     Validate only workflow files
    --environments-only  Validate only environment config
    --dry-run           Show what would be checked without executing
    --help              Show this help message

Examples:
    $0                          # Run all validations
    $0 --secrets-only           # Check only secrets
    $0 --workflows-only         # Check only workflows
    $0 --dry-run                # Preview checks

Exit Codes:
    0 - All validations passed
    1 - One or more validations failed
    2 - Script error or missing dependencies
EOF
}

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --secrets-only)
                SECRETS_ONLY=true
                shift
                ;;
            --workflows-only)
                WORKFLOWS_ONLY=true
                shift
                ;;
            --environments-only)
                ENVIRONMENTS_ONLY=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 2
                ;;
        esac
    done

    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    rm -f "${OUTPUT_DIR}/failures.txt" "${OUTPUT_DIR}/warnings.txt"

    # Print header
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║          CI/CD Configuration Validator v1.0.0            ║"
    echo "║                                                          ║"
    echo "║  Validating GitHub Actions, Secrets, and Deployments    ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"

    # Check dependencies first
    check_dependencies

    # Run validations based on flags
    if [ "$SECRETS_ONLY" = true ]; then
        validate_secrets
    elif [ "$WORKFLOWS_ONLY" = true ]; then
        validate_workflows
    elif [ "$ENVIRONMENTS_ONLY" = true ]; then
        validate_environments
    else
        # Run all validations
        validate_secrets
        validate_workflows
        validate_environments
        validate_branch_protection
        validate_deployment_targets
        validate_docker_build
    fi

    # Generate report
    generate_report

    # Exit with appropriate code
    if [ $FAILED_CHECKS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main "$@"
