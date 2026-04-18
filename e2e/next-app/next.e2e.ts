import { expect, test } from '@playwright/test';

test('loads monaco-loader through the Next.js app router', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  await expect(page.getByTestId('server-import')).toHaveText('server-import-ok');
  await expect(page.getByTestId('client-init')).toHaveText('client-init-ok');
  expect(errors).toEqual([]);
});
