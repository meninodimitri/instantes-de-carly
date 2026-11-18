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

  test('Textos & Seções: editar os 3 pilares de Sobre Carly e sincronizar Avaliações Google', async ({ page }) => {
    await page.locator('button.sidebar-tab[data-tab="sections"]').click();
    await page.waitForTimeout(200);

    // 1. Sub-aba 05. Sobre Carly: os 3 pilares e título ético são editáveis e refletem no preview
    await page.locator('#sections-subtabs [data-subtab="sec-sobre"]').click();
    await page.waitForTimeout(250);

    const pilTitles = page.locator('.js-sb-pil-title');
    const pilDescs = page.locator('.js-sb-pil-desc');
    await expect(pilTitles).toHaveCount(3);
    await expect(pilDescs).toHaveCount(3);

    await pilTitles.first().fill('“Pessoas no centro de tudo”');
    await pilDescs.first().fill('Direção acolhedora respeitando seu ritmo natural.');
    await page.waitForTimeout(300);

    const iframe = page.frameLocator('#cms-preview-iframe');
    await expect(iframe.locator('.about-pillar-item h4').first()).toContainText('Pessoas no centro de tudo');
    await expect(iframe.locator('.about-pillar-item p').first()).toContainText('Direção acolhedora respeitando seu ritmo natural.');

    // 2. Sub-aba 06. Avaliações Google: botão de sincronizar, totais e adição manual
    await page.locator('#sections-subtabs [data-subtab="sec-avaliacoes"]').click();
    await page.waitForTimeout(250);

    await expect(page.locator('#btn-sync-google-reviews')).toBeVisible();
    await expect(page.locator('#f-gr-total')).toHaveValue('22');

    await page.locator('#btn-add-manual-review').click();
    await page.waitForTimeout(200);
    await page.locator('.js-rev-author').first().fill('Cliente Teste E2E');
    await page.locator('.js-rev-text').first().fill('Avaliação adicionada pelo painel admin!');
    await page.waitForTimeout(300);

    await expect(iframe.locator('#reviews-track')).toContainText('Cliente Teste E2E');
  });

  test('Resolução 2K (2560x1440): scroll e reordenação de fotos mantém topbar fixa sem travar fundo', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.locator('button.sidebar-tab[data-tab="portfolio"]').click();
    await page.waitForTimeout(300);

    await page.locator('.admin-cat-pill[data-filter-cat="todas"]').click();
    await page.waitForTimeout(300);

    const cards = page.locator('#portfolio-cards-list .photo-editor-card-v3');
    await expect(cards).toHaveCount(17);

    // Abre gavetas de várias fotos inferiores para criar lista longa e simular scroll em 2K
    for (const idx of [8, 9, 10, 11]) {
      await cards.nth(idx).locator('.js-toggle-port-drawer').click();
    }

    // Rola o painel editor até a 10ª foto
    await page.evaluate(() => {
      const pane = document.querySelector('.cms-editor-pane');
      if (pane) pane.scrollTop = pane.scrollHeight * 0.65;
    });
    await page.waitForTimeout(200);

    const tenthCardDownBtn = cards.nth(9).locator('.js-port-down');
    await tenthCardDownBtn.click();
    await page.waitForTimeout(350);

    // Verifica que a topbar permanece no topo (y === 0) e nenhum container externo rolou
    const shellMetrics = await page.evaluate(() => {
      const topbar = document.querySelector('.cms-topbar');
      const app = document.getElementById('cms-app');
      const ws = document.getElementById('cms-workspace');
      const pane = document.querySelector('.cms-editor-pane');
      return {
        winY: window.scrollY,
        docTop: document.documentElement.scrollTop,
        bodyTop: document.body.scrollTop,
        appTop: app ? app.scrollTop : -1,
        wsTop: ws ? ws.scrollTop : -1,
        topbarY: topbar ? Math.round(topbar.getBoundingClientRect().y) : -1,
        paneHeight: pane ? pane.clientHeight : 0,
        paneScrollHeight: pane ? pane.scrollHeight : 0
      };
    });

    expect(shellMetrics.winY).toBe(0);
    expect(shellMetrics.docTop).toBe(0);
    expect(shellMetrics.bodyTop).toBe(0);
    expect(shellMetrics.appTop).toBe(0);
    expect(shellMetrics.wsTop).toBe(0);
    expect(shellMetrics.topbarY).toBe(0);
    expect(shellMetrics.paneHeight).toBeGreaterThan(800);
    await expect(page.locator('#portfolio-cards-list .photo-editor-card-v3').first()).toBeVisible();
  });

});
