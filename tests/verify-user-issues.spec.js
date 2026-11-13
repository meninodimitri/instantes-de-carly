// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:4173';

async function forcePhase1SelectionDataJs(page) {
  await page.route('**/assets/js/data.js*', async route => {
    const resp = await route.fetch();
    let body = await resp.text();
    body += `\n;(function(){ if (window.SITE_DATA && Array.isArray(window.SITE_DATA.clientAlbums)) { window.SITE_DATA.clientAlbums.forEach(a => { a.phase = 'proofing'; a.selectionLocked = false; a.selectedIds = []; a.photoComments = {}; a.status = 'awaiting_selection'; a.paymentOrder = null; }); } })();\n`;
    await route.fulfill({ response: resp, body });
  });
}

test.describe('Validação Rigorosa das Correções do Usuário', () => {

  test('1. Botão Topbar "Concluir Seleção" no PC (1280px) não fica espremido em círculo 36px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(() => {
      try { localStorage.clear(); } catch (e) {}
    });
    await forcePhase1SelectionDataJs(page);

    await page.goto(`${BASE_URL}/galeria?album=teste-definitivo&preview=1`);
    await page.waitForTimeout(600);

    const btnFinish = page.locator('#btn-finish-selection-top');
    await expect(btnFinish).toBeVisible();

    const btnBox = await btnFinish.boundingBox();
    expect(btnBox).not.toBeNull();
    expect(btnBox.width).toBeGreaterThanOrEqual(130);
    expect(btnBox.height).toBeGreaterThanOrEqual(36);

    const labelEl = btnFinish.locator('.btn-label');
    await expect(labelEl).toBeVisible();
    await expect(labelEl).toContainText(/Seleção concluída|Concluir seleção/);
  });

  test('2. Alternância de Marca d\'Água no Painel Admin (Texto <-> Logo) não reverte para Texto', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/admin.html?local=1`);
    await page.waitForTimeout(400);

    const gate = page.locator('#auth-gate');
    if (await gate.isVisible()) {
      const btnLocal = page.locator('#btn-enter-local');
      if (await btnLocal.isVisible()) await btnLocal.click();
    }
    await expect(gate).toBeHidden();

    const firstAlbumBtn = page.locator('[data-sidebar-album-id]').first();
    await expect(firstAlbumBtn).toBeVisible();
    await firstAlbumBtn.click();
    await page.waitForTimeout(400);

    await page.locator('[data-alb-subtab="protection"]').click();
    await page.waitForTimeout(400);

    const btnImageMode = page.locator('[data-wm-mode="image"]');
    const btnTextMode = page.locator('[data-wm-mode="text"]');
    await expect(btnImageMode).toBeVisible();
    await expect(btnTextMode).toBeVisible();

    await btnTextMode.click();
    await page.waitForTimeout(400);
    await expect(btnTextMode).toHaveClass(/active/);
    await expect(page.locator('#wm-text-input')).toBeVisible();

    await btnImageMode.click();
    await page.waitForTimeout(400);

    await expect(btnImageMode).toHaveClass(/active/);
    await expect(page.locator('.alb-wm-thumb-box')).toBeVisible();
  });

  test('3. Confirmação de Zero Álbuns de Teste Residuais em SITE_DATA', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin.html?local=1`);
    await page.waitForTimeout(500);

    const clientAlbums = await page.evaluate(() => window.SITE_DATA?.clientAlbums || []);
    expect(clientAlbums.length).toBeGreaterThanOrEqual(1);
    expect(clientAlbums.some(a => a.id && a.id.startsWith('alb_demo_'))).toBe(false);
  });

  test('4. Troca de Capa em Design & Capa atualiza o preview ao vivo e não trava/reverte', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 860 });
    await page.goto(`${BASE_URL}/admin.html?local=1`);
    await page.waitForTimeout(400);

    const gate = page.locator('#auth-gate');
    if (await gate.isVisible()) {
      const btnLocal = page.locator('#btn-enter-local');
      if (await btnLocal.isVisible()) await btnLocal.click();
    }
    await expect(gate).toBeHidden();

    await page.locator('#tab-btn-albums').click();
    await page.waitForTimeout(300);

    const firstAlbumBtn = page.locator('.sidebar-album-item[data-sidebar-album-id]').first();
    await firstAlbumBtn.click();
    await page.waitForTimeout(500);

    await page.locator('[data-alb-subtab="design"]').click();
    await page.waitForTimeout(500);

    const iframe = page.frameLocator('#cms-preview-iframe');

    for (const cover of ['centro', 'rotulo', 'romance', 'classico']) {
      await page.locator(`.pix-choice-item[data-design-cover="${cover}"]`).click();
      await expect(page.locator(`.pix-choice-item[data-design-cover="${cover}"]`)).toHaveClass(/active/);
      await expect(iframe.locator('#delivery-hero')).toHaveAttribute('data-cover', cover, { timeout: 3000 });
    }

    await page.locator('[data-alb-subtab="protection"]').click();
    await page.waitForTimeout(1000);
    await expect(iframe.locator('#delivery-hero')).toHaveAttribute('data-cover', 'classico');
  });

  test('5. Pagamento Mercado Pago fecha o modal automaticamente ao aprovar e sincroniza observações', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(() => {
      try { localStorage.clear(); } catch (e) {}
    });
    await forcePhase1SelectionDataJs(page);

    const selectionPosts = [];
    let paymentPollCount = 0;

    await page.route('**/api/checkout**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          paymentId: '99887766',
          amount: 1,
          pixCopyPaste: '00020101021226830014br.gov.bcb.pix0136mock-pix-payload-5204000053039865802BR5910Carly6009Fortaleza62070503***6304ABCD',
          pixQrBase64: '',
          checkoutUrl: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=mock-pref'
        })
      });
    });

    await page.route('**/api/payments**', async route => {
      paymentPollCount += 1;
      const isApproved = paymentPollCount >= 2;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          payments: [{
            id: '99887766',
            status: isApproved ? 'approved' : 'pending',
            amount: 1,
            paymentMethod: 'pix',
            albumId: 'alb_1794449405990',
            albumSlug: 'teste-definitivo',
            extraCount: 1,
            selectedIds: [],
            photoComments: {}
          }]
        })
      });
    });

    await page.route('**/api/selection**', async route => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        selectionPosts.push(body);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, status: body.status || 'selection_paid' })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false })
        });
      }
    });

    await page.goto(`${BASE_URL}/galeria?album=teste-definitivo&preview=1&mockCloud=1`);
    await page.waitForTimeout(700);

    // Abre Lightbox na 1ª foto e salva uma observação
    await page.locator('.masonry-tile .masonry-img-btn').first().click();
    await expect(page.locator('#gal-lightbox')).toBeVisible();
    await page.locator('#lb-comment-input').fill('Tratamento suave na pele, por favor!');
    await page.locator('#lb-save-comment').click();
    await page.waitForTimeout(250);
    await page.locator('#lb-close').click();

    // Seleciona 6 fotos para gerar 1 extra (franquia = 5)
    const hearts = page.locator('.masonry-tile .tile-heart-btn');
    const count = await hearts.count();
    for (let i = 0; i < Math.min(6, count); i++) {
      const active = await hearts.nth(i).evaluate(el => el.classList.contains('active'));
      if (!active) await hearts.nth(i).click();
    }

    // Abre Checkout
    await page.locator('#btn-finish-selection-top').click();
    const chkDialog = page.locator('#checkout-dialog');
    await expect(chkDialog).toBeVisible();
    await expect(page.locator('#mp-poll-status')).toBeVisible();

    // Polling a cada 3s detecta approved -> fecha modal automaticamente e exibe banner verde
    await expect(chkDialog).not.toBeVisible({ timeout: 9000 });
    await expect(page.locator('#proofing-locked-wrap')).toBeVisible();
    await expect(page.locator('#proofing-locked-banner')).toContainText(/Pagamento.*aprovado|libera/i);
    await expect(page.locator('#gal-toast')).toBeVisible();

    const finalPost = selectionPosts[selectionPosts.length - 1];
    expect(finalPost).toBeTruthy();
    expect(Object.values(finalPost.photoComments || {})).toContain('Tratamento suave na pele, por favor!');
  });

  test('6. Comentários de fotos do cliente sincronizam e aparecem no Painel Admin', async ({ page }) => {
    const fs = require('fs');
    const path = require('path');
    const dataTxt = fs.readFileSync(path.join(process.cwd(), 'assets/js/data.js'), 'utf8');
    const idMatch = dataTxt.match(/"id":\s*"(ph_[^"]+)"/);
    const targetPhotoId = idMatch ? idMatch[1] : 'ph_1794449607242_0';
    const albumMatch = dataTxt.match(/"clientAlbums":\s*\[\s*\{[\s\S]*?"id":\s*"(alb_[^"]+)"[\s\S]*?"slug":\s*"([^"]+)"/);
    const targetAlbumId = albumMatch ? albumMatch[1] : 'alb_1794449405990';
    const targetSlug = albumMatch ? albumMatch[2] : 'teste-definitivo';

    await page.setViewportSize({ width: 1280, height: 860 });

    const photoNote = 'Quero esta foto em preto e branco!';

    await page.route('**/api/selection**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          selections: [{
            id: 'sel_mock_note',
            albumId: targetAlbumId,
            slug: targetSlug,
            status: 'selection_paid',
            draftOnly: true,
            selectedIds: [],
            photoComments: { [targetPhotoId]: photoNote }
          }]
        })
      });
    });

    await page.route('**/api/payments**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          payments: []
        })
      });
    });

    await page.goto(`${BASE_URL}/admin?local=1&mockCloud=1`);
    await page.waitForTimeout(500);

    const gate = page.locator('#auth-gate');
    if (await gate.isVisible()) {
      const btnLocal = page.locator('#btn-enter-local');
      if (await btnLocal.isVisible()) await btnLocal.click();
    }
    await expect(gate).toBeHidden();

    await page.locator('#tab-btn-albums').click();
    await page.waitForTimeout(300);
    await page.locator('.sidebar-album-item[data-sidebar-album-id]').first().click();
    await page.waitForTimeout(400);

    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForTimeout(600);

    await page.locator('[data-alb-subtab="photos"]').click();
    await page.waitForTimeout(400);

    await expect(page.locator('#panel-albums')).toContainText(photoNote);
    await expect(page.locator('.alb-notes-clean-list')).toContainText(photoNote);
    await expect(page.locator('.alb-thumb-note-badge').first()).toBeVisible();
  });

});
