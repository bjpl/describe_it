# Branch Protection Rules Configuration

This document outlines the recommended branch protection rules for the `describe-it` project to ensure code quality, security, and proper CI/CD processes.

## 📋 Overview

Branch protection rules help maintain code quality by requiring certain conditions to be met before code can be merged into protected branches. This configuration supports our GitFlow-based development workflow.

## 🛡️ Recommended Protection Rules

### Main Branch Protection

The `main` branch should have the strictest protection rules as it represents the production-ready code.

#### Required Settings:
- ✅ **Require a pull request before merging**
- ✅ **Require approvals**: 2 approvals required
- ✅ **Dismiss stale PR approvals when new commits are pushed**
- ✅ **Require review from code owners**
- ✅ **Restrict pushes that create files**
- ✅ **Require status checks to pass before merging**
- ✅ **Require branches to be up to date before merging**
- ✅ **Require conversation resolution before merging**
- ✅ **Include administrators**
- ✅ **Allow force pushes**: Never
- ✅ **Allow deletions**: Never

#### Required Status Checks:
```yaml
Required checks for main branch:
- Continuous Integration / lint
- Continuous Integration / test (Node 18)
- Continuous Integration / test (Node 20)  
- Continuous Integration / test (Node 22)
- Continuous Integration / e2e-test
- Continuous Integration / build
- Security Scanning / codeql-analysis
- Security Scanning / dependency-scan
- Security Scanning / secret-scan
- Deploy to Vercel / pre-deploy-checks
```

### Develop Branch Protection

The `develop` branch serves as the main integration branch for ongoing development.

#### Required Settings:
- ✅ **Require a pull request before merging**
- ✅ **Require approvals**: 1 approval required
- ✅ **Dismiss stale PR approvals when new commits are pushed**
- ✅ **Require status checks to pass before merging**
- ✅ **Require branches to be up to date before merging**
- ✅ **Include administrators**
- ✅ **Allow force pushes**: Never
- ✅ **Allow deletions**: Never

#### Required Status Checks:
```yaml
Required checks for develop branch:
- Continuous Integration / lint
- Continuous Integration / test (Node 18)
- Continuous Integration / e2e-test
- Continuous Integration / build
- Security Scanning / dependency-scan
```

## 🔧 Configuration via GitHub CLI

You can set up these branch protection rules using the GitHub CLI:

### Main Branch
```bash
# Protect main branch
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Continuous Integration / lint","Continuous Integration / test (Node 18)","Continuous Integration / test (Node 20)","Continuous Integration / test (Node 22)","Continuous Integration / e2e-test","Continuous Integration / build","Security Scanning / codeql-analysis","Security Scanning / dependency-scan","Security Scanning / secret-scan","Deploy to Vercel / pre-deploy-checks"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":2,"dismiss_stale_reviews":true,"require_code_owner_reviews":true,"require_last_push_approval":true}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field block_creations=false \
  --field required_conversation_resolution=true
```

### Develop Branch
```bash
# Protect develop branch
gh api repos/:owner/:repo/branches/develop/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Continuous Integration / lint","Continuous Integration / test (Node 18)","Continuous Integration / e2e-test","Continuous Integration / build","Security Scanning / dependency-scan"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":false,"require_last_push_approval":false}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field block_creations=false \
  --field required_conversation_resolution=true
```

## 📝 Manual Configuration via GitHub Web UI

### Step 1: Navigate to Settings
1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Click on **Branches** in the left sidebar

### Step 2: Add Rule for Main Branch
1. Click **Add rule**
2. Enter branch name pattern: `main`
3. Configure the following settings:

#### Pull Request Settings:
- ☑️ Require a pull request before merging
  - ☑️ Require approvals: `2`
  - ☑️ Dismiss stale PR approvals when new commits are pushed
  - ☑️ Require review from code owners
  - ☑️ Restrict pushes that create files

#### Status Check Settings:
- ☑️ Require status checks to pass before merging
- ☑️ Require branches to be up to date before merging
- Add required checks:
  - `Continuous Integration / lint`
  - `Continuous Integration / test (Node 18)`
  - `Continuous Integration / test (Node 20)`
  - `Continuous Integration / test (Node 22)`
  - `Continuous Integration / e2e-test`
  - `Continuous Integration / build`
  - `Security Scanning / codeql-analysis`
  - `Security Scanning / dependency-scan`
  - `Security Scanning / secret-scan`

#### Additional Settings:
- ☑️ Require conversation resolution before merging
- ☑️ Include administrators
- ☑️ Restrict pushes that create files

### Step 3: Add Rule for Develop Branch
Repeat the process for `develop` branch with reduced requirements.

## 🚀 Rulesets (Recommended Alternative)

GitHub's newer Rulesets feature provides more flexibility and better performance than branch protection rules. Here's how to configure them:

### Main Branch Ruleset
```yaml
name: "Main Branch Protection"
target: "branch"
enforcement: "active"
conditions:
  ref_name:
    include: ["refs/heads/main"]
rules:
  - type: "pull_request"
    parameters:
      required_approving_review_count: 2
      dismiss_stale_reviews_on_push: true
      require_code_owner_review: true
      require_last_push_approval: true
  - type: "required_status_checks"
    parameters:
      required_status_checks:
        - context: "Continuous Integration / lint"
        - context: "Continuous Integration / test (Node 18)"
        - context: "Continuous Integration / test (Node 20)"
        - context: "Continuous Integration / test (Node 22)"
        - context: "Continuous Integration / e2e-test"
        - context: "Continuous Integration / build"
        - context: "Security Scanning / codeql-analysis"
        - context: "Security Scanning / dependency-scan"
        - context: "Security Scanning / secret-scan"
      strict_required_status_checks_policy: true
  - type: "non_fast_forward"
  - type: "required_conversations_resolution"
  - type: "deletion"
```

### Develop Branch Ruleset
```yaml
name: "Develop Branch Protection"
target: "branch"
enforcement: "active"
conditions:
  ref_name:
    include: ["refs/heads/develop"]
rules:
  - type: "pull_request"
    parameters:
      required_approving_review_count: 1
      dismiss_stale_reviews_on_push: true
  - type: "required_status_checks"
    parameters:
      required_status_checks:
        - context: "Continuous Integration / lint"
        - context: "Continuous Integration / test (Node 18)"
        - context: "Continuous Integration / e2e-test"
        - context: "Continuous Integration / build"
        - context: "Security Scanning / dependency-scan"
      strict_required_status_checks_policy: true
  - type: "non_fast_forward"
  - type: "required_conversations_resolution"
  - type: "deletion"
```

## 🔄 Workflow Integration

Our CI/CD workflows are designed to work seamlessly with these branch protection rules:

### Continuous Integration (ci.yml)
- Runs on all PRs and pushes to protected branches
- Provides required status checks for linting, testing, and building
- Supports multiple Node.js versions for compatibility testing

### Deployment (deploy.yml)
- Automatically deploys to preview environments for PRs
- Deploys to production only from main branch
- Includes pre-deployment checks as required status

### Security Scanning (security.yml)
- Provides security-related status checks
- Runs dependency scans and code analysis
- Required for main branch protection

### Performance Monitoring (performance.yml)
- Provides performance regression detection
- Optional but recommended for quality assurance

## 📊 Monitoring and Maintenance

### Regular Review
- Review branch protection rules quarterly
- Update required status checks when workflows change
- Ensure rules align with team growth and process changes

### Metrics to Track
- Pull request approval time
- CI/CD pipeline success rates
- Security scan results
- Deployment frequency and success rates

### Emergency Procedures
In case of emergency deployments:
1. Temporarily disable branch protection (requires admin access)
2. Make necessary changes with proper documentation
3. Re-enable branch protection immediately after deployment
4. Create post-mortem to prevent similar emergencies

## 🛠️ Troubleshooting

### Common Issues

#### Status Check Not Appearing
- Ensure the workflow has run at least once
- Check workflow names and job names match exactly
- Verify branch triggers in workflow files

#### PR Cannot Be Merged
- All required status checks must pass
- Branch must be up to date with target branch
- All conversations must be resolved
- Required approvals must be obtained

#### Admin Override
- Admins can bypass rules but should document reasons
- Use sparingly and only for emergencies
- Consider if rules need adjustment instead

### Quick Fixes
```bash
# Check branch protection status
gh api repos/:owner/:repo/branches/main/protection

# View required status checks
gh api repos/:owner/:repo/branches/main/protection/required_status_checks

# List recent workflow runs
gh run list --branch main --limit 5
```

## 🔗 Related Documentation

- [GitHub Actions Workflows](../.github/workflows/)
- [Code Review Guidelines](./CODE_REVIEW.md)
- [Development Workflow](./CONTRIBUTING.md)
- [Security Policies](./SECURITY.md)

## 📞 Support

If you need help configuring branch protection rules or encounter issues:

1. Check this documentation first
2. Review GitHub's official [branch protection documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
3. Contact the DevOps team
4. Create an issue in this repository

---

**Note**: This configuration assumes you're using the workflow files provided in this repository. Adjust the required status check names if you modify the workflow names or job names.