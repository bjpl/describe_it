#!/bin/bash
# Cleanup Backup Files Script
# Purpose: Remove unnecessary backup files from the repository
# Created: 2025-10-03
# Safety: Creates final backup before deletion

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/docs/cleanup/cleanup-$(date +%Y%m%d_%H%M%S).log"

# Ensure log directory exists
mkdir -p "$PROJECT_ROOT/docs/cleanup"

echo -e "${YELLOW}=== Backup File Cleanup Script ===${NC}"
echo "Project Root: $PROJECT_ROOT"
echo "Log File: $LOG_FILE"
echo ""

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to find backup files
find_backup_files() {
    log "Searching for backup files..."

    # Find all backup-related files
    find "$PROJECT_ROOT" -type f \( \
        -name "*.backup" -o \
        -name "*.fixed" -o \
        -name "*.old" -o \
        -name "*.bak" -o \
        -name "*.tmp" -o \
        -name "*~" -o \
        -name "*.swp" -o \
        -name "*.swo" \
    \) -not -path "*/node_modules/*" \
       -not -path "*/.git/*" \
       -not -path "*/.next/*" \
       -not -path "*/build/*"
}

# Create final backup archive
create_final_backup() {
    log "Creating final backup archive..."

    BACKUP_DIR="$PROJECT_ROOT/docs/cleanup/final-backup-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    local count=0
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            # Create directory structure in backup
            rel_path="${file#$PROJECT_ROOT/}"
            target_dir="$BACKUP_DIR/$(dirname "$rel_path")"
            mkdir -p "$target_dir"

            # Copy file to backup
            cp "$file" "$BACKUP_DIR/$rel_path"
            ((count++))
            log "Backed up: $rel_path"
        fi
    done < <(find_backup_files)

    if [ $count -gt 0 ]; then
        echo -e "${GREEN}Created final backup with $count files at:${NC}"
        echo "$BACKUP_DIR"
        log "Final backup created with $count files"
    else
        echo -e "${YELLOW}No backup files found to archive${NC}"
        log "No backup files found"
    fi

    echo ""
}

# Display backup files to be deleted
display_files() {
    log "Files to be deleted:"
    echo -e "${YELLOW}The following backup files will be deleted:${NC}"
    echo ""

    local count=0
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            rel_path="${file#$PROJECT_ROOT/}"
            echo "  - $rel_path"
            log "  Will delete: $rel_path"
            ((count++))
        fi
    done < <(find_backup_files)

    echo ""
    echo -e "${YELLOW}Total files to delete: $count${NC}"
    log "Total files to delete: $count"
    echo ""

    return $count
}

# Delete backup files
delete_backup_files() {
    log "Starting deletion of backup files..."

    local deleted=0
    local failed=0

    while IFS= read -r file; do
        if [ -f "$file" ]; then
            rel_path="${file#$PROJECT_ROOT/}"
            if rm "$file"; then
                echo -e "${GREEN}✓ Deleted: $rel_path${NC}"
                log "✓ Deleted: $rel_path"
                ((deleted++))
            else
                echo -e "${RED}✗ Failed to delete: $rel_path${NC}"
                log "✗ Failed to delete: $rel_path"
                ((failed++))
            fi
        fi
    done < <(find_backup_files)

    echo ""
    echo -e "${GREEN}Deletion complete!${NC}"
    echo "  Deleted: $deleted files"
    echo "  Failed: $failed files"
    log "Deletion summary: $deleted deleted, $failed failed"
    echo ""
}

# Main execution
main() {
    log "=== Cleanup script started ==="

    # Create final backup first
    create_final_backup

    # Display files to be deleted
    if ! display_files; then
        echo -e "${YELLOW}No backup files found. Nothing to clean up.${NC}"
        log "No backup files found. Exiting."
        exit 0
    fi

    # Ask for confirmation
    echo -e "${RED}WARNING: This will permanently delete these files from the working directory.${NC}"
    echo -e "${YELLOW}A final backup has been created in docs/cleanup/${NC}"
    echo ""
    read -p "Do you want to proceed with deletion? (yes/no): " confirmation

    if [ "$confirmation" != "yes" ]; then
        echo -e "${YELLOW}Cleanup cancelled by user.${NC}"
        log "Cleanup cancelled by user"
        exit 0
    fi

    # Perform deletion
    delete_backup_files

    # Run verification
    echo -e "${YELLOW}Running verification...${NC}"
    if [ -f "$SCRIPT_DIR/verify-cleanup.sh" ]; then
        bash "$SCRIPT_DIR/verify-cleanup.sh"
    else
        echo -e "${YELLOW}Verification script not found. Skipping.${NC}"
    fi

    log "=== Cleanup script completed ==="
    echo ""
    echo -e "${GREEN}Cleanup complete! Log saved to:${NC}"
    echo "$LOG_FILE"
}

# Run main function
main
