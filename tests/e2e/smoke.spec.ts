import { test, expect } from '@playwright/test';

test.describe('AHA Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads aha mode with chat and card flow', async ({ page }) => {
    await expect(page.getByText('AHA-AI')).toBeVisible();
    await expect(page.getByPlaceholder(/继续说你的想法/)).toBeVisible();
    await expect(page.getByText('想法节点')).toBeVisible();
  });

  test('mode switch button toggles between aha and zen', async ({ page }) => {
    const switchBtn = page.locator('[data-mode] button').first();
    await expect(switchBtn).toContainText('Zen 模式');
    await switchBtn.click({ force: true });
    await expect(switchBtn).toContainText('Aha 模式');
    await switchBtn.click({ force: true });
    await expect(switchBtn).toContainText('Zen 模式');
  });
});
