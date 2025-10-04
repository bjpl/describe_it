#!/bin/bash

###############################################################################
# ROLLBACK SCRIPT
###############################################################################
# Automated rollback for staging deployments
# Usage: ./scripts/deployment/rollback.sh [backup-dir]
###############################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Configuration
BACKUP_DIR="${1:-}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${PROJECT_ROOT}/logs/rollback-${TIMESTAMP}.log"

mkdir -p "${PROJECT_ROOT}/logs"

###############################################################################
# UTILITY FUNCTIONS
###############################################################################

log_info() {
    echo -e "${NC}ℹ${NC} $@" | tee -a "$LOG_FILE"
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
# ROLLBACK FUNCTIONS
###############################################################################

list_available_backups() {
    print_header "AVAILABLE BACKUPS"

    local backups_dir="${PROJECT_ROOT}/backups"

    if [[ ! -d "$backups_dir" ]]; then
        log_error "No backups directory found"
        exit 1
    fi

    local backups=($(ls -dt "${backups_dir}"/staging-* 2>/dev/null || true))

    if [[ ${#backups[@]} -eq 0 ]]; then
        log_error "No staging backups found"
        exit 1
    fi

    log_info "Found ${#backups[@]} backup(s):"
    echo ""

    local index=1
    for backup in "${backups[@]}"; do
        local backup_name=$(basename "$backup")
        local backup_time=$(echo "$backup_name" | sed 's/staging-//')

        echo "  [$index] $backup_name"

        if [[ -f "${backup}/git-commit.txt" ]]; then
            local commit=$(cat "${backup}/git-commit.txt")
            echo "      Git commit: $commit"
        fi

        if [[ -f "${backup}/git-branch.txt" ]]; then
            local branch=$(cat "${backup}/git-branch.txt")
            echo "      Git branch: $branch"
        fi

        if [[ -f "${backup}/deployment-url.txt" ]]; then
            local url=$(cat "${backup}/deployment-url.txt")
            echo "      Deployment URL: $url"
        fi

        echo ""
        ((index++))
    done
}

select_backup() {
    list_available_backups

    read -p "Select backup number to restore (or 'q' to quit): " selection

    if [[ "$selection" == "q" ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi

    local backups=($(ls -dt "${PROJECT_ROOT}/backups"/staging-* 2>/dev/null || true))
    local selected_index=$((selection - 1))

    if [[ $selected_index -lt 0 ]] || [[ $selected_index -ge ${#backups[@]} ]]; then
        log_error "Invalid selection"
        exit 1
    fi

    BACKUP_DIR="${backups[$selected_index]}"
    log_success "Selected backup: $(basename $BACKUP_DIR)"
}

verify_backup() {
    print_header "BACKUP VERIFICATION"

    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi

    log_info "Verifying backup contents..."

    # Check for environment file
    if [[ -f "${BACKUP_DIR}/.env.staging.bak" ]]; then
        log_success "Environment file found"
    else
        log_warning "Environment file not found in backup"
    fi

    # Check for git information
    if [[ -f "${BACKUP_DIR}/git-commit.txt" ]]; then
        local commit=$(cat "${BACKUP_DIR}/git-commit.txt")
        log_success "Git commit: $commit"
    else
        log_warning "Git commit information not found"
    fi

    if [[ -f "${BACKUP_DIR}/git-branch.txt" ]]; then
        local branch=$(cat "${BACKUP_DIR}/git-branch.txt")
        log_success "Git branch: $branch"
    else
        log_warning "Git branch information not found"
    fi

    log_success "Backup verification complete"
}

confirm_rollback() {
    print_header "ROLLBACK CONFIRMATION"

    log_warning "This will restore the application to a previous state"
    log_info "Backup location: $BACKUP_DIR"
    echo ""

    read -p "Are you sure you want to proceed? (yes/no): " confirmation

    if [[ "$confirmation" != "yes" ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi
}

restore_environment() {
    print_header "RESTORING ENVIRONMENT"

    log_info "Restoring environment configuration..."

    if [[ -f "${BACKUP_DIR}/.env.staging.bak" ]]; then
        # Backup current environment
        if [[ -f "${PROJECT_ROOT}/.env.staging" ]]; then
            cp "${PROJECT_ROOT}/.env.staging" "${PROJECT_ROOT}/.env.staging.before-rollback"
            log_info "Current environment backed up to .env.staging.before-rollback"
        fi

        # Restore from backup
        cp "${BACKUP_DIR}/.env.staging.bak" "${PROJECT_ROOT}/.env.staging"
        log_success "Environment file restored"
    else
        log_warning "No environment file to restore"
    fi
}

restore_git_state() {
    print_header "RESTORING GIT STATE"

    if [[ ! -f "${BACKUP_DIR}/git-commit.txt" ]]; then
        log_warning "No git commit information found, skipping git restore"
        return 0
    fi

    local target_commit=$(cat "${BACKUP_DIR}/git-commit.txt")
    log_info "Target commit: $target_commit"

    # Check for uncommitted changes
    if [[ -n $(git status -s) ]]; then
        log_warning "Uncommitted changes detected:"
        git status -s

        read -p "Stash changes before rollback? (y/N): " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git stash push -m "Stashed before rollback to $target_commit"
            log_success "Changes stashed"
        fi
    fi

    # Checkout target commit
    log_info "Checking out commit: $target_commit"

    if git checkout "$target_commit" &>> "$LOG_FILE"; then
        log_success "Git state restored"
    else
        log_error "Failed to checkout commit. Check $LOG_FILE for details"
        return 1
    fi
}

rebuild_application() {
    print_header "REBUILDING APPLICATION"

    log_info "Installing dependencies..."
    if npm ci --legacy-peer-deps &>> "$LOG_FILE"; then
        log_success "Dependencies installed"
    else
        log_error "Failed to install dependencies"
        return 1
    fi

    log_info "Building application..."
    if NODE_ENV=staging npm run build &>> "$LOG_FILE"; then
        log_success "Application built successfully"
    else
        log_error "Build failed. Check $LOG_FILE for details"
        return 1
    fi
}

redeploy_to_vercel() {
    print_header "REDEPLOYING TO VERCEL"

    log_info "Redeploying to Vercel..."

    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI not installed"
        return 1
    fi

    if vercel --prod --yes --token="${VERCEL_TOKEN:-}" &>> "$LOG_FILE"; then
        log_success "Redeployment successful"
    else
        log_error "Redeployment failed. Check $LOG_FILE for details"
        return 1
    fi
}

run_health_checks() {
    print_header "POST-ROLLBACK HEALTH CHECKS"

    log_info "Running health checks..."

    if [[ -f "${SCRIPT_DIR}/health-check.sh" ]]; then
        if [[ -f "${BACKUP_DIR}/deployment-url.txt" ]]; then
            local deployment_url=$(cat "${BACKUP_DIR}/deployment-url.txt")

            if bash "${SCRIPT_DIR}/health-check.sh" "$deployment_url"; then
                log_success "Health checks passed"
            else
                log_error "Health checks failed"
                return 1
            fi
        else
            log_warning "Deployment URL not found, skipping automated health checks"
        fi
    else
        log_warning "Health check script not found"
    fi
}

###############################################################################
# MAIN EXECUTION
###############################################################################

main() {
    print_header "STAGING ROLLBACK PROCEDURE"

    log_info "Starting rollback process..."
    log_info "Log file: $LOG_FILE"

    # Select backup if not provided
    if [[ -z "$BACKUP_DIR" ]]; then
        select_backup
    fi

    # Verify backup
    verify_backup

    # Confirm rollback
    confirm_rollback

    # Execute rollback
    restore_environment
    restore_git_state
    rebuild_application
    redeploy_to_vercel
    run_health_checks

    # Success
    print_header "ROLLBACK SUCCESSFUL"
    log_success "Application rolled back to backup: $(basename $BACKUP_DIR)"
    log_success "Rollback log: $LOG_FILE"

    if [[ -f "${PROJECT_ROOT}/.env.staging.before-rollback" ]]; then
        log_info "Previous environment saved as: .env.staging.before-rollback"
    fi
}

main "$@"
