// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:4173';

test.describe('3. Área Privada do Cliente (galeria.html)', () => {

  test('Tela de Acesso: Glassmorphism translúcido neutro, logo centralizada e sem sombras', async ({ page }) => {
    // Limpa localStorage e sessionStorage para garantir tela de senha bloqueada
    await page.goto(`${BASE_URL}/galeria`);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto(`${BASE_URL}/galeria?album=ana-e-lucas`);
    await page.waitForTimeout(600);

    const gate = page.locator('#password-view');
    await expect(gate).toBeVisible();

    const pwCard = gate.locator('.auth-fullscreen-card');
    await expect(pwCard).toBeVisible();

    // Verifica que não há sombras de texto nos títulos de login
    const heading = pwCard.locator('.auth-heading');
    const headingShadow = await heading.evaluate(el => getComputedStyle(el).textShadow);
    expect(headingShadow).toBe('none');

    // Verifica que a logo está visível
    const brandLogo = pwCard.locator('.auth-brand-link img');
    await expect(brandLogo).toBeVisible();

    // Digita senha errada
    const pwInput = page.locator('#pw-input');
    await pwInput.fill('senha-incorreta-123');
    await page.locator('#password-form button[type="submit"]').click();

    const pwError = page.locator('#pw-error');
    await expect(pwError).toBeVisible();
    await expect(pwError).toContainText(/incorreta/i);
  });

  test('Desbloqueio com senha correta e renderização da Capa Pixieset', async ({ page }) => {
    await page.goto(`${BASE_URL}/galeria`);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Usa marina-e-pedro que está na fase 'delivery' (Entrega Final com Capa Pixieset)
    await page.goto(`${BASE_URL}/galeria?album=marina-e-pedro`);
    await page.waitForTimeout(600);

    // Digita senha correta (1234)
    const pwInput = page.locator('#pw-input');
    await pwInput.fill('1234');
    await page.locator('#password-form button[type="submit"]').click();
    await page.waitForTimeout(800);

    // O álbum deve abrir
    const albumView = page.locator('#album-view');
    await expect(albumView).toBeVisible();

    const deliveryHero = page.locator('#delivery-hero');
    await expect(deliveryHero).toBeVisible();

    // Zero filtro escuro ativo sobre a foto
    const scrim = page.locator('.pixieset-cover-scrim');
    const scrimDisplay = await scrim.evaluate(el => getComputedStyle(el).display);
    expect(scrimDisplay).toBe('none');

    // Título da capa NÃO possui sombra de texto
    const title = page.locator('#delivery-hero-title');
    const titleShadow = await title.evaluate(el => getComputedStyle(el).textShadow);
    expect(titleShadow).toBe('none');
  });

  test('Capa Retângulo Vertical: moldura esbelta, autor interno e botão com sublinhado', async ({ page }) => {
    await page.goto(`${BASE_URL}/galeria?album=marina-e-pedro&preview=1`);
    await page.waitForTimeout(600);

    // Configura capa para retangulo via evaluate
    await page.evaluate(() => {
      const albView = document.getElementById('album-view');
      if (albView) albView.hidden = false;
      const hero = document.getElementById('delivery-hero');
      if (hero) {
        hero.hidden = false;
        hero.setAttribute('data-cover', 'retangulo');
      }

      const boxAuthor = document.getElementById('delivery-box-author');
      const boxDate = document.getElementById('delivery-box-date');
      if (boxAuthor) {
        boxAuthor.textContent = 'CARLIANE CARVALHO';
        boxAuthor.style.display = 'block';
      }
      if (boxDate) {
        boxDate.textContent = '31 DE OUTUBRO DE 2026';
        boxDate.style.display = 'block';
      }
    });

    await page.waitForTimeout(300);

    const coverBox = page.locator('.pixieset-cover-box');
    const boxStyles = await coverBox.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        border: cs.border,
        background: cs.backgroundColor,
        backdropFilter: cs.backdropFilter,
        display: cs.display,
        flexDirection: cs.flexDirection
      };
    });

    // Moldura branca fina
    expect(boxStyles.border).toContain('rgba(255, 255, 255');
    // Fundo 100% transparente
    expect(boxStyles.background).toBe('rgba(0, 0, 0, 0)');
    // Zero desfoque
    expect(boxStyles.backdropFilter).toBe('none');
    expect(boxStyles.display).toBe('flex');
    expect(boxStyles.flexDirection).toBe('column');

    // Autor dentro da caixa no topo visível
    const boxAuthor = page.locator('#delivery-box-author');
    await expect(boxAuthor).toBeVisible();
    await expect(boxAuthor).toContainText('CARLIANE CARVALHO');

    // Botão com sublinhado
    const btnCover = page.locator('#btn-scroll-gallery');
    const btnBorderBottom = await btnCover.evaluate(el => getComputedStyle(el).borderBottom);
    expect(btnBorderBottom).toContain('rgb(255, 255, 255)');
  });

  test('Anti-Print: intercepta atalhos e abre modal de direito autoral com fonte formal desacoplada', async ({ page }) => {
    await page.goto(`${BASE_URL}/galeria?album=marina-e-pedro&preview=1`);
    await page.waitForTimeout(600);

    // Simula fonte cursiva ativa no álbum e dispara evento de PrintScreen
    await page.evaluate(() => {
      document.body.style.setProperty('--font-display', "'Alex Brush', cursive");
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'PrintScreen', keyCode: 44, bubbles: true }));
    });

    await page.waitForTimeout(300);

    const copyModal = page.locator('#modal-copyright');
    await expect(copyModal).toBeVisible();

    // Verifica que o título do modal é formal em Plus Jakarta Sans (não herdou a cursiva)
    const copyTitle = copyModal.locator('.copyright-title');
    const copyTitleFont = await copyTitle.evaluate(el => getComputedStyle(el).fontFamily);
    expect(copyTitleFont).toContain('Plus Jakarta Sans');

    // Verifica que o botão do modal também é formal
    const copyBtn = copyModal.locator('.gal-btn-copyright');
    const copyBtnFont = await copyBtn.evaluate(el => getComputedStyle(el).fontFamily);
    expect(copyBtnFont).toContain('Plus Jakarta Sans');

    // Fecha o modal clicando em "Entendi"
    await copyBtn.click();
    await expect(copyModal).not.toBeVisible();
  });

  test('Fase 1 (Seleção de Provas): seleção de favoritos e cálculo de fotos extras', async ({ page }) => {
    // Desbloqueia ana-e-lucas no sessionStorage e acessa diretamente
    await page.goto(`${BASE_URL}/galeria`);
    await page.evaluate(() => {
      sessionStorage.setItem('unlocked_alb_alb_demo_selecao_01', '1234');
    });

    await page.goto(`${BASE_URL}/galeria?album=ana-e-lucas`);
    await page.waitForTimeout(800);

    // Clica no primeiro coração para selecionar uma foto
    const firstTile = page.locator('.masonry-tile').first();
    await expect(firstTile).toBeVisible();

    const favBtn = firstTile.locator('.tile-heart-btn');
    await favBtn.click();
    await page.waitForTimeout(300);

    // Contador da topbar deve refletir o formato da franquia (ex: Selecionadas: 3 / 5)
    const selStat = page.locator('#top-sel-stat');
    await expect(selStat).toBeVisible();
    await expect(selStat).toContainText(/Selecionadas:\s*\d+\s*\/\s*5/);
  });

  test('Checkout Modal: suporte a pagamento duplo (Mercado Pago e Pix Direto ao estúdio)', async ({ page }) => {
    await page.goto(`${BASE_URL}/galeria`);
    await page.evaluate(() => {
      sessionStorage.setItem('unlocked_alb_alb_demo_selecao_01', '1234');
    });

    await page.goto(`${BASE_URL}/galeria?album=ana-e-lucas`);
    await page.waitForTimeout(600);

    // Seleciona fotos suficientes para gerar excedente (6 fotos no total, pacote = 5)
    const hearts = page.locator('.masonry-tile .tile-heart-btn');
    const heartCount = await hearts.count();
    for (let i = 0; i < Math.min(6, heartCount); i++) {
      const isFav = await hearts.nth(i).evaluate(el => el.classList.contains('active'));
      if (!isFav) {
        await hearts.nth(i).click();
        await page.waitForTimeout(150);
      }
    }

    // Abre modal de checkout clicando em Concluir Seleção na topbar
    const finishBtn = page.locator('#btn-finish-selection-top');
    await expect(finishBtn).toBeVisible();
    await finishBtn.click();
    await page.waitForTimeout(400);

    // Modal de checkout visível
    const chkDialog = page.locator('#checkout-dialog');
    await expect(chkDialog).toBeVisible();

    // Box de pagamento de extras exibido
    const payBox = page.locator('#chk-payment-box');
    await expect(payBox).toBeVisible();

    // Abas de pagamento: Mercado Pago e Pix Direto
    const tabMp = page.locator('.pay-tab[data-pay-tab="mp"]');
    const tabDirect = page.locator('.pay-tab[data-pay-tab="direct"]');
    await expect(tabMp).toBeVisible();
    await expect(tabDirect).toBeVisible();
    await expect(tabMp).toHaveClass(/active/);

    // Painel Mercado Pago ativo por padrão com QR code e botão de cartão
    const paneMp = page.locator('#pay-pane-mp');
    await expect(paneMp).toBeVisible();
    const btnCard = page.locator('#btn-mp-card-link');
    await expect(btnCard).toBeVisible();
    await expect(btnCard).toContainText('Pagar com cartão de crédito');

    // Alterna para aba Pix Direto ao estúdio (0% taxa)
    await tabDirect.click();
    await page.waitForTimeout(200);
    await expect(tabDirect).toHaveClass(/active/);

    // Painel Pix Direto visível com chave e botão de envio no WhatsApp
    const paneDirect = page.locator('#pay-pane-direct');
    await expect(paneDirect).toBeVisible();
    const btnDirectConfirm = page.locator('#btn-confirm-direct-pix');
    await expect(btnDirectConfirm).toBeVisible();
    await expect(btnDirectConfirm).toContainText('Já realizei o Pix');

    // Fecha modal
    await page.locator('#chk-close').click();
    await page.waitForTimeout(200);
    await expect(chkDialog).not.toBeVisible();
  });

});
