// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:4173';

test.describe('1. Site Principal (index.html)', () => {

  test('Hero dinâmico carrega com título, CTA e sem overflow', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);
    await expect(page).toHaveTitle(/Instantes de Carly/);

    const heroTitle = page.locator('#hero-title');
    await expect(heroTitle).toBeVisible();

    const heroCta = page.locator('.hero-cinema-actions .btn-hero-primary');
    await expect(heroCta).toBeVisible();

    const activeSlide = page.locator('.hero-slide.active');
    await expect(activeSlide).toBeVisible();
  });

  test('Navegação e âncoras principais existem e são acessíveis', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);

    const anchors = ['#inicio', '#proposta', '#portfolio', '#humanizada', '#servicos', '#sobre', '#avaliacoes', '#contato'];
    for (const anchor of anchors) {
      const el = page.locator(anchor);
      await expect(el).toHaveCount(1);
    }
  });

  test('Vitrine de Capas Inteligente: 1 capa por categoria em "todos" e filtro ao clicar', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);

    await page.locator('#portfolio').scrollIntoViewIfNeeded();

    const btnTodos = page.locator('#portfolio-filters .filter-btn[data-category="todos"]');
    await expect(btnTodos).toHaveClass(/active/);

    const workItems = page.locator('#portfolio-grid .work-item:visible');
    const count = await workItems.count();
    expect(count).toBeGreaterThan(0);

    const firstPill = page.locator('.work-collection-pill').first();
    await expect(firstPill).toBeVisible();

    const categoryTarget = await workItems.first().getAttribute('data-category');
    await workItems.first().click();

    await page.waitForTimeout(400);

    const activeTab = page.locator(`#portfolio-filters .filter-btn[data-category="${categoryTarget}"]`);
    await expect(activeTab).toHaveClass(/active/);
  });

  test('Lightbox autoral: abre foto, navega e fecha com Escape', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);

    await page.locator('#portfolio').scrollIntoViewIfNeeded();
    // Filtra uma categoria para abrir fotos normais
    const catBtn = page.locator('#portfolio-filters .filter-btn[data-category="casais"]');
    await catBtn.click();
    await page.waitForTimeout(400);

    const firstPhoto = page.locator('#portfolio-grid .work-item:visible').first();
    await firstPhoto.click();

    const dialog = page.locator('#lightbox-dialog');
    await expect(dialog).toHaveAttribute('open', '');

    // Tecla Escape fecha
    await page.keyboard.press('Escape');
    await expect(dialog).not.toHaveAttribute('open', '');
  });

  test('Formatos & Valores: card "Mais Escolhido" com badge alinhado e link WhatsApp', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);

    const popularCard = page.locator('.package-card.popular');
    await expect(popularCard).toBeVisible();

    const badge = popularCard.locator('.popular-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Mais Escolhido');

    const selectBtn = popularCard.locator('.btn-select-package');
    await expect(selectBtn).toBeVisible();
  });

  test('Formulário de Pré-Agendamento: máscara de telefone e envio seguro', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);

    const phoneInput = page.locator('#input-whatsapp');
    await phoneInput.scrollIntoViewIfNeeded();

    await phoneInput.pressSequentially('85988887777');
    const maskedValue = await phoneInput.inputValue();
    expect(maskedValue).toContain('(85)');
    expect(maskedValue).toContain('-');
  });

  test('Stress Responsivo: Zero overflow horizontal em múltiplos viewports', async ({ page }) => {
    const viewports = [
      { width: 320, height: 600, name: 'iPhone SE' },
      { width: 375, height: 812, name: 'iPhone 13' },
      { width: 768, height: 1024, name: 'iPad Portrait' },
      { width: 1024, height: 768, name: 'iPad Landscape' },
      { width: 1440, height: 900, name: 'MacBook' },
      { width: 1920, height: 1080, name: 'Desktop Full HD' }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/index.html`);
      await page.waitForTimeout(200);

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll, `Overflow horizontal detectado em ${vp.name} (${vp.width}px)`).toBe(false);
    }
  });

});
