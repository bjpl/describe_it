# GitHub Issue Migration Guide

## Overview

This guide explains how to convert TODO comments in the codebase to tracked GitHub issues using the automated tools and templates provided.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Automated Process](#automated-process)
3. [Manual Process](#manual-process)
4. [Verification Steps](#verification-steps)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Setup

1. **GitHub Personal Access Token**
   ```bash
   # Create a token at: https://github.com/settings/tokens
   # Required scopes: repo, issues

   export GITHUB_TOKEN="your_token_here"
   export GITHUB_OWNER="your-org"
   export GITHUB_REPO="your-repo"
   ```

2. **Install Dependencies**
   ```bash
   npm install @octokit/rest
   ```

3. **Verify CSV Files Exist**
   ```bash
   ls -l docs/github-issues/*.csv
   ```

## Automated Process

### Step 1: Dry Run (Recommended)

Always start with a dry run to preview issues before creation:

```bash
# Preview all critical issues
node scripts/create-github-issues.js \
  --dry-run \
  --csv=docs/github-issues/critical-issues.csv

# Preview specific priority
node scripts/create-github-issues.js \
  --dry-run \
  --priority=high \
  --csv=docs/github-issues/high-priority-issues.csv
```

### Step 2: Create Issues by Priority

Create issues in phases, starting with critical:

```bash
# Phase 1: Critical issues (10 items)
node scripts/create-github-issues.js \
  --csv=docs/github-issues/critical-issues.csv \
  --batch-size=5

# Phase 2: High priority issues (10 items)
node scripts/create-github-issues.js \
  --csv=docs/github-issues/high-priority-issues.csv \
  --batch-size=10

# Phase 3: Medium priority issues (10 items)
node scripts/create-github-issues.js \
  --csv=docs/github-issues/medium-priority-issues.csv \
  --batch-size=10

# Phase 4: Low priority issues (10 items)
node scripts/create-github-issues.js \
  --csv=docs/github-issues/low-priority-issues.csv \
  --batch-size=10
```

### Step 3: Review Results

Check the generated results file:

```bash
cat docs/github-issues/creation-results.json
```

## Manual Process

If you prefer to create issues manually or need to handle special cases:

### Using GitHub Web Interface

1. **Navigate to Issues**
   - Go to your repository
   - Click "Issues" tab
   - Click "New Issue"

2. **Select Template**
   - Choose from:
     - Technical Debt
     - TODO Conversion
     - Bug from TODO

3. **Fill Template**
   - Copy TODO information from CSV files
   - Fill all required fields
   - Add appropriate labels
   - Assign priority

### Using GitHub CLI

```bash
# Install GitHub CLI if needed
# brew install gh  # macOS
# See: https://cli.github.com/

# Create issue from template
gh issue create \
  --title "[DEBT] AuthManager: Implement session validation" \
  --body-file docs/github-issues/technical-debt-template.md \
  --label "priority: critical,technical-debt,security"
```

## Verification Steps

### 1. Verify Issue Creation

```bash
# Check created issues
gh issue list --label "technical-debt" --limit 50

# Check by priority
gh issue list --label "priority: critical" --limit 20
```

### 2. Validate Issue Data

For each created issue, verify:

- [ ] Title is descriptive and includes component name
- [ ] Body contains all required information
- [ ] File path and line number are correct
- [ ] Labels are appropriate (priority, category, area)
- [ ] Original TODO text is preserved
- [ ] Acceptance criteria are clear

### 3. Check for Duplicates

```bash
# Search for potential duplicates
gh issue list --search "AuthManager" --limit 10
gh issue list --search "session validation" --limit 10
```

### 4. Verify Link Quality

Ensure issue bodies contain:
- Working links to source files
- Correct line numbers
- Valid GitHub references

## Best Practices

### Before Creating Issues

1. **Review TODO Inventory**
   - Check CSV files for accuracy
   - Verify file paths are current
   - Update priorities if needed
   - Group related TODOs

2. **Clean Up Duplicates**
   ```bash
   # Check for duplicate TODOs
   sort -u docs/github-issues/*.csv | wc -l
   ```

3. **Categorize Properly**
   - Security issues → Critical
   - Bugs → High
   - Features → Medium
   - Documentation → Low

### During Issue Creation

1. **Use Batching**
   - Keep batch size small (5-10)
   - Avoid rate limiting
   - Monitor progress

2. **Add Context**
   - Link related issues
   - Add screenshots if helpful
   - Reference documentation

3. **Assign Ownership**
   - Assign to responsible team members
   - Add to project boards
   - Set milestones

### After Issue Creation

1. **Update Codebase**
   ```bash
   # Link TODO comments to issues
   # TODO: Implement session validation (#123)
   ```

2. **Remove Resolved TODOs**
   ```bash
   # After issue is created, optionally replace TODO with issue link
   # Original: TODO: Add error handling
   # Updated: // See issue #123 for error handling implementation
   ```

3. **Track Progress**
   - Use GitHub Projects
   - Update issue labels
   - Close completed issues

## Troubleshooting

### Issue Creation Failed

**Problem:** Script fails with authentication error

**Solution:**
```bash
# Verify token has correct permissions
gh auth status

# Regenerate token if needed
# https://github.com/settings/tokens
```

### Duplicate Issues Created

**Problem:** Same TODO created multiple times

**Solution:**
```bash
# Close duplicates
gh issue close 123 --comment "Duplicate of #122"

# Update CSV to remove duplicates
# Edit docs/github-issues/*.csv
```

### Rate Limiting

**Problem:** GitHub API rate limit exceeded

**Solution:**
```bash
# Check rate limit status
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit

# Wait and retry with smaller batch size
node scripts/create-github-issues.js --batch-size=3
```

### Missing Labels

**Problem:** Labels not applied correctly

**Solution:**
```bash
# Create missing labels
gh label create "priority: critical" --color "d73a4a"
gh label create "technical-debt" --color "fbca04"
gh label create "area: api" --color "0e8a16"

# Update issue labels
gh issue edit 123 --add-label "priority: critical"
```

### Invalid File References

**Problem:** Links to files return 404

**Solution:**
- Verify file paths in CSV are correct
- Check if files were moved/renamed
- Update CSV with current paths
- Regenerate issues

## Advanced Usage

### Custom Filtering

```bash
# Filter by category
awk -F',' '$5 == "security"' docs/github-issues/*.csv > security-todos.csv

# Filter by severity
awk -F',' '$6 == "critical"' docs/github-issues/*.csv > critical-todos.csv
```

### Batch Updates

```bash
# Update all issues with a label
gh issue list --label "technical-debt" --limit 100 --json number \
  --jq '.[] | .number' | \
  xargs -I {} gh issue edit {} --add-label "needs-review"
```

### Export for Reporting

```bash
# Export all created issues
gh issue list --label "from-todo" --limit 100 --json number,title,labels,createdAt \
  > issue-report.json
```

## Migration Phases

### Phase 1: Critical Issues (Week 1)
- Review and create critical security issues
- Assign to security team
- Target: Resolve within 2 weeks

### Phase 2: High Priority (Week 2)
- Create high priority feature/bug issues
- Assign to development teams
- Target: Schedule in next sprint

### Phase 3: Medium Priority (Week 3)
- Create medium priority issues
- Add to backlog
- Target: Address in next 1-2 months

### Phase 4: Low Priority (Week 4)
- Create low priority issues
- Tag as "good first issue" where appropriate
- Target: Opportunistic resolution

## Support and Resources

- **Issue Templates:** `/docs/github-issues/*-template.md`
- **Automation Script:** `/scripts/create-github-issues.js`
- **CSV Files:** `/docs/github-issues/*-issues.csv`
- **Results:** `/docs/github-issues/creation-results.json`

## Cleanup Checklist

After migration is complete:

- [ ] All CSV files processed
- [ ] All issues created successfully
- [ ] Issues properly labeled and assigned
- [ ] TODO comments updated with issue references
- [ ] Obsolete TODOs removed from codebase
- [ ] GitHub Projects updated
- [ ] Team notified of new issues
- [ ] Documentation updated
- [ ] Results archived

---

**Last Updated:** 2025-10-03
**Script Version:** 1.0.0
**Maintainer:** Development Team
