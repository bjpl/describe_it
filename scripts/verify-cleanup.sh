#!/bin/bash
# Verification Script for Cleanup Operations
# Purpose: Verify backup files are removed and primary files exist
# Created: 2025-10-03

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$PROJECT_ROOT/docs/cleanup/verification-$TIMESTAMP.log"

# Ensure log directory exists
mkdir -p "$PROJECT_ROOT/docs/cleanup"

echo -e "${BLUE}=== Cleanup Verification Script ===${NC}"
echo "Project Root: $PROJECT_ROOT"
echo "Report File: $REPORT_FILE"
echo ""

# Initialize counters
BACKUP_FILES_FOUND=0
MISSING_PRIMARY_FILES=0
VERIFIED_PRIMARY_FILES=0
ISSUES_FOUND=0

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$REPORT_FILE"
}

# Check for remaining backup files
check_backup_files() {
    log "=== Checking for Remaining Backup Files ==="
    echo -e "${YELLOW}Checking for remaining backup files...${NC}"

    local found_files=()

    while IFS= read -r file; do
        if [ -f "$file" ]; then
            rel_path="${file#$PROJECT_ROOT/}"
            echo -e "${RED}  ✗ Found backup file: $rel_path${NC}"
            log "  ✗ Found backup file: $rel_path"
            found_files+=("$file")
            ((BACKUP_FILES_FOUND++))
            ((ISSUES_FOUND++))
        fi
    done < <(find "$PROJECT_ROOT" -type f \( \
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
       -not -path "*/build/*" \
       -not -path "*/docs/cleanup/final-backup-*/*")

    if [ $BACKUP_FILES_FOUND -eq 0 ]; then
        echo -e "${GREEN}  ✓ No backup files found${NC}"
        log "  ✓ No backup files found"
    fi

    echo ""
}

# Verify primary files exist
verify_primary_files() {
    log "=== Verifying Primary Files Exist ==="
    echo -e "${YELLOW}Verifying primary files exist...${NC}"

    # List of critical files that should exist
    local critical_files=(
        "src/lib/monitoring/web-vitals.ts"
        "src/lib/auth/AuthManager.ts"
        "tests/components/PhrasesPanel.test.tsx"
        "src/app/api/status/route.ts"
    )

    for file in "${critical_files[@]}"; do
        local full_path="$PROJECT_ROOT/$file"
        if [ -f "$full_path" ]; then
            echo -e "${GREEN}  ✓ $file exists${NC}"
            log "  ✓ $file exists"
            ((VERIFIED_PRIMARY_FILES++))
        else
            echo -e "${RED}  ✗ $file is MISSING${NC}"
            log "  ✗ $file is MISSING"
            ((MISSING_PRIMARY_FILES++))
            ((ISSUES_FOUND++))
        fi
    done

    echo ""
}

# Check for duplicate files
check_duplicates() {
    log "=== Checking for Duplicate Files ==="
    echo -e "${YELLOW}Checking for potential duplicate files...${NC}"

    # Look for patterns like file.ts and file.backup.ts or file.fixed.ts
    local duplicates_found=0

    # This is a simplified check - can be enhanced
    while IFS= read -r file; do
        local base="${file%.*}"
        local ext="${file##*.}"

        # Check if backup versions exist
        if [ -f "${base}.backup.${ext}" ] || [ -f "${base}.fixed.${ext}" ] || [ -f "${base}.old.${ext}" ]; then
            echo -e "${YELLOW}  ! Potential duplicate: $(basename "$file")${NC}"
            log "  ! Potential duplicate: $file"
            ((duplicates_found++))
        fi
    done < <(find "$PROJECT_ROOT/src" "$PROJECT_ROOT/tests" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) 2>/dev/null)

    if [ $duplicates_found -eq 0 ]; then
        echo -e "${GREEN}  ✓ No duplicate files found${NC}"
        log "  ✓ No duplicate files found"
    fi

    echo ""
}

# Generate summary report
generate_summary() {
    log "=== Verification Summary ==="
    echo -e "${BLUE}=== Verification Summary ===${NC}"
    echo ""

    echo "Backup Files Found: $BACKUP_FILES_FOUND"
    log "Backup Files Found: $BACKUP_FILES_FOUND"

    echo "Primary Files Verified: $VERIFIED_PRIMARY_FILES"
    log "Primary Files Verified: $VERIFIED_PRIMARY_FILES"

    echo "Missing Primary Files: $MISSING_PRIMARY_FILES"
    log "Missing Primary Files: $MISSING_PRIMARY_FILES"

    echo "Total Issues Found: $ISSUES_FOUND"
    log "Total Issues Found: $ISSUES_FOUND"

    echo ""

    if [ $ISSUES_FOUND -eq 0 ]; then
        echo -e "${GREEN}✓ Verification PASSED - No issues found${NC}"
        log "✓ Verification PASSED"
        return 0
    else
        echo -e "${RED}✗ Verification FAILED - $ISSUES_FOUND issue(s) found${NC}"
        log "✗ Verification FAILED - $ISSUES_FOUND issues"
        return 1
    fi
}

# Main execution
main() {
    log "=== Verification script started ==="

    check_backup_files
    verify_primary_files
    check_duplicates

    echo ""
    if generate_summary; then
        log "=== Verification completed successfully ==="
        echo ""
        echo -e "${GREEN}Report saved to: $REPORT_FILE${NC}"
        exit 0
    else
        log "=== Verification completed with issues ==="
        echo ""
        echo -e "${YELLOW}Report saved to: $REPORT_FILE${NC}"
        exit 1
    fi
}

# Run main function
main
