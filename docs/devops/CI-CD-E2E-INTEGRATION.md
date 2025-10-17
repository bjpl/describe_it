# CI/CD Integration Guide for E2E Authentication Tests

Complete guide for integrating E2E authentication tests into your CI/CD pipeline.

---

## Table of Contents

1. [GitHub Actions](#github-actions)
2. [GitLab CI](#gitlab-ci)
3. [CircleCI](#circleci)
4. [Jenkins](#jenkins)
5. [Azure DevOps](#azure-devops)
6. [Vercel Deploy Hooks](#vercel-deploy-hooks)
7. [Environment Secrets](#environment-secrets)
8. [Best Practices](#best-practices)

---

## GitHub Actions

### Complete Workflow

Create `.github/workflows/e2e-auth-tests.yml`:

```yaml
name: E2E Authentication Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # Run tests daily at 2 AM UTC
    - cron: '0 2 * * *'

jobs:
  e2e-auth-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}

      - name: Create .env.test
        run: |
          cat > .env.test << EOF
          TEST_USER_EMAIL=${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD=${{ secrets.TEST_USER_PASSWORD }}
          NEXT_PUBLIC_SUPABASE_URL=${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          BASE_URL=http://localhost:3000
          CI=true
          EOF

      - name: Build application
        run: npm run build

      - name: Start application
        run: npm start &
        env:
          NODE_ENV: production

      - name: Wait for application
        run: |
          echo "Waiting for application to start..."
          npx wait-on http://localhost:3000/api/health -t 60000

      - name: Run E2E Auth Tests
        run: npm run test:e2e -- --project=${{ matrix.browser }}
        env:
          CI: true

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/
          retention-days: 30

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots-${{ matrix.browser }}-${{ github.run_number }}
          path: tests/e2e/screenshots/
          retention-days: 7

      - name: Upload test videos
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: videos-${{ matrix.browser }}-${{ github.run_number }}
          path: test-results/
          retention-days: 7

      - name: Comment PR with results
        if: github.event_name == 'pull_request' && always()
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('test-results/e2e-auth-results.json', 'utf8'));

            const passed = results.suites.reduce((acc, s) => acc + s.specs.filter(t => t.ok).length, 0);
            const total = results.suites.reduce((acc, s) => acc + s.specs.length, 0);
            const failed = total - passed;

            const body = `## E2E Auth Tests (${{ matrix.browser }})

            - ✅ Passed: ${passed}
            - ❌ Failed: ${failed}
            - 📊 Total: ${total}

            [View full report](https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }})`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });

      - name: Fail if tests failed
        if: failure()
        run: exit 1
```

### Slack Notifications (Optional)

Add to workflow:

```yaml
      - name: Notify Slack on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "E2E Auth Tests Failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": ":x: E2E Auth Tests Failed\n*Branch:* ${{ github.ref }}\n*Run:* https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## GitLab CI

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test

e2e-auth-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.0-focal

  services:
    - postgres:14

  variables:
    POSTGRES_DB: test_db
    POSTGRES_USER: test_user
    POSTGRES_PASSWORD: test_password
    DATABASE_URL: postgresql://test_user:test_password@postgres:5432/test_db

  before_script:
    - npm ci
    - npx playwright install
    - echo "TEST_USER_EMAIL=$TEST_USER_EMAIL" >> .env.test
    - echo "TEST_USER_PASSWORD=$TEST_USER_PASSWORD" >> .env.test
    - echo "NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL" >> .env.test
    - echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" >> .env.test

  script:
    - npm run build
    - npm start &
    - sleep 10
    - npm run test:e2e

  artifacts:
    when: always
    paths:
      - playwright-report/
      - tests/e2e/screenshots/
      - test-results/
    expire_in: 7 days

  only:
    - main
    - develop
    - merge_requests
```

---

## CircleCI

Create `.circleci/config.yml`:

```yaml
version: 2.1

orbs:
  node: circleci/node@5.1.0
  browser-tools: circleci/browser-tools@1.4.0

jobs:
  e2e-auth-tests:
    docker:
      - image: mcr.microsoft.com/playwright:v1.40.0-focal

    steps:
      - checkout

      - node/install:
          node-version: '20'

      - restore_cache:
          keys:
            - npm-deps-{{ checksum "package-lock.json" }}

      - run:
          name: Install dependencies
          command: npm ci

      - save_cache:
          key: npm-deps-{{ checksum "package-lock.json" }}
          paths:
            - node_modules

      - run:
          name: Install Playwright
          command: npx playwright install

      - run:
          name: Setup environment
          command: |
            echo "TEST_USER_EMAIL=$TEST_USER_EMAIL" >> .env.test
            echo "TEST_USER_PASSWORD=$TEST_USER_PASSWORD" >> .env.test
            echo "NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL" >> .env.test
            echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" >> .env.test

      - run:
          name: Build and start app
          command: |
            npm run build
            npm start &
            sleep 15
          background: true

      - run:
          name: Run E2E tests
          command: npm run test:e2e

      - store_artifacts:
          path: playwright-report

      - store_artifacts:
          path: tests/e2e/screenshots

      - store_test_results:
          path: test-results

workflows:
  test:
    jobs:
      - e2e-auth-tests:
          context:
            - supabase-credentials
```

---

## Jenkins

Create `Jenkinsfile`:

```groovy
pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.40.0-focal'
            args '-u root:root'
        }
    }

    environment {
        TEST_USER_EMAIL = credentials('test-user-email')
        TEST_USER_PASSWORD = credentials('test-user-password')
        SUPABASE_URL = credentials('supabase-url')
        SUPABASE_ANON_KEY = credentials('supabase-anon-key')
    }

    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install'
            }
        }

        stage('Setup Environment') {
            steps {
                sh '''
                    cat > .env.test << EOF
TEST_USER_EMAIL=${TEST_USER_EMAIL}
TEST_USER_PASSWORD=${TEST_USER_PASSWORD}
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
EOF
                '''
            }
        }

        stage('Build Application') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Run E2E Tests') {
            steps {
                sh 'npm start &'
                sh 'sleep 15'
                sh 'npm run test:e2e'
            }
        }
    }

    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'playwright-report',
                reportFiles: 'index.html',
                reportName: 'E2E Test Report'
            ])

            archiveArtifacts artifacts: 'tests/e2e/screenshots/**/*.png', allowEmptyArchive: true
            archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true
        }

        failure {
            emailext(
                subject: "E2E Tests Failed: ${env.JOB_NAME} - Build #${env.BUILD_NUMBER}",
                body: "Build URL: ${env.BUILD_URL}",
                to: "${env.DEVELOPER_EMAIL}"
            )
        }
    }
}
```

---

## Azure DevOps

Create `azure-pipelines.yml`:

```yaml
trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: supabase-credentials
  - name: NODE_VERSION
    value: '20.x'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: $(NODE_VERSION)
    displayName: 'Install Node.js'

  - script: |
      npm ci
      npx playwright install --with-deps
    displayName: 'Install dependencies'

  - script: |
      cat > .env.test << EOF
      TEST_USER_EMAIL=$(TEST_USER_EMAIL)
      TEST_USER_PASSWORD=$(TEST_USER_PASSWORD)
      NEXT_PUBLIC_SUPABASE_URL=$(SUPABASE_URL)
      NEXT_PUBLIC_SUPABASE_ANON_KEY=$(SUPABASE_ANON_KEY)
      EOF
    displayName: 'Setup environment'

  - script: |
      npm run build
      npm start &
      sleep 15
    displayName: 'Build and start application'

  - script: npm run test:e2e
    displayName: 'Run E2E tests'
    continueOnError: true

  - task: PublishTestResults@2
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: '**/test-results/*.xml'
    displayName: 'Publish test results'
    condition: always()

  - task: PublishPipelineArtifact@1
    inputs:
      targetPath: 'playwright-report'
      artifact: 'playwright-report'
    displayName: 'Publish test report'
    condition: always()

  - task: PublishPipelineArtifact@1
    inputs:
      targetPath: 'tests/e2e/screenshots'
      artifact: 'screenshots'
    displayName: 'Publish screenshots'
    condition: failed()
```

---

## Vercel Deploy Hooks

### Post-Deploy E2E Tests

Create `.github/workflows/vercel-e2e.yml`:

```yaml
name: Vercel Deploy E2E Tests

on:
  deployment_status:

jobs:
  e2e-on-vercel:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run E2E tests against Vercel deployment
        run: npm run test:e2e
        env:
          BASE_URL: ${{ github.event.deployment_status.target_url }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - name: Comment deployment status
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.repos.createCommitComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              commit_sha: context.sha,
              body: '✅ E2E tests passed on Vercel deployment!'
            });
```

---

## Environment Secrets

### Required Secrets

Set these in your CI/CD platform:

```bash
# Test User Credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional
ADMIN_USER_EMAIL=admin@example.com
ADMIN_USER_PASSWORD=adminpassword123
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

### GitHub Secrets Setup

```bash
# Using GitHub CLI
gh secret set TEST_USER_EMAIL -b "test@example.com"
gh secret set TEST_USER_PASSWORD -b "testpassword123"
gh secret set NEXT_PUBLIC_SUPABASE_URL -b "https://..."
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY -b "eyJ..."
```

### GitLab Variables

1. Go to Settings → CI/CD → Variables
2. Add each secret as a protected variable
3. Mask sensitive values

---

## Best Practices

### 1. Test in Production-like Environment

```yaml
- name: Use production build
  run: |
    NODE_ENV=production npm run build
    NODE_ENV=production npm start &
```

### 2. Parallel Testing

```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]

steps:
  - run: npx playwright test --shard=${{ matrix.shard }}/4
```

### 3. Retry Flaky Tests

```yaml
- run: npm run test:e2e -- --retries=2
```

### 4. Cache Dependencies

```yaml
- uses: actions/cache@v3
  with:
    path: |
      ~/.npm
      ~/.cache/ms-playwright
    key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
```

### 5. Artifact Retention

```yaml
- uses: actions/upload-artifact@v3
  with:
    retention-days: 7  # Keep for 1 week
```

### 6. Status Badges

Add to README:

```markdown
[![E2E Tests](https://github.com/your-org/your-repo/workflows/E2E%20Authentication%20Tests/badge.svg)](https://github.com/your-org/your-repo/actions)
```

### 7. Notification Strategy

- ✅ Slack/Teams on failure
- 📧 Email weekly summary
- 💬 PR comments with results
- 🔔 Discord webhooks for critical failures

---

## Troubleshooting CI/CD

### Common Issues

1. **Tests timeout in CI**
   ```yaml
   - run: npm run test:e2e -- --timeout=60000
   ```

2. **Browser installation fails**
   ```yaml
   - run: npx playwright install --with-deps chromium
   ```

3. **Port conflicts**
   ```yaml
   env:
     PORT: 3001
   ```

4. **Database connection issues**
   ```yaml
   services:
     postgres:
       image: postgres:14
       env:
         POSTGRES_PASSWORD: postgres
   ```

### Debug Mode

```yaml
- name: Debug E2E tests
  run: DEBUG=pw:api npm run test:e2e
```

---

## Monitoring & Metrics

### Test Analytics

Track over time:
- Pass/fail rates
- Test duration
- Flakiness score
- Browser-specific issues

### Dashboards

Use tools like:
- **Playwright Dashboard**: Built-in HTML reports
- **Datadog**: Custom metrics
- **Grafana**: Test result visualization
- **Allure**: Advanced reporting

---

## Conclusion

With proper CI/CD integration:
- ✅ Every PR is tested automatically
- ✅ Deployments are verified
- ✅ Regressions are caught early
- ✅ Team is notified of failures
- ✅ Historical data is tracked

**Next Steps**:
1. Choose your CI/CD platform
2. Add secrets/variables
3. Create workflow file
4. Test and iterate
5. Monitor results

---

**Last Updated**: October 6, 2025
**Version**: 1.0.0
