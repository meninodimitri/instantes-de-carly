// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:4173';

test.describe('Validação Rigorosa das 3 Correções do Usuário', () => {

  test('1. Botão Topbar "Concluir Seleção" no PC (1280px) não fica espremido em círculo 36px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/galeria?album=yan-gordinho&preview=1`);
    await page.waitForTimeout(600);

    const btnFinish = page.locator('#btn-finish-selection-top');
    await expect(btnFinish).toBeVisible();

    const btnBox = await btnFinish.boundingBox();
    expect(btnBox).not.toBeNull();
    // No PC, o botão deve ser uma pílula larga (min-width >= 130px), NUNCA um círculo de 36px
    expect(btnBox.width).toBeGreaterThanOrEqual(130);
    expect(btnBox.height).toBeGreaterThanOrEqual(36);

    const labelEl = btnFinish.locator('.btn-label');
    await expect(labelEl).toBeVisible();
    await expect(labelEl).toContainText('Concluir seleção');

    // Seleciona uma foto e verifica que o botão permanece pílula larga
    const firstHeart = page.locator('.masonry-tile .tile-heart-btn').first();
    await firstHeart.click();
    await page.waitForTimeout(300);

    const btnBoxAfter = await btnFinish.boundingBox();
    expect(btnBoxAfter.width).toBeGreaterThanOrEqual(130);
  });

  test('2. Alternância de Marca d\'Água no Painel Admin (Texto <-> Logo) não reverte para Texto', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/admin.html?local=1`);
    await page.waitForTimeout(400);

    const gate = page.locator('#auth-gate');
    if (await gate.isVisible()) {
      const btnLocal = page.locator('#btn-enter-local');
      if (await btnLocal.isVisible()) {
        await btnLocal.click();
      }
    }
    await expect(gate).toBeHidden();

    // Clica no primeiro álbum de cliente da lista lateral
    const firstAlbumBtn = page.locator('[data-sidebar-album-id]').first();
    await expect(firstAlbumBtn).toBeVisible();
    await firstAlbumBtn.click();
    await page.waitForTimeout(400);

    // Clica na sub-aba Marca d'Água & Proteção
    await page.locator('[data-alb-subtab="protection"]').click();
    await page.waitForTimeout(400);

    const btnImageMode = page.locator('[data-wm-mode="image"]');
    const btnTextMode = page.locator('[data-wm-mode="text"]');
    await expect(btnImageMode).toBeVisible();
    await expect(btnTextMode).toBeVisible();

    // Alterna para Texto
    await btnTextMode.click();
    await page.waitForTimeout(400);
    await expect(btnTextMode).toHaveClass(/active/);
    await expect(page.locator('#wm-text-input')).toBeVisible();

    // Alterna de volta para Sua Logo (PNG/SVG)
    await btnImageMode.click();
    await page.waitForTimeout(400);

    // Confirma que "Sua Logo" FICOU ATIVA e a caixa de upload de logo apareceu (não reverteu)
    await expect(btnImageMode).toHaveClass(/active/);
    await expect(page.locator('.alb-wm-thumb-box')).toBeVisible();
  });

  test('3. Confirmação de Zero Álbuns de Teste Residuais em SITE_DATA', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin.html?local=1`);
    await page.waitForTimeout(500);

    const clientAlbums = await page.evaluate(() => window.SITE_DATA?.clientAlbums || []);
    expect(clientAlbums.length).toBe(2);
    expect(clientAlbums.some(a => a.id && a.id.startsWith('alb_demo_'))).toBe(false);
  });

});
