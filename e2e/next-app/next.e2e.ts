import { expect, test } from '@playwright/test';

const monacoReadyTimeout = 15_000;

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

test('falls back to the next Monaco asset base URL when the primary loader script is unavailable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/fallback');

  await expect(page.getByTestId('fallback-init')).toHaveText('fallback-init-ok', { timeout: monacoReadyTimeout });
  expect(errors).toEqual([]);
});

test('falls back when the primary Monaco editor module fails after loader.js initializes', async ({ page }) => {
  const errors: string[] = [];
  const primaryEditorMainUrl = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs/editor/editor.main.js';
  const fallbackRequests: string[] = [];

  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(primaryEditorMainUrl, (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/javascript',
      body: '/* primary editor.main unavailable */',
    })
  );
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('https://unpkg.com/monaco-editor@0.55.1/min/vs/')) {
      fallbackRequests.push(url);
    }
  });

  await page.goto('/fallback-editor-assets');

  await expect(page.getByTestId('fallback-editor-assets')).toHaveText('fallback-editor-assets-ok', {
    timeout: monacoReadyTimeout,
  });
  expect(fallbackRequests.some((url) => url.endsWith('/editor/editor.main.js'))).toBe(true);
  expect(errors).toEqual([]);
});
