# CI/CD Pipeline Guide

**Global Quant Scanner Pro - Continuous Integration and Deployment**

**Status**: ✅ COMPLETED
**Last Updated**: January 2026
**Version**: 0.0.6

---

## 📋 Overview

This document details the comprehensive CI/CD infrastructure for Global Quant Scanner Pro, including GitHub Actions workflows for continuous integration, security scanning, and automated deployment.

All workflows follow industry best practices for automated testing, code quality enforcement, and security scanning.

---

## 🔄 1. Continuous Integration Workflow

### Implementation File

[.github/workflows/ci.yml](../.github/workflows/ci.yml)

### Triggers

- Push to `main` or `develop` branch
- Pull requests to `main` or `develop` branch

### Jobs

#### 1.1 Lint and Format Check

**Purpose**: Enforce code quality standards

**Steps**:
1. Checkout code
2. Setup Node.js 20.x
3. Install dependencies
4. Run ESLint validation
5. Run Prettier format check

**Fail Conditions**:
- ESLint errors found
- Code not properly formatted

#### 1.2 Test Suite

**Purpose**: Ensure code functionality

**Steps**:
1. Checkout code
2. Setup Node.js 20.x
3. Install dependencies
4. Run all unit tests
5. Run integration tests
6. Run Phase 1 security tests

**Fail Conditions**:
- Any test fails
- Test coverage below threshold (future)

#### 1.3 Security Audit

**Purpose**: Identify dependency vulnerabilities

**Steps**:
1. Checkout code
2. Setup Node.js 20.x
3. Install dependencies
4. Run `npm audit`

**Configuration**: Continues on error (for visibility)

**Reports**: Vulnerability report artifact generated

#### 1.4 Build Check

**Purpose**: Verify server starts successfully

**Steps**:
1. Checkout code
2. Setup Node.js 20.x
3. Install dependencies
4. Start server (with timeout)
5. Verify health endpoint responds

**Dependencies**: Runs only after lint and test jobs pass

### Example Workflow

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test

  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm audit
        continue-on-error: true
```

### Success Criteria

- ✅ All PRs blocked until CI passes
- ✅ Failed tests prevent merges
- ✅ Code quality standards enforced
- ✅ Security vulnerabilities flagged

---

## 🔒 2. Security Scanning Workflow

### Implementation File

[.github/workflows/security.yml](../.github/workflows/security.yml)

### Triggers

- Weekly schedule (Mondays at 9:00 UTC)
- Pull requests
- Manual dispatch

### Jobs

#### 2.1 Dependency Review (PR only)

**Purpose**: Review new dependencies in PRs

**Steps**:
1. Checkout code
2. Run dependency review action
3. Fail on moderate+ severity vulnerabilities

**Configuration**:
```yaml
- name: Dependency Review
  uses: actions/dependency-review-action@v4
  with:
    fail-on-severity: moderate
```

#### 2.2 Snyk Security Scan (Weekly)

**Purpose**: Third-party vulnerability scanning

**Steps**:
1. Checkout code
2. Setup Node.js
3. Run Snyk test
4. Upload results to Snyk dashboard

**Requirements**: `SNYK_TOKEN` secret configured

**Configuration**:
```yaml
- name: Run Snyk
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

#### 2.3 CodeQL Analysis

**Purpose**: Static code analysis for vulnerabilities

**Steps**:
1. Checkout code
2. Initialize CodeQL
3. Autobuild (or manual build)
4. Perform CodeQL analysis
5. Upload results

**Languages**: JavaScript/TypeScript

**Queries**: `security-extended`

#### 2.4 Secret Scanning (TruffleHog)

**Purpose**: Detect committed secrets

**Steps**:
1. Checkout code (full history)
2. Run TruffleHog scanner
3. Fail if secrets found

**Configuration**:
```yaml
- name: TruffleHog
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: ${{ github.event.repository.default_branch }}
    head: HEAD
    extra_args: --only-verified
```

#### 2.5 NPM Audit

**Purpose**: Regular dependency vulnerability checks

**Steps**:
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Run `npm audit --audit-level=moderate`
5. Generate audit report
6. Upload report as artifact

### Security Scan Results

Results are available in:

- **GitHub Security tab**: CodeQL findings
- **Snyk Dashboard**: Vulnerability reports
- **Action artifacts**: Audit reports
- **PR comments**: Dependency review results

### Success Criteria

- ✅ Proactive vulnerability detection
- ✅ Secrets prevented from being committed
- ✅ Dependency security monitored
- ✅ Compliance-ready audit trail

---

## 🚀 3. Deployment Workflow (Future)

### Planned Implementation

[.github/workflows/deploy.yml](../.github/workflows/deploy.yml) (to be created)

### Triggers

- Tags matching `v*.*.*` (e.g., v0.0.6)
- Manual dispatch

### Planned Jobs

#### 3.1 Build

**Steps**:
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Run build (if applicable)
5. Create production artifacts

#### 3.2 Deploy to Staging

**Steps**:
1. Download artifacts
2. Deploy to staging environment
3. Run smoke tests
4. Generate deployment report

#### 3.3 Deploy to Production

**Steps**:
1. Download artifacts
2. Wait for manual approval
3. Deploy to production
4. Run health checks
5. Notify deployment status

### Deployment Environments

- **Development**: Automatic on `develop` branch
- **Staging**: Automatic on tags
- **Production**: Manual approval required

---

## 📊 CI/CD Metrics

### Before vs. After

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| CI/CD | Manual | Automated | +100% |
| Security Scanning | None | Weekly + PR | +100% |
| Test Automation | Manual | GitHub Actions | +100% |
| Deployment Frequency | Infrequent | On-demand | Better |
| Code Quality Checks | None | Automated | +100% |

---

## 🔧 Configuration

### Required Secrets

Configure in GitHub repository settings → Secrets and variables → Actions:

- `SNYK_TOKEN`: Snyk API token (for security scanning)
- Additional secrets for deployment (future)

### Branch Protection Rules

Configure on GitHub repository → Settings → Branches:

**Main Branch Protection**:
- ✅ Require pull request reviews (minimum 1 approver)
- ✅ Require status checks to pass before merging
  - `lint`
  - `test`
  - `security-audit`
- ✅ Require branches to be up to date before merging
- ✅ Prevent force pushes
- ✅ Prevent deletions

**Develop Branch Protection**:
- ✅ Require status checks to pass
- ✅ Allow force pushes (for squashing)

---

## 🧪 Testing CI/CD

### Local Testing

Test workflows locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or
sudo apt install act  # Linux

# Run CI workflow
act push

# Run security workflow
act schedule
```

### Manual Workflow Dispatch

Trigger workflows manually from GitHub:

1. Go to Actions tab
2. Select workflow
3. Click "Run workflow"
4. Choose branch
5. Click "Run workflow" button

---

## 📈 Monitoring CI/CD

### GitHub Actions Dashboard

Monitor workflow runs:

1. Go to repository → Actions
2. View recent workflow runs
3. Check job status
4. Download artifacts
5. View logs

### Notifications

Configure notifications in GitHub settings:

- Email on workflow failure
- Slack/Teams integration (via webhooks)
- GitHub mobile app notifications

---

## 🔍 Troubleshooting

### Common Issues

#### Workflow Not Triggering

**Problem**: Workflow doesn't run on push/PR
**Solution**: Check trigger configuration and branch names

#### Secrets Not Available

**Problem**: Workflow fails with missing secret
**Solution**: Configure secret in repository settings

#### Tests Failing in CI

**Problem**: Tests pass locally but fail in CI
**Solution**: Check for environment-specific issues (timezone, file paths, etc.)

#### Slow Workflow Execution

**Problem**: Workflows take too long
**Solution**: Use dependency caching, optimize test suite

### Debugging Workflows

Enable debug logging:

```bash
# Set repository secret
ACTIONS_STEP_DEBUG=true
ACTIONS_RUNNER_DEBUG=true
```

---

## 📚 Best Practices

### Workflow Design

1. **Keep workflows fast**: Use caching, parallelize jobs
2. **Fail fast**: Run quick checks (lint) before slow ones (tests)
3. **Use matrix builds**: Test multiple Node.js versions if needed
4. **Cache dependencies**: Speed up workflow execution
5. **Use artifacts**: Share data between jobs

### Security

1. **Never commit secrets**: Use GitHub Secrets
2. **Minimize permissions**: Use least privilege principle
3. **Review dependencies**: Check third-party actions
4. **Pin action versions**: Avoid `@latest`, use specific versions
5. **Audit workflow changes**: Review carefully in PRs

### Maintenance

1. **Keep actions updated**: Regular dependency updates
2. **Monitor workflow runs**: Check for failures
3. **Review logs**: Investigate warnings and errors
4. **Optimize performance**: Reduce workflow execution time
5. **Document changes**: Update this guide when workflows change

---

## 📞 Support

For questions about CI/CD:

- GitHub Issues: https://github.com/JP-Fernando/global-scanner-pro/issues
- GitHub Actions Docs: https://docs.github.com/en/actions
- Community Forum: https://github.community/

---

**Document Version**: 1.0
**Last Updated**: January 18, 2026
