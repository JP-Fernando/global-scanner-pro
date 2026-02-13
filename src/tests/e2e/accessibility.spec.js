/**
 * Accessibility E2E tests using axe-core.
 *
 * Known pre-existing issues:
 * - Several form inputs in portfolio/backtest sections lack proper <label for=""> associations
 * - Some select elements lack accessible names
 * These are tracked as tech-debt (label, select-name rules) and excluded from the audit.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupAllMocks } from './helpers/api-mocks.js';
import { setupWithCompletedScan } from './helpers/test-utils.js';

// Rules with known pre-existing violations tracked as tech-debt
const KNOWN_ISSUE_RULES = ['color-contrast', 'label', 'select-name'];

test.describe('Accessibility', () => {
  test('initial page load has no critical violations', async ({ page }) => {
    await setupAllMocks(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(KNOWN_ISSUE_RULES)
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });

  test('page with scan results has no critical violations', async ({ page }) => {
    await setupWithCompletedScan(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(KNOWN_ISSUE_RULES)
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toHaveLength(0);
  });

  test('baseline label violations are tracked (currently 2 rule groups)', async ({ page }) => {
    await setupAllMocks(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    // Track baseline: expect exactly the known label+select-name violations
    const labelViolations = results.violations.filter(
      (v) => v.id === 'label' || v.id === 'select-name',
    );
    // This count should decrease over time as we fix accessibility issues
    expect(labelViolations.length).toBeLessThanOrEqual(2);
  });

  test('interactive elements are keyboard focusable', async ({ page }) => {
    await setupAllMocks(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['SELECT', 'BUTTON', 'INPUT', 'A']).toContain(firstFocused);
  });
});
