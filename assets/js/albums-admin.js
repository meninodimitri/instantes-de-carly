/**
 * ============================================================================
 * PAINEL ADMINISTRATIVO — GESTOR DE ÁLBUNS DE CLIENTES (SINETO + PIXIESET)
 * Integra com admin.html + sincroniza o Preview Vivo automaticamente com galeria.html
 * ============================================================================
 */
(function () {
  'use strict';

  let albumsState = null;
  let selectedAlbumId = null;
  let showPaymentDrawer = false;

  function formatBRL(val) {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function notifyAdminToast(msg) {
    const container = document.getElementById('cms-toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'cms-toast toast-success';
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  function slugify(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `album-${Date.now().toString().slice(-4)}`;
  }

  function getActiveAlbum() {
    if (!albumsState || !Array.isArray(albumsState.albums)) return null;
    let found = albumsState.albums.find((a) => a.id === selectedAlbumId);
    if (!found && albumsState.albums.length > 0) {
      found = albumsState.albums[0];
      selectedAlbumId = found.id;
    }
    return found || null;
  }

  function updateSidebarBadge() {
    const badge = document.getElementById('count-albums');
    if (badge && albumsState?.albums) {
      badge.textContent = String(albumsState.albums.length);
    }
  }

  const galeriaRoute = window.location.protocol === 'file:' ? 'galeria.html' : 'galeria';

  function syncPreviewIframeForAlbums() {
    const iframe = document.getElementById('cms-preview-iframe');
    const albumsTabBtn = document.querySelector('.sidebar-tab[data-tab="albums"]');
    if (!iframe || !albumsTabBtn) return;

    const isAlbumsActive = albumsTabBtn.classList.contains('active');
    if (isAlbumsActive) {
      const alb = getActiveAlbum();
      const targetUrl = alb
        ? `${galeriaRoute}?id=${encodeURIComponent(alb.slug)}&preview=1`
        : galeriaRoute;
      if (!iframe.getAttribute('src')?.startsWith(targetUrl)) {
        iframe.setAttribute('src', targetUrl);
      }
    } else if (iframe.getAttribute('src')?.includes('galeria')) {
      iframe.setAttribute('src', 'index.html?cmsPreview=1');
    }
  }

  function getStatusMeta(album) {
    if (album.phase === 'delivery' || album.status === 'delivered') {
      return { label: '✨ Entregue em Alta', cls: 'st-deliv' };
    }
    if (album.status === 'selection_paid') {
      return { label: '✅ Extras Pagas • Pronto p/ Editar', cls: 'st-paid' };
    }
    if (album.status === 'awaiting_pix_confirm') {
      return { label: '⏳ Confirmar Pix Direto', cls: 'st-pix' };
    }
    if (album.status === 'selection_completed') {
      return { label: '✅ Seleção Concluída', cls: 'st-paid' };
    }
    return { label: '🔍 Aguardando Seleção', cls: 'st-wait' };
  }

  function renderAlbumsAdminPanel() {
    const panel = document.getElementById('panel-albums');
    if (!panel || !albumsState) return;

    updateSidebarBadge();
    const albums = albumsState.albums || [];
    const activeAlbum = getActiveAlbum();

    const waitingCount = albums.filter((a) => a.phase === 'proofing' && !a.selectionLocked).length;
    const readyEditCount = albums.filter((a) => a.phase === 'proofing' && a.selectionLocked).length;
    const deliveredCount = albums.filter((a) => a.phase === 'delivery').length;
    const extraRevenue = albums.reduce((acc, a) => {
      if (a.paymentOrder && a.paymentOrder.status === 'approved') {
        return acc + Number(a.paymentOrder.totalAmount || 0);
      }
      return acc;
    }, 0);

    const payCfg = albumsState.paymentConfig || {};

    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <span class="panel-kicker">Área do Cliente • Sineto Studio + Pixieset Integrados</span>
          <h2 class="panel-title">Álbuns de Seleção, Venda de Extras &amp; Entrega</h2>
          <p class="panel-desc">
            Crie galerias privadas com marca d'água automática para o cliente selecionar as fotos do pacote, cobre fotos extras com segurança (Mercado Pago ou Pix Direto) e depois vire a chave para Galeria de Entrega em Alta Resolução.
          </p>
        </div>
      </div>

      <!-- KPIs Rápidos do Estúdio -->
      <div class="alb-kpi-grid">
        <div class="alb-kpi-card">
          <span>Álbuns Ativos</span>
          <strong>${albums.length}</strong>
        </div>
        <div class="alb-kpi-card">
          <span>Em Seleção</span>
          <strong>${waitingCount}</strong>
        </div>
        <div class="alb-kpi-card">
          <span>Prontos p/ Editar</span>
          <strong>${readyEditCount}</strong>
        </div>
        <div class="alb-kpi-card">
          <span>Entregues</span>
          <strong>${deliveredCount}</strong>
        </div>
        <div class="alb-kpi-card">
          <span>Extras Aprovadas</span>
          <strong style="color: #19613B;">${formatBRL(extraRevenue)}</strong>
        </div>
      </div>

      <!-- Barra de Ações Gerais -->
      <div class="alb-top-toolbar">
        <button type="button" id="btn-create-client-album" class="cms-btn cms-btn-primary">
          <span>+ Novo Álbum de Cliente</span>
        </button>
        <button type="button" id="btn-toggle-pay-drawer" class="cms-btn cms-btn-outline">
          <span>⚙️ Recebimentos (Pix &amp; Mercado Pago)</span>
        </button>
        <button type="button" id="btn-reset-demo-albums" class="cms-btn cms-btn-outline">
          <span>↺ Restaurar Exemplos de Teste</span>
        </button>
      </div>

      <!-- Gaveta de Configuração de Pagamentos -->
      ${showPaymentDrawer ? `
        <div class="alb-section-box" style="background: #FDF6DF; border-color: rgba(231, 195, 120, 0.6);">
          <h3>🔒 Configurações de Pagamento Seguro de Fotos Extras</h3>
          <div class="field-grid">
            <div class="field-group">
              <label class="field-label">Chave Pix Oficial do Estúdio (Modo 0% Taxa)</label>
              <input type="text" id="cfg-pix-key" class="cms-input" value="${escapeHtml(payCfg.pixKey || '')}" placeholder="CPF, CNPJ, E-mail ou Telefone" />
            </div>
            <div class="field-group">
              <label class="field-label">Nome do Recebedor no Banco</label>
              <input type="text" id="cfg-pix-name" class="cms-input" value="${escapeHtml(payCfg.merchantName || '')}" />
            </div>
          </div>
          <div class="field-grid" style="margin-top: 10px;">
            <div class="field-group">
              <label class="field-label">Cidade (Padrão Banco Central)</label>
              <input type="text" id="cfg-pix-city" class="cms-input" value="${escapeHtml(payCfg.merchantCity || 'FORTALEZA')}" />
            </div>
            <div class="field-group">
              <label class="field-label">Mercado Pago (Produção Vercel)</label>
              <input type="text" class="cms-input" value="Ativo via MP_ACCESS_TOKEN (/api/checkout)" disabled />
            </div>
          </div>
          <p class="field-hint" style="margin-top: 8px;">
            Em produção na Vercel, o token secreto <code>MP_ACCESS_TOKEN</code> fica guardado no servidor (nunca exposto no navegador) e confirma pagamentos Pix/Cartão via Webhook assinado em <code>/api/webhooks/mercadopago</code>.
          </p>
          <button type="button" id="btn-save-pay-cfg" class="cms-btn cms-btn-primary cms-btn-sm" style="margin-top: 10px;">
            Salvar Dados de Recebimento
          </button>
        </div>
      ` : ''}

      <!-- Seletor Horizontal de Álbuns -->
      <div class="alb-switcher-list">
        ${albums.map((alb) => {
          const st = getStatusMeta(alb);
          const calc = window.AlbumsStore.calculateSelectionPricing(alb);
          return `
            <button type="button" class="alb-pill-item ${alb.id === activeAlbum?.id ? 'active' : ''}" data-pick-alb="${escapeHtml(alb.id)}">
              <span class="alb-status-tag ${st.cls}">${escapeHtml(st.label)}</span>
              <strong>${escapeHtml(alb.clientName)}</strong>
              <span class="alb-pill-meta">
                /${escapeHtml(alb.slug)} • ${(alb.photos || []).length} fotos (${calc.selectedCount} escolhidas)
              </span>
            </button>
          `;
        }).join('')}
      </div>

      ${activeAlbum ? renderActiveAlbumDetailHtml(activeAlbum) : '<p>Crie seu primeiro álbum de cliente acima.</p>'}
    `;

    bindAlbumsAdminEvents();
    syncPreviewIframeForAlbums();
  }

  function renderActiveAlbumDetailHtml(album) {
    const calc = window.AlbumsStore.calculateSelectionPricing(album);
    const lr = window.AlbumsStore.formatLightroomCodes(album);
    const commentsEntries = Object.entries(album.photoComments || {}).filter(([, txt]) => String(txt || '').trim());
    const galleryUrl = `${window.location.origin}${window.location.pathname.replace(/admin(\.html)?$/i, '')}${galeriaRoute}?id=${encodeURIComponent(album.slug)}`;

    return `
      <!-- Chave Unificada: Fase 1 (Sineto Seleção) <-> Fase 2 (Pixieset Entrega) -->
      <div class="alb-phase-toggle-bar">
        <button type="button" class="alb-phase-btn ${album.phase === 'proofing' ? 'active' : ''}" data-set-phase="proofing">
          🔍 Fase 1: Seleção de Provas (Marca d'Água + Extras)
        </button>
        <button type="button" class="alb-phase-btn ${album.phase === 'delivery' ? 'active' : ''}" data-set-phase="delivery">
          ✨ Fase 2: Galeria de Entrega Final (Alta + .ZIP)
        </button>
      </div>

      <!-- Compartilhamento Rápido com o Cliente -->
      <div class="alb-section-box" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
        <div>
          <strong style="font-size: 0.88rem;">Link Exclusivo do Cliente:</strong>
          <div style="font-size: 0.8rem; color: #3B7293; word-break: break-all;">${escapeHtml(galleryUrl)}</div>
          <span class="field-hint">Senha: <strong>${escapeHtml(album.password || 'Sem senha')}</strong> • PIN Download: <strong>${escapeHtml(album.downloadPin || 'Livre')}</strong></span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          <button type="button" id="btn-copy-whatsapp-invite" class="cms-btn cms-btn-gold cms-btn-sm">
            📲 Copiar Convite c/ Senha p/ WhatsApp
          </button>
          <a href="${galeriaRoute}?id=${encodeURIComponent(album.slug)}" target="_blank" rel="noopener" class="cms-btn cms-btn-outline cms-btn-sm">
            Abrir como Cliente ↗
          </a>
        </div>
      </div>

      <!-- Painel de Seleção, Pagamento de Extras & Código Lightroom -->
      <div class="alb-section-box">
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
          <h3>❤️ Acompanhamento da Seleção &amp; Lightroom (${calc.selectedCount} escolhidas)</h3>
          ${album.selectionLocked ? `
            <button type="button" id="btn-unlock-selection" class="cms-btn cms-btn-outline cms-btn-sm">
              🔓 Reabrir Seleção p/ Cliente
            </button>
          ` : ''}
        </div>

        <p style="margin: 0 0 10px; font-size: 0.84rem; color: #465564;">
          Pacote: <strong>${calc.includedSelected}/${calc.packageIncluded} inclusas</strong>
          ${calc.hasExtras ? ` • <strong style="color: #9D6E15;">+${calc.extraCount} fotos extras (${formatBRL(calc.extraTotal)})</strong>` : ' • Sem fotos extras até o momento'}
        </p>

        ${album.status === 'awaiting_pix_confirm' && album.paymentOrder ? `
          <div style="background: #FFF4D9; border: 1px solid #E7C378; padding: 12px 14px; border-radius: 10px; margin-bottom: 12px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
            <div style="font-size: 0.83rem;">
              <strong>⏳ Pix Direto Aguardando Confirmação (${escapeHtml(album.paymentOrder.id)}):</strong><br />
              Valor esperado no seu extrato: <strong>${formatBRL(album.paymentOrder.totalAmount)}</strong> (${album.paymentOrder.extraCount} fotos extras).
            </div>
            <button type="button" id="btn-approve-direct-pix" class="cms-btn cms-btn-primary cms-btn-sm">
              ✅ Confirmar Pix Recebido
            </button>
          </div>
        ` : ''}

        ${album.status === 'selection_paid' && album.paymentOrder ? `
          <div style="background: #DFF5E8; color: #165434; padding: 10px 14px; border-radius: 10px; margin-bottom: 12px; font-size: 0.82rem; font-weight: 600;">
            ✅ Pagamento de ${formatBRL(album.paymentOrder.totalAmount)} confirmado (${album.paymentOrder.extraCount} fotos extras liberadas)!
          </div>
        ` : ''}

        <div class="alb-lr-box">
          <strong style="font-size: 0.78rem;">Código pronto para filtrar no Adobe Lightroom Classic (Biblioteca &gt; Texto &gt; Nome do Arquivo):</strong>
          <div class="alb-lr-code">
            <input type="text" id="lr-code-output" class="cms-input" readonly value="${escapeHtml(lr.lightroomComma || 'Nenhuma foto selecionada ainda')}" />
            <button type="button" id="btn-copy-lr-code" class="cms-btn cms-btn-primary cms-btn-sm" ${lr.count === 0 ? 'disabled' : ''}>
              📋 Copiar Lightroom
            </button>
          </div>
        </div>

        ${commentsEntries.length > 0 ? `
          <div style="margin-top: 14px;">
            <strong style="font-size: 0.8rem;">💬 Observações de Edição deixadas pelo Cliente (${commentsEntries.length}):</strong>
            <ul class="alb-notes-list">
              ${commentsEntries.map(([pid, note]) => {
                const ph = (album.photos || []).find((p) => p.id === pid);
                return `<li><strong>${escapeHtml(ph?.filename || pid)}:</strong> ${escapeHtml(note)}</li>`;
              }).join('')}
            </ul>
          </div>
        ` : ''}
      </div>

      <!-- Configurações de Regras do Pacote, Senha, PIN e Textos -->
      <div class="alb-section-box">
        <h3>⚙️ Regras do Pacote, Senha &amp; Dados do Ensaio</h3>
        <div class="field-grid">
          <div class="field-group">
            <label class="field-label">Nome do Cliente</label>
            <input type="text" id="alb-in-client" class="cms-input" value="${escapeHtml(album.clientName)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Código do Link (/galeria?id=...)</label>
            <input type="text" id="alb-in-slug" class="cms-input" value="${escapeHtml(album.slug)}" />
          </div>
        </div>

        <div class="field-grid" style="margin-top: 10px;">
          <div class="field-group">
            <label class="field-label">Título Editorial do Álbum</label>
            <input type="text" id="alb-in-title" class="cms-input" value="${escapeHtml(album.title)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Subtítulo / Local do Ensaio</label>
            <input type="text" id="alb-in-sub" class="cms-input" value="${escapeHtml(album.subtitle || '')}" />
          </div>
        </div>

        <div class="field-grid" style="margin-top: 10px;">
          <div class="field-group">
            <label class="field-label">Nome do Pacote Contratado</label>
            <input type="text" id="alb-in-pkgname" class="cms-input" value="${escapeHtml(album.packageName || 'Ensaio')}" />
          </div>
          <div class="field-group">
            <label class="field-label">Fotos Inclusas no Pacote (Limite)</label>
            <input type="number" min="0" id="alb-in-included" class="cms-input" value="${Number(album.packageIncluded) || 0}" />
          </div>
        </div>

        <div class="field-grid" style="margin-top: 10px;">
          <div class="field-group">
            <label class="field-label">Valor por Foto Extra (R$)</label>
            <input type="number" min="0" step="0.50" id="alb-in-extraprice" class="cms-input" value="${Number(album.extraPhotoPrice || 0).toFixed(2)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Senha do Álbum (Acesso)</label>
            <input type="text" id="alb-in-password" class="cms-input" value="${escapeHtml(album.password || '')}" placeholder="Ex: 1234" />
          </div>
        </div>

        <div class="field-grid" style="margin-top: 10px;">
          <div class="field-group">
            <label class="field-label">PIN de Download 4 Dígitos (Estilo Pixieset)</label>
            <input type="text" maxlength="6" id="alb-in-pin" class="cms-input" value="${escapeHtml(album.downloadPin || '')}" placeholder="Ex: 7788" />
          </div>
          <div class="field-group" style="justify-content: flex-end;">
            <label class="toggle-check-row" style="padding-bottom: 10px;">
              <input type="checkbox" id="alb-in-watermark" ${album.watermarkEnabled !== false ? 'checked' : ''} />
              <span>Aplicar Marca d'Água Automática nas Provas</span>
            </label>
          </div>
        </div>

        <div class="field-group" style="margin-top: 10px;">
          <label class="field-label">Mensagem Afetiva de Boas-Vindas</label>
          <textarea id="alb-in-welcome" class="cms-textarea" rows="2">${escapeHtml(album.welcomeMessage || '')}</textarea>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px;">
          <button type="button" id="btn-save-album-meta" class="cms-btn cms-btn-primary">
            Salvar Configurações do Álbum
          </button>
          <button type="button" id="btn-delete-album" class="cms-btn cms-btn-danger cms-btn-sm">
            Excluir Álbum
          </button>
        </div>
      </div>

      <!-- Upload & Grade de Fotografias do Álbum -->
      <div class="alb-section-box">
        <h3>📸 Fotografias do Álbum (${(album.photos || []).length})</h3>
        <div class="upload-box" style="padding: 18px; margin-bottom: 12px;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;">
            <div>
              <strong>Enviar Novas Fotos (Prova com Marca d'Água + Original p/ Entrega)</strong>
              <p class="field-hint" style="margin: 4px 0 0;">
                O sistema gera automaticamente a versão protegida com marca d'água para seleção e guarda a alta resolução para a entrega final.
              </p>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="text" id="alb-upload-folder" class="cms-input" style="width: 155px;" placeholder="Momento (ex: Praia)" value="Ensaio" />
              <input type="file" id="alb-upload-input" accept="image/jpeg,image/png,image/webp" multiple hidden />
              <button type="button" id="btn-trigger-alb-upload" class="cms-btn cms-btn-gold">
                + Subir Fotos
              </button>
            </div>
          </div>
          <div id="alb-upload-status" class="field-hint" style="margin-top: 8px; font-weight: 600; color: #3B7293;" hidden></div>
        </div>

        <div class="alb-photos-admin-grid">
          ${(album.photos || []).map((p) => {
            const isPicked = (album.selectedIds || []).includes(p.id);
            const isCover = album.coverSrc === p.originalSrc;
            return `
              <div class="alb-adm-photo-card ${isPicked ? 'is-client-picked' : ''}">
                <div class="alb-adm-thumb-wrap">
                  <img src="${escapeHtml(p.originalSrc)}" alt="${escapeHtml(p.filename)}" loading="lazy" />
                  ${isPicked ? '<span class="alb-adm-picked-badge">❤️ Escolhida</span>' : ''}
                  ${isCover ? '<span class="alb-adm-cover-badge">★ Capa</span>' : ''}
                </div>
                <div class="alb-adm-card-body">
                  <strong style="word-break: break-all;">${escapeHtml(p.filename)}</strong>
                  <input
                    type="text"
                    class="cms-input js-photo-folder-in"
                    data-photo-id="${escapeHtml(p.id)}"
                    value="${escapeHtml(p.folder || '')}"
                    placeholder="Momento/Pasta"
                    style="padding: 5px 8px; font-size: 0.73rem;"
                  />
                  <div style="display: flex; gap: 4px;">
                    <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-set-alb-cover" data-photo-id="${escapeHtml(p.id)}" style="flex: 1; padding: 4px 6px; font-size: 0.7rem;">
                      ${isCover ? '★ Capa' : '☆ Capa'}
                    </button>
                    <button type="button" class="cms-btn cms-btn-danger cms-btn-sm js-del-alb-photo" data-photo-id="${escapeHtml(p.id)}" style="padding: 4px 8px; font-size: 0.7rem;">
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Histórico de Atividades e Downloads do Cliente -->
      <div class="alb-section-box">
        <h3>📋 Registro de Acessos, Seleções &amp; Downloads</h3>
        <ul class="alb-log-list">
          ${(album.activityLog || []).map((entry) => {
            const dt = new Date(entry.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            return `<li><time>${escapeHtml(dt)}</time> ${escapeHtml(entry.text)}</li>`;
          }).join('') || '<li>Nenhuma atividade registrada ainda.</li>'}
        </ul>
      </div>
    `;
  }

  function bindAlbumsAdminEvents() {
    const panel = document.getElementById('panel-albums');
    if (!panel) return;

    panel.querySelectorAll('[data-pick-alb]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedAlbumId = btn.getAttribute('data-pick-alb');
        renderAlbumsAdminPanel();
      });
    });

    document.getElementById('btn-toggle-pay-drawer')?.addEventListener('click', () => {
      showPaymentDrawer = !showPaymentDrawer;
      renderAlbumsAdminPanel();
    });

    document.getElementById('btn-save-pay-cfg')?.addEventListener('click', async () => {
      albumsState.paymentConfig = {
        ...albumsState.paymentConfig,
        pixKey: document.getElementById('cfg-pix-key')?.value.trim() || '',
        merchantName: document.getElementById('cfg-pix-name')?.value.trim() || '',
        merchantCity: document.getElementById('cfg-pix-city')?.value.trim() || 'FORTALEZA'
      };
      await window.AlbumsStore.saveState(albumsState);
      showPaymentDrawer = false;
      renderAlbumsAdminPanel();
      notifyAdminToast('✅ Configurações de recebimento Pix salvas!');
    });

    document.getElementById('btn-reset-demo-albums')?.addEventListener('click', async () => {
      albumsState = await window.AlbumsStore.resetToDemo();
      selectedAlbumId = albumsState.albums[0]?.id || null;
      renderAlbumsAdminPanel();
      notifyAdminToast('↺ Álbuns de demonstração restaurados!');
    });

    document.getElementById('btn-create-client-album')?.addEventListener('click', async () => {
      const brand = window.AlbumsStore.getBrandDefaults();
      const num = (albumsState.albums?.length || 0) + 1;
      const clientName = `Novo Cliente #${num}`;
      const newAlb = {
        id: `alb_${Date.now()}`,
        slug: slugify(`ensaio-cliente-${num}`),
        clientName,
        title: `${clientName} — Ensaio Fotográfico`,
        subtitle: 'Fortaleza, Ceará',
        shootDate: new Date().toISOString().slice(0, 10),
        welcomeMessage: 'Escolham com carinho suas fotografias favoritas deste momento especial!',
        phase: 'proofing',
        status: 'awaiting_selection',
        password: String(Math.floor(1000 + Math.random() * 9000)),
        downloadPin: String(Math.floor(1000 + Math.random() * 9000)),
        packageName: 'Ensaio Simples',
        packageIncluded: 10,
        extraPhotoPrice: 20.00,
        watermarkEnabled: true,
        watermarkText: brand.studioName.toUpperCase(),
        coverSrc: 'assets/images/real/IMG_1186.jpg',
        coverFocal: 'center 35%',
        allowComments: true,
        selectionLocked: false,
        selectedIds: [],
        deliveryFavorites: [],
        photoComments: {},
        paymentOrder: null,
        activityLog: [
          { at: new Date().toISOString(), type: 'created', text: 'Novo álbum criado no painel do estúdio.' }
        ],
        photos: []
      };
      albumsState.albums.unshift(newAlb);
      selectedAlbumId = newAlb.id;
      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast('✨ Novo álbum criado! Configure o pacote e envie as fotos.');
    });

    const activeAlbum = getActiveAlbum();
    if (!activeAlbum) return;

    // Alternar Fase Unificada (Seleção <-> Entrega Final)
    panel.querySelectorAll('[data-set-phase]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nextPhase = btn.getAttribute('data-set-phase');
        if (activeAlbum.phase === nextPhase) return;
        activeAlbum.phase = nextPhase;
        if (nextPhase === 'delivery') {
          activeAlbum.status = 'delivered';
          activeAlbum.activityLog.unshift({
            at: new Date().toISOString(),
            type: 'delivered',
            text: 'Álbum alterado para Galeria de Entrega Final (Alta Resolução).'
          });
        } else if (activeAlbum.status === 'delivered') {
          activeAlbum.status = activeAlbum.selectionLocked ? 'selection_completed' : 'awaiting_selection';
        }
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
        const iframe = document.getElementById('cms-preview-iframe');
        if (iframe) iframe.contentWindow?.location.reload();
        notifyAdminToast(nextPhase === 'delivery'
          ? '✨ Álbum publicado como Galeria de Entrega Final!'
          : '🔍 Álbum em modo de Seleção de Provas.');
      });
    });

    // Copiar convite formatado para WhatsApp
    document.getElementById('btn-copy-whatsapp-invite')?.addEventListener('click', () => {
      const baseUrl = `${window.location.origin}${window.location.pathname.replace(/admin(\.html)?$/i, '')}${galeriaRoute}?id=${encodeURIComponent(activeAlbum.slug)}`;
      const msg = activeAlbum.phase === 'proofing'
        ? `Olá, ${activeAlbum.clientName}! ✨\nAs prévias do seu ensaio já estão prontas para escolha!\n\n🔗 Link: ${baseUrl}\n🔑 Senha: ${activeAlbum.password}\n📸 Seu pacote inclui ${activeAlbum.packageIncluded} fotos (fotos extras opcionais saem a ${formatBRL(activeAlbum.extraPhotoPrice)} cada).`
        : `Olá, ${activeAlbum.clientName}! ✨\nSeu álbum final em Alta Resolução está pronto para ver e baixar!\n\n🔗 Link: ${baseUrl}\n🔑 Senha: ${activeAlbum.password}\n⬇️ PIN de Download: ${activeAlbum.downloadPin}`;
      navigator.clipboard?.writeText(msg);
      notifyAdminToast('📲 Convite com link e senha copiado para colar no WhatsApp!');
    });

    // Copiar código Lightroom
    document.getElementById('btn-copy-lr-code')?.addEventListener('click', () => {
      const val = document.getElementById('lr-code-output')?.value || '';
      navigator.clipboard?.writeText(val);
      notifyAdminToast('📋 Lista copiada! Cole no filtro de Nome do Arquivo do Lightroom.');
    });

    // Reabrir seleção para cliente
    document.getElementById('btn-unlock-selection')?.addEventListener('click', async () => {
      activeAlbum.selectionLocked = false;
      activeAlbum.status = 'awaiting_selection';
      activeAlbum.activityLog.unshift({
        at: new Date().toISOString(),
        type: 'reopened',
        text: 'Seleção reaberta pela fotógrafa para ajustes do cliente.'
      });
      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast('🔓 Seleção reaberta para o cliente!');
    });

    // Aprovar Pix Direto em 1 clique
    document.getElementById('btn-approve-direct-pix')?.addEventListener('click', async () => {
      activeAlbum.status = 'selection_paid';
      if (activeAlbum.paymentOrder) {
        activeAlbum.paymentOrder.status = 'approved';
        activeAlbum.paymentOrder.paidAt = new Date().toISOString();
      }
      activeAlbum.activityLog.unshift({
        at: new Date().toISOString(),
        type: 'payment',
        text: `Pix Direto confirmado manualmente no painel (${formatBRL(activeAlbum.paymentOrder?.totalAmount)}).`
      });
      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast('✅ Pagamento Pix confirmado!');
    });

    // Salvar metadados do álbum
    document.getElementById('btn-save-album-meta')?.addEventListener('click', async () => {
      activeAlbum.clientName = document.getElementById('alb-in-client')?.value.trim() || activeAlbum.clientName;
      activeAlbum.slug = slugify(document.getElementById('alb-in-slug')?.value || activeAlbum.clientName);
      activeAlbum.title = document.getElementById('alb-in-title')?.value.trim() || activeAlbum.clientName;
      activeAlbum.subtitle = document.getElementById('alb-in-sub')?.value.trim() || '';
      activeAlbum.packageName = document.getElementById('alb-in-pkgname')?.value.trim() || 'Ensaio';
      activeAlbum.packageIncluded = Math.max(0, parseInt(document.getElementById('alb-in-included')?.value, 10) || 0);
      activeAlbum.extraPhotoPrice = Math.max(0, Number(document.getElementById('alb-in-extraprice')?.value) || 0);
      activeAlbum.password = document.getElementById('alb-in-password')?.value.trim() || '';
      activeAlbum.downloadPin = document.getElementById('alb-in-pin')?.value.trim() || '';
      activeAlbum.watermarkEnabled = Boolean(document.getElementById('alb-in-watermark')?.checked);
      activeAlbum.welcomeMessage = document.getElementById('alb-in-welcome')?.value.trim() || '';

      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast('💾 Configurações do álbum atualizadas!');
    });

    // Excluir álbum
    document.getElementById('btn-delete-album')?.addEventListener('click', async () => {
      if (!window.confirm(`Tem certeza que deseja excluir o álbum de "${activeAlbum.clientName}"?`)) return;
      albumsState.albums = albumsState.albums.filter((a) => a.id !== activeAlbum.id);
      selectedAlbumId = albumsState.albums[0]?.id || null;
      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast('Álbum removido.');
    });

    // Upload em lote de novas fotos
    const fileInput = document.getElementById('alb-upload-input');
    document.getElementById('btn-trigger-alb-upload')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      const folderName = document.getElementById('alb-upload-folder')?.value.trim() || 'Ensaio';
      const statusEl = document.getElementById('alb-upload-status');
      if (statusEl) statusEl.hidden = false;

      for (let i = 0; i < files.length; i++) {
        if (statusEl) {
          statusEl.textContent = `Processando foto ${i + 1} de ${files.length} (gerando prova com marca d'água)...`;
        }
        const processed = await window.AlbumsStore.processUploadedAlbumFile(files[i], {
          watermarkText: activeAlbum.watermarkText
        });
        const newPhoto = {
          id: `ph_${Date.now()}_${i}`,
          filename: processed.filename,
          folder: folderName,
          originalSrc: processed.originalSrc,
          proofSrc: processed.proofSrc
        };
        activeAlbum.photos.push(newPhoto);
        if (activeAlbum.photos.length === 1) {
          activeAlbum.coverSrc = newPhoto.originalSrc;
        }
      }

      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast(`📸 ${files.length} ${files.length === 1 ? 'foto adicionada' : 'fotos adicionadas'} ao álbum!`);
    });

    // Editar momento/pasta, capa e exclusão individual de fotos
    panel.querySelectorAll('.js-photo-folder-in').forEach((inp) => {
      inp.addEventListener('change', async () => {
        const pid = inp.getAttribute('data-photo-id');
        const ph = (activeAlbum.photos || []).find((p) => p.id === pid);
        if (ph) {
          ph.folder = inp.value.trim();
          await window.AlbumsStore.saveState(albumsState);
        }
      });
    });

    panel.querySelectorAll('.js-set-alb-cover').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pid = btn.getAttribute('data-photo-id');
        const ph = (activeAlbum.photos || []).find((p) => p.id === pid);
        if (ph) {
          activeAlbum.coverSrc = ph.originalSrc;
          await window.AlbumsStore.saveState(albumsState);
          renderAlbumsAdminPanel();
          notifyAdminToast('★ Foto definida como Capa do Álbum!');
        }
      });
    });

    panel.querySelectorAll('.js-del-alb-photo').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pid = btn.getAttribute('data-photo-id');
        activeAlbum.photos = (activeAlbum.photos || []).filter((p) => p.id !== pid);
        activeAlbum.selectedIds = (activeAlbum.selectedIds || []).filter((id) => id !== pid);
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    albumsState = await window.AlbumsStore.loadState();
    selectedAlbumId = albumsState.albums?.[0]?.id || null;
    renderAlbumsAdminPanel();

    // Observa cliques nas abas laterais do Admin para alternar o Preview Vivo entre Site e Galeria do Cliente
    document.querySelectorAll('.sidebar-tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        setTimeout(syncPreviewIframeForAlbums, 20);
      });
    });

    // Atualiza o Admin ao vivo assim que o cliente seleciona fotos, paga extras ou baixa o .ZIP!
    window.AlbumsStore.subscribe(async () => {
      albumsState = await window.AlbumsStore.loadState();
      renderAlbumsAdminPanel();
    });
  });
})();

