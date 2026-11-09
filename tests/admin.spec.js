// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:4173';

test.describe('2. Painel Administrativo Visual (admin.html)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/admin.html?local=1`);
    await page.waitForTimeout(300);
    const gate = page.locator('#auth-gate');
    if (await gate.isVisible()) {
      const btnLocal = page.locator('#btn-enter-local');
      if (await btnLocal.isVisible()) {
        await btnLocal.click();
      }
    }
    await expect(gate).toBeHidden();
  });

  test('Hidratação da marca e split-screen Editor + Preview', async ({ page }) => {
    // Topbar brand
    const brandTitle = page.locator('strong.topbar-title');
    await expect(brandTitle).toContainText('Instantes de Carly');

    // Split-screen editor e preview
    const editor = page.locator('main.cms-editor-pane');
    await expect(editor).toBeVisible();

    const preview = page.locator('#cms-preview-pane');
    await expect(preview).toBeVisible();

    const iframe = page.locator('#cms-preview-iframe');
    await expect(iframe).toBeVisible();
  });

  test('Recolhimento do Menu: Editor expande 240px à esquerda e preview permanece fixo', async ({ page }) => {
    const workspace = page.locator('#cms-workspace');
    const btnToggle = page.locator('#btn-toggle-sidebar');

    // Garante que o menu inicia aberto
    if (await workspace.evaluate(el => el.classList.contains('sidebar-collapsed'))) {
      await btnToggle.click();
      await page.waitForTimeout(200);
    }

    // Mede largura do preview e editor com menu aberto
    const previewBoxBefore = await page.locator('#cms-preview-pane').boundingBox();
    const editorBoxBefore = await page.locator('main.cms-editor-pane').boundingBox();

    // Clica para recolher o menu
    await btnToggle.click();
    await expect(workspace).toHaveClass(/sidebar-collapsed/);

    // Mede largura pós-recolhimento
    const previewBoxAfter = await page.locator('#cms-preview-pane').boundingBox();
    const editorBoxAfter = await page.locator('main.cms-editor-pane').boundingBox();

    // Editor deve ter ganho espaço para a esquerda (x menor ou width maior)
    expect(editorBoxAfter.x).toBeLessThan(editorBoxBefore.x);
    expect(editorBoxAfter.width).toBeGreaterThan(editorBoxBefore.width);

    // Preview deve manter largura idêntica (diferença <= 2px)
    const previewDiff = Math.abs(previewBoxBefore.width - previewBoxAfter.width);
    expect(previewDiff).toBeLessThanOrEqual(2);

    // Reabre o menu
    await btnToggle.click();
    await expect(workspace).not.toHaveClass(/sidebar-collapsed/);
  });

  test('Álbuns de Clientes: lista lateral, agrupamento e abertura do álbum', async ({ page }) => {
    await page.waitForTimeout(400);

    // Clica no primeiro álbum de cliente da lista lateral
    const firstAlbumBtn = page.locator('[data-sidebar-album-id]').first();
    await expect(firstAlbumBtn).toBeVisible();
    await firstAlbumBtn.click();
    await page.waitForTimeout(400);

    // Verifica que abriu o painel de álbuns com as sub-abas
    const subtabPhotos = page.locator('[data-alb-subtab="photos"]');
    const subtabDesign = page.locator('[data-alb-subtab="design"]');
    const subtabProt = page.locator('[data-alb-subtab="protection"]');
    const subtabPkg = page.locator('[data-alb-subtab="settings"]');

    await expect(subtabPhotos).toBeVisible();
    await expect(subtabDesign).toBeVisible();
    await expect(subtabProt).toBeVisible();
    await expect(subtabPkg).toBeVisible();
  });

  test('Editor de Capas: Retângulo Vertical e Contorno com mini-thumbnails fiéis', async ({ page }) => {
    await page.waitForTimeout(400);

    // Abre o primeiro álbum
    await page.locator('[data-sidebar-album-id]').first().click();
    await page.waitForTimeout(400);

    // Clica na sub-aba Design & Capa
    await page.locator('[data-alb-subtab="design"]').click();
    await page.waitForTimeout(400);

    // Verifica que 'retangulo' existe e exibe moldura com autor e underline
    const cardRetangulo = page.locator('[data-design-cover="retangulo"]');
    await expect(cardRetangulo).toBeVisible();

    const rectThumb = cardRetangulo.locator('.pix-mini-contorno-rect');
    await expect(rectThumb).toBeVisible();
    await expect(cardRetangulo.locator('.pix-mini-ret-author')).toBeVisible();
    await expect(cardRetangulo.locator('.pix-mini-underline')).toBeVisible();

    // Clica na opção Retângulo Vertical
    await cardRetangulo.click();
    await expect(cardRetangulo).toHaveClass(/active/);

    // Verifica que 'contorno' também existe e está calibrado
    const cardContorno = page.locator('[data-design-cover="contorno"]');
    await expect(cardContorno).toBeVisible();
  });

  test('Alternância Preview PC vs Preview Celular', async ({ page }) => {
    await page.waitForTimeout(300);

    const btnPreviewMobile = page.locator('button.preview-mode-btn[data-preview-mode="mobile"]');
    const btnPreviewPc = page.locator('button.preview-mode-btn[data-preview-mode="desktop"]');
    const workspace = page.locator('#cms-workspace');

    // Clica no modo celular
    await btnPreviewMobile.click();
    await expect(workspace).toHaveClass(/force-mobile-preview/);

    // Clica no modo PC
    await btnPreviewPc.click();
    await expect(workspace).not.toHaveClass(/force-mobile-preview/);
  });

  test('Portfólio: Vitrine do Acervo (7 capas) vs Todas as Fotos (17) e reordenação', async ({ page }) => {
    // Garante que está na aba Portfólio
    const tabPortfolio = page.locator('button.sidebar-tab[data-tab="portfolio"]');
    await tabPortfolio.click();
    await page.waitForTimeout(300);

    const pillVitrine = page.locator('.admin-cat-pill[data-filter-cat="vitrine"]');
    const pillTodas = page.locator('.admin-cat-pill[data-filter-cat="todas"]');

    // 1. Vitrine é a aba inicial ativa com 7 capas
    await expect(pillVitrine).toBeVisible();
    await expect(pillVitrine).toHaveClass(/active/);
    await expect(pillVitrine).toContainText('Vitrine do Acervo');

    const vitrineCards = page.locator('#portfolio-cards-list .is-vitrine-card');
    await expect(vitrineCards).toHaveCount(7);

    // O primeiro card tem botão de subir desabilitado e descer habilitado
    const firstUpBtn = vitrineCards.first().locator('.js-vitrine-up').first();
    const firstDownBtn = vitrineCards.first().locator('.js-vitrine-down').first();
    await expect(firstUpBtn).toBeDisabled();
    await expect(firstDownBtn).toBeEnabled();

    // 2. Alterna para "Todas as Fotos"
    await pillTodas.click();
    await expect(pillTodas).toHaveClass(/active/);
    await expect(pillVitrine).not.toHaveClass(/active/);

    const allCards = page.locator('#portfolio-cards-list .photo-editor-card-v3');
    await expect(allCards).toHaveCount(17);

    // 3. Volta para Vitrine e testa reordenação da primeira capa
    await pillVitrine.click();
    await expect(vitrineCards).toHaveCount(7);

    // Verifica que a ordem no Preview do site espelha 1:1 a ordem dos cartões do Admin
    const iframe = page.frameLocator('#cms-preview-iframe');
    await page.waitForTimeout(500);

    const adminTitlesBefore = await page.locator('#portfolio-cards-list .is-vitrine-card .js-port-title').evaluateAll(els => els.map(e => e.value.trim()));
    const previewTitlesBefore = await iframe.locator('#portfolio-grid .work-item .work-title').allTextContents();
    expect(previewTitlesBefore.map(t => t.trim())).toEqual(adminTitlesBefore);

    // Desce o primeiro item
    await firstDownBtn.click();
    await page.waitForTimeout(500);

    const adminTitlesAfter = await page.locator('#portfolio-cards-list .is-vitrine-card .js-port-title').evaluateAll(els => els.map(e => e.value.trim()));
    const previewTitlesAfter = await iframe.locator('#portfolio-grid .work-item .work-title').allTextContents();
    expect(previewTitlesAfter.map(t => t.trim())).toEqual(adminTitlesAfter);

    // O segundo item agora é o que era o primeiro antes
    expect(adminTitlesAfter[1]).toBe(adminTitlesBefore[0]);

    // 4. Teste de ajuste de enquadramento vertical em tempo real no Preview
    const cardDrawerBtn = vitrineCards.first().locator('.js-toggle-port-drawer');
    await cardDrawerBtn.click();
    await page.waitForTimeout(200);

    const focalSlider = vitrineCards.first().locator('.js-port-focal');
    await focalSlider.fill('75');
    await focalSlider.dispatchEvent('input');
    await page.waitForTimeout(200);

    const firstPreviewImg = iframe.locator('#portfolio-grid .work-item img.work-img').first();
    const focalStyle = await firstPreviewImg.evaluate((el) => el.style.objectPosition);
    expect(focalStyle).toBe('center 75%');
  });

});
