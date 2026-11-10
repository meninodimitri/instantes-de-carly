/**
 * ============================================================================
 * PAINEL ADMINISTRATIVO — GESTOR DE ÁLBUNS DE CLIENTES (V3)
 * - Árvore de álbuns diretamente na barra vertical esquerda (#sidebar-albums-sublist)
 * - 4 Sub-abas limpas estilo Pixieset: Fotos, Design & Capa, Proteção, Pacote & Senhas
 * - Grade de fotos 4:3 imune a qualquer nível de zoom (50%–200%)
 * - 3 Modos de Proteção (Marca d'Água, Baixa Resolução, Foco no Cursor / Toque)
 * - Customizador completo de Entrega Final (Capa, Tipografia, Cor e Grade)
 * ============================================================================
 */
(function () {
  'use strict';

  let albumsState = null;
  let selectedAlbumId = null;
  let activeAlbumSubTab = 'photos'; // 'photos' | 'design' | 'protection' | 'settings'
  let activeDesignSection = 'cover'; // 'cover' | 'typography' | 'color' | 'grid'
  let showQuickCreateAlbum = false;
  let showPaymentDrawer = false;
  let previewRenderSeq = 0;

  const galeriaRoute = window.location.protocol === 'file:' ? 'galeria.html' : 'galeria';

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

  function parseFocalCoords(focalStr) {
    const m = String(focalStr || '50% 35%').match(/([\d.]+)%\s+([\d.]+)%/);
    if (!m) return { x: 50, y: 35 };
    return {
      x: Math.max(0, Math.min(100, Number(m[1]))),
      y: Math.max(0, Math.min(100, Number(m[2])))
    };
  }

  function getActiveAlbum() {
    if (!albumsState || !Array.isArray(albumsState.albums)) return null;
    let found = albumsState.albums.find((a) => a.id === selectedAlbumId);
    if (!found && albumsState.albums.length > 0) {
      found = albumsState.albums[0];
      selectedAlbumId = found.id;
    }
    if (found && window.AlbumsStore?.normalizeAlbum) {
      window.AlbumsStore.normalizeAlbum(found);
    }
    return found || null;
  }

  function isAlbumsMainTabActive() {
    const albumsTabBtn = document.querySelector('.sidebar-tab[data-tab="albums"]');
    return Boolean(albumsTabBtn && albumsTabBtn.classList.contains('active'));
  }

  function activateAlbumsTabInAdmin() {
    document.querySelectorAll('.sidebar-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === 'albums');
    });
    document.querySelectorAll('.cms-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === 'panel-albums');
    });
  }

  function updateSidebarBadge() {
    const badge = document.getElementById('count-albums');
    if (badge && albumsState?.albums) {
      badge.textContent = String(albumsState.albums.length);
    }
  }

  function getStatusMeta(album) {
    if (album.phase === 'delivery' || album.status === 'delivered') {
      return { label: 'Entregue em Alta', cls: 'st-deliv', dotCls: 'is-deliv' };
    }
    if (album.status === 'selection_paid') {
      return { label: 'Extras Pagas', cls: 'st-paid', dotCls: 'is-paid' };
    }
    if (album.status === 'awaiting_pix_confirm') {
      return { label: 'Confirmar Pix', cls: 'st-pix', dotCls: 'is-pix' };
    }
    if (album.status === 'selection_completed') {
      return { label: 'Seleção Concluída', cls: 'st-paid', dotCls: 'is-paid' };
    }
    return { label: 'Em Seleção', cls: 'st-wait', dotCls: '' };
  }

  function getProtectionLabel(level, watermarkEnabled = true) {
    if (watermarkEnabled === false) return 'Sem Marca d\'Água';
    if (level === 'watermark_lowres') return 'Marca d\'Água + Baixa Resolução';
    if (level === 'watermark_spotlight') return 'Marca d\'Água + Foco no Cursor';
    return 'Marca d\'Água';
  }

  function syncPreviewIframeForAlbums() {
    const iframe = document.getElementById('cms-preview-iframe');
    if (!iframe) return;

    if (isAlbumsMainTabActive()) {
      const alb = getActiveAlbum();
      if (!alb) {
        if (iframe.getAttribute('src') !== galeriaRoute) {
          iframe.setAttribute('src', galeriaRoute);
        }
        return;
      }
      const wantDesignPreview = activeAlbumSubTab === 'design';
      const targetUrl = `${galeriaRoute}?id=${encodeURIComponent(alb.slug)}&preview=1${wantDesignPreview ? '&designPreview=1' : ''}`;
      if (iframe.getAttribute('src') !== targetUrl) {
        iframe.setAttribute('src', targetUrl);
      }
    } else if (iframe.getAttribute('src')?.includes('galeria')) {
      iframe.setAttribute('src', 'index.html?cmsPreview=1');
    }
  }

  /* ==========================================================================
     1. LISTA DE ÁLBUNS NA BARRA VERTICAL ESQUERDA (#sidebar-albums-sublist)
     - Suporte a agrupar / desagrupar (accordion com chevron e persistência)
     - Rolagem suave com scroll limitado a 280px para acervos com 10+ álbuns
     ========================================================================== */
  const SIDEBAR_COLLAPSE_STORAGE_KEY = 'cms_albums_sublist_collapsed';

  function isSidebarSublistCollapsed() {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === 'true';
    } catch (_) {
      return false;
    }
  }

  function setSidebarSublistCollapsed(collapsed) {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, collapsed ? 'true' : 'false');
    } catch (_) {}
    applySidebarCollapseVisualState(collapsed);
  }

  function applySidebarCollapseVisualState(collapsed) {
    const sublist = document.getElementById('sidebar-albums-sublist');
    const tabBtn = document.getElementById('tab-btn-albums') || document.querySelector('.sidebar-tab[data-tab="albums"]');
    const chevron = document.getElementById('btn-toggle-albums-sublist');
    if (sublist) sublist.classList.toggle('is-collapsed', collapsed);
    if (tabBtn) tabBtn.classList.toggle('is-sublist-collapsed', collapsed);
    if (chevron) {
      chevron.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      chevron.textContent = collapsed ? '▸' : '▾';
      chevron.title = collapsed ? 'Desagrupar / Expandir lista de álbuns' : 'Agrupar / Recolher lista de álbuns';
    }
  }

  function bindSidebarCollapseButton() {
    const chevron = document.getElementById('btn-toggle-albums-sublist');
    if (!chevron || chevron.dataset.boundCollapse) return;
    chevron.dataset.boundCollapse = '1';

    const toggle = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const current = isSidebarSublistCollapsed();
      setSidebarSublistCollapsed(!current);
    };

    chevron.addEventListener('click', toggle);
    chevron.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        toggle(e);
      }
    });
  }

  function renderSidebarAlbumsSublist() {
    const sublist = document.getElementById('sidebar-albums-sublist');
    if (!sublist || !albumsState) return;

    bindSidebarCollapseButton();
    applySidebarCollapseVisualState(isSidebarSublistCollapsed());

    const albums = albumsState.albums || [];
    const activeAlbum = getActiveAlbum();
    const tabIsAlbums = isAlbumsMainTabActive();

    sublist.innerHTML = `
      ${albums.map((alb) => {
        const st = getStatusMeta(alb);
        const isSelected = tabIsAlbums && activeAlbum && alb.id === activeAlbum.id && !showQuickCreateAlbum;
        return `
          <button
            type="button"
            class="sidebar-album-item ${isSelected ? 'is-selected' : ''}"
            data-sidebar-album-id="${escapeHtml(alb.id)}"
            title="${escapeHtml(alb.clientName)} (${escapeHtml(st.label)})"
          >
            <span class="sidebar-album-left">
              <span class="sidebar-album-dot ${st.dotCls}"></span>
              <span class="sidebar-album-name">${escapeHtml(alb.clientName)}</span>
            </span>
            <span class="sidebar-album-qty">${(alb.photos || []).length}</span>
          </button>
        `;
      }).join('')}
      <button type="button" class="sidebar-album-add-btn" id="btn-sidebar-new-album">
        + Novo álbum de cliente
      </button>
    `;

    sublist.querySelectorAll('[data-sidebar-album-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedAlbumId = btn.getAttribute('data-sidebar-album-id');
        showQuickCreateAlbum = false;
        activateAlbumsTabInAdmin();
        renderAlbumsAdminPanel();
      });
    });

    document.getElementById('btn-sidebar-new-album')?.addEventListener('click', () => {
      showQuickCreateAlbum = true;
      activateAlbumsTabInAdmin();
      renderAlbumsAdminPanel();
      setTimeout(() => document.getElementById('quick-alb-client-input')?.focus(), 30);
    });
  }

  /* ==========================================================================
     2. PRÉVIA VIVA DA MARCA D'ÁGUA + LENTE INTERATIVA NO /ADMIN
     ========================================================================== */
  async function refreshWatermarkSamplePreview() {
    const baseImg = document.getElementById('adm-wm-live-preview');
    const revealImg = document.getElementById('adm-wm-live-reveal');
    const captionEl = document.getElementById('adm-wm-live-caption');
    const cardEl = document.getElementById('adm-wm-live-card');
    if (!baseImg || !albumsState) return;

    const seq = ++previewRenderSeq;
    const activeAlbum = getActiveAlbum();
    const sampleSrc = activeAlbum?.photos?.[0]?.originalSrc || activeAlbum?.coverSrc || 'assets/images/carly-perfil.jpg';
    const wmEnabled = activeAlbum ? activeAlbum.watermarkEnabled !== false : true;
    const level = activeAlbum?.protectionLevel || 'watermark';

    if (captionEl) {
      captionEl.textContent = getProtectionLabel(level, wmEnabled);
    }

    try {
      const bundle = await window.AlbumsStore.generateProtectedProofBundle(
        sampleSrc,
        { ...albumsState.watermarkConfig, enabled: wmEnabled },
        level,
        640
      );
      if (seq === previewRenderSeq && baseImg.isConnected) {
        baseImg.src = bundle.primarySrc;
        if (revealImg) {
          if (level === 'watermark_spotlight' && bundle.revealSrc) {
            revealImg.src = bundle.revealSrc;
            revealImg.hidden = false;
          } else {
            revealImg.hidden = true;
            cardEl?.classList.remove('is-spot-active');
          }
        }
      }
    } catch (_) {
      if (seq === previewRenderSeq && baseImg.isConnected) {
        baseImg.src = sampleSrc;
      }
    }
  }

  function bindAdminPreviewSpotlight() {
    const cardEl = document.getElementById('adm-wm-live-card');
    const activeAlbum = getActiveAlbum();
    if (!cardEl || !activeAlbum || activeAlbum.protectionLevel !== 'watermark_spotlight') return;

    const updateSpot = (clientX, clientY) => {
      const rect = cardEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      cardEl.style.setProperty('--spot-x', `${x.toFixed(1)}%`);
      cardEl.style.setProperty('--spot-y', `${y.toFixed(1)}%`);
      cardEl.classList.add('is-spot-active');
    };

    cardEl.addEventListener('pointermove', (e) => updateSpot(e.clientX, e.clientY));
    cardEl.addEventListener('pointerleave', () => cardEl.classList.remove('is-spot-active'));
    cardEl.addEventListener('touchstart', (e) => {
      if (e.touches[0]) updateSpot(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    cardEl.addEventListener('touchmove', (e) => {
      if (e.touches[0]) updateSpot(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    cardEl.addEventListener('touchend', () => cardEl.classList.remove('is-spot-active'));
  }

  /* ==========================================================================
     3. RENDERIZADORES DAS 4 SUB-ABAS LIMPAS DO ÁLBUM ATIVO
     ========================================================================== */
  function renderPhotosSubTab(activeAlbum, calc) {
    const selectedSet = new Set(activeAlbum.selectedIds || []);
    const lrInfo = window.AlbumsStore.formatLightroomCodes(activeAlbum);
    const lrList = typeof lrInfo === 'string' ? lrInfo : (lrInfo?.lightroomComma || '');
    const commentEntries = Object.entries(activeAlbum.photoComments || {}).filter(([, txt]) => String(txt || '').trim());

    return `
      <div class="alb-card-clean">
        <div class="alb-photos-topbar">
          <div class="alb-photos-summary">
            <strong>${(activeAlbum.photos || []).length} fotografias no álbum</strong>
            <span>·</span>
            <span>${calc.selectedCount} escolhidas de ${calc.packageIncluded} inclusas</span>
            ${calc.hasExtras ? `<span class="alb-status-tag st-paid">+${calc.extraCount} extras (${formatBRL(calc.extraTotal)})</span>` : ''}
          </div>
          <div>
            <input type="file" id="alb-upload-input" accept="image/*" multiple hidden />
            <button type="button" id="btn-trigger-alb-upload" class="cms-btn cms-btn-primary cms-btn-sm">
              + Enviar Fotos do Ensaio
            </button>
          </div>
        </div>

        <div id="alb-upload-status" class="alb-pix-alert-banner" hidden>
          Otimizando fotografias e aplicando proteção...
        </div>

        ${calc.selectedCount > 0 ? `
          <div class="alb-lr-compact-bar">
            <div class="alb-lr-compact-left">
              <span>Filtro Lightroom:</span>
              <input type="text" id="lr-code-output" class="alb-lr-code-inline" readonly value="${escapeHtml(lrList)}" />
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button type="button" id="btn-copy-lr-code" class="cms-btn cms-btn-outline cms-btn-sm">
                Copiar Códigos
              </button>
              ${activeAlbum.selectionLocked ? `
                <button type="button" id="btn-unlock-selection" class="cms-btn cms-btn-outline cms-btn-sm">
                  Reabrir Seleção
                </button>
              ` : ''}
            </div>
          </div>
        ` : ''}

        ${(activeAlbum.photos || []).length === 0 ? `
          <div style="padding: 34px 16px; text-align: center; background: #FAF8F3; border-radius: 10px; border: 1px dashed rgba(27,39,51,0.18);">
            <strong style="display:block; color:#1B2733; margin-bottom:4px;">Este álbum ainda está vazio</strong>
            <span style="font-size:0.8rem; color:#5E6D7C;">Clique em "+ Enviar Fotos do Ensaio" para subir as fotos da sessão.</span>
          </div>
        ` : `
          <div class="alb-photos-admin-grid">
            ${(activeAlbum.photos || []).map((ph) => {
              const isCover = activeAlbum.coverSrc === ph.originalSrc;
              const isSel = selectedSet.has(ph.id);
              return `
                <div class="alb-adm-photo-card ${isCover ? 'is-cover-card' : ''}">
                  <div class="alb-adm-thumb-wrap">
                    <img src="${escapeHtml(ph.originalSrc)}" alt="${escapeHtml(ph.filename)}" loading="lazy" />
                    <button
                      type="button"
                      class="alb-thumb-cover-btn ${isCover ? 'is-active' : ''} js-set-alb-cover"
                      data-photo-id="${escapeHtml(ph.id)}"
                      title="${isCover ? 'Foto de capa atual' : 'Definir como capa do álbum'}"
                    >${isCover ? '★ Capa' : '☆ Capa'}</button>
                    <button
                      type="button"
                      class="alb-thumb-del-btn js-del-alb-photo"
                      data-photo-id="${escapeHtml(ph.id)}"
                      aria-label="Remover foto ${escapeHtml(ph.filename)}"
                      title="Remover foto"
                    >✕</button>
                    ${isSel ? `<span class="alb-thumb-sel-badge">♥ Escolhida</span>` : ''}
                  </div>
                  <div class="alb-adm-meta">
                    <span class="alb-adm-fname">${escapeHtml(ph.filename)}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

        ${commentEntries.length > 0 ? `
          <div class="alb-notes-clean-list">
            <h4>Observações deixadas pelo cliente (${commentEntries.length})</h4>
            ${commentEntries.map(([pid, note]) => {
              const ph = (activeAlbum.photos || []).find((p) => p.id === pid);
              return `
                <div class="alb-note-row">
                  <strong>${escapeHtml(ph?.filename || pid)}:</strong> ${escapeHtml(note)}
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderCoverMiniThumb(styleId, coverSrc, focal, typoFamily) {
    const escSrc = escapeHtml(coverSrc);
    const escTitle = 'TÍTULO';
    const fPos = `object-position:${focal.x}% ${focal.y}%;`;
    const fStyle = typoFamily ? `font-family:${escapeHtml(typoFamily)};` : '';

    if (styleId === 'none') {
      return `
        <div class="pix-choice-frame pix-cover-thumb" data-style="none">
          <div class="pix-none-grid">
            <span></span><span></span><span></span>
            <span></span><span></span><span></span>
          </div>
        </div>
      `;
    }

    if (styleId === 'alegria') {
      return `
        <div class="pix-choice-frame pix-cover-thumb" data-style="alegria">
          <div class="pix-mini-joy">
            <span class="mini-joy-letter">J</span>
            <span class="mini-joy-o"><img src="${escSrc}" alt="" style="${fPos}" /></span>
            <span class="mini-joy-letter">Y</span>
          </div>
          <span class="pix-mini-title-dark" style="${fStyle}">${escTitle}</span>
        </div>
      `;
    }

    if (styleId === 'romance') {
      return `
        <div class="pix-choice-frame pix-cover-thumb" data-style="romance">
          <div class="pix-mini-split-left">
            <span class="pix-mini-title-dark" style="${fStyle}">${escTitle}</span>
            <span class="pix-mini-rule-dark"></span>
          </div>
          <div class="pix-mini-split-right">
            <img src="${escSrc}" alt="" style="${fPos}" />
          </div>
        </div>
      `;
    }

    if (styleId === 'vintage') {
      return `
        <div class="pix-choice-frame pix-cover-thumb" data-style="vintage">
          <div class="pix-mini-polaroid-img">
            <img src="${escSrc}" alt="" style="${fPos}" />
          </div>
          <div class="pix-mini-polaroid-bar">
            <span class="pix-mini-title-dark" style="${fStyle}">${escTitle}</span>
          </div>
        </div>
      `;
    }

    if (styleId === 'moldura') {
      return `
        <div class="pix-choice-frame pix-cover-thumb" data-style="moldura">
          <img src="${escSrc}" alt="" style="${fPos}" />
          <div class="pix-mini-inset-frame">
            <span class="pix-mini-title-light" style="${fStyle}">${escTitle}</span>
          </div>
        </div>
      `;
    }

    if (styleId === 'listra') {
      return `
        <div class="pix-choice-frame pix-cover-thumb" data-style="listra">
          <img src="${escSrc}" alt="" style="${fPos}" />
          <div class="pix-mini-stripe-overlay">
            <div class="pix-mini-stripe-line"></div>
            <span class="pix-mini-title-light" style="${fStyle}">${escTitle}</span>
            <div class="pix-mini-stripe-line"></div>
          </div>
        </div>
      `;
    }

    if (styleId === 'divisor') {
      return `
        <div class="pix-choice-frame pix-cover-thumb" data-style="divisor">
          <img src="${escSrc}" alt="" style="${fPos}" />
          <div class="pix-mini-divisor-overlay">
            <div class="pix-mini-divisor-vbar"></div>
            <span class="pix-mini-title-light" style="${fStyle}">${escTitle}</span>
          </div>
        </div>
      `;
    }

    if (styleId === 'diario') {
      return `
        <div class="pix-choice-frame pix-cover-thumb" data-style="diario">
          <div class="pix-mini-diario-img">
            <img src="${escSrc}" alt="" style="${fPos}" />
          </div>
          <div class="pix-mini-diario-card">
            <span class="pix-mini-title-dark" style="${fStyle}">${escTitle}</span>
            <span class="pix-mini-rule-dark"></span>
          </div>
        </div>
      `;
    }

    if (styleId === 'carimbo') {
      return `
        <div class="pix-choice-frame pix-cover-thumb" data-style="carimbo">
          <div class="pix-mini-stamp-box">
            <img src="${escSrc}" alt="" style="${fPos}" />
          </div>
          <span class="pix-mini-title-dark" style="${fStyle}">${escTitle}</span>
        </div>
      `;
    }

    if (styleId === 'contorno' || styleId === 'retangulo') {
      return `
        <div class="pix-choice-frame pix-cover-thumb" data-style="${styleId}">
          <img src="${escSrc}" alt="" style="${fPos}" />
          <div class="pix-mini-contorno-rect">
            <span class="pix-mini-ret-author"></span>
            <span class="pix-mini-title-light" style="${fStyle}">${escTitle}</span>
            <span class="pix-mini-underline"></span>
          </div>
        </div>
      `;
    }

    if (styleId === 'classico') {
      return `
        <div class="pix-choice-frame pix-cover-thumb" data-style="classico">
          <div class="pix-mini-classico-img">
            <img src="${escSrc}" alt="" style="${fPos}" />
          </div>
          <div class="pix-mini-classico-bar">
            <span class="pix-mini-dot"></span>
            <span class="pix-mini-title-dark" style="${fStyle}">${escTitle}</span>
            <span class="pix-mini-dot"></span>
          </div>
        </div>
      `;
    }

    if (styleId === 'dividido') {
      return `
        <div class="pix-choice-frame pix-cover-thumb" data-style="dividido">
          <div class="pix-mini-dividido-img">
            <img src="${escSrc}" alt="" style="${fPos}" />
          </div>
          <div class="pix-mini-dividido-bar">
            <span class="pix-mini-title-dark" style="${fStyle}">${escTitle}</span>
          </div>
        </div>
      `;
    }

    if (styleId === 'rotulo') {
      return `
        <div class="pix-choice-frame pix-cover-thumb" data-style="rotulo">
          <img src="${escSrc}" alt="" style="${fPos}" />
          <div class="pix-mini-rotulo-badge">
            <span class="pix-mini-title-dark" style="${fStyle}">${escTitle}</span>
          </div>
        </div>
      `;
    }

    if (styleId === 'borda') {
      return `
        <div class="pix-choice-frame pix-cover-thumb" data-style="borda">
          <div class="pix-mini-borda-inner">
            <img src="${escSrc}" alt="" style="${fPos}" />
            <span class="pix-mini-title-light" style="${fStyle}">${escTitle}</span>
          </div>
        </div>
      `;
    }

    if (styleId === 'album') {
      return `
        <div class="pix-choice-frame pix-cover-thumb" data-style="album">
          <div class="pix-mini-album-img">
            <img src="${escSrc}" alt="" style="${fPos}" />
          </div>
          <div class="pix-mini-album-bar">
            <span class="pix-mini-title-dark" style="${fStyle}">${escTitle}</span>
          </div>
        </div>
      `;
    }

    if (styleId === 'esquerda') {
      return `
        <div class="pix-choice-frame pix-cover-thumb" data-style="esquerda">
          <img src="${escSrc}" alt="" style="${fPos}" />
          <div class="pix-mini-overlay-left">
            <span class="pix-mini-title-light" style="${fStyle}">${escTitle}</span>
          </div>
        </div>
      `;
    }

    // Padrão: 'centro'
    return `
      <div class="pix-choice-frame pix-cover-thumb" data-style="centro">
        <img src="${escSrc}" alt="" style="${fPos}" />
        <div class="pix-mini-overlay-center">
          <span class="pix-mini-title-light" style="${fStyle}">${escTitle}</span>
          <span class="pix-mini-pill-btn"></span>
        </div>
      </div>
    `;
  }

  function renderDesignSubTab(activeAlbum) {
    const presets = window.AlbumsStore.DESIGN_PRESETS;
    const design = activeAlbum.design || window.AlbumsStore.getDefaultDesign();
    const coverSrc = activeAlbum.coverSrc || activeAlbum.photos?.[0]?.originalSrc || 'assets/images/carly-perfil.jpg';
    const focal = parseFocalCoords(activeAlbum.coverFocal);
    const shortTitle = (activeAlbum.title || activeAlbum.clientName || 'Álbum').slice(0, 24);

    const activeTypoObj = presets.typographies.find((t) => t.id === design.typography) || presets.typographies[0];
    const typoFamily = activeTypoObj ? activeTypoObj.fontFamily : 'serif';

    let stageBody = '';
    let stageHeading = 'Capa';
    let stageHint = 'Escolha a abertura do álbum (reflete na Entrega Final ao vivo ao lado)';

    if (activeDesignSection === 'cover') {
      stageHeading = 'Capa';
      stageHint = 'Clique no estilo desejado · Ajuste o ponto focal clicando na miniatura à esquerda';
      const logoVisible = design.coverLogoVisible !== false;
      const logoColor = design.coverLogoColor || 'auto';
      stageBody = `
        <div class="pix-cards-grid">
          ${presets.coverStyles.map((st) => {
            const isAct = design.coverStyle === st.id;
            return `
              <button type="button" class="pix-choice-item ${isAct ? 'active' : ''}" data-design-cover="${escapeHtml(st.id)}">
                ${st.badge ? `<span class="pix-thumb-badge">${escapeHtml(st.badge)}</span>` : ''}
                ${renderCoverMiniThumb(st.id, coverSrc, focal, typoFamily)}
                <span class="pix-choice-label">${escapeHtml(st.label)}</span>
              </button>
            `;
          }).join('')}
        </div>

        <div class="pix-cover-options-bar">
          <div class="pix-cover-opt-group">
            <label class="cms-switch" style="cursor:pointer;" title="Ativa ou oculta a logo do estúdio na abertura do álbum">
              <input type="checkbox" id="sw-cover-logo-visible" ${logoVisible ? 'checked' : ''} />
              <span class="cms-switch-slider"></span>
            </label>
            <span class="pix-cover-opt-label">Exibir Logotipo na Capa</span>
          </div>

          <div class="pix-cover-opt-group" style="${logoVisible ? '' : 'opacity:0.4; pointer-events:none;'}">
            <span class="pix-cover-opt-label" style="font-size:0.78rem; color:#5E6D7C;">Cor da Logo:</span>
            <div class="pix-logo-btn-group">
              <button type="button" class="${logoColor === 'auto' ? 'active' : ''}" data-cover-logo-color="auto" title="Automática conforme o contraste da capa e do tema">Auto</button>
              <button type="button" class="${logoColor === 'light' ? 'active' : ''}" data-cover-logo-color="light" title="Logo branca para capas escuras ou fotográficas">Branca</button>
              <button type="button" class="${logoColor === 'dark' ? 'active' : ''}" data-cover-logo-color="dark" title="Logo escura para capas claras">Escura</button>
            </div>
          </div>
        </div>
      `;
    } else if (activeDesignSection === 'typography') {
      stageHeading = 'Tipografia';
      stageHint = 'Define a personalidade dos títulos na capa e no cabeçalho do álbum';
      stageBody = `
        <div class="pix-cards-grid">
          ${presets.typographies.map((tp) => {
            const isAct = design.typography === tp.id;
            return `
              <button type="button" class="pix-choice-item ${isAct ? 'active' : ''}" data-design-typo="${escapeHtml(tp.id)}">
                <div class="pix-choice-frame pix-typo-card">
                  ${tp.badge ? `<span class="pix-thumb-badge">${escapeHtml(tp.badge)}</span>` : ''}
                  <span
                    class="pix-typo-sample"
                    style="font-family:${escapeHtml(tp.fontFamily)}; font-weight:${tp.weight}; font-style:${tp.fontStyle || 'normal'}; letter-spacing:${tp.tracking}; text-transform:${tp.transform};"
                  >${escapeHtml(tp.sample)}</span>
                  <span class="pix-typo-desc">${escapeHtml(tp.desc)}</span>
                </div>
                <span class="pix-choice-label">${escapeHtml(tp.label)}</span>
              </button>
            `;
          }).join('')}
        </div>
      `;
    } else if (activeDesignSection === 'color') {
      stageHeading = 'Cor';
      stageHint = 'Paleta de fundo, superfície e destaque editorial do álbum';
      stageBody = `
        <div class="pix-cards-grid">
          ${presets.colorThemes.map((ct) => {
            const isAct = design.colorTheme === ct.id;
            return `
              <button type="button" class="pix-choice-item ${isAct ? 'active' : ''}" data-design-color="${escapeHtml(ct.id)}">
                <div class="pix-choice-frame pix-color-card">
                  ${ct.badge ? `<span class="pix-thumb-badge">${escapeHtml(ct.badge)}</span>` : ''}
                  ${ct.dots.map((hex) => `<span class="pix-color-dot" style="background-color:${escapeHtml(hex)};"></span>`).join('')}
                </div>
                <span class="pix-choice-label">${escapeHtml(ct.label)}</span>
              </button>
            `;
          }).join('')}
        </div>
      `;
    } else {
      stageHeading = 'Grade';
      stageHint = 'Disposição das fotografias, respiro entre imagens e tamanho das colunas';
      const gStyle = design.gridStyle || 'vertical';
      const gSpacing = design.gridSpacing || 'regular';
      const gSize = design.gridSize || 'regular';
      const gNav = design.gridNavStyle || 'icons_text';
      stageBody = `
        <div class="pix-grid-group">
          <span class="pix-grid-group-label">Estilo da Grade</span>
          <div class="pix-cards-grid">
            ${presets.gridStyles.map((gs) => {
              const isAct = gStyle === gs.id;
              return `
                <button type="button" class="pix-choice-item ${isAct ? 'active' : ''}" data-grid-style="${escapeHtml(gs.id)}">
                  <div class="pix-choice-frame pix-grid-diagram" data-grid-style="${escapeHtml(gs.id)}">
                    ${gs.badge ? `<span class="pix-thumb-badge">${escapeHtml(gs.badge)}</span>` : ''}
                    ${gs.id === 'vertical' ? `
                      <div class="pix-wire-vert">
                        <span style="height:28px;"></span>
                        <span style="height:18px;"></span>
                        <span style="height:24px;"></span>
                        <span style="height:16px;"></span>
                        <span style="height:26px;"></span>
                        <span style="height:20px;"></span>
                      </div>
                    ` : gs.id === 'horizontal' ? `
                      <div class="pix-wire-horiz">
                        <div><span style="flex:1.5;"></span><span style="flex:1;"></span></div>
                        <div><span style="flex:1;"></span><span style="flex:1.6;"></span></div>
                      </div>
                    ` : gs.id === 'square' ? `
                      <div class="pix-wire-square">
                        <span></span><span></span>
                        <span></span><span></span>
                      </div>
                    ` : `
                      <div class="pix-wire-passepartout">
                        <div><span></span></div>
                        <div><span></span></div>
                      </div>
                    `}
                  </div>
                  <span class="pix-choice-label">${escapeHtml(gs.label)}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="pix-grid-group">
          <span class="pix-grid-group-label">Espaçamento entre Fotos</span>
          <div class="pix-cards-grid">
            ${presets.gridSpacings.map((sp) => `
              <button type="button" class="pix-choice-item ${gSpacing === sp.id ? 'active' : ''}" data-grid-spacing="${escapeHtml(sp.id)}">
                <div class="pix-choice-frame" style="padding:14px 12px; text-align:center; font-size:0.8rem; font-weight:600; color:#1B2733;">
                  ${escapeHtml(sp.label)} (${sp.gapPx}px)
                </div>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="pix-grid-group">
          <span class="pix-grid-group-label">Tamanho das Miniaturas</span>
          <div class="pix-cards-grid">
            ${presets.gridSizes.map((sz) => `
              <button type="button" class="pix-choice-item ${gSize === sz.id ? 'active' : ''}" data-grid-size="${escapeHtml(sz.id)}">
                <div class="pix-choice-frame" style="padding:14px 12px; text-align:center; font-size:0.8rem; font-weight:600; color:#1B2733;">
                  ${escapeHtml(sz.label)} (${sz.cols} colunas)
                </div>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="pix-grid-group">
          <span class="pix-grid-group-label">Navegação e Cabeçalho</span>
          <p style="font-size:0.75rem; color:#5E6D7C; margin:0 0 10px;">Define se os botões da barra da galeria (Baixar fotos, Concluir seleção) exibem o texto ao lado do ícone ou apenas o ícone circular minimalista.</p>
          <div class="pix-cards-grid">
            <button type="button" class="pix-choice-item ${gNav === 'icons_text' ? 'active' : ''}" data-grid-nav="icons_text">
              <div class="pix-choice-frame" style="padding:14px 12px; text-align:center;">
                <div style="display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:6px;">
                  <span style="display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:4px; background:rgba(0,0,0,0.07); font-size:0.72rem; color:#1B2733; font-weight:600;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Baixar
                  </span>
                </div>
                <div style="font-size:0.82rem; font-weight:600; color:#1B2733;">Ícones e Texto</div>
                <div style="font-size:0.68rem; color:#6B7280; margin-top:3px;">Exibe nome e ícone no botão</div>
              </div>
            </button>
            <button type="button" class="pix-choice-item ${gNav === 'icons_only' ? 'active' : ''}" data-grid-nav="icons_only">
              <div class="pix-choice-frame" style="padding:14px 12px; text-align:center;">
                <div style="display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:6px;">
                  <span style="display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:50%; background:rgba(0,0,0,0.07); font-size:0.72rem; color:#1B2733;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </span>
                </div>
                <div style="font-size:0.82rem; font-weight:600; color:#1B2733;">Apenas Ícones</div>
                <div style="font-size:0.68rem; color:#6B7280; margin-top:3px;">Botões compactos circulares</div>
              </div>
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="pix-design-shell">
        <aside class="pix-design-rail">
          <div class="pix-focal-box">
            <div class="pix-focal-stage" id="pix-focal-picker" title="Clique para mover o ponto focal da capa">
              <img src="${escapeHtml(coverSrc)}" alt="Capa do álbum" style="object-position: ${focal.x}% ${focal.y}%;" />
              <span class="pix-focal-pin" id="pix-focal-pin" style="left: ${focal.x}%; top: ${focal.y}%;"></span>
            </div>
            <div class="pix-focal-caption">
              <span>⊙ Ponto Focal</span>
              <span id="pix-focal-coords">${Math.round(focal.x)}% · ${Math.round(focal.y)}%</span>
            </div>
          </div>
          <div class="pix-rail-label">Design</div>
          <nav class="pix-rail-nav" aria-label="Opções de design do álbum">
            <button type="button" class="pix-rail-btn ${activeDesignSection === 'cover' ? 'active' : ''}" data-design-sec="cover">
              <span class="pix-rail-icon">▣</span>
              <span>Capa</span>
            </button>
            <button type="button" class="pix-rail-btn ${activeDesignSection === 'typography' ? 'active' : ''}" data-design-sec="typography">
              <span class="pix-rail-icon" style="font-family:Georgia,serif;font-weight:700;">T</span>
              <span>Tipografia</span>
            </button>
            <button type="button" class="pix-rail-btn ${activeDesignSection === 'color' ? 'active' : ''}" data-design-sec="color">
              <span class="pix-rail-icon">◐</span>
              <span>Cor</span>
            </button>
            <button type="button" class="pix-rail-btn ${activeDesignSection === 'grid' ? 'active' : ''}" data-design-sec="grid">
              <span class="pix-rail-icon">⊞</span>
              <span>Grade</span>
            </button>
          </nav>
        </aside>

        <div class="pix-design-stage">
          <div class="pix-stage-head">
            <h3>${stageHeading}</h3>
            <span class="pix-stage-hint">${stageHint}</span>
          </div>
          ${stageBody}
        </div>
      </div>
    `;
  }

  function renderProtectionSubTab(activeAlbum) {
    const wmCfg = albumsState.watermarkConfig || {};
    const wmEnabled = activeAlbum.watermarkEnabled !== false;
    const activeProt = activeAlbum.protectionLevel || 'watermark';
    const wmOpacityPct = Math.round((Number(wmCfg.opacity) || 0.45) * 100);
    const wmScalePct = Math.round((Number(wmCfg.scale) || 0.28) * 100);

    return `
      <div class="alb-card-clean">
        <div class="alb-switch-header-row">
          <div class="alb-toggle-setting-text">
            <strong>Proteger fotos na Fase de Seleção com Marca d'Água</strong>
            <span>Na Entrega Final (Fase 2), as fotos ficam limpas em alta resolução automaticamente.</span>
          </div>
          <label class="cms-switch">
            <input type="checkbox" id="sw-alb-wm-enabled" ${wmEnabled ? 'checked' : ''} />
            <span class="cms-switch-track"></span>
            <span>${wmEnabled ? 'ON' : 'OFF'}</span>
          </label>
        </div>

        <div class="alb-protection-grid">
          <button type="button" class="alb-prot-card ${activeProt === 'watermark' ? 'active' : ''}" data-set-prot="watermark">
            <div class="alb-prot-card-top">
              <strong>Marca d'Água</strong>
              <span class="alb-prot-dot"></span>
            </div>
            <span>Fotografia nítida com sua marca d'água aplicada sobre a imagem.</span>
          </button>

          <button type="button" class="alb-prot-card ${activeProt === 'watermark_lowres' ? 'active' : ''}" data-set-prot="watermark_lowres">
            <div class="alb-prot-card-top">
              <strong>Marca d'Água + Baixa Resolução</strong>
              <span class="alb-prot-dot"></span>
            </div>
            <span>O cliente vê bem rostos e expressões para escolher, mas a resolução reduzida impede uso ou impressão.</span>
          </button>

          <button type="button" class="alb-prot-card ${activeProt === 'watermark_spotlight' ? 'active' : ''}" data-set-prot="watermark_spotlight">
            <div class="alb-prot-card-top">
              <strong>Marca d'Água + Foco no Cursor</strong>
              <span class="alb-prot-dot"></span>
            </div>
            <span>Foto inteira desfocada; foca apenas onde o cliente passa o mouse ou o dedo na tela.</span>
          </button>
        </div>

        <div class="alb-wm-studio-layout">
          <div>
            ${wmEnabled ? `
              <div style="display:flex; flex-wrap:wrap; gap:14px; margin-bottom:10px;">
                <div>
                  <label class="field-label" style="display:block; margin-bottom:5px;">Formato da Marca</label>
                  <div class="alb-seg-row">
                    <button type="button" class="alb-seg-btn ${wmCfg.mode !== 'text' ? 'active' : ''}" data-wm-mode="image">Sua Logo (PNG/SVG)</button>
                    <button type="button" class="alb-seg-btn ${wmCfg.mode === 'text' ? 'active' : ''}" data-wm-mode="text">Texto</button>
                  </div>
                </div>
                <div>
                  <label class="field-label" style="display:block; margin-bottom:5px;">Disposição</label>
                  <div class="alb-seg-row">
                    <button type="button" class="alb-seg-btn ${wmCfg.pattern !== 'center' ? 'active' : ''}" data-wm-pattern="tiled">Grade Repetida</button>
                    <button type="button" class="alb-seg-btn ${wmCfg.pattern === 'center' ? 'active' : ''}" data-wm-pattern="center">Centralizada</button>
                  </div>
                </div>
              </div>

              ${wmCfg.mode !== 'text' ? `
                <div class="alb-wm-thumb-box">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <div class="alb-wm-logo-checker">
                      <img src="${escapeHtml(wmCfg.imageSrc || 'assets/images/logo-light.png')}" alt="Logo Marca d'Água" />
                    </div>
                    <div style="font-size:0.75rem; line-height:1.35;">
                      <strong style="display:block;">Arquivo da Marca d'Água</strong>
                      <span style="color:rgba(255,253,243,0.72);">PNG ou SVG transparente</span>
                    </div>
                  </div>
                  <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <input type="file" id="wm-file-upload" accept="image/png,image/webp,image/svg+xml,image/jpeg" hidden />
                    <button type="button" id="btn-upload-wm-img" class="cms-btn cms-btn-gold cms-btn-sm">Subir Logo</button>
                    <button type="button" id="btn-reset-wm-default" class="cms-btn cms-btn-outline cms-btn-sm" style="color:#FFFDF3; border-color:rgba(255,253,243,0.28);">Padrão</button>
                  </div>
                </div>
              ` : `
                <div class="field-group" style="margin-top:10px;">
                  <label class="field-label">Texto da Marca d'Água</label>
                  <input type="text" id="wm-text-input" class="cms-input" value="${escapeHtml(wmCfg.text || '')}" placeholder="Ex: INSTANTES DE CARLY · PROVA" />
                </div>
              `}

              <div class="field-grid" style="margin-top:12px;">
                <div class="field-group">
                  <div style="display:flex; justify-content:space-between; font-size:0.74rem; font-weight:600; margin-bottom:4px;">
                    <span>Opacidade</span>
                    <strong id="wm-opacity-val">${wmOpacityPct}%</strong>
                  </div>
                  <input type="range" id="wm-opacity-range" min="15" max="85" step="5" value="${wmOpacityPct}" style="width:100%;" />
                </div>
                <div class="field-group">
                  <div style="display:flex; justify-content:space-between; font-size:0.74rem; font-weight:600; margin-bottom:4px;">
                    <span>Tamanho</span>
                    <strong id="wm-scale-val">${wmScalePct}%</strong>
                  </div>
                  <input type="range" id="wm-scale-range" min="15" max="60" step="5" value="${wmScalePct}" style="width:100%;" />
                </div>
              </div>
            ` : `
              <div style="padding:18px; border-radius:9px; background:#FAF8F3; color:#526170; font-size:0.8rem;">
                A marca d'água sobreposta está desativada (<strong>OFF</strong>). O modo de resolução/foco selecionado acima continua protegendo as fotos.
              </div>
            `}
          </div>

          <div>
            <div class="alb-wm-live-card" id="adm-wm-live-card">
              <img id="adm-wm-live-preview" class="adm-wm-base" src="assets/images/carly-perfil.jpg" alt="Prévia viva da proteção" />
              <img id="adm-wm-live-reveal" class="adm-wm-reveal" src="assets/images/carly-perfil.jpg" alt="" hidden />
              <div class="alb-wm-live-badge">
                <span>${activeProt === 'watermark_spotlight' ? 'Passe o mouse p/ testar' : 'Prévia real'}</span>
                <strong id="adm-wm-live-caption">${escapeHtml(getProtectionLabel(activeProt, wmEnabled))}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderSettingsSubTab(activeAlbum) {
    const pwOn = activeAlbum.passwordEnabled !== false && Boolean(activeAlbum.password || activeAlbum.passwordEnabled === true);
    const extrasOn = activeAlbum.extrasEnabled !== false;
    const pinOn = Boolean(activeAlbum.pinEnabled && activeAlbum.downloadPin) || activeAlbum.pinEnabled === true;
    const payCfg = albumsState.paymentConfig || {};

    return `
      <div class="alb-card-clean">
        <div class="field-grid">
          <div class="field-group">
            <label class="field-label">Nome do Cliente / Casal</label>
            <input type="text" id="alb-in-client" class="cms-input" value="${escapeHtml(activeAlbum.clientName)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Código do Link (/galeria?id=...)</label>
            <input type="text" id="alb-in-slug" class="cms-input" value="${escapeHtml(activeAlbum.slug)}" />
          </div>
        </div>

        <div class="field-grid" style="margin-top:10px;">
          <div class="field-group">
            <label class="field-label">Título Exibido no Álbum</label>
            <input type="text" id="alb-in-title" class="cms-input" value="${escapeHtml(activeAlbum.title)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Subtítulo / Local / Data</label>
            <input type="text" id="alb-in-sub" class="cms-input" value="${escapeHtml(activeAlbum.subtitle || '')}" />
          </div>
        </div>

        <div class="field-grid" style="margin-top:10px;">
          <div class="field-group">
            <label class="field-label">Selo Superior da Capa (Kicker)</label>
            <input type="text" id="alb-in-kicker" class="cms-input" value="${escapeHtml(activeAlbum.coverKicker !== undefined ? activeAlbum.coverKicker : 'GALERIA OFICIAL EM ALTA RESOLUÇÃO')}" placeholder="Deixe em branco para ocultar da capa" />
          </div>
          <div class="field-group">
            <label class="field-label">Assinatura da Fotógrafa na Capa</label>
            <input type="text" id="alb-in-author" class="cms-input" value="${escapeHtml(activeAlbum.coverAuthor !== undefined ? activeAlbum.coverAuthor : 'Carliane Carvalho')}" placeholder="Deixe em branco para ocultar da capa" />
          </div>
        </div>

        <div class="field-grid" style="margin-top:10px;">
          <div class="field-group">
            <label class="field-label">Nome do Pacote</label>
            <input type="text" id="alb-in-pkgname" class="cms-input" value="${escapeHtml(activeAlbum.packageName || 'Ensaio')}" />
          </div>
          <div class="field-group">
            <label class="field-label">Fotos Inclusas no Pacote</label>
            <input type="number" min="0" id="alb-in-included" class="cms-input" value="${Number(activeAlbum.packageIncluded || 0)}" />
          </div>
        </div>

        <div class="field-group" style="margin-top:10px;">
          <label class="field-label">Mensagem de Boas-Vindas / Subtítulo da Capa (Exibida no Hero)</label>
          <textarea id="alb-in-welcome" class="cms-textarea" rows="2" placeholder="Ex: Escolham com calma as fotografias favoritas de vocês.">${escapeHtml(activeAlbum.welcomeMessage || '')}</textarea>
        </div>

        <!-- CHAVE ON/OFF 1: VENDA DE FOTOS EXTRAS -->
        <div class="alb-toggle-setting-row" style="margin-top:14px;">
          <div class="alb-toggle-setting-head">
            <div class="alb-toggle-setting-text">
              <strong>Permitir compra de fotos extras além do pacote</strong>
              <span>Calcula automaticamente o valor adicional quando o cliente escolhe além da franquia.</span>
            </div>
            <label class="cms-switch">
              <input type="checkbox" id="sw-alb-extras" ${extrasOn ? 'checked' : ''} />
              <span class="cms-switch-track"></span>
              <span>${extrasOn ? 'ON' : 'OFF'}</span>
            </label>
          </div>
          ${extrasOn ? `
            <div class="alb-toggle-setting-body">
              <div class="field-grid">
                <div class="field-group">
                  <label class="field-label">Valor por Foto Extra (R$)</label>
                  <input type="number" min="0" step="1" id="alb-in-extraprice" class="cms-input" value="${Number(activeAlbum.extraPhotoPrice || 0)}" />
                </div>
                <div class="field-group" style="display:flex; align-items:flex-end;">
                  <button type="button" id="btn-toggle-pay-drawer" class="cms-btn cms-btn-outline cms-btn-sm">
                    ${showPaymentDrawer ? 'Ocultar Dados Pix ▲' : 'Configurar Chave Pix do Estúdio ▾'}
                  </button>
                </div>
              </div>
              ${showPaymentDrawer ? `
                <div class="field-grid" style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(27,39,51,0.08);">
                  <div class="field-group">
                    <label class="field-label">Chave Pix Oficial (0% Taxa)</label>
                    <input type="text" id="cfg-pix-key" class="cms-input" value="${escapeHtml(payCfg.pixKey || '')}" placeholder="CPF, CNPJ, E-mail ou Celular" />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Nome do Recebedor</label>
                    <input type="text" id="cfg-pix-name" class="cms-input" value="${escapeHtml(payCfg.merchantName || '')}" />
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <!-- CHAVE ON/OFF 2: SENHA DE ACESSO AO ÁLBUM -->
        <div class="alb-toggle-setting-row">
          <div class="alb-toggle-setting-head">
            <div class="alb-toggle-setting-text">
              <strong>Exigir senha para abrir o álbum</strong>
              <span>Mantém o ensaio privado apenas para quem recebeu o convite.</span>
            </div>
            <label class="cms-switch">
              <input type="checkbox" id="sw-alb-password" ${pwOn ? 'checked' : ''} />
              <span class="cms-switch-track"></span>
              <span>${pwOn ? 'ON' : 'OFF'}</span>
            </label>
          </div>
          ${pwOn ? `
            <div class="alb-toggle-setting-body">
              <div class="field-group" style="max-width:260px; margin:0;">
                <label class="field-label">Senha do Cliente</label>
                <input type="text" id="alb-in-password" class="cms-input" value="${escapeHtml(activeAlbum.password || '1234')}" />
              </div>
            </div>
          ` : ''}
        </div>

        <!-- CHAVE ON/OFF 3: PIN DE DOWNLOAD EM ALTA -->
        <div class="alb-toggle-setting-row">
          <div class="alb-toggle-setting-head">
            <div class="alb-toggle-setting-text">
              <strong>Exigir PIN de 4 dígitos para baixar fotos em Alta Resolução</strong>
              <span>Útil quando convidados podem ver o álbum final, mas só os noivos/cliente baixam o .ZIP.</span>
            </div>
            <label class="cms-switch">
              <input type="checkbox" id="sw-alb-pin" ${pinOn ? 'checked' : ''} />
              <span class="cms-switch-track"></span>
              <span>${pinOn ? 'ON' : 'OFF'}</span>
            </label>
          </div>
          ${pinOn ? `
            <div class="alb-toggle-setting-body">
              <div class="field-group" style="max-width:220px; margin:0;">
                <label class="field-label">PIN de Download (4 dígitos)</label>
                <input type="text" maxlength="6" id="alb-in-pin" class="cms-input" value="${escapeHtml(activeAlbum.downloadPin || '2026')}" />
              </div>
            </div>
          ` : ''}
        </div>

        <div class="alb-danger-footer">
          <button type="button" id="btn-save-album-meta" class="cms-btn cms-btn-primary">
            Salvar Alterações deste Álbum
          </button>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" id="btn-reset-demo-albums" class="cms-btn cms-btn-outline cms-btn-sm">
              Restaurar Exemplos
            </button>
            <button type="button" id="btn-delete-album" class="cms-btn cms-btn-danger cms-btn-sm">
              Excluir Álbum
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     4. RENDERIZAÇÃO PRINCIPAL DO PAINEL #panel-albums
     ========================================================================== */
  function renderAlbumsAdminPanel() {
    const panel = document.getElementById('panel-albums');
    if (!panel || !albumsState) return;

    updateSidebarBadge();
    renderSidebarAlbumsSublist();

    const albums = albumsState.albums || [];
    const activeAlbum = getActiveAlbum();

    const quickCreateMarkup = showQuickCreateAlbum ? `
      <div class="alb-quick-create-card">
        <div class="alb-quick-create-head">
          <strong>Criar Novo Álbum Privado de Cliente</strong>
          <button type="button" id="btn-cancel-quick-create" class="cms-btn cms-btn-outline cms-btn-sm">Cancelar</button>
        </div>
        <div class="alb-quick-create-row">
          <div class="field-group">
            <label class="field-label">Nome do Cliente ou Casal</label>
            <input type="text" id="quick-alb-client-input" class="cms-input" placeholder="Ex: Camila & Rafael" />
          </div>
          <div class="field-group" style="max-width: 150px;">
            <label class="field-label">Fotos no Pacote</label>
            <input type="number" id="quick-alb-pkg-input" class="cms-input" value="15" min="0" />
          </div>
          <button type="button" id="btn-confirm-quick-create" class="cms-btn cms-btn-primary">
            Criar Álbum
          </button>
        </div>
      </div>
    ` : '';

    if (!activeAlbum) {
      panel.innerHTML = `
        ${quickCreateMarkup}
        <div class="alb-card-clean" style="text-align:center; padding:42px 20px;">
          <h3 style="margin:0 0 8px; color:#1B2733;">Nenhum álbum criado ainda</h3>
          <p style="font-size:0.84rem; color:#5E6D7C; margin:0 0 16px;">Crie o primeiro álbum usando o menu lateral esquerdo ou o botão abaixo.</p>
          <button type="button" id="btn-empty-new-alb" class="cms-btn cms-btn-primary">+ Novo Álbum de Cliente</button>
        </div>
      `;
      bindQuickCreateEvents();
      document.getElementById('btn-empty-new-alb')?.addEventListener('click', () => {
        showQuickCreateAlbum = true;
        renderAlbumsAdminPanel();
      });
      syncPreviewIframeForAlbums();
      return;
    }

    const st = getStatusMeta(activeAlbum);
    const calc = window.AlbumsStore.calculateSelectionPricing(activeAlbum);

    let subTabContent = '';
    if (activeAlbumSubTab === 'design') {
      subTabContent = renderDesignSubTab(activeAlbum);
    } else if (activeAlbumSubTab === 'protection') {
      subTabContent = renderProtectionSubTab(activeAlbum);
    } else if (activeAlbumSubTab === 'settings') {
      subTabContent = renderSettingsSubTab(activeAlbum);
    } else {
      subTabContent = renderPhotosSubTab(activeAlbum, calc);
    }

    panel.innerHTML = `
      ${quickCreateMarkup}

      <!-- Seletor compacto apenas em telas mobile (no desktop os álbuns ficam na barra esquerda) -->
      <div class="alb-mobile-SelectWrap">
        <select id="alb-mobile-switcher" class="cms-select" style="flex:1;">
          ${albums.map((a) => `<option value="${escapeHtml(a.id)}" ${a.id === activeAlbum.id ? 'selected' : ''}>${escapeHtml(a.clientName)} (${(a.photos || []).length} fotos)</option>`).join('')}
        </select>
        <button type="button" id="btn-mobile-new-album" class="cms-btn cms-btn-primary cms-btn-sm">+ Novo</button>
      </div>

      <div class="alb-studio-header">
        <div class="alb-studio-identity">
          <div class="alb-studio-toprow">
            <h2 class="alb-studio-title">${escapeHtml(activeAlbum.clientName)}</h2>
            <span class="alb-status-tag ${st.cls}">${escapeHtml(st.label)}</span>
          </div>
          <div class="alb-studio-slug">
            <span>${escapeHtml(activeAlbum.title || '')}</span>
            <span>·</span>
            <code>/${escapeHtml(activeAlbum.slug)}</code>
          </div>
        </div>

        <div class="alb-studio-actions">
          <button type="button" id="btn-publish-album-now" class="cms-btn cms-btn-primary cms-btn-sm" title="Publica este e todos os álbuns no site oficial via GitHub">
            ☁ Publicar no Site
          </button>
          <button type="button" id="btn-copy-whatsapp-invite" class="cms-btn cms-btn-gold cms-btn-sm">
            Copiar Convite WhatsApp
          </button>
          <a href="${galeriaRoute}?id=${encodeURIComponent(activeAlbum.slug)}" target="_blank" rel="noopener" class="cms-btn cms-btn-outline cms-btn-sm">
            Abrir Álbum ↗
          </a>
        </div>
      </div>

      ${activeAlbum.status === 'awaiting_pix_confirm' ? `
        <div class="alb-pix-alert-banner">
          <span><strong>Pix informado pelo cliente:</strong> confirme o recebimento de <strong>${formatBRL(activeAlbum.paymentOrder?.totalAmount)}</strong> para liberar a seleção.</span>
          <button type="button" id="btn-approve-direct-pix" class="cms-btn cms-btn-primary cms-btn-sm">
            Confirmar Pix Recebido
          </button>
        </div>
      ` : ''}

      ${activeAlbum.status === 'selection_paid' ? `
        <div class="alb-pix-alert-banner" style="background: rgba(39, 174, 96, 0.12); border-color: rgba(39, 174, 96, 0.35); color: #1e8449; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <span>✅ <strong>Pagamento Confirmado:</strong> ${formatBRL(activeAlbum.paymentOrder?.totalAmount)} (${activeAlbum.paymentOrder?.extraCount || 0} fotos extras) pagos via ${activeAlbum.paymentOrder?.method || 'Mercado Pago'}. As ${calc.selectedCount} fotografias selecionadas estão prontas para edição!</span>
          <button type="button" id="btn-reset-album-payment" class="cms-btn cms-btn-outline cms-btn-sm" style="border-color: rgba(39, 174, 96, 0.45); color: #1e8449; background: #fff;" title="Reabre a seleção para o cliente e limpa status de pago">
            Reabrir Seleção
          </button>
        </div>
      ` : ''}

      <div class="alb-phase-toggle-bar" role="tablist" aria-label="Fase atual do álbum">
        <button type="button" class="alb-phase-btn ${activeAlbum.phase === 'proofing' ? 'active' : ''}" data-set-phase="proofing">
          Fase 1 · Seleção de Fotos (${calc.selectedCount}/${calc.packageIncluded})
        </button>
        <button type="button" class="alb-phase-btn ${activeAlbum.phase === 'delivery' ? 'active' : ''}" data-set-phase="delivery">
          Fase 2 · Entrega Final em Alta
        </button>
      </div>

      <nav class="alb-subtabs-nav" aria-label="Editor do álbum">
        <button type="button" class="alb-subtab-btn ${activeAlbumSubTab === 'photos' ? 'active' : ''}" data-alb-subtab="photos">
          <span>Fotos</span>
          <span class="alb-subtab-pill">${(activeAlbum.photos || []).length}</span>
        </button>
        <button type="button" class="alb-subtab-btn ${activeAlbumSubTab === 'design' ? 'active' : ''}" data-alb-subtab="design">
          <span>Design &amp; Capa</span>
        </button>
        <button type="button" class="alb-subtab-btn ${activeAlbumSubTab === 'protection' ? 'active' : ''}" data-alb-subtab="protection">
          <span>Marca d'Água &amp; Proteção</span>
        </button>
        <button type="button" class="alb-subtab-btn ${activeAlbumSubTab === 'settings' ? 'active' : ''}" data-alb-subtab="settings">
          <span>Pacote &amp; Senhas</span>
        </button>
      </nav>

      ${subTabContent}
    `;

    bindQuickCreateEvents();
    bindAlbumWorkspaceEvents(activeAlbum);
    syncPreviewIframeForAlbums();
    if (activeAlbumSubTab === 'protection') {
      refreshWatermarkSamplePreview();
      bindAdminPreviewSpotlight();
    }
  }

  /* ==========================================================================
     5. EVENTOS INTERATIVOS DO EDITOR DE ÁLBUNS
     ========================================================================== */
  function bindQuickCreateEvents() {
    document.getElementById('btn-cancel-quick-create')?.addEventListener('click', () => {
      showQuickCreateAlbum = false;
      renderAlbumsAdminPanel();
    });

    const createNow = async () => {
      const nameInput = document.getElementById('quick-alb-client-input');
      const pkgInput = document.getElementById('quick-alb-pkg-input');
      const clientName = nameInput?.value.trim();
      if (!clientName) {
        nameInput?.focus();
        return;
      }
      const slug = slugify(clientName);
      const newAlb = window.AlbumsStore.normalizeAlbum({
        id: `alb_${Date.now()}`,
        slug,
        clientName,
        title: `Ensaio — ${clientName}`,
        subtitle: (window.SITE_DATA?.brand?.location || 'Fortaleza, CE').toUpperCase(),
        phase: 'proofing',
        status: 'awaiting_selection',
        protectionLevel: 'watermark',
        watermarkEnabled: true,
        passwordEnabled: true,
        password: String(Math.floor(1000 + Math.random() * 9000)),
        pinEnabled: false,
        downloadPin: '',
        packageName: 'Ensaio Autoral',
        packageIncluded: Math.max(0, parseInt(pkgInput?.value, 10) || 15),
        extrasEnabled: true,
        extraPhotoPrice: 25,
        allowHighResDownload: true,
        allowWebDownload: true,
        welcomeMessage: `Olá, ${clientName}! Escolham com carinho suas fotografias favoritas.`,
        coverSrc: '',
        coverFocal: '50% 35%',
        design: window.AlbumsStore.getDefaultDesign(),
        photos: [],
        selectedIds: [],
        photoComments: {},
        deliveryFavorites: [],
        selectionLocked: false,
        paymentOrder: null,
        activityLog: [{ at: new Date().toISOString(), type: 'created', text: 'Álbum criado no painel.' }]
      });

      albumsState.albums.unshift(newAlb);
      selectedAlbumId = newAlb.id;
      showQuickCreateAlbum = false;
      activeAlbumSubTab = 'photos';
      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast(`Álbum "${clientName}" criado!`);
    };

    document.getElementById('btn-confirm-quick-create')?.addEventListener('click', createNow);
    document.getElementById('quick-alb-client-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createNow();
      }
    });
  }

  function syncAdminStateDirty() {
    if (typeof cmsData !== 'undefined' && cmsData && albumsState) {
      cmsData.clientAlbums = albumsState.albums;
      cmsData.clientWatermarkConfig = albumsState.watermarkConfig;
      cmsData.clientPaymentConfig = albumsState.paymentConfig;
      if (typeof markDirty === 'function') markDirty();
    }
  }

  function broadcastWatermarkUpdate() {
    const iframe = document.getElementById('cms-preview-iframe');
    if (iframe && iframe.contentWindow && albumsState) {
      iframe.contentWindow.postMessage({
        type: 'WATERMARK_LIVE_UPDATE',
        watermarkConfig: JSON.parse(JSON.stringify(albumsState.watermarkConfig))
      }, '*');
    }
  }

  async function persistAlbumsStateAndSync(notifyMsg = null) {
    await window.AlbumsStore.saveState(albumsState);
    syncAdminStateDirty();
    broadcastWatermarkUpdate();
    if (notifyMsg) notifyAdminToast(notifyMsg);
  }

  function bindAlbumWorkspaceEvents(activeAlbum) {
    const panel = document.getElementById('panel-albums');
    if (!panel) return;

    let liveSaveTimer = null;
    const debouncedSaveState = () => {
      clearTimeout(liveSaveTimer);
      liveSaveTimer = setTimeout(async () => {
        await window.AlbumsStore.saveState(albumsState);
        syncAdminStateDirty();
      }, 350);
    };

    const flushTextMetaInputs = () => {
      const cName = document.getElementById('alb-in-client');
      if (cName) activeAlbum.clientName = cName.value.trim() || activeAlbum.clientName;
      const cSlug = document.getElementById('alb-in-slug');
      if (cSlug) activeAlbum.slug = slugify(cSlug.value || activeAlbum.clientName);
      const cTitle = document.getElementById('alb-in-title');
      if (cTitle) activeAlbum.title = cTitle.value.trim() || activeAlbum.clientName;
      const cSub = document.getElementById('alb-in-sub');
      if (cSub) activeAlbum.subtitle = cSub.value.trim();
      const cKicker = document.getElementById('alb-in-kicker');
      if (cKicker) activeAlbum.coverKicker = cKicker.value.trim();
      const cAuthor = document.getElementById('alb-in-author');
      if (cAuthor) activeAlbum.coverAuthor = cAuthor.value.trim();
      const cPkg = document.getElementById('alb-in-pkgname');
      if (cPkg) activeAlbum.packageName = cPkg.value.trim() || 'Ensaio';
      const cInc = document.getElementById('alb-in-included');
      if (cInc) activeAlbum.packageIncluded = Math.max(0, parseInt(cInc.value, 10) || 0);
      const cWel = document.getElementById('alb-in-welcome');
      if (cWel) activeAlbum.welcomeMessage = cWel.value.trim();
      const cExt = document.getElementById('alb-in-extraprice');
      if (cExt) activeAlbum.extraPhotoPrice = Math.max(0, Number(cExt.value) || 0);
      const cPw = document.getElementById('alb-in-password');
      if (cPw) activeAlbum.password = cPw.value.trim();
      const cPin = document.getElementById('alb-in-pin');
      if (cPin) activeAlbum.downloadPin = cPin.value.trim();

      const pixKey = document.getElementById('cfg-pix-key');
      const pixName = document.getElementById('cfg-pix-name');
      if (pixKey || pixName) {
        albumsState.paymentConfig = {
          ...albumsState.paymentConfig,
          pixKey: pixKey ? pixKey.value.trim() : albumsState.paymentConfig?.pixKey,
          merchantName: pixName ? pixName.value.trim() : albumsState.paymentConfig?.merchantName
        };
      }
    };

    const broadcastLiveAlbum = () => {
      flushTextMetaInputs();
      const iframe = document.getElementById('cms-preview-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'ALBUM_LIVE_UPDATE',
          album: JSON.parse(JSON.stringify(activeAlbum))
        }, '*');
      }
      debouncedSaveState();
    };

    // Ouvintes de digitação em tempo real em todos os campos de texto do álbum (0ms de atraso visual)
    [
      'alb-in-client', 'alb-in-slug', 'alb-in-title', 'alb-in-sub',
      'alb-in-kicker', 'alb-in-author', 'alb-in-pkgname', 'alb-in-included',
      'alb-in-welcome', 'alb-in-extraprice', 'alb-in-password', 'alb-in-pin'
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', broadcastLiveAlbum);
        el.addEventListener('change', broadcastLiveAlbum);
      }
    });

    // Switcher mobile
    document.getElementById('alb-mobile-switcher')?.addEventListener('change', (e) => {
      selectedAlbumId = e.target.value;
      renderAlbumsAdminPanel();
    });
    document.getElementById('btn-mobile-new-album')?.addEventListener('click', () => {
      showQuickCreateAlbum = true;
      renderAlbumsAdminPanel();
    });

    // Sub-abas (Fotos | Design | Proteção | Pacote & Senhas)
    panel.querySelectorAll('[data-alb-subtab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeAlbumSubTab = btn.getAttribute('data-alb-subtab');
        renderAlbumsAdminPanel();
      });
    });

    // Alternar Fase 1 (Seleção) <-> Fase 2 (Entrega Final)
    panel.querySelectorAll('[data-set-phase]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nextPhase = btn.getAttribute('data-set-phase');
        if (activeAlbum.phase === nextPhase) return;
        activeAlbum.phase = nextPhase;
        activeAlbum.status = nextPhase === 'delivery'
          ? 'delivered'
          : (activeAlbum.selectionLocked ? 'selection_completed' : 'awaiting_selection');
        await persistAlbumsStateAndSync(
          nextPhase === 'delivery'
            ? 'Fase 2 ativada: álbum publicado como Entrega Final!'
            : 'Fase 1 ativada: galeria em modo protegido de seleção.'
        );
        renderAlbumsAdminPanel();
      });
    });

    // Publicar no site oficial (via botão rápido dentro do próprio álbum)
    document.getElementById('btn-publish-album-now')?.addEventListener('click', () => {
      const mainPublishBtn = document.getElementById('btn-publish-main');
      if (mainPublishBtn) {
        mainPublishBtn.click();
      } else if (typeof handleMainPublishClick === 'function') {
        handleMainPublishClick();
      } else {
        notifyAdminToast('Acesse a aba Publicação para conectar o GitHub e enviar as alterações.', 'warning');
      }
    });

    // Reabrir seleção e limpar falso positivo ou pagamento de teste
    document.getElementById('btn-reset-album-payment')?.addEventListener('click', async () => {
      activeAlbum.status = 'awaiting_selection';
      activeAlbum.selectionLocked = false;
      activeAlbum.paymentOrder = null;
      if (Array.isArray(activeAlbum.activityLog)) {
        activeAlbum.activityLog = activeAlbum.activityLog.filter((l) => !l.text || (!l.text.includes('117,80') && !l.text.includes('Pagamento aprovado')));
      }
      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast('Seleção reaberta e pagamento resetado com sucesso!');
    });

    // Convite WhatsApp inteligente (omite senha/PIN quando desativados!)
    document.getElementById('btn-copy-whatsapp-invite')?.addEventListener('click', () => {
      const baseUrl = `${window.location.origin}${window.location.pathname.replace(/admin(\.html)?$/i, '')}${galeriaRoute}?id=${encodeURIComponent(activeAlbum.slug)}`;
      const pwLine = activeAlbum.passwordEnabled !== false && activeAlbum.password
        ? `\nSenha: ${activeAlbum.password}`
        : '';
      const pinLine = activeAlbum.pinEnabled && activeAlbum.downloadPin
        ? `\nPIN de Download: ${activeAlbum.downloadPin}`
        : '';
      const extraInfo = activeAlbum.extrasEnabled !== false
        ? ` (fotos extras opcionais: ${formatBRL(activeAlbum.extraPhotoPrice)} cada)`
        : '';

      const msg = activeAlbum.phase === 'proofing'
        ? `Olá, ${activeAlbum.clientName}!\nAs prévias do seu ensaio já estão prontas para escolha:\n\nLink: ${baseUrl}${pwLine}\nPacote: ${activeAlbum.packageIncluded} fotos inclusas${extraInfo}.`
        : `Olá, ${activeAlbum.clientName}!\nSeu álbum final em alta resolução está pronto para ver e baixar:\n\nLink: ${baseUrl}${pwLine}${pinLine}`;
      navigator.clipboard?.writeText(msg);

      const hasLocalBase64 = (activeAlbum.photos || []).some((p) => typeof p.originalSrc === 'string' && p.originalSrc.startsWith('data:image/'));
      if (hasLocalBase64) {
        notifyAdminToast('Convite copiado! Lembre-se de clicar em "☁ Publicar no Site" para que as fotos abram no celular do cliente.', 'info', 6000);
      } else {
        notifyAdminToast('Convite copiado para colar no WhatsApp.');
      }
    });

    // Confirmar Pix Direto
    document.getElementById('btn-approve-direct-pix')?.addEventListener('click', async () => {
      activeAlbum.status = 'selection_paid';
      if (activeAlbum.paymentOrder) {
        activeAlbum.paymentOrder.status = 'approved';
        activeAlbum.paymentOrder.paidAt = new Date().toISOString();
      }
      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast('Pagamento Pix confirmado!');

      // Sincroniza aprovação na nuvem para desbloquear o cliente
      try {
        fetch('/api/selection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            albumId: activeAlbum.id,
            slug: activeAlbum.slug,
            clientName: activeAlbum.clientName,
            selectedIds: activeAlbum.selectedIds,
            status: 'selection_paid',
            method: 'direct_pix',
            orderCode: activeAlbum.paymentOrder?.id || 'PIX-CONFIRMED',
            totalAmount: activeAlbum.paymentOrder?.totalAmount || 0,
            extraCount: activeAlbum.paymentOrder?.extraCount || 0
          })
        }).catch(() => {});
      } catch (_) {}
    });

    /* --- SUB-ABA 1: FOTOS --- */
    const fileInput = document.getElementById('alb-upload-input');
    document.getElementById('btn-trigger-alb-upload')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      const statusEl = document.getElementById('alb-upload-status');
      if (statusEl) statusEl.hidden = false;

      for (let i = 0; i < files.length; i++) {
        if (statusEl) statusEl.textContent = `Otimizando foto ${i + 1} de ${files.length}...`;
        const processed = await window.AlbumsStore.processUploadedAlbumFile(files[i]);
        const newPhoto = {
          id: `ph_${Date.now()}_${i}`,
          filename: processed.filename,
          originalSrc: processed.originalSrc
        };
        activeAlbum.photos.push(newPhoto);
        if (!activeAlbum.coverSrc || activeAlbum.photos.length === 1) {
          activeAlbum.coverSrc = newPhoto.originalSrc;
        }
      }

      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast(`${files.length} ${files.length === 1 ? 'foto adicionada' : 'fotos adicionadas'} ao álbum.`);
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
        const removed = (activeAlbum.photos || []).find((p) => p.id === pid);
        activeAlbum.photos = (activeAlbum.photos || []).filter((p) => p.id !== pid);
        activeAlbum.selectedIds = (activeAlbum.selectedIds || []).filter((id) => id !== pid);
        if (removed && activeAlbum.coverSrc === removed.originalSrc) {
          activeAlbum.coverSrc = activeAlbum.photos[0]?.originalSrc || '';
        }
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
      });
    });

    document.getElementById('btn-copy-lr-code')?.addEventListener('click', () => {
      const val = document.getElementById('lr-code-output')?.value || '';
      navigator.clipboard?.writeText(val);
      notifyAdminToast('Códigos copiados para o filtro do Lightroom.');
    });

    document.getElementById('btn-unlock-selection')?.addEventListener('click', async () => {
      activeAlbum.selectionLocked = false;
      activeAlbum.status = 'awaiting_selection';
      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast('Seleção reaberta para o cliente.');
    });

    /* --- SUB-ABA 2: DESIGN ESTILO PIXIESET --- */
    panel.querySelectorAll('[data-design-sec]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeDesignSection = btn.getAttribute('data-design-sec');
        renderAlbumsAdminPanel();
        const iframe = document.getElementById('cms-preview-iframe');
        if (iframe && iframe.contentWindow) {
          if (activeDesignSection === 'grid') {
            iframe.contentWindow.postMessage({ type: 'SCROLL_TO_SECTION', section: 'topbar' }, '*');
          } else if (activeDesignSection === 'cover') {
            iframe.contentWindow.postMessage({ type: 'SCROLL_TO_SECTION', section: 'cover' }, '*');
          }
        }
      });
    });

    const focalPicker = document.getElementById('pix-focal-picker');
    focalPicker?.addEventListener('click', async (e) => {
      const rect = focalPicker.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
      const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));
      activeAlbum.coverFocal = `${x}% ${y}%`;
      broadcastLiveAlbum();
      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast(`Ponto focal da capa ajustado (${x}% · ${y}%).`);
    });

    panel.querySelectorAll('[data-design-cover]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        activeAlbum.design = activeAlbum.design || window.AlbumsStore.getDefaultDesign();
        activeAlbum.design.coverStyle = btn.getAttribute('data-design-cover');
        broadcastLiveAlbum();
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
      });
    });

    const swCoverLogo = panel.querySelector('#sw-cover-logo-visible');
    if (swCoverLogo) {
      swCoverLogo.addEventListener('change', async () => {
        activeAlbum.design = activeAlbum.design || window.AlbumsStore.getDefaultDesign();
        activeAlbum.design.coverLogoVisible = swCoverLogo.checked;
        broadcastLiveAlbum();
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
        notifyAdminToast(swCoverLogo.checked ? 'Logotipo ativado na capa.' : 'Logotipo ocultado na capa.');
      });
    }

    panel.querySelectorAll('[data-cover-logo-color]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const color = btn.getAttribute('data-cover-logo-color');
        activeAlbum.design = activeAlbum.design || window.AlbumsStore.getDefaultDesign();
        activeAlbum.design.coverLogoColor = color;
        broadcastLiveAlbum();
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
        notifyAdminToast(`Cor da logo alterada para: ${color === 'auto' ? 'Automática' : color === 'light' ? 'Branca' : 'Escura'}.`);
      });
    });

    panel.querySelectorAll('[data-design-typo]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        activeAlbum.design = activeAlbum.design || window.AlbumsStore.getDefaultDesign();
        activeAlbum.design.typography = btn.getAttribute('data-design-typo');
        broadcastLiveAlbum();
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
      });
    });

    panel.querySelectorAll('[data-design-color]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        activeAlbum.design = activeAlbum.design || window.AlbumsStore.getDefaultDesign();
        activeAlbum.design.colorTheme = btn.getAttribute('data-design-color');
        broadcastLiveAlbum();
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
      });
    });

    panel.querySelectorAll('[data-grid-style]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        activeAlbum.design = activeAlbum.design || window.AlbumsStore.getDefaultDesign();
        activeAlbum.design.gridStyle = btn.getAttribute('data-grid-style');
        broadcastLiveAlbum();
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
      });
    });

    panel.querySelectorAll('[data-grid-spacing]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        activeAlbum.design = activeAlbum.design || window.AlbumsStore.getDefaultDesign();
        activeAlbum.design.gridSpacing = btn.getAttribute('data-grid-spacing');
        broadcastLiveAlbum();
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
      });
    });

    panel.querySelectorAll('[data-grid-size]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        activeAlbum.design = activeAlbum.design || window.AlbumsStore.getDefaultDesign();
        activeAlbum.design.gridSize = btn.getAttribute('data-grid-size');
        broadcastLiveAlbum();
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
      });
    });

    panel.querySelectorAll('[data-grid-nav]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        activeAlbum.design = activeAlbum.design || window.AlbumsStore.getDefaultDesign();
        activeAlbum.design.gridNavStyle = btn.getAttribute('data-grid-nav');
        broadcastLiveAlbum();
        const iframe = document.getElementById('cms-preview-iframe');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'SCROLL_TO_SECTION', section: 'topbar' }, '*');
        }
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
      });
    });

    /* --- SUB-ABA 3: PROTEÇÃO & MARCA D'ÁGUA --- */
    document.getElementById('sw-alb-wm-enabled')?.addEventListener('change', async (e) => {
      activeAlbum.watermarkEnabled = Boolean(e.target.checked);
      await persistAlbumsStateAndSync();
      renderAlbumsAdminPanel();
    });

    panel.querySelectorAll('[data-set-prot]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nextProt = btn.getAttribute('data-set-prot');
        activeAlbum.protectionLevel = nextProt;
        await persistAlbumsStateAndSync(`Proteção alterada: ${getProtectionLabel(nextProt, activeAlbum.watermarkEnabled !== false)}`);
        renderAlbumsAdminPanel();
      });
    });

    panel.querySelectorAll('[data-wm-mode]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        albumsState.watermarkConfig = {
          ...albumsState.watermarkConfig,
          mode: btn.getAttribute('data-wm-mode'),
          updatedAt: Date.now()
        };
        await persistAlbumsStateAndSync();
        renderAlbumsAdminPanel();
        refreshWatermarkSamplePreview();
      });
    });

    panel.querySelectorAll('[data-wm-pattern]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        albumsState.watermarkConfig = {
          ...albumsState.watermarkConfig,
          pattern: btn.getAttribute('data-wm-pattern'),
          updatedAt: Date.now()
        };
        await persistAlbumsStateAndSync();
        renderAlbumsAdminPanel();
        refreshWatermarkSamplePreview();
      });
    });

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
        await persistAlbumsStateAndSync('Logo personalizada aplicada na marca d\'água!');
        renderAlbumsAdminPanel();
      } catch (_) {
        notifyAdminToast('Não foi possível ler a imagem da marca d\'água.');
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
      await persistAlbumsStateAndSync('Logo padrão do estúdio restaurada.');
      renderAlbumsAdminPanel();
    });

    document.getElementById('wm-text-input')?.addEventListener('change', async (e) => {
      albumsState.watermarkConfig = {
        ...albumsState.watermarkConfig,
        text: e.target.value.trim() || window.AlbumsStore.getBrandDefaults().studioName.toUpperCase(),
        updatedAt: Date.now()
      };
      await persistAlbumsStateAndSync();
      refreshWatermarkSamplePreview();
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
      await persistAlbumsStateAndSync();
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
      await persistAlbumsStateAndSync();
      refreshWatermarkSamplePreview();
    });

    /* --- SUB-ABA 4: PACOTE, EXTRAS & SENHAS (CHAVES ON/OFF) --- */
    document.getElementById('sw-alb-extras')?.addEventListener('change', async (e) => {
      flushTextMetaInputs();
      activeAlbum.extrasEnabled = Boolean(e.target.checked);
      await persistAlbumsStateAndSync();
      renderAlbumsAdminPanel();
    });

    document.getElementById('sw-alb-password')?.addEventListener('change', async (e) => {
      flushTextMetaInputs();
      activeAlbum.passwordEnabled = Boolean(e.target.checked);
      if (activeAlbum.passwordEnabled && !activeAlbum.password) {
        activeAlbum.password = '1234';
      }
      await persistAlbumsStateAndSync();
      renderAlbumsAdminPanel();
    });

    document.getElementById('sw-alb-pin')?.addEventListener('change', async (e) => {
      flushTextMetaInputs();
      activeAlbum.pinEnabled = Boolean(e.target.checked);
      if (activeAlbum.pinEnabled && !activeAlbum.downloadPin) {
        activeAlbum.downloadPin = '2026';
      }
      await persistAlbumsStateAndSync();
      renderAlbumsAdminPanel();
    });

    document.getElementById('btn-toggle-pay-drawer')?.addEventListener('click', () => {
      flushTextMetaInputs();
      showPaymentDrawer = !showPaymentDrawer;
      renderAlbumsAdminPanel();
    });

    document.getElementById('btn-save-album-meta')?.addEventListener('click', async () => {
      flushTextMetaInputs();
      await persistAlbumsStateAndSync('Configurações do álbum salvas!');
      renderAlbumsAdminPanel();
    });

    document.getElementById('btn-reset-demo-albums')?.addEventListener('click', async () => {
      if (!window.confirm('Restaurar os álbuns demonstrativos originais?')) return;
      albumsState = await window.AlbumsStore.resetToDemo();
      selectedAlbumId = albumsState.albums[0]?.id || null;
      renderAlbumsAdminPanel();
      notifyAdminToast('Álbuns de exemplo restaurados.');
    });

    document.getElementById('btn-delete-album')?.addEventListener('click', async () => {
      if (!window.confirm(`Excluir permanentemente o álbum de "${activeAlbum.clientName}"?`)) return;
      albumsState.albums = albumsState.albums.filter((a) => a.id !== activeAlbum.id);
      selectedAlbumId = albumsState.albums[0]?.id || null;
      await window.AlbumsStore.saveState(albumsState);
      renderAlbumsAdminPanel();
      notifyAdminToast('Álbum excluído.');
    });
  }

  /* ==========================================================================
     6. SINCRONIZAÇÃO EM NUVEM DE SELEÇÕES DO CLIENTE E PAGAMENTOS
     ========================================================================== */
  async function syncCloudPayments() {
    try {
      if (!albumsState || !Array.isArray(albumsState.albums)) return;
      let changed = false;

      // 1. Sincroniza seleções diretas de clientes (Pix Direto e pacotes inclusos via /api/selection)
      try {
        const selRes = await fetch('/api/selection');
        if (selRes.ok) {
          const selData = await selRes.json();
          const selections = Array.isArray(selData.selections) ? selData.selections : [];
          selections.forEach((sel) => {
            const targetId = String(sel.albumId || sel.slug || '').trim();
            if (!targetId) return;
            const alb = albumsState.albums.find(
              (a) => a.id === targetId || (a.slug && a.slug.toLowerCase() === targetId.toLowerCase())
            );
            if (!alb) return;

            if (Array.isArray(sel.selectedIds) && sel.selectedIds.length > 0) {
              const currentCount = (alb.selectedIds || []).length;
              if (currentCount !== sel.selectedIds.length || alb.status !== sel.status) {
                alb.selectedIds = sel.selectedIds;
                alb.selectionLocked = true;
                alb.status = sel.status || 'awaiting_pix_confirm';
                alb.paymentOrder = {
                  id: sel.id,
                  method: sel.method || 'direct_pix',
                  status: sel.status === 'selection_paid' ? 'approved' : 'pending_receipt',
                  extraCount: sel.extraCount || 0,
                  totalAmount: sel.totalAmount || 0,
                  createdAt: sel.updatedAt || new Date().toISOString()
                };
                alb.activityLog = alb.activityLog || [];
                if (!alb.activityLog.some((l) => l.text && l.text.includes(sel.id))) {
                  alb.activityLog.unshift({
                    at: sel.updatedAt || new Date().toISOString(),
                    type: sel.status === 'awaiting_pix_confirm' ? 'pix_pending' : 'selection',
                    text: `Seleção recebida do cliente (${sel.selectedIds.length} fotos) via ${sel.method === 'direct_pix' ? 'Pix Direto' : 'Pacote'} (${sel.id}).`
                  });
                }
                changed = true;
              }
            }
          });
        }
      } catch (_) {}

      // 2. Higienização automática de falsos positivos antigos do Mercado Pago
      const res = await fetch('/api/payments');
      if (res.ok) {
        const data = await res.json();
        const payments = Array.isArray(data.payments) ? data.payments : [];

        albumsState.albums.forEach((a) => {
          if (a.paymentOrder && (a.paymentOrder.totalAmount === 117.8 || (a.paymentOrder.extraCount === 0 && a.status === 'selection_paid' && (!a.selectedIds || a.selectedIds.length === 0)))) {
            const hasLegit = payments.some(
              (p) => p.status === 'approved' && p.albumId && (p.albumId === a.id || (a.slug && p.albumId.toLowerCase() === a.slug.toLowerCase()))
            );
            if (!hasLegit) {
              a.status = 'awaiting_selection';
              a.selectionLocked = false;
              a.paymentOrder = null;
              if (Array.isArray(a.activityLog)) {
                a.activityLog = a.activityLog.filter((l) => !l.text || (!l.text.includes('117,80') && !l.text.includes('Pagamento aprovado')));
              }
              changed = true;
            }
          }
        });

        // 3. Vinculação estrita e segura de pagamentos aprovados do Mercado Pago
        payments.forEach((pay) => {
          if (pay.status !== 'approved') return;
          const targetId = String(pay.albumId || '').trim();
          if (!targetId) return;

          let alb = albumsState.albums.find(
            (a) => a.id === targetId || (a.slug && a.slug.toLowerCase() === targetId.toLowerCase())
          );
          if (!alb) return;

          if (alb && alb.status !== 'selection_paid') {
            alb.status = 'selection_paid';
            alb.selectionLocked = true;
            if (Array.isArray(pay.selectedIds) && pay.selectedIds.length > 0) {
              alb.selectedIds = pay.selectedIds;
            }
            alb.paymentOrder = {
              id: pay.id,
              method: pay.paymentMethod || 'mercadopago',
              status: 'approved',
              extraCount: pay.extraCount || 0,
              totalAmount: pay.amount,
              paidAt: pay.paidAt || new Date().toISOString()
            };
            alb.activityLog = alb.activityLog || [];
            if (!alb.activityLog.some((l) => l.text && l.text.includes(pay.id))) {
              alb.activityLog.unshift({
                at: pay.paidAt || new Date().toISOString(),
                type: 'payment',
                text: `Pagamento aprovado via Mercado Pago (${pay.id}): ${formatBRL(pay.amount)} por ${pay.extraCount || 0} fotos extras.`
              });
            }
            changed = true;
          }
        });
      }

      if (changed) {
        await window.AlbumsStore.saveState(albumsState);
        renderAlbumsAdminPanel();
      }
    } catch (_) {}
  }

  /* ==========================================================================
     7. INICIALIZAÇÃO E SINCRONIZAÇÃO EM TEMPO REAL
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', async () => {
    albumsState = await window.AlbumsStore.loadState();
    selectedAlbumId = albumsState.albums?.[0]?.id || null;
    renderAlbumsAdminPanel();

    // Consulta nuvem a cada 6 segundos e ao focar a aba (sem exigir Alt+F5)
    syncCloudPayments();
    setInterval(syncCloudPayments, 6000);
    window.addEventListener('focus', syncCloudPayments);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') syncCloudPayments();
    });

    document.querySelectorAll('.sidebar-tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        setTimeout(() => {
          renderSidebarAlbumsSublist();
          syncPreviewIframeForAlbums();
          syncCloudPayments();
        }, 20);
      });
    });

    window.AlbumsStore.subscribe(async () => {
      albumsState = await window.AlbumsStore.loadState();
      renderAlbumsAdminPanel();
    });
  });
})();
