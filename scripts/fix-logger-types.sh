#!/bin/bash

# Fix LogContext parameter type errors across the codebase
# This script wraps primitive values in LogContext objects and casts unknown types

echo "Fixing LogContext parameter type errors..."

# Find all TypeScript files with logger calls
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 | while IFS= read -r -d '' file; do
  # Skip already fixed files
  if grep -q "logger\.\(error\|warn\|info\)" "$file" 2>/dev/null; then
    echo "Processing: $file"

    # Create backup
    cp "$file" "$file.bak"

    # Fix patterns:
    # 1. logger.error("msg:", error) -> logger.error("msg:", error as Error)
    # 2. logger.warn("msg:", error) -> logger.warn("msg:", { error: error as Error })
    # 3. logger.info("msg:", value) -> logger.info("msg:", { value })

    sed -i.tmp \
      -e 's/logger\.error(\([^,)]*\),\s*\([a-z][a-zA-Z0-9_]*\)\s*)/logger.error(\1, \2 as Error)/g' \
      -e 's/logger\.warn(\([^,)]*\),\s*\([a-z][a-zA-Z0-9_]*\)\s*)/logger.warn(\1, { error: \2 as Error })/g' \
      -e 's/logger\.info(\([^,)]*\),\s*\([a-z][a-zA-Z0-9_]*\)\s*)/logger.info(\1, { \2 })/g' \
      "$file"

    # Remove temporary file
    rm -f "$file.tmp"

    # Check if file changed
    if ! diff -q "$file" "$file.bak" > /dev/null 2>&1; then
      echo "  ✓ Fixed: $file"
    else
      echo "  - No changes: $file"
      rm -f "$file.bak"
    fi
  fi
done

echo "Done! Fixed LogContext parameter types."
echo "Backup files created with .bak extension. Remove them after verification."
