# Code Quality Tooling Guide

**Global Quant Scanner Pro - Code Quality Standards**

**Status**: ✅ COMPLETED
**Last Updated**: January 2026
**Version**: 0.0.6

---

## 📋 Overview

This document details the comprehensive code quality tooling for Global Quant Scanner Pro, including ESLint configuration, Prettier formatting, and Husky pre-commit hooks.

All tools enforce consistent code style, catch potential bugs, and ensure security best practices.

---

## 🔍 1. ESLint Configuration

### Implementation File

[.eslintrc.json](../.eslintrc.json)

### Extends

- **`airbnb-base`**: Industry-standard JavaScript style guide
- **`plugin:security/recommended`**: Security best practices
- **`plugin:jsdoc/recommended`**: JSDoc documentation enforcement
- **`prettier`**: Prettier compatibility (disables conflicting rules)

### Key Features

- ✅ ES2022 syntax support
- ✅ ES6 module imports with extensions
- ✅ Security vulnerability detection
- ✅ JSDoc documentation requirements
- ✅ Max line length: 100 characters (with exceptions)
- ✅ No console warnings (allowed in server and tests)

### Security Rules

ESLint's security plugin detects common vulnerabilities:

- Unsafe regex detection
- Buffer assertions
- eval() detection
- CSRF vulnerability detection
- Timing attack detection

### Custom Rules

```json
{
  "rules": {
    "max-len": ["warn", {
      "code": 100,
      "ignoreUrls": true,
      "ignoreStrings": true,
      "ignoreTemplateLiterals": true,
      "ignoreRegExpLiterals": true
    }],
    "no-console": ["warn", {
      "allow": ["warn", "error"]
    }],
    "import/extensions": ["error", "always", {
      "ignorePackages": true
    }]
  }
}
```

### Commands

```bash
npm run lint          # Check for lint errors
npm run lint:fix      # Fix auto-fixable issues
```

### IDE Integration

For VS Code, add to `.vscode/settings.json`:

```json
{
  "eslint.enable": true,
  "eslint.validate": ["javascript"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## 🎨 2. Prettier Configuration

### Implementation Files

- [.prettierrc.json](../.prettierrc.json) - Prettier config
- [.prettierignore](../.prettierignore) - Ignore patterns

### Settings

```json
{
  "singleQuote": true,
  "semi": true,
  "tabWidth": 2,
  "printWidth": 100,
  "endOfLine": "lf",
  "trailingComma": "none"
}
```

### Features

- **Single quotes**: For strings (except JSON)
- **Semicolons**: Always included
- **Indentation**: 2 spaces (not tabs)
- **Line width**: 100 characters
- **Line endings**: LF (Unix-style)
- **Trailing commas**: None

### Commands

```bash
npm run format        # Format all files
npm run format:check  # Check formatting without modifying
```

### Ignored Files

See [.prettierignore](../.prettierignore) for the complete list:

```
node_modules/
logs/
*.min.js
package-lock.json
```

### IDE Integration

For VS Code, add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

---

## 🪝 3. Husky Pre-commit Hooks

### Implementation Files

- [.husky/pre-commit](../.husky/pre-commit) - Pre-commit hook
- `lint-staged` configuration in [package.json](../package.json)

### Features

- ✅ Automatic linting on commit
- ✅ Automatic formatting on commit
- ✅ Only staged files processed (fast)
- ✅ Prevents commits with lint/format errors

### Staged File Processing

Configuration in `package.json`:

```json
{
  "lint-staged": {
    "*.js": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### Workflow

1. Stage files: `git add .`
2. Commit: `git commit -m "message"`
3. Husky runs pre-commit hook
4. lint-staged processes staged files:
   - Runs ESLint with auto-fix
   - Runs Prettier to format
5. If all pass, commit succeeds
6. If errors, commit fails with error messages

### Bypass Hook (Use Sparingly)

In emergency situations, you can bypass hooks:

```bash
git commit --no-verify -m "Emergency fix"
```

**Warning**: Only use `--no-verify` when absolutely necessary, as it bypasses important code quality checks.

---

## 📊 Code Quality Metrics

### Before vs. After

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Linting | None | ESLint configured | +100% |
| Formatting | Inconsistent | Prettier enforced | +100% |
| Pre-commit Checks | None | Lint + format | +100% |
| Code Documentation | Minimal | JSDoc required | +80% |
| Security Linting | None | Plugin enabled | N/A |

---

## 🧪 Testing

The code quality tooling is validated through:

1. **CI Pipeline**: All linting and formatting checks run in GitHub Actions
2. **Pre-commit Hooks**: Automatic validation before each commit
3. **Manual Testing**: Regular reviews of code quality

**Run Quality Checks**:

```bash
npm run lint          # Check linting
npm run lint:fix      # Fix linting issues
npm run format        # Format all files
npm run format:check  # Check formatting
```

---

## 📚 Documentation Standards

### JSDoc Requirements

All public functions must have JSDoc comments:

```javascript
/**
 * Creates a validation middleware for Express routes
 *
 * @param {Object} schema - Zod schema to validate against
 * @param {string} [source='query'] - Source of data ('query', 'body', 'params')
 * @returns {Function} Express middleware function
 *
 * @example
 * app.get('/api/users', validate(userSchema, 'query'), (req, res) => {
 *   // req.query is now validated and type-safe
 * });
 */
export function validate(schema, source = 'query') {
  // ...
}
```

### Required JSDoc Tags

- `@param`: Document parameters with types
- `@returns`: Document return value
- `@throws`: Document error conditions (if applicable)
- `@example`: Provide usage examples (recommended)
- `@module`: Module-level documentation

---

## 🚀 Best Practices

### Code Style

1. **Use descriptive variable names**: `userCount` instead of `uc`
2. **Keep functions small**: Aim for single responsibility
3. **Avoid deep nesting**: Max 3-4 levels
4. **Use early returns**: Reduce nesting with guard clauses
5. **Comment "why", not "what"**: Code should be self-documenting

### Security

1. **Never disable security rules** without justification
2. **Use `eval()` sparingly** (or never)
3. **Validate all user input** before processing
4. **Sanitize data** before logging or displaying
5. **Use parameterized queries** to prevent SQL injection

### Performance

1. **Avoid unnecessary loops**: Use built-in methods when possible
2. **Cache expensive operations**: Don't recalculate repeatedly
3. **Use async/await**: For better readability of async code
4. **Avoid blocking operations**: Keep the event loop responsive

---

## 🔧 Troubleshooting

### ESLint Issues

**Problem**: ESLint errors on valid code
**Solution**: Check if rule is appropriate, add exception if needed

**Problem**: IDE not showing ESLint errors
**Solution**: Install ESLint extension and check VS Code settings

### Prettier Issues

**Problem**: Prettier conflicts with ESLint
**Solution**: Ensure `eslint-config-prettier` is installed and configured

**Problem**: Files not formatting on save
**Solution**: Enable format on save in IDE settings

### Husky Issues

**Problem**: Pre-commit hook not running
**Solution**: Reinstall Husky: `npm run prepare`

**Problem**: Hook fails but commit succeeds
**Solution**: Check Git version (requires 2.9+)

---

## 📞 Support

For questions about code quality tooling:

- GitHub Issues: https://github.com/JP-Fernando/global-scanner-pro/issues
- ESLint Docs: https://eslint.org/docs/latest/
- Prettier Docs: https://prettier.io/docs/en/
- Husky Docs: https://typicode.github.io/husky/

---

**Document Version**: 1.0
**Last Updated**: January 18, 2026
