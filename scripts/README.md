# Cleanup Scripts Documentation

This directory contains automated scripts for cleaning up backup files and verifying the cleanup process.

## Available Scripts

### 1. cleanup-backups.sh (Linux/Mac)
Removes backup files from the repository with safety confirmations.

**Usage:**
```bash
cd /mnt/c/Users/brand/Development/Project_Workspace/active-development/describe_it
./scripts/cleanup-backups.sh
```

**Features:**
- Creates final backup archive before deletion
- Shows all files to be deleted
- Requires explicit confirmation
- Comprehensive logging
- Automatic verification after cleanup

### 2. cleanup-backups.bat (Windows)
Windows batch script equivalent with same functionality.

**Usage:**
```cmd
cd C:\Users\brand\Development\Project_Workspace\active-development\describe_it
scripts\cleanup-backups.bat
```

### 3. verify-cleanup.sh (Verification)
Verifies cleanup operation success and checks for issues.

**Usage:**
```bash
./scripts/verify-cleanup.sh
```

**Checks:**
- No remaining backup files
- All primary files exist
- No duplicate files
- Generates detailed report

## Backup File Patterns

The scripts target these file patterns:

| Pattern | Description | Example |
|---------|-------------|---------|
| `*.backup` | Code backup files | `file.ts.backup` |
| `*.fixed` | Manual fix backups | `file.ts.fixed` |
| `*.old` | Old version files | `file.ts.old` |
| `*.bak` | Generic backups | `file.ts.bak` |
| `*.tmp` | Temporary files | `file.ts.tmp` |
| `*~` | Editor backups | `file.ts~` |
| `*.swp` | Vim swap files | `.file.ts.swp` |
| `*.swo` | Vim swap files | `.file.ts.swo` |

## Safety Features

1. **Final Backup Archive**
   - All backup files copied to `/docs/cleanup/final-backup-[timestamp]/`
   - Archive preserved for recovery if needed
   - Organized by original directory structure

2. **Confirmation Required**
   - Lists all files to be deleted
   - Requires explicit "yes" confirmation
   - Can be cancelled at any time

3. **Comprehensive Logging**
   - All operations logged to `/docs/cleanup/cleanup-[timestamp].log`
   - Includes timestamps and success/failure status
   - Preserved for audit trail

4. **Automatic Verification**
   - Runs verification script after cleanup
   - Checks for remaining backup files
   - Verifies primary files exist
   - Reports any issues found

## Workflow

```
1. Run cleanup-backups.sh
   ├─ Creates final backup archive
   ├─ Lists files to delete
   ├─ Asks for confirmation
   ├─ Deletes backup files
   └─ Runs verification

2. Review verification results
   ├─ Check for remaining backups
   ├─ Verify primary files exist
   └─ Review logs

3. If issues found:
   ├─ Review logs in /docs/cleanup/
   ├─ Restore from final backup if needed
   └─ Fix issues manually

4. If successful:
   ├─ Commit .gitignore changes
   ├─ Run tests: npm test
   ├─ Run typecheck: npm run typecheck
   └─ Archive final backup
```

## Output Locations

| Type | Location | Purpose |
|------|----------|---------|
| Final Backup | `/docs/cleanup/final-backup-[timestamp]/` | Safety archive before deletion |
| Cleanup Log | `/docs/cleanup/cleanup-[timestamp].log` | Deletion operation log |
| Verification Log | `/docs/cleanup/verification-[timestamp].log` | Verification results |
| Report Template | `/docs/cleanup/CLEANUP_REPORT.md` | Documentation template |

## Gitignore Updates

The `.gitignore` file has been updated to prevent future backup file commits:

```gitignore
# Backup and temporary files (prevent accidental commits)
*.backup       # TypeScript/code backup files
*.fixed        # Manual fix backup files
*.old          # Renamed old versions
*.bak          # Generic backup extension
*~             # Vim/Emacs backup files
*.swp          # Vim swap files
*.swo          # Vim swap files (alternative)
```

## Recovery Process

If you need to recover deleted files:

1. **Locate Final Backup:**
   ```bash
   ls -la docs/cleanup/final-backup-*/
   ```

2. **Find Needed File:**
   ```bash
   find docs/cleanup/final-backup-* -name "filename*"
   ```

3. **Restore File:**
   ```bash
   cp docs/cleanup/final-backup-[timestamp]/path/to/file.ts.backup src/path/to/file.ts
   ```

## Troubleshooting

### Issue: Permission Denied

**Solution:**
```bash
chmod +x scripts/cleanup-backups.sh
chmod +x scripts/verify-cleanup.sh
```

### Issue: Files Not Found

**Possible Causes:**
- Files already deleted
- Wrong directory
- Files in node_modules (excluded)

**Solution:**
Check logs in `/docs/cleanup/` for details.

### Issue: Verification Failed

**Actions:**
1. Review verification log
2. Check which files are missing
3. Restore from final backup if needed
4. Run manual verification

## Best Practices

1. **Before Running Cleanup:**
   - Commit current changes
   - Run tests to ensure code works
   - Review list of files to be deleted

2. **After Running Cleanup:**
   - Review verification results
   - Run full test suite
   - Run TypeScript type checking
   - Commit .gitignore updates

3. **Backup Archive Retention:**
   - Keep final backup for 30 days
   - Archive or delete after verification period
   - Document in CLEANUP_REPORT.md

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success - no issues |
| 1 | Verification failed - issues found |

## Examples

### Dry Run (See What Would Be Deleted)
```bash
# Find backup files without deleting
find . -type f \( -name "*.backup" -o -name "*.fixed" -o -name "*.old" \) \
  -not -path "*/node_modules/*" -not -path "*/.git/*"
```

### Manual Verification
```bash
# Check for remaining backups
./scripts/verify-cleanup.sh
```

### Review Logs
```bash
# View latest cleanup log
ls -t docs/cleanup/cleanup-*.log | head -1 | xargs cat

# View latest verification log
ls -t docs/cleanup/verification-*.log | head -1 | xargs cat
```

## Support

For issues or questions:
1. Review logs in `/docs/cleanup/`
2. Check verification results
3. Consult final backup archive
4. Review CLEANUP_REPORT.md template

---

**Created:** 2025-10-03
**Last Updated:** 2025-10-03
**Maintained By:** Development Team
