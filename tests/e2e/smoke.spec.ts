import { test, expect } from '@playwright/test';

test.describe('AHA Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads aha mode with chat and card flow', async ({ page }) => {
    await expect(page.getByText('AHA-AI')).toBeVisible();
    await expect(page.getByPlaceholder(/写下任何想法/)).toBeVisible();
    await expect(page.getByText('想法节点')).toBeVisible();
  });

  test('switches to zen mode and renders graph canvas', async ({ page }) => {
    await page.getByRole('button', { name: 'Zen 模式' }).click();
    await expect(page.getByTestId('graph-canvas')).toBeVisible();
  });

  test('opens search panel from toolbar in zen mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Zen 模式' }).click();
    await page.getByTitle('搜索').click();
    await expect(page.getByPlaceholder('搜索节点标题、内容或标签…')).toBeVisible();
  });

  test('toggles theme in zen mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Zen 模式' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByTitle('切换主题').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
