#!/bin/bash

# Vercel Deployment Rollback Script
# Quickly rollback to previous stable deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
VERCEL_TOKEN="${VERCEL_TOKEN:-}"
VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-}"
VERCEL_ORG_ID="${VERCEL_ORG_ID:-}"
PRODUCTION_URL="https://describe-it-lovat.vercel.app"
BACKUP_DIR="./deployment-backups"
LOG_FILE="./logs/rollback-$(date +%Y%m%d-%H%M%S).log"

# Ensure directories exist
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$BACKUP_DIR"

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
    info "Checking rollback prerequisites..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        warning "Vercel CLI not found. Installing..."
        npm install -g vercel@latest || error_exit "Failed to install Vercel CLI"
    fi
    
    # Check if required environment variables are set
    if [[ -z "$VERCEL_TOKEN" ]]; then
        error_exit "VERCEL_TOKEN environment variable is required"
    fi
    
    success "Prerequisites check passed"
}

# List available deployments
list_deployments() {
    info "Fetching deployment history..."
    
    echo -e "${PURPLE}Recent Deployments:${NC}"
    echo -e "${PURPLE}==================${NC}"
    
    # Get deployment list with formatting
    vercel ls --token="$VERCEL_TOKEN" | head -20 | while IFS= read -r line; do
        if [[ "$line" =~ ^[a-zA-Z0-9-]+ ]]; then
            local deployment_id=$(echo "$line" | awk '{print $1}')
            local url=$(echo "$line" | awk '{print $2}')
            local status=$(echo "$line" | awk '{print $3}')
            local created=$(echo "$line" | awk '{print $4, $5}')
            
            if [[ "$url" == *"describe-it"* ]]; then
                if [[ "$status" == "READY" ]]; then
                    echo -e "${GREEN}✓${NC} $deployment_id - $url (${GREEN}$status${NC}) - $created"
                else
                    echo -e "${YELLOW}⚠${NC} $deployment_id - $url (${YELLOW}$status${NC}) - $created"
                fi
            fi
        fi
    done
}

# Get current deployment
get_current_deployment() {
    info "Identifying current production deployment..."
    
    local current_deployment=$(vercel ls --token="$VERCEL_TOKEN" | grep "$PRODUCTION_URL" | head -n1 | awk '{print $1}')
    
    if [[ -n "$current_deployment" ]]; then
        info "Current deployment: $current_deployment"
        echo "$current_deployment"
    else
        warning "Could not identify current deployment"
        echo ""
    fi
}

# Get previous stable deployment
get_previous_deployment() {
    info "Finding previous stable deployment..."
    
    # Look for the second READY deployment for this project
    local deployments=$(vercel ls --token="$VERCEL_TOKEN" | grep "READY" | grep "describe-it" | awk '{print $1}')
    local deployment_array=($deployments)
    
    if [[ ${#deployment_array[@]} -ge 2 ]]; then
        local previous="${deployment_array[1]}"
        info "Previous stable deployment found: $previous"
        echo "$previous"
    else
        error_exit "No previous stable deployment found"
    fi
}

# Validate deployment
validate_deployment() {
    local deployment_id="$1"
    
    info "Validating deployment: $deployment_id"
    
    # Get deployment info
    local deployment_info=$(vercel inspect "$deployment_id" --token="$VERCEL_TOKEN" 2>/dev/null || echo "")
    
    if [[ -z "$deployment_info" ]]; then
        error_exit "Deployment $deployment_id not found or not accessible"
    fi
    
    # Check if deployment is ready
    if echo "$deployment_info" | grep -q '"readyState": "READY"'; then
        success "Deployment $deployment_id is ready for rollback"
        return 0
    else
        error_exit "Deployment $deployment_id is not in READY state"
    fi
}

# Create rollback backup
create_rollback_backup() {
    local current_deployment="$1"
    
    info "Creating rollback backup..."
    
    if [[ -n "$current_deployment" ]]; then
        local backup_file="$BACKUP_DIR/rollback-backup-$(date +%Y%m%d-%H%M%S).json"
        
        cat > "$backup_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "action": "rollback",
  "previous_deployment": "$current_deployment",
  "production_url": "$PRODUCTION_URL",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "initiated_by": "$(whoami)",
  "reason": "Manual rollback"
}
EOF
        
        success "Rollback backup created: $backup_file"
    else
        warning "No current deployment to backup"
    fi
}

# Perform rollback
perform_rollback() {
    local target_deployment="$1"
    local reason="${2:-Manual rollback}"
    
    info "Performing rollback to deployment: $target_deployment"
    info "Reason: $reason"
    
    # Alias the target deployment to production
    info "Aliasing deployment to production domain..."
    vercel alias "$target_deployment" "$PRODUCTION_URL" --token="$VERCEL_TOKEN" || error_exit "Failed to alias deployment"
    
    success "Rollback completed successfully"
    success "Production now points to: $target_deployment"
}

# Verify rollback
verify_rollback() {
    local target_deployment="$1"
    
    info "Verifying rollback..."
    
    # Wait a moment for DNS propagation
    sleep 10
    
    # Check if the production URL is responding
    local response_code=$(curl -s -o /dev/null -w '%{http_code}' "$PRODUCTION_URL")
    
    if [[ "$response_code" == "200" ]]; then
        success "Production URL is responding (HTTP $response_code)"
    else
        warning "Production URL returned HTTP $response_code"
    fi
    
    # Run basic health check
    if curl -s -f "$PRODUCTION_URL/api/health" | grep -q "ok"; then
        success "Health check passed after rollback"
    else
        warning "Health check failed after rollback"
    fi
    
    # Optional: Run validation script if available
    if [[ -f "./scripts/validate-deployment.sh" ]]; then
        info "Running deployment validation..."
        if bash "./scripts/validate-deployment.sh" health; then
            success "Post-rollback validation passed"
        else
            warning "Post-rollback validation failed"
        fi
    fi
}

# Interactive deployment selection
interactive_rollback() {
    echo -e "${PURPLE}===========================================${NC}"
    echo -e "${PURPLE}         INTERACTIVE ROLLBACK${NC}"
    echo -e "${PURPLE}===========================================${NC}"
    
    list_deployments
    
    echo
    read -p "Enter deployment ID to rollback to: " target_deployment
    
    if [[ -z "$target_deployment" ]]; then
        error_exit "No deployment ID provided"
    fi
    
    read -p "Enter reason for rollback (optional): " reason
    reason="${reason:-Manual interactive rollback}"
    
    echo
    warning "You are about to rollback production to deployment: $target_deployment"
    warning "Reason: $reason"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Rollback cancelled"
        exit 0
    fi
    
    return 0
}

# Quick rollback to previous
quick_rollback() {
    local reason="${1:-Quick rollback to previous deployment}"
    
    info "Performing quick rollback..."
    
    local current_deployment=$(get_current_deployment)
    local previous_deployment=$(get_previous_deployment)
    
    if [[ -z "$previous_deployment" ]]; then
        error_exit "No previous deployment available for quick rollback"
    fi
    
    validate_deployment "$previous_deployment"
    create_rollback_backup "$current_deployment"
    perform_rollback "$previous_deployment" "$reason"
    verify_rollback "$previous_deployment"
    
    success "Quick rollback completed successfully!"
}

# Emergency rollback
emergency_rollback() {
    warning "EMERGENCY ROLLBACK INITIATED"
    
    # Skip some validation steps for speed
    local previous_deployment=$(get_previous_deployment)
    
    if [[ -z "$previous_deployment" ]]; then
        error_exit "No previous deployment available for emergency rollback"
    fi
    
    info "Emergency rollback to: $previous_deployment"
    
    # Perform rollback without extensive validation
    vercel alias "$previous_deployment" "$PRODUCTION_URL" --token="$VERCEL_TOKEN" || error_exit "Emergency rollback failed"
    
    success "EMERGENCY ROLLBACK COMPLETED"
    warning "Please verify the rollback and investigate the issue"
}

# Main rollback function
main() {
    local deployment_id="${1:-}"
    local reason="${2:-Manual rollback}"
    
    info "Starting rollback process..."
    
    check_prerequisites
    
    if [[ -n "$deployment_id" ]]; then
        # Direct rollback to specific deployment
        validate_deployment "$deployment_id"
        local current_deployment=$(get_current_deployment)
        create_rollback_backup "$current_deployment"
        perform_rollback "$deployment_id" "$reason"
        verify_rollback "$deployment_id"
        success "Rollback to $deployment_id completed successfully!"
    else
        # Interactive rollback
        interactive_rollback
        local current_deployment=$(get_current_deployment)
        validate_deployment "$target_deployment"
        create_rollback_backup "$current_deployment"
        perform_rollback "$target_deployment" "$reason"
        verify_rollback "$target_deployment"
        success "Interactive rollback completed successfully!"
    fi
}

# Handle script arguments
case "${1:-interactive}" in
    "interactive"|"")
        main
        ;;
    "quick")
        quick_rollback "${2:-Quick rollback}"
        ;;
    "emergency")
        emergency_rollback
        ;;
    "list")
        list_deployments
        ;;
    "current")
        get_current_deployment
        ;;
    "previous")
        get_previous_deployment
        ;;
    *)
        if [[ "$1" =~ ^[a-zA-Z0-9-]+$ ]]; then
            # Direct rollback to deployment ID
            main "$1" "${2:-Manual rollback to specific deployment}"
        else
            echo "Usage: $0 [interactive|quick|emergency|list|current|previous|DEPLOYMENT_ID]"
            echo ""
            echo "Commands:"
            echo "  interactive   - Interactive rollback with deployment selection (default)"
            echo "  quick         - Quick rollback to previous stable deployment"
            echo "  emergency     - Emergency rollback (minimal validation)"
            echo "  list          - List recent deployments"
            echo "  current       - Show current production deployment"
            echo "  previous      - Show previous stable deployment"
            echo "  DEPLOYMENT_ID - Rollback to specific deployment ID"
            echo ""
            echo "Examples:"
            echo "  $0                           # Interactive rollback"
            echo "  $0 quick                     # Quick rollback"
            echo "  $0 dpl_abc123def456          # Rollback to specific deployment"
            echo "  $0 emergency                 # Emergency rollback"
            exit 1
        fi
        ;;
esac