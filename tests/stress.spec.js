// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:4173';

test.describe('4. Validação & Stress Tests Globais', () => {

  test('Auditoria de Console: Zero erros não tratados de JS e Zero 404 em todas as páginas', async ({ page }) => {
    const errorLogs = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon.ico') && !text.includes('net::ERR_ABORTED')) {
          errorLogs.push(text);
        }
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // 1. Visita index.html
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    // 2. Visita admin.html
    await page.goto(`${BASE_URL}/admin.html`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    // 3. Visita galeria.html
    await page.goto(`${BASE_URL}/galeria.html`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    expect(pageErrors, `Erros não capturados de JavaScript detectados: ${pageErrors.join(', ')}`).toHaveLength(0);
    expect(errorLogs, `Erros de console detectados: ${errorLogs.join(', ')}`).toHaveLength(0);
  });

  test('Stress de Resize: Alternância rápida de resoluções sem corromper layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    const sizes = [
      { width: 320, height: 568 },
      { width: 1920, height: 1080 },
      { width: 375, height: 667 },
      { width: 1440, height: 900 },
      { width: 768, height: 1024 },
      { width: 1280, height: 800 }
    ];

    for (const s of sizes) {
      await page.setViewportSize(s);
      await page.waitForTimeout(100);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflow, `Overflow em ${s.width}x${s.height}`).toBe(false);
    }
  });

});
