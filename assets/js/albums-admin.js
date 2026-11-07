/**
 * ============================================================================
 * PAINEL ADMINISTRATIVO — GESTOR DE ÁLBUNS DE CLIENTES (V2)
 * Seleção & Fotos Extras (estilo Sineto Studio) + Entrega Final (estilo Pixieset)
 * Inclui Upload de Marca d'Água Personalizada + 3 Níveis de Proteção com Prévia Viva
 * ============================================================================
 */
(function () {
  'use strict';

  let albumsState = null;
  let selectedAlbumId = null;
  let showPaymentDrawer = false;
  let previewRenderSeq = 0;

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
      return { label: 'Entregue em Alta', cls: 'st-deliv' };
    }
    if (album.status === 'selection_paid') {
      return { label: 'Extras Pagas · Pronto p/ Editar', cls: 'st-paid' };
    }
    if (album.status === 'awaiting_pix_confirm') {
      return { label: 'Confirmar Pix Direto', cls: 'st-pix' };
    }
    if (album.status === 'selection_completed') {
      return { label: 'Seleção Concluída', cls: 'st-paid' };
    }
    return { label: 'Aguardando Seleção', cls: 'st-wait' };
  }

  function getProtectionLabel(level) {
    if (level === 'watermark_blur') return 'Marca d\'Água + Desfoque';
    if (level === 'watermark_spotlight') return 'Marca d\'Água + Foco Centralizado';
    return 'Marca d\'Água';
  }

  async function refreshWatermarkSamplePreview() {
    const imgEl = document.getElementById('adm-wm-live-preview');
    const captionEl = document.getElementById('adm-wm-live-caption');
    if (!imgEl || !albumsState) return;

    const seq = ++previewRenderSeq;
    const activeAlbum = getActiveAlbum();
    const sampleSrc = activeAlbum?.photos?.[0]?.originalSrc || activeAlbum?.coverSrc || 'assets/images/real/IMG_7513.jpg';
    const level = activeAlbum?.protectionLevel || 'watermark';

    if (captionEl) {
      captionEl.textContent = getProtectionLabel(level);
    }

    try {
      const bundle = await window.AlbumsStore.generateProtectedProofBundle(
        sampleSrc,
        albumsState.watermarkConfig,
        level,
        640
      );
      if (seq === previewRenderSeq && imgEl.isConnected) {
        imgEl.src = bundle.primarySrc;
      }
    } catch (_) {
      if (seq === previewRenderSeq && imgEl.isConnected) {
        imgEl.src = sampleSrc;
      }
    }
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
          <span class="panel-kicker">Área Privada do Cliente</span>
          <h2 class="panel-title">Álbuns de Seleção, Proteção &amp; Entrega</h2>
          <p class="panel-desc">
            Envie o link privado do ensaio com sua marca d'água e o nível de proteção escolhido para o cliente selecionar as fotos do pacote, adquirir fotos extras e depois receber o álbum final em alta resolução.
          </p>
        </div>
      </div>

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

      <div class="alb-top-toolbar">
        <button type="button" id="btn-create-client-album" class="cms-btn cms-btn-primary">
          <span>+ Novo Álbum de Cliente</span>
        </button>
        <button type="button" id="btn-toggle-pay-drawer" class="cms-btn cms-btn-outline">
          <span>Configurar Pix &amp; Pagamentos</span>
        </button>
        <button type="button" id="btn-reset-demo-albums" class="cms-btn cms-btn-outline">
          <span>Restaurar Exemplos de Teste</span>
        </button>
      </div>

      ${showPaymentDrawer ? `
        <div class="alb-section-box" style="background: #FDF6DF; border-color: rgba(231, 195, 120, 0.6);">
          <h3>Recebimento Seguro de Fotos Extras</h3>
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
            Em produção na Vercel, o token secreto <code>MP_ACCESS_TOKEN</code> fica isolado no servidor e aprova Pix/Cartão via Webhook assinado em <code>/api/webhooks/mercadopago</code>.
          </p>
          <button type="button" id="btn-save-pay-cfg" class="cms-btn cms-btn-primary cms-btn-sm" style="margin-top: 10px;">
            Salvar Dados de Recebimento
          </button>
        </div>
      ` : ''}

      <div class="alb-switcher-list">
        ${albums.map((alb) => {
          const st = getStatusMeta(alb);
          const calc = window.AlbumsStore.calculateSelectionPricing(alb);
          return `
            <button type="button" class="alb-pill-item ${alb.id === activeAlbum?.id ? 'active' : ''}" data-pick-alb="${escapeHtml(alb.id)}">
              <span class="alb-status-tag ${st.cls}">${escapeHtml(st.label)}</span>
              <strong>${escapeHtml(alb.clientName)}</strong>
              <span class="alb-pill-meta">
                /${escapeHtml(alb.slug)} · ${(alb.photos || []).length} fotos (${calc.selectedCount} escolhidas)
              </span>
            </button>
          `;
        }).join('')}
      </div>

      ${activeAlbum ? renderActiveAlbumDetailHtml(activeAlbum) : '<p>Crie seu primeiro álbum de cliente acima.</p>'}
    `;

    bindAlbumsAdminEvents();
    syncPreviewIframeForAlbums();
    refreshWatermarkSamplePreview();
  }

  function renderActiveAlbumDetailHtml(album) {
    const calc = window.AlbumsStore.calculateSelectionPricing(album);
    const lr = window.AlbumsStore.formatLightroomCodes(album);
    const wm = albumsState.watermarkConfig || {};
    const wmMode = wm.mode === 'text' ? 'text' : 'image';
    const wmPattern = wm.pattern === 'center' ? 'center' : 'tiled';
    const wmOpacityPct = Math.round((Number(wm.opacity) || 0.45) * 100);
    const wmScalePct = Math.round((Number(wm.scale) || 0.28) * 100);
    const activeProt = album.protectionLevel || 'watermark';

    const commentsEntries = Object.entries(album.photoComments || {}).filter(([, txt]) => String(txt || '').trim());
    const galleryUrl = `${window.location.origin}${window.location.pathname.replace(/admin(\.html)?$/i, '')}${galeriaRoute}?id=${encodeURIComponent(album.slug)}`;

    return `
      <!-- Chave Unificada: Fase 1 (Seleção Sineto) <-> Fase 2 (Entrega Pixieset) -->
      <div class="alb-phase-toggle-bar">
        <button type="button" class="alb-phase-btn ${album.phase === 'proofing' ? 'active' : ''}" data-set-phase="proofing">
          Fase 1 · Seleção de Provas (Protegida + Extras)
        </button>
        <button type="button" class="alb-phase-btn ${album.phase === 'delivery' ? 'active' : ''}" data-set-phase="delivery">
          Fase 2 · Entrega Final (Alta Resolução + .ZIP)
        </button>
      </div>

      <!-- Link Exclusivo do Cliente -->
      <div class="alb-section-box" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
        <div>
          <strong style="font-size: 0.86rem;">Link Privado deste Álbum:</strong>
          <div style="font-size: 0.8rem; color: #3B7293; word-break: break-all;">${escapeHtml(galleryUrl)}</div>
          <span class="field-hint">Senha de Acesso: <strong>${escapeHtml(album.password || 'Sem senha')}</strong> · PIN de Download Final: <strong>${escapeHtml(album.downloadPin || 'Livre')}</strong></span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          <button type="button" id="btn-copy-whatsapp-invite" class="cms-btn cms-btn-gold cms-btn-sm">
            Copiar Convite p/ WhatsApp
          </button>
          <a href="${galeriaRoute}?id=${encodeURIComponent(album.slug)}" target="_blank" rel="noopener" class="cms-btn cms-btn-outline cms-btn-sm">
            Abrir como Cliente ↗
          </a>
        </div>
      </div>

      <!-- PROTEÇÃO DE IMAGEM & MARCA D'ÁGUA DO ESTÚDIO -->
      <div class="alb-section-box">
        <div style="display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 10px;">
          <h3 style="margin: 0;">Marca d'Água &amp; Nível de Proteção das Provas</h3>
          <span class="field-hint">Gravada diretamente nos pixels (sem botão de download na Fase 1)</span>
        </div>

        <div class="alb-protection-grid" role="radiogroup" aria-label="Nível de proteção das provas">
          <button type="button" class="alb-prot-card ${activeProt === 'watermark' ? 'active' : ''}" data-set-prot="watermark">
            <div class="alb-prot-card-top">
              <strong>Marca d'Água</strong>
              <span class="alb-prot-dot"></span>
            </div>
            <span>Fotografia nítida em resolução de prova com sua marca d'água aplicada.</span>
          </button>

          <button type="button" class="alb-prot-card ${activeProt === 'watermark_blur' ? 'active' : ''}" data-set-prot="watermark_blur">
            <div class="alb-prot-card-top">
              <strong>Marca d'Água + Desfoque</strong>
              <span class="alb-prot-dot"></span>
            </div>
            <span>Miniaturas desfocadas anti-print; no zoom o cliente segura o clique para inspecionar.</span>
          </button>

          <button type="button" class="alb-prot-card ${activeProt === 'watermark_spotlight' ? 'active' : ''}" data-set-prot="watermark_spotlight">
            <div class="alb-prot-card-top">
              <strong>Marca d'Água + Foco Centralizado</strong>
              <span class="alb-prot-dot"></span>
            </div>
            <span>Centro em foco nítido com bordas desfocadas e lupa circular interativa ao ampliar.</span>
          </button>
        </div>

        <div class="alb-wm-studio-layout">
          <div>
            <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px;">
              <div>
                <span class="field-label" style="margin-bottom: 4px; display: block;">Formato da Marca d'Água</span>
                <div class="alb-seg-row">
                  <button type="button" class="alb-seg-btn ${wmMode === 'image' ? 'active' : ''}" data-wm-mode="image">Sua Logo (PNG/SVG)</button>
                  <button type="button" class="alb-seg-btn ${wmMode === 'text' ? 'active' : ''}" data-wm-mode="text">Texto do Estúdio</button>
                </div>
              </div>

              <div>
                <span class="field-label" style="margin-bottom: 4px; display: block;">Disposição na Foto</span>
                <div class="alb-seg-row">
                  <button type="button" class="alb-seg-btn ${wmPattern === 'tiled' ? 'active' : ''}" data-wm-pattern="tiled">Grade Repetida</button>
                  <button type="button" class="alb-seg-btn ${wmPattern === 'center' ? 'active' : ''}" data-wm-pattern="center">Centralizada</button>
                </div>
              </div>
            </div>

            ${wmMode === 'image' ? `
              <div class="alb-wm-thumb-box">
                <div class="alb-wm-thumb-checker">
                  <img src="${escapeHtml(wm.imageSrc || 'assets/images/logo-light.png')}" alt="Marca d'água atual" />
                </div>
                <div style="flex: 1; min-width: 140px;">
                  <strong style="display: block; font-size: 0.8rem;">Arquivo da Marca d'Água</strong>
                  <span style="font-size: 0.72rem; color: rgba(255,253,243,0.72);">PNG ou SVG com fundo transparente recomendado</span>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  <input type="file" id="wm-file-upload" accept="image/png,image/webp,image/svg+xml,image/jpeg" hidden />
                  <button type="button" id="btn-upload-wm-img" class="cms-btn cms-btn-gold cms-btn-sm">
                    Subir Marca d'Água
                  </button>
                  <button type="button" id="btn-reset-wm-default" class="cms-btn alb-btn-dark-ghost cms-btn-sm" title="Voltar para a logo clara padrão do site">
                    Logo Padrão
                  </button>
                </div>
              </div>
            ` : `
              <div class="field-group" style="margin-bottom: 12px;">
                <label class="field-label" for="wm-text-input">Texto da Marca d'Água</label>
                <input type="text" id="wm-text-input" class="cms-input" value="${escapeHtml(wm.text || '')}" placeholder="Ex: INSTANTES DE CARLY · PROVA" />
              </div>
            `}

            <div class="alb-slider-row">
              <div>
                <label class="field-label" for="wm-opacity-range" style="display: flex; justify-content: space-between; gap: 8px;">
                  <span>Opacidade</span>
                  <strong id="wm-opacity-val" style="font-variant-numeric: tabular-nums;">${wmOpacityPct}%</strong>
                </label>
                <input type="range" id="wm-opacity-range" min="15" max="85" step="5" value="${wmOpacityPct}" />
              </div>
              <div>
                <label class="field-label" for="wm-scale-range" style="display: flex; justify-content: space-between; gap: 8px;">
                  <span>Tamanho da Marca</span>
                  <strong id="wm-scale-val" style="font-variant-numeric: tabular-nums;">${wmScalePct}%</strong>
                </label>
                <input type="range" id="wm-scale-range" min="15" max="60" step="3" value="${wmScalePct}" />
              </div>
            </div>
          </div>

          <div class="alb-wm-preview-card">
            <img id="adm-wm-live-preview" src="${escapeHtml(album.coverSrc || 'assets/images/real/IMG_7513.jpg')}" alt="Prévia real da proteção na fotografia" />
            <div class="alb-wm-preview-caption">
              <span>Prévia real no álbum</span>
              <strong id="adm-wm-live-caption">${escapeHtml(getProtectionLabel(activeProt))}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Seleção do Cliente, Pagamento de Extras & Código Lightroom -->
      <div class="alb-section-box">
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
          <h3>Seleção do Cliente &amp; Filtro Lightroom (${calc.selectedCount} escolhidas)</h3>
          ${album.selectionLocked ? `
            <button type="button" id="btn-unlock-selection" class="cms-btn cms-btn-outline cms-btn-sm">
              Reabrir Seleção p/ Cliente
            </button>
          ` : ''}
        </div>

        <p style="margin: 0 0 10px; font-size: 0.84rem; color: #465564; font-variant-numeric: tabular-nums;">
          Pacote contratado: <strong>${calc.includedSelected}/${calc.packageIncluded} inclusas</strong>
          ${calc.hasExtras ? ` · <strong style="color: #9D6E15;">+${calc.extraCount} fotos extras (${formatBRL(calc.extraTotal)})</strong>` : ' · Sem fotos extras até o momento'}
        </p>

        ${album.status === 'awaiting_pix_confirm' && album.paymentOrder ? `
          <div style="background: #FFF4D9; border: 1px solid #E7C378; padding: 12px 14px; border-radius: 10px; margin-bottom: 12px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
            <div style="font-size: 0.83rem;">
              <strong>Pix Direto aguardando confirmação (${escapeHtml(album.paymentOrder.id)}):</strong><br />
              Valor esperado: <strong>${formatBRL(album.paymentOrder.totalAmount)}</strong> (${album.paymentOrder.extraCount} fotos extras).
            </div>
            <button type="button" id="btn-approve-direct-pix" class="cms-btn cms-btn-primary cms-btn-sm">
              Confirmar Pix Recebido
            </button>
          </div>
        ` : ''}

        ${album.status === 'selection_paid' && album.paymentOrder ? `
          <div style="background: #DFF5E8; color: #165434; padding: 10px 14px; border-radius: 10px; margin-bottom: 12px; font-size: 0.82rem; font-weight: 600;">
            Pagamento de ${formatBRL(album.paymentOrder.totalAmount)} confirmado (${album.paymentOrder.extraCount} fotos extras liberadas).
          </div>
        ` : ''}

        <div class="alb-lr-box">
          <strong style="font-size: 0.78rem;">Filtro para Adobe Lightroom Classic (Biblioteca &gt; Texto &gt; Nome do Arquivo):</strong>
          <div class="alb-lr-code">
            <input type="text" id="lr-code-output" class="cms-input" readonly value="${escapeHtml(lr.lightroomComma || 'Nenhuma foto selecionada ainda')}" />
            <button type="button" id="btn-copy-lr-code" class="cms-btn cms-btn-primary cms-btn-sm" ${lr.count === 0 ? 'disabled' : ''}>
              Copiar Lista
            </button>
          </div>
        </div>

        ${commentsEntries.length > 0 ? `
          <div style="margin-top: 14px;">
            <strong style="font-size: 0.8rem;">Observações deixadas pelo cliente (${commentsEntries.length}):</strong>
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
        <h3>Pacote, Valor de Foto Extra &amp; Acesso</h3>
        <div class="field-grid">
          <div class="field-group">
            <label class="field-label" for="alb-in-client">Nome do Cliente</label>
            <input type="text" id="alb-in-client" class="cms-input" value="${escapeHtml(album.clientName)}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="alb-in-slug">Código do Link (/galeria?id=...)</label>
            <input type="text" id="alb-in-slug" class="cms-input" value="${escapeHtml(album.slug)}" />
          </div>
        </div>

        <div class="field-grid" style="margin-top: 10px;">
          <div class="field-group">
            <label class="field-label" for="alb-in-title">Título do Álbum</label>
            <input type="text" id="alb-in-title" class="cms-input" value="${escapeHtml(album.title)}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="alb-in-sub">Subtítulo / Data &amp; Local</label>
            <input type="text" id="alb-in-sub" class="cms-input" value="${escapeHtml(album.subtitle || '')}" />
          </div>
        </div>

        <div class="field-grid" style="margin-top: 10px;">
          <div class="field-group">
            <label class="field-label" for="alb-in-pkgname">Pacote Contratado</label>
            <input type="text" id="alb-in-pkgname" class="cms-input" value="${escapeHtml(album.packageName || 'Ensaio')}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="alb-in-included">Qtd. Fotos Inclusas no Pacote</label>
            <input type="number" min="0" id="alb-in-included" class="cms-input" value="${Number(album.packageIncluded) || 0}" />
          </div>
        </div>

        <div class="field-grid" style="margin-top: 10px;">
          <div class="field-group">
            <label class="field-label" for="alb-in-extraprice">Valor por Foto Extra (R$)</label>
            <input type="number" min="0" step="0.50" id="alb-in-extraprice" class="cms-input" value="${Number(album.extraPhotoPrice) || 0}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="alb-in-password">Senha de Acesso do Cliente</label>
            <input type="text" id="alb-in-password" class="cms-input" value="${escapeHtml(album.password || '')}" placeholder="Deixe vazio para acesso sem senha" />
          </div>
        </div>

        <div class="field-grid" style="margin-top: 10px;">
          <div class="field-group">
            <label class="field-label" for="alb-in-pin">PIN p/ Baixar em Alta (Fase 2 · Entrega)</label>
            <input type="text" id="alb-in-pin" class="cms-input" value="${escapeHtml(album.downloadPin || '')}" placeholder="Ex: 7788 (vazio libera sem PIN)" />
          </div>
          <div class="field-group">
            <label class="field-label" for="alb-in-welcome">Mensagem para o Cliente</label>
            <input type="text" id="alb-in-welcome" class="cms-input" value="${escapeHtml(album.welcomeMessage || '')}" />
          </div>
        </div>

        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; margin-top: 14px;">
          <button type="button" id="btn-save-album-meta" class="cms-btn cms-btn-primary">
            Salvar Regras do Álbum
          </button>
          <button type="button" id="btn-delete-album" class="cms-btn cms-btn-danger cms-btn-sm">
            Excluir Álbum
          </button>
        </div>
      </div>

      <!-- Grade de Fotografias do Álbum -->
      <div class="alb-section-box">
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
          <h3>Fotografias do Álbum (${(album.photos || []).length})</h3>
          <div>
            <input type="file" id="alb-upload-input" accept="image/*" multiple hidden />
            <button type="button" id="btn-trigger-alb-upload" class="cms-btn cms-btn-primary cms-btn-sm">
              + Enviar Fotos do Ensaio
            </button>
          </div>
        </div>
        <p id="alb-upload-status" class="field-hint" style="margin-top: 6px; color: #3B7293; font-weight: 600;" hidden></p>

        <div class="alb-photos-admin-grid">
          ${(album.photos || []).map((ph) => {
            const isPicked = (album.selectedIds || []).includes(ph.id);
            const isCover = album.coverSrc === ph.originalSrc;
            return `
              <div class="alb-adm-photo-card ${isPicked ? 'is-client-picked' : ''}">
                <div class="alb-adm-thumb-wrap">
                  <img src="${escapeHtml(ph.originalSrc)}" alt="${escapeHtml(ph.filename)}" loading="lazy" />
                  ${isPicked ? '<span class="alb-adm-picked-badge">Escolhida</span>' : ''}
                  ${isCover ? '<span class="alb-adm-cover-badge">Capa</span>' : ''}
                </div>
                <div class="alb-adm-card-body">
                  <strong style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(ph.filename)}">${escapeHtml(ph.filename)}</strong>
                  <div style="display: flex; gap: 4px; justify-content: space-between;">
                    <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-set-alb-cover" data-photo-id="${escapeHtml(ph.id)}" style="padding: 4px 8px; font-size: 0.68rem;">
                      ${isCover ? 'Capa Ativa' : 'Usar na Capa'}
                    </button>
                    <button type="button" class="cms-btn cms-btn-danger cms-btn-sm js-del-alb-photo" data-photo-id="${escapeHtml(ph.id)}" style="padding: 4px 8px; font-size: 0.68rem;">
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Histórico de Atividades -->
      <div class="alb-section-box">
        <h3>Histórico do Álbum</h3>
        <ul class="alb-log-list">
          ${(album.activityLog || []).map((ev) => `
            <li>
              <time>${new Date(ev.at).toLocaleString('pt-BR')}</time>
              <span>${escapeHtml(ev.text)}</span>
            </li>
          `).join('')}
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
      notifyAdminToast('Dados de recebimento Pix salvos.');
    });

    document.getElementById('btn-reset-demo-albums')?.addEventListener('click', async () => {
      if (!window.confirm('Restaurar os 2 álbuns de exemplo originais (Ana & Lucas + Marina & Pedro)?')) return;
      albumsState = await window.AlbumsStore.resetToDemo();
      selectedAlbumId = albumsState.albums[0]?.id || null;
      renderAlbumsAdminPanel();
      const iframe = document.getElementById('cms-preview-iframe');
      if (iframe && iframe.getAttribute('src')?.includes('galeria')) {
        iframe.contentWindow?.location.reload();
      }
      notifyAdminToast('Álbuns de teste restaurados.');
    });

    document.getElementById('btn-create-client-album')?.addEventListener('click', async () => {
      const num = (albumsState.albums?.length || 0) + 1;
      const clientName = `Novo Cliente #${num}`;
      const newAlb = {
        id: `alb_${Date.now()}`,
        slug: slugify(`ensaio-cliente-${num}`),
        clientName,
        title: `${clientName}`,
        subtitle: 'Fortaleza, Ceará',
        shootDate: new Date().toISOString().slice(0, 10),
        welcomeMessage: 'Escolham com calma as fotografias favoritas de vocês.',
        phase: 'proofing',
        status: 'awaiting_selection',
        protectionLevel: 'watermark',
        password: String(Math.floor(1000 + Math.random() * 9000)),
        downloadPin: String(Math.floor(1000 + Math.random() * 9000)),
        packageName: 'Ensaio Simples',
        packageIncluded: 10,
        extraPhotoPrice: 20.00,
        coverSrc: 'assets/images/real/IMG_1186.jpg',
        coverFocal: 'center 35%',
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
      notifyAdminToast('Novo álbum criado.');
    });

    const activeAlbum = getActiveAlbum();
    if (!activeAlbum) return;

    // Alternar Fase Unificada (Fase 1 Seleção <-> Fase 2 Entrega)
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
            text: 'Álbum publicado como Galeria de Entrega Final (Alta Resolução).'
          });
        } else if (activeAlbum.status === 'delivered') {
          activeAlbum.status = activeAlbum.selectionLocked ? 'selection_completed' : 'awaiting_selection';
        }
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
        notifyAdminToast(nextPhase === 'delivery'
          ? 'Álbum em modo de Entrega Final (alta resolução + download).'
          : 'Álbum em modo de Seleção de Provas protegidas.');
      });
    });

    // Nível de proteção (3 cartões: watermark, watermark_blur, watermark_spotlight)
    panel.querySelectorAll('[data-set-prot]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nextProt = btn.getAttribute('data-set-prot');
        if (!nextProt || activeAlbum.protectionLevel === nextProt) return;
        activeAlbum.protectionLevel = nextProt;
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
        notifyAdminToast(`Proteção alterada para: ${getProtectionLabel(nextProt)}`);
      });
    });

    // Marca d'água: Modo (Imagem PNG vs Texto)
    panel.querySelectorAll('[data-wm-mode]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const mode = btn.getAttribute('data-wm-mode');
        albumsState.watermarkConfig = {
          ...albumsState.watermarkConfig,
          mode,
          updatedAt: Date.now()
        };
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
      });
    });

    // Marca d'água: Padrão (Grade Repetida vs Centralizada)
    panel.querySelectorAll('[data-wm-pattern]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pattern = btn.getAttribute('data-wm-pattern');
        albumsState.watermarkConfig = {
          ...albumsState.watermarkConfig,
          pattern,
          updatedAt: Date.now()
        };
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
      });
    });

    // Upload de imagem personalizada de Marca d'Água (PNG/WebP/SVG)
    const wmFileInput = document.getElementById('wm-file-upload');
    document.getElementById('btn-upload-wm-img')?.addEventListener('click', () => wmFileInput?.click());
    wmFileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const pngDataUrl = await window.AlbumsStore.readWatermarkImageFile(file);
        albumsState.watermarkConfig = {
          ...albumsState.watermarkConfig,
          mode: 'image',
          imageSrc: pngDataUrl,
          updatedAt: Date.now()
        };
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
        notifyAdminToast('Marca d\'água personalizada aplicada em todas as provas.');
      } catch (_) {
        notifyAdminToast('Não foi possível ler o arquivo de marca d\'água.');
      }
    });

    document.getElementById('btn-reset-wm-default')?.addEventListener('click', async () => {
      const defaults = window.AlbumsStore.getBrandDefaults();
      albumsState.watermarkConfig = {
        ...albumsState.watermarkConfig,
        mode: 'image',
        imageSrc: defaults.defaultWatermarkImg,
        updatedAt: Date.now()
      };
      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast('Logo padrão restaurada na marca d\'água.');
    });

    document.getElementById('wm-text-input')?.addEventListener('change', async (e) => {
      albumsState.watermarkConfig = {
        ...albumsState.watermarkConfig,
        text: e.target.value.trim() || window.AlbumsStore.getBrandDefaults().studioName.toUpperCase(),
        updatedAt: Date.now()
      };
      await window.AlbumsStore.saveState(albumsState);
      refreshWatermarkSamplePreview();
      notifyAdminToast('Texto da marca d\'água atualizado.');
    });

    const opacityRange = document.getElementById('wm-opacity-range');
    opacityRange?.addEventListener('input', () => {
      const lbl = document.getElementById('wm-opacity-val');
      if (lbl) lbl.textContent = `${opacityRange.value}%`;
    });
    opacityRange?.addEventListener('change', async () => {
      albumsState.watermarkConfig = {
        ...albumsState.watermarkConfig,
        opacity: Math.min(0.85, Math.max(0.15, Number(opacityRange.value) / 100)),
        updatedAt: Date.now()
      };
      await window.AlbumsStore.saveState(albumsState);
      refreshWatermarkSamplePreview();
    });

    const scaleRange = document.getElementById('wm-scale-range');
    scaleRange?.addEventListener('input', () => {
      const lbl = document.getElementById('wm-scale-val');
      if (lbl) lbl.textContent = `${scaleRange.value}%`;
    });
    scaleRange?.addEventListener('change', async () => {
      albumsState.watermarkConfig = {
        ...albumsState.watermarkConfig,
        scale: Math.min(0.60, Math.max(0.15, Number(scaleRange.value) / 100)),
        updatedAt: Date.now()
      };
      await window.AlbumsStore.saveState(albumsState);
      refreshWatermarkSamplePreview();
    });

    // Copiar convite WhatsApp
    document.getElementById('btn-copy-whatsapp-invite')?.addEventListener('click', () => {
      const baseUrl = `${window.location.origin}${window.location.pathname.replace(/admin(\.html)?$/i, '')}${galeriaRoute}?id=${encodeURIComponent(activeAlbum.slug)}`;
      const msg = activeAlbum.phase === 'proofing'
        ? `Olá, ${activeAlbum.clientName}!\nAs prévias do seu ensaio já estão prontas para escolha:\n\nLink: ${baseUrl}\nSenha: ${activeAlbum.password}\nPacote: ${activeAlbum.packageIncluded} fotos inclusas (fotos extras opcionais: ${formatBRL(activeAlbum.extraPhotoPrice)} cada).`
        : `Olá, ${activeAlbum.clientName}!\nSeu álbum final em alta resolução está pronto para ver e baixar:\n\nLink: ${baseUrl}\nSenha: ${activeAlbum.password}\nPIN de Download: ${activeAlbum.downloadPin}`;
      navigator.clipboard?.writeText(msg);
      notifyAdminToast('Convite copiado para colar no WhatsApp.');
    });

    // Copiar código Lightroom
    document.getElementById('btn-copy-lr-code')?.addEventListener('click', () => {
      const val = document.getElementById('lr-code-output')?.value || '';
      navigator.clipboard?.writeText(val);
      notifyAdminToast('Lista copiada para o filtro do Lightroom.');
    });

    // Reabrir seleção
    document.getElementById('btn-unlock-selection')?.addEventListener('click', async () => {
      activeAlbum.selectionLocked = false;
      activeAlbum.status = 'awaiting_selection';
      activeAlbum.activityLog.unshift({
        at: new Date().toISOString(),
        type: 'reopened',
        text: 'Seleção reaberta para ajustes do cliente.'
      });
      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast('Seleção reaberta para o cliente.');
    });

    // Aprovar Pix Direto
    document.getElementById('btn-approve-direct-pix')?.addEventListener('click', async () => {
      activeAlbum.status = 'selection_paid';
      if (activeAlbum.paymentOrder) {
        activeAlbum.paymentOrder.status = 'approved';
        activeAlbum.paymentOrder.paidAt = new Date().toISOString();
      }
      activeAlbum.activityLog.unshift({
        at: new Date().toISOString(),
        type: 'payment',
        text: `Pix Direto confirmado no painel (${formatBRL(activeAlbum.paymentOrder?.totalAmount)}).`
      });
      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast('Pagamento Pix confirmado.');
    });

    // Salvar regras do álbum
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
      activeAlbum.welcomeMessage = document.getElementById('alb-in-welcome')?.value.trim() || '';

      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast('Configurações do álbum salvas.');
    });

    // Excluir álbum
    document.getElementById('btn-delete-album')?.addEventListener('click', async () => {
      if (!window.confirm(`Excluir o álbum de "${activeAlbum.clientName}"?`)) return;
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
      const statusEl = document.getElementById('alb-upload-status');
      if (statusEl) statusEl.hidden = false;

      for (let i = 0; i < files.length; i++) {
        if (statusEl) {
          statusEl.textContent = `Otimizando foto ${i + 1} de ${files.length}...`;
        }
        const processed = await window.AlbumsStore.processUploadedAlbumFile(files[i]);
        const newPhoto = {
          id: `ph_${Date.now()}_${i}`,
          filename: processed.filename,
          originalSrc: processed.originalSrc
        };
        activeAlbum.photos.push(newPhoto);
        if (activeAlbum.photos.length === 1) {
          activeAlbum.coverSrc = newPhoto.originalSrc;
        }
      }

      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast(`${files.length} ${files.length === 1 ? 'fotografia adicionada' : 'fotografias adicionadas'} ao álbum.`);
    });

    panel.querySelectorAll('.js-set-alb-cover').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pid = btn.getAttribute('data-photo-id');
        const ph = (activeAlbum.photos || []).find((p) => p.id === pid);
        if (ph) {
          activeAlbum.coverSrc = ph.originalSrc;
          await window.AlbumsStore.saveState(albumsState);
          renderAlbumsAdminPanel();
          notifyAdminToast('Foto definida como capa do álbum.');
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

    document.querySelectorAll('.sidebar-tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        setTimeout(syncPreviewIframeForAlbums, 20);
      });
    });

    window.AlbumsStore.subscribe(async () => {
      albumsState = await window.AlbumsStore.loadState();
      renderAlbumsAdminPanel();
    });
  });
})();
