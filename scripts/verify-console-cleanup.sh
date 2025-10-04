#!/bin/bash

# Console Statement Cleanup Verification Script
# Searches for remaining console statements after replacement

echo "=== Console Statement Cleanup Verification ==="
echo ""

SRC_DIR="../src"
REPORT_FILE="./verification-report.txt"

# Initialize report
cat > "$REPORT_FILE" << EOF
Console Statement Verification Report
Generated: $(date)
=====================================

EOF

# Count remaining console statements by type
echo "Scanning for remaining console statements..."
echo ""

# Count console.log
LOG_COUNT=$(grep -r "console\.log" "$SRC_DIR" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l)
echo "console.log: $LOG_COUNT" | tee -a "$REPORT_FILE"

# Count console.warn
WARN_COUNT=$(grep -r "console\.warn" "$SRC_DIR" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l)
echo "console.warn: $WARN_COUNT" | tee -a "$REPORT_FILE"

# Count console.error
ERROR_COUNT=$(grep -r "console\.error" "$SRC_DIR" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l)
echo "console.error: $ERROR_COUNT" | tee -a "$REPORT_FILE"

# Count console.info
INFO_COUNT=$(grep -r "console\.info" "$SRC_DIR" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l)
echo "console.info: $INFO_COUNT" | tee -a "$REPORT_FILE"

# Count console.debug
DEBUG_COUNT=$(grep -r "console\.debug" "$SRC_DIR" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l)
echo "console.debug: $DEBUG_COUNT" | tee -a "$REPORT_FILE"

# Total count
TOTAL_COUNT=$((LOG_COUNT + WARN_COUNT + ERROR_COUNT + INFO_COUNT + DEBUG_COUNT))
echo "" | tee -a "$REPORT_FILE"
echo "Total remaining: $TOTAL_COUNT" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

# List files with remaining console statements
if [ $TOTAL_COUNT -gt 0 ]; then
    echo "Files with remaining console statements:" | tee -a "$REPORT_FILE"
    echo "========================================" | tee -a "$REPORT_FILE"
    grep -r "console\.\(log\|warn\|error\|info\|debug\)" "$SRC_DIR" \
        --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
        -l | sort | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"

    echo "Detailed occurrences:" | tee -a "$REPORT_FILE"
    echo "====================" | tee -a "$REPORT_FILE"
    grep -r "console\.\(log\|warn\|error\|info\|debug\)" "$SRC_DIR" \
        --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
        -n --color=never | tee -a "$REPORT_FILE"
else
    echo "SUCCESS: All console statements have been replaced!" | tee -a "$REPORT_FILE"
fi

echo ""
echo "Verification complete. Report saved to: $REPORT_FILE"
