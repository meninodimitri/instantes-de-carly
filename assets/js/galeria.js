/**
 * ============================================================================
 * ÁREA DO CLIENTE — GALERIA DE SELEÇÃO (SINETO) & ENTREGA (PIXIESET)
 * ============================================================================
 */
(function () {
  'use strict';

  const isLocalEnv = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
  const galeriaRoute = window.location.protocol === 'file:' ? 'galeria.html' : 'galeria';
  const params = new URLSearchParams(window.location.search);
  const hashSlug = window.location.hash.replace(/^#/, '').trim().toLowerCase();
  const initialSlug = (params.get('id') || params.get('album') || hashSlug || '').trim().toLowerCase();
  const isAdminPreview = params.get('preview') === '1';

  let rootState = null;
  let currentAlbum = null;
  let activeFilter = 'all'; // 'all' | 'selected' | 'unselected' | 'commented' | 'favorites' | 'folder:<name>'
  let lightboxList = [];
  let lightboxIdx = 0;
  let pendingDownloadTarget = null; // null = full zip, or photo object

  const els = {
    portalView: document.getElementById('portal-view'),
    portalForm: document.getElementById('portal-code-form'),
    portalSlugIn: document.getElementById('portal-slug-input'),
    portalError: document.getElementById('portal-error'),
    portalDemoBox: document.getElementById('portal-demo-box'),
    portalAlbumsGrid: document.getElementById('portal-albums-grid'),

    pwView: document.getElementById('password-view'),
    pwBg: document.getElementById('password-bg'),
    pwBadge: document.getElementById('pw-phase-badge'),
    pwTitle: document.getElementById('pw-album-title'),
    pwSubtitle: document.getElementById('pw-album-subtitle'),
    pwForm: document.getElementById('password-form'),
    pwInput: document.getElementById('pw-input'),
    pwError: document.getElementById('pw-error'),
    pwHint: document.getElementById('pw-local-hint'),

    albumView: document.getElementById('album-view'),
    deliveryHero: document.getElementById('delivery-hero'),
    deliveryHeroImg: document.getElementById('delivery-hero-img'),
    deliveryHeroSub: document.getElementById('delivery-hero-subtitle'),
    deliveryHeroTitle: document.getElementById('delivery-hero-title'),
    deliveryHeroMsg: document.getElementById('delivery-hero-msg'),
    btnScrollGallery: document.getElementById('btn-scroll-gallery'),
    btnHeroDownloadAll: document.getElementById('btn-hero-download-all'),

    proofingHeader: document.getElementById('proofing-header'),
    proofingPkgPill: document.getElementById('proofing-pkg-pill'),
    proofingSub: document.getElementById('proofing-subtitle'),
    proofingTitle: document.getElementById('proofing-title'),
    proofingWelcome: document.getElementById('proofing-welcome'),
    proofingLockedBanner: document.getElementById('proofing-locked-banner'),

    toolbar: document.getElementById('gallery-toolbar'),
    toolbarFilters: document.getElementById('toolbar-filters'),
    toolbarCount: document.getElementById('toolbar-count-label'),
    btnToolbarZip: document.getElementById('btn-toolbar-download-zip'),

    loadingBox: document.getElementById('photos-loading'),
    grid: document.getElementById('gallery-grid'),
    emptyBox: document.getElementById('gallery-empty'),

    dock: document.getElementById('selection-dock'),
    dockMainStat: document.getElementById('dock-main-stat'),
    dockExtraStat: document.getElementById('dock-extra-stat'),
    dockBarFill: document.getElementById('dock-bar-fill'),
    btnFilterSelectedQuick: document.getElementById('btn-filter-selected-quick'),
    btnFinishSelection: document.getElementById('btn-finish-selection'),

    lbDialog: document.getElementById('gal-lightbox'),
    lbClose: document.getElementById('lb-close'),
    lbImg: document.getElementById('lb-img'),
    lbPrev: document.getElementById('lb-prev'),
    lbNext: document.getElementById('lb-next'),
    lbStrip: document.getElementById('lb-filmstrip'),
    lbIndex: document.getElementById('lb-index'),
    lbFilename: document.getElementById('lb-filename'),
    lbFolder: document.getElementById('lb-folder'),
    lbProofControls: document.getElementById('lb-proofing-controls'),
    lbSelectBtn: document.getElementById('lb-select-btn'),
    lbCommentWrap: document.getElementById('lb-comment-wrap'),
    lbCommentIn: document.getElementById('lb-comment-input'),
    lbSaveComment: document.getElementById('lb-save-comment'),
    lbDeliveryControls: document.getElementById('lb-delivery-controls'),
    lbFavBtn: document.getElementById('lb-fav-btn'),
    lbDownloadSingle: document.getElementById('lb-download-single'),

    chkDialog: document.getElementById('checkout-dialog'),
    chkClose: document.getElementById('chk-close'),
    chkIncludedVal: document.getElementById('chk-included-val'),
    chkExtraLabel: document.getElementById('chk-extra-label'),
    chkExtraVal: document.getElementById('chk-extra-val'),
    chkTotalVal: document.getElementById('chk-total-val'),
    chkThumbsLabel: document.getElementById('chk-thumbs-label'),
    chkThumbsStrip: document.getElementById('chk-thumbs-strip'),
    chkNoExtrasBox: document.getElementById('chk-no-extras-box'),
    btnConfirmFree: document.getElementById('btn-confirm-free-selection'),
    chkPaymentBox: document.getElementById('chk-payment-box'),
    payPaneMp: document.getElementById('pay-pane-mp'),
    payPaneDirect: document.getElementById('pay-pane-direct'),
    mpQrCanvas: document.getElementById('mp-qr-canvas'),
    mpPixCode: document.getElementById('mp-pix-code'),
    btnCopyMpPix: document.getElementById('btn-copy-mp-pix'),
    btnMpCardLink: document.getElementById('btn-mp-card-link'),
    mpLocalSimBox: document.getElementById('mp-local-webhook-sim'),
    btnSimulateWebhook: document.getElementById('btn-simulate-mp-webhook'),
    directQrCanvas: document.getElementById('direct-qr-canvas'),
    directPixKeyLabel: document.getElementById('direct-pix-key-label'),
    directPixCode: document.getElementById('direct-pix-code'),
    btnCopyDirectPix: document.getElementById('btn-copy-direct-pix'),
    btnConfirmDirectPix: document.getElementById('btn-confirm-direct-pix'),

    dlDialog: document.getElementById('download-dialog'),
    dlClose: document.getElementById('dl-close'),
    dlTitle: document.getElementById('dl-modal-title'),
    dlPinGroup: document.getElementById('dl-pin-group'),
    dlPinInput: document.getElementById('dl-pin-input'),
    dlPinHint: document.getElementById('dl-pin-hint'),
    dlPinError: document.getElementById('dl-pin-error'),
    dlProgressBox: document.getElementById('dl-progress-box'),
    dlProgressText: document.getElementById('dl-progress-text'),
    dlProgressBar: document.getElementById('dl-progress-bar'),
    btnStartDownload: document.getElementById('btn-start-download'),

    toast: document.getElementById('gal-toast')
  };

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

  let toastTimer = null;
  function showToast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.hidden = true;
    }, 2800);
  }

  function hydrateBrandStrings() {
    const brand = window.AlbumsStore.getBrandDefaults();
    const footerBrand = document.getElementById('gal-footer-brand');
    if (footerBrand) footerBrand.textContent = `${brand.studioName} — Fotografia Autoral & Humanizada`;
    document.querySelectorAll('img[alt="Instantes de Carly"]').forEach((img) => {
      img.alt = brand.studioName;
    });
  }

  /* ==========================================================================
     1. PROTEÇÃO ANTI-CÓPIA EM MODO DE PROVA
     ========================================================================== */
  function setupAntiCopyProtection() {
    document.addEventListener('contextmenu', (e) => {
      if (currentAlbum && currentAlbum.phase === 'proofing') {
        if (e.target.closest('.gallery-grid, .gal-lightbox')) {
          e.preventDefault();
          showToast('🔒 Fotografia em modo de prova protegida.');
        }
      }
    });

    document.addEventListener('dragstart', (e) => {
      if (currentAlbum && currentAlbum.phase === 'proofing' && e.target.tagName === 'IMG') {
        e.preventDefault();
      }
    });
  }

  /* ==========================================================================
     2. DESENHO VISUAL DE QR CODE PIX EM CANVAS (ESTÉTICA NÍTIDA DE CHECKOUT)
     ========================================================================== */
  function renderVisualQrCanvas(canvas, payloadStr) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const modules = 29;
    const pad = 12;
    const cell = (size - pad * 2) / modules;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#1B2733';

    function drawFinder(mx, my) {
      ctx.fillStyle = '#1B2733';
      ctx.fillRect(pad + mx * cell, pad + my * cell, 7 * cell, 7 * cell);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(pad + (mx + 1) * cell, pad + (my + 1) * cell, 5 * cell, 5 * cell);
      ctx.fillStyle = '#1B2733';
      ctx.fillRect(pad + (mx + 2) * cell, pad + (my + 2) * cell, 3 * cell, 3 * cell);
    }

    drawFinder(0, 0);
    drawFinder(modules - 7, 0);
    drawFinder(0, modules - 7);

    // Hash determinístico a partir do BRCode Pix para compor matriz visual consistente
    let seed = 2166136261;
    for (let i = 0; i < payloadStr.length; i++) {
      seed ^= payloadStr.charCodeAt(i);
      seed = Math.imul(seed, 16777619) >>> 0;
    }

    ctx.fillStyle = '#1B2733';
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        const inFinderTL = r < 8 && c < 8;
        const inFinderTR = r < 8 && c >= modules - 8;
        const inFinderBL = r >= modules - 8 && c < 8;
        if (inFinderTL || inFinderTR || inFinderBL) continue;

        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const bit = ((seed >>> 16) ^ payloadStr.charCodeAt((r * modules + c) % payloadStr.length)) & 1;
        if (bit) {
          ctx.fillRect(
            Math.round(pad + c * cell),
            Math.round(pad + r * cell),
            Math.ceil(cell),
            Math.ceil(cell)
          );
        }
      }
    }
  }

  /* ==========================================================================
     3. ROTEAMENTO: PORTAL -> SENHA -> ÁLBUM
     ========================================================================== */
  function showOnlySection(target) {
    [els.portalView, els.pwView, els.albumView].forEach((sec) => {
      if (sec) sec.hidden = sec !== target;
    });
  }

  function renderPortalView() {
    showOnlySection(els.portalView);
    document.body.classList.remove('is-proofing-protected');

    if (isLocalEnv && els.portalDemoBox && els.portalAlbumsGrid) {
      els.portalDemoBox.hidden = false;
      const albums = rootState.albums || [];
      els.portalAlbumsGrid.innerHTML = albums.map((alb) => {
        const isProof = alb.phase === 'proofing';
        const badge = isProof
          ? `🔍 Fase 1: Seleção de Provas (${alb.packageIncluded} no pacote • Extra ${formatBRL(alb.extraPhotoPrice)})`
          : `✨ Fase 2: Galeria de Entrega em Alta (${(alb.photos || []).length} fotos)`;
        return `
          <a href="${galeriaRoute}?id=${encodeURIComponent(alb.slug)}" class="portal-album-card">
            <img src="${escapeHtml(alb.coverSrc || alb.photos?.[0]?.originalSrc || '')}" alt="${escapeHtml(alb.clientName)}" class="portal-album-thumb" />
            <div class="portal-album-body">
              <span class="demo-pill">${escapeHtml(badge)}</span>
              <h3>${escapeHtml(alb.clientName)}</h3>
              <p>${escapeHtml(alb.subtitle || alb.title)} • Código: <strong>${escapeHtml(alb.slug)}</strong></p>
              <span class="gal-btn gal-btn-primary gal-btn-sm">Testar este Álbum →</span>
            </div>
          </a>
        `;
      }).join('');
    }
  }

  function isAlbumUnlocked(album) {
    if (!album.password || isAdminPreview) return true;
    try {
      return sessionStorage.getItem(`unlocked_alb_${album.id}`) === album.password;
    } catch (_) {
      return false;
    }
  }

  function markAlbumUnlocked(album) {
    try {
      sessionStorage.setItem(`unlocked_alb_${album.id}`, album.password || 'open');
    } catch (_) {}
  }

  function renderPasswordGate(album) {
    showOnlySection(els.pwView);
    const cover = album.coverSrc || album.photos?.[0]?.originalSrc || '';
    if (els.pwBg) els.pwBg.style.backgroundImage = `url("${cover}")`;
    if (els.pwBadge) {
      els.pwBadge.textContent = album.phase === 'proofing'
        ? 'Galeria Privada de Seleção'
        : 'Galeria Oficial de Entrega';
    }
    if (els.pwTitle) els.pwTitle.textContent = album.title || album.clientName;
    if (els.pwSubtitle) els.pwSubtitle.textContent = album.subtitle || '';
    if (els.pwError) els.pwError.hidden = true;
    if (els.pwInput) els.pwInput.value = '';

    if (isLocalEnv && els.pwHint && album.password) {
      els.pwHint.hidden = false;
      els.pwHint.textContent = `🧪 Dica ambiente local: a senha deste álbum é "${album.password}"`;
    }
  }

  /* ==========================================================================
     4. GARANTIR MARCA D'ÁGUA REAL NAS PROVAS ANTES DE EXIBIR
     ========================================================================== */
  async function ensureProofWatermarksReady(album) {
    if (album.phase !== 'proofing' || album.watermarkEnabled === false) return;
    const missing = (album.photos || []).filter((p) => !p.proofSrc && p.originalSrc);
    if (missing.length === 0) return;

    if (els.loadingBox) els.loadingBox.hidden = false;
    if (els.grid) els.grid.innerHTML = '';

    const label = album.watermarkText || window.AlbumsStore.getBrandDefaults().studioName;
    await Promise.all(missing.map(async (photo) => {
      try {
        photo.proofSrc = await window.AlbumsStore.burnProofWatermark(photo.originalSrc, label);
      } catch (_) {
        photo.proofSrc = photo.originalSrc;
      }
    }));

    await window.AlbumsStore.saveState(rootState, { silent: true });
    if (els.loadingBox) els.loadingBox.hidden = true;
  }

  function getDisplaySrc(album, photo) {
    if (album.phase === 'proofing' && album.watermarkEnabled !== false) {
      return photo.proofSrc || photo.originalSrc;
    }
    return photo.originalSrc;
  }

  /* ==========================================================================
     5. RENDERIZAÇÃO DO ÁLBUM (SELEÇÃO SINETO OU ENTREGA PIXIESET)
     ========================================================================== */
  async function openAlbumExperience(album) {
    currentAlbum = album;
    showOnlySection(els.albumView);
    document.title = `${album.clientName} — ${window.AlbumsStore.getBrandDefaults().studioName}`;

    const isProof = album.phase === 'proofing';
    document.body.classList.toggle('is-proofing-protected', isProof);

    if (els.deliveryHero) els.deliveryHero.hidden = isProof;
    if (els.proofingHeader) els.proofingHeader.hidden = !isProof;
    if (els.btnToolbarZip) els.btnToolbarZip.hidden = isProof;
    if (els.dock) els.dock.hidden = !isProof;

    if (isProof) {
      renderProofingHeader(album);
      await ensureProofWatermarksReady(album);
    } else {
      renderDeliveryHero(album);
    }

    renderToolbarFilters(album);
    renderPhotosGrid(album);
    if (isProof) updateSelectionDock(album);
  }

  function renderProofingHeader(album) {
    if (els.proofingPkgPill) {
      els.proofingPkgPill.textContent = `${album.packageName || 'Seu Pacote'}: ${album.packageIncluded} fotos inclusas • Foto extra ${formatBRL(album.extraPhotoPrice)}`;
    }
    if (els.proofingSub) els.proofingSub.textContent = album.subtitle || 'Seleção de Fotografias';
    if (els.proofingTitle) els.proofingTitle.textContent = album.title || album.clientName;
    if (els.proofingWelcome) els.proofingWelcome.textContent = album.welcomeMessage || '';

    if (els.proofingLockedBanner) {
      if (album.selectionLocked) {
        els.proofingLockedBanner.hidden = false;
        const calc = window.AlbumsStore.calculateSelectionPricing(album);
        let statusLine = '✅ <strong>Seleção Finalizada e Enviada!</strong> Sua fotógrafa já recebeu suas escolhas para iniciar a edição final.';
        if (album.status === 'selection_paid' && album.paymentOrder) {
          statusLine = `✅ <strong>Seleção Confirmada &amp; Fotos Extras Pagas (${formatBRL(album.paymentOrder.totalAmount)})!</strong> Total de ${calc.selectedCount} fotografias liberadas para edição final.`;
        } else if (album.status === 'awaiting_pix_confirm' && album.paymentOrder) {
          statusLine = `⏳ <strong>Seleção Registrada (${calc.selectedCount} fotos)!</strong> Aguardando confirmação do seu Pix de ${formatBRL(album.paymentOrder.totalAmount)} pela fotógrafa.`;
        }
        els.proofingLockedBanner.innerHTML = statusLine;
      } else {
        els.proofingLockedBanner.hidden = true;
      }
    }
  }

  function renderDeliveryHero(album) {
    const cover = album.coverSrc || album.photos?.[0]?.originalSrc || '';
    if (els.deliveryHeroImg) {
      els.deliveryHeroImg.src = cover;
      els.deliveryHeroImg.style.objectPosition = album.coverFocal || 'center 35%';
    }
    if (els.deliveryHeroSub) els.deliveryHeroSub.textContent = album.subtitle || '';
    if (els.deliveryHeroTitle) els.deliveryHeroTitle.textContent = album.title || album.clientName;
    if (els.deliveryHeroMsg) els.deliveryHeroMsg.textContent = album.welcomeMessage || '';
  }

  function getFilteredPhotos(album) {
    const photos = album.photos || [];
    const selectedSet = new Set(album.selectedIds || []);
    const favSet = new Set(album.deliveryFavorites || []);
    const comments = album.photoComments || {};

    if (activeFilter === 'selected') return photos.filter((p) => selectedSet.has(p.id));
    if (activeFilter === 'unselected') return photos.filter((p) => !selectedSet.has(p.id));
    if (activeFilter === 'commented') return photos.filter((p) => Boolean(comments[p.id]?.trim()));
    if (activeFilter === 'favorites') return photos.filter((p) => favSet.has(p.id));
    if (activeFilter.startsWith('folder:')) {
      const folderName = activeFilter.slice(7);
      return photos.filter((p) => (p.folder || 'Geral') === folderName);
    }
    return photos;
  }

  function renderToolbarFilters(album) {
    if (!els.toolbarFilters) return;
    const photos = album.photos || [];
    const folders = [...new Set(photos.map((p) => p.folder).filter(Boolean))];
    const chips = [];

    if (album.phase === 'proofing') {
      const selCount = (album.selectedIds || []).length;
      const unselCount = Math.max(0, photos.length - selCount);
      const noteCount = Object.values(album.photoComments || {}).filter((v) => String(v || '').trim()).length;

      chips.push({ id: 'all', label: `Todas (${photos.length})` });
      chips.push({ id: 'selected', label: `Selecionadas ❤️ (${selCount})` });
      chips.push({ id: 'unselected', label: `Não Selecionadas (${unselCount})` });
      if (noteCount > 0 || activeFilter === 'commented') {
        chips.push({ id: 'commented', label: `Com Observação 💬 (${noteCount})` });
      }
      folders.forEach((f) => {
        const c = photos.filter((p) => p.folder === f).length;
        chips.push({ id: `folder:${f}`, label: `${f} (${c})` });
      });
    } else {
      const favCount = (album.deliveryFavorites || []).length;
      chips.push({ id: 'all', label: `Todas (${photos.length})` });
      folders.forEach((f) => {
        const c = photos.filter((p) => p.folder === f).length;
        chips.push({ id: `folder:${f}`, label: `${f} (${c})` });
      });
      chips.push({ id: 'favorites', label: `Favoritas ❤️ (${favCount})` });
    }

    els.toolbarFilters.innerHTML = chips.map((c) => `
      <button type="button" class="filter-chip ${activeFilter === c.id ? 'active' : ''}" data-filter="${escapeHtml(c.id)}">
        ${escapeHtml(c.label)}
      </button>
    `).join('');

    els.toolbarFilters.querySelectorAll('.filter-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.getAttribute('data-filter') || 'all';
        renderToolbarFilters(currentAlbum);
        renderPhotosGrid(currentAlbum);
      });
    });
  }

  function renderPhotosGrid(album) {
    if (!els.grid) return;
    const filtered = getFilteredPhotos(album);
    lightboxList = filtered;

    if (els.toolbarCount) {
      els.toolbarCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'fotografia' : 'fotografias'}`;
    }

    if (els.emptyBox) els.emptyBox.hidden = filtered.length > 0;

    const isProof = album.phase === 'proofing';
    const selectedOrder = album.selectedIds || [];
    const selectedSet = new Set(selectedOrder);
    const favSet = new Set(album.deliveryFavorites || []);
    const comments = album.photoComments || {};
    const pkgLimit = Math.max(0, parseInt(album.packageIncluded, 10) || 0);

    els.grid.innerHTML = filtered.map((photo, idx) => {
      const globalIdx = (album.photos || []).findIndex((p) => p.id === photo.id);
      const numStr = String(globalIdx + 1).padStart(2, '0');
      const src = getDisplaySrc(album, photo);

      if (isProof) {
        const isSel = selectedSet.has(photo.id);
        const selPos = selectedOrder.indexOf(photo.id);
        const isExtraPhoto = isSel && selPos >= pkgLimit;
        const hasNote = Boolean(comments[photo.id]?.trim());

        return `
          <article class="photo-item ${isSel ? 'is-selected' : ''}" data-photo-id="${escapeHtml(photo.id)}">
            <div class="photo-thumb-wrap js-open-lb" data-lb-idx="${idx}">
              <img src="${escapeHtml(src)}" alt="${escapeHtml(photo.filename)}" loading="lazy" draggable="false" />
              <span class="photo-num-tag">#${numStr} • ${escapeHtml(photo.filename)}</span>
              ${isExtraPhoto ? `<span class="photo-extra-tag">+ Extra (${formatBRL(album.extraPhotoPrice)})</span>` : ''}
            </div>
            <div class="photo-card-bar">
              <button
                type="button"
                class="btn-select-toggle ${isSel ? 'active' : ''} js-toggle-select"
                data-photo-id="${escapeHtml(photo.id)}"
                ${album.selectionLocked ? 'disabled' : ''}
              >
                <span>${isSel ? '❤️ Selecionada' : '🤍 Selecionar'}</span>
              </button>
              <button
                type="button"
                class="btn-icon-action ${hasNote ? 'has-note' : ''} js-open-note"
                data-lb-idx="${idx}"
                title="Adicionar observação de edição"
              >
                💬 ${hasNote ? 'Nota' : ''}
              </button>
            </div>
          </article>
        `;
      }

      const isFav = favSet.has(photo.id);
      return `
        <article class="photo-item ${isFav ? 'is-selected' : ''}" data-photo-id="${escapeHtml(photo.id)}">
          <div class="photo-thumb-wrap js-open-lb" data-lb-idx="${idx}">
            <img src="${escapeHtml(src)}" alt="${escapeHtml(photo.filename)}" loading="lazy" />
            <span class="photo-num-tag">#${numStr}</span>
          </div>
          <div class="photo-card-bar">
            <button type="button" class="btn-select-toggle ${isFav ? 'active' : ''} js-toggle-fav" data-photo-id="${escapeHtml(photo.id)}">
              <span>${isFav ? '❤️ Favorita' : '🤍 Favoritar'}</span>
            </button>
            <button type="button" class="btn-icon-action js-download-one" data-photo-id="${escapeHtml(photo.id)}" title="Baixar esta foto">
              ⬇️ Baixar
            </button>
          </div>
        </article>
      `;
    }).join('');

    els.grid.querySelectorAll('.js-open-lb').forEach((el) => {
      el.addEventListener('click', () => openLightboxAt(Number(el.getAttribute('data-lb-idx')) || 0, false));
    });

    els.grid.querySelectorAll('.js-open-note').forEach((el) => {
      el.addEventListener('click', () => openLightboxAt(Number(el.getAttribute('data-lb-idx')) || 0, true));
    });

    els.grid.querySelectorAll('.js-toggle-select').forEach((btn) => {
      btn.addEventListener('click', () => togglePhotoSelection(btn.getAttribute('data-photo-id')));
    });

    els.grid.querySelectorAll('.js-toggle-fav').forEach((btn) => {
      btn.addEventListener('click', () => toggleDeliveryFavorite(btn.getAttribute('data-photo-id')));
    });

    els.grid.querySelectorAll('.js-download-one').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = (currentAlbum.photos || []).find((x) => x.id === btn.getAttribute('data-photo-id'));
        if (p) openDownloadDialog(p);
      });
    });
  }

  function updateSelectionDock(album) {
    if (!els.dock) return;
    if (album.selectionLocked) {
      els.dock.hidden = true;
      return;
    }
    els.dock.hidden = false;

    const calc = window.AlbumsStore.calculateSelectionPricing(album);
    const pct = calc.packageIncluded > 0
      ? Math.min(100, Math.round((calc.includedSelected / calc.packageIncluded) * 100))
      : 100;

    if (els.dockBarFill) els.dockBarFill.style.width = `${pct}%`;

    if (els.dockMainStat) {
      els.dockMainStat.textContent = `${calc.includedSelected} de ${calc.packageIncluded} fotos do pacote escolhidas`;
    }

    if (els.dockExtraStat) {
      if (calc.hasExtras) {
        els.dockExtraStat.textContent = `+ ${calc.extraCount} ${calc.extraCount === 1 ? 'foto extra' : 'fotos extras'} (${calc.extraCount} × ${formatBRL(calc.extraPhotoPrice)} = ${formatBRL(calc.extraTotal)})`;
      } else if (calc.remainingInPackage > 0) {
        els.dockExtraStat.textContent = `Você ainda pode escolher mais ${calc.remainingInPackage} sem custo adicional`;
      } else {
        els.dockExtraStat.textContent = `Pacote completo! Se desejar mais fotos, cada extra custa ${formatBRL(calc.extraPhotoPrice)}`;
      }
    }

    if (els.btnFinishSelection) {
      els.btnFinishSelection.disabled = calc.selectedCount === 0;
      els.btnFinishSelection.textContent = calc.hasExtras
        ? `Revisar & Pagar Extras (${formatBRL(calc.extraTotal)}) →`
        : `Concluir Seleção (${calc.selectedCount}) →`;
    }
  }

  async function togglePhotoSelection(photoId) {
    if (!currentAlbum || currentAlbum.selectionLocked) return;
    if (!Array.isArray(currentAlbum.selectedIds)) currentAlbum.selectedIds = [];

    const idx = currentAlbum.selectedIds.indexOf(photoId);
    if (idx >= 0) {
      currentAlbum.selectedIds.splice(idx, 1);
    } else {
      currentAlbum.selectedIds.push(photoId);
      const calc = window.AlbumsStore.calculateSelectionPricing(currentAlbum);
      if (calc.extraCount === 1 && currentAlbum.selectedIds.length === calc.packageIncluded + 1) {
        showToast(`✨ Limite do pacote atingido! Fotos adicionais custam ${formatBRL(calc.extraPhotoPrice)} cada.`);
      }
    }

    await window.AlbumsStore.saveState(rootState);
    renderToolbarFilters(currentAlbum);
    renderPhotosGrid(currentAlbum);
    updateSelectionDock(currentAlbum);
    if (els.lbDialog?.open) refreshLightboxUI();
  }

  async function toggleDeliveryFavorite(photoId) {
    if (!currentAlbum) return;
    if (!Array.isArray(currentAlbum.deliveryFavorites)) currentAlbum.deliveryFavorites = [];
    const idx = currentAlbum.deliveryFavorites.indexOf(photoId);
    if (idx >= 0) {
      currentAlbum.deliveryFavorites.splice(idx, 1);
    } else {
      currentAlbum.deliveryFavorites.push(photoId);
    }
    await window.AlbumsStore.saveState(rootState);
    renderToolbarFilters(currentAlbum);
    renderPhotosGrid(currentAlbum);
    if (els.lbDialog?.open) refreshLightboxUI();
  }

  /* ==========================================================================
     6. LIGHTBOX COMPARADOR (COM SCROLLTO SEGURO NA FILMSTRIP)
     ========================================================================== */
  function openLightboxAt(idx, focusComment = false) {
    if (!lightboxList.length || !els.lbDialog) return;
    lightboxIdx = Math.max(0, Math.min(idx, lightboxList.length - 1));
    renderLightboxFilmstrip();
    refreshLightboxUI();
    if (!els.lbDialog.open) els.lbDialog.showModal();
    if (focusComment && els.lbCommentIn) {
      setTimeout(() => els.lbCommentIn.focus(), 80);
    }
  }

  function renderLightboxFilmstrip() {
    if (!els.lbStrip) return;
    els.lbStrip.innerHTML = lightboxList.map((p, i) => `
      <img
        src="${escapeHtml(getDisplaySrc(currentAlbum, p))}"
        alt=""
        class="lb-strip-thumb ${i === lightboxIdx ? 'active' : ''}"
        data-strip-idx="${i}"
        draggable="false"
      />
    `).join('');

    els.lbStrip.querySelectorAll('.lb-strip-thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        lightboxIdx = Number(thumb.getAttribute('data-strip-idx')) || 0;
        refreshLightboxUI();
      });
    });
  }

  function refreshLightboxUI() {
    const photo = lightboxList[lightboxIdx];
    if (!photo || !currentAlbum) return;

    if (els.lbImg) els.lbImg.src = getDisplaySrc(currentAlbum, photo);
    if (els.lbIndex) els.lbIndex.textContent = `${lightboxIdx + 1} / ${lightboxList.length}`;
    if (els.lbFilename) els.lbFilename.textContent = photo.filename || '';
    if (els.lbFolder) els.lbFolder.textContent = photo.folder ? `Momento: ${photo.folder}` : '';

    const isProof = currentAlbum.phase === 'proofing';
    if (els.lbProofControls) els.lbProofControls.hidden = !isProof;
    if (els.lbDeliveryControls) els.lbDeliveryControls.hidden = isProof;

    if (isProof) {
      const isSel = (currentAlbum.selectedIds || []).includes(photo.id);
      if (els.lbSelectBtn) {
        els.lbSelectBtn.disabled = Boolean(currentAlbum.selectionLocked);
        els.lbSelectBtn.classList.toggle('active', isSel);
        els.lbSelectBtn.textContent = isSel ? '❤️ Foto Selecionada (Clique p/ remover)' : '🤍 Selecionar esta fotografia';
      }
      if (els.lbCommentIn) {
        els.lbCommentIn.disabled = Boolean(currentAlbum.selectionLocked);
        els.lbCommentIn.value = (currentAlbum.photoComments && currentAlbum.photoComments[photo.id]) || '';
      }
    } else {
      const isFav = (currentAlbum.deliveryFavorites || []).includes(photo.id);
      if (els.lbFavBtn) {
        els.lbFavBtn.textContent = isFav ? '❤️ Salva nas Favoritas' : '🤍 Salvar nas Favoritas';
      }
    }

    // Sincroniza miniatura ativa com scrollTo (NUNCA scrollIntoView)
    if (els.lbStrip) {
      const thumbs = els.lbStrip.querySelectorAll('.lb-strip-thumb');
      thumbs.forEach((t, i) => t.classList.toggle('active', i === lightboxIdx));
      const activeThumb = thumbs[lightboxIdx];
      if (activeThumb) {
        const targetScroll = activeThumb.offsetLeft - (els.lbStrip.clientWidth / 2) + (activeThumb.clientWidth / 2);
        els.lbStrip.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
      }
    }
  }

  /* ==========================================================================
     7. CHECKOUT SEGURO DE FOTOS EXTRAS (MERCADO PAGO + PIX DIRETO)
     ========================================================================== */
  function openCheckoutModal() {
    if (!currentAlbum || !els.chkDialog) return;
    const calc = window.AlbumsStore.calculateSelectionPricing(currentAlbum);
    if (calc.selectedCount === 0) {
      showToast('Selecione ao menos 1 fotografia antes de concluir.');
      return;
    }

    if (els.chkIncludedVal) {
      els.chkIncludedVal.textContent = `${calc.includedSelected} de ${calc.packageIncluded} fotos (Incluso no pacote)`;
    }
    if (els.chkExtraLabel) {
      els.chkExtraLabel.textContent = calc.hasExtras
        ? `Fotos extras (${calc.extraCount} × ${formatBRL(calc.extraPhotoPrice)})`
        : 'Fotos extras adicionadas';
    }
    if (els.chkExtraVal) els.chkExtraVal.textContent = formatBRL(calc.extraTotal);
    if (els.chkTotalVal) els.chkTotalVal.textContent = formatBRL(calc.extraTotal);
    if (els.chkThumbsLabel) els.chkThumbsLabel.textContent = `Suas ${calc.selectedCount} fotografias escolhidas:`;

    const selectedSet = new Set(calc.selectedIds);
    const chosenPhotos = (currentAlbum.photos || []).filter((p) => selectedSet.has(p.id));
    if (els.chkThumbsStrip) {
      els.chkThumbsStrip.innerHTML = chosenPhotos.map((p) => `
        <img src="${escapeHtml(getDisplaySrc(currentAlbum, p))}" alt="${escapeHtml(p.filename)}" title="${escapeHtml(p.filename)}" />
      `).join('');
    }

    if (!calc.hasExtras) {
      if (els.chkNoExtrasBox) els.chkNoExtrasBox.hidden = false;
      if (els.chkPaymentBox) els.chkPaymentBox.hidden = true;
    } else {
      if (els.chkNoExtrasBox) els.chkNoExtrasBox.hidden = true;
      if (els.chkPaymentBox) els.chkPaymentBox.hidden = false;
      preparePaymentPayloads(calc);
    }

    els.chkDialog.showModal();
  }

  async function preparePaymentPayloads(calc) {
    const payCfg = rootState.paymentConfig || {};
    const brand = window.AlbumsStore.getBrandDefaults();
    const txid = `ALB${currentAlbum.slug.replace(/[^a-z0-9]/gi, '').slice(0, 10)}${Date.now().toString().slice(-4)}`;

    // 1. Payload Pix Direto (BRCode Padrão Banco Central)
    const directPayload = window.AlbumsStore.generatePixPayload({
      pixKey: payCfg.pixKey || 'contato@instantesdecarly.com.br',
      merchantName: payCfg.merchantName || brand.studioName,
      merchantCity: payCfg.merchantCity || brand.city,
      amount: calc.extraTotal,
      txid
    });

    if (els.directPixKeyLabel) els.directPixKeyLabel.textContent = payCfg.pixKey || 'contato@instantesdecarly.com.br';
    if (els.directPixCode) els.directPixCode.value = directPayload;
    renderVisualQrCanvas(els.directQrCanvas, directPayload);

    // 2. Payload Mercado Pago (API Serverless /api/checkout em produção ou Simulador Localhost)
    if (!isLocalEnv && rootState.storageMode === 'cloud') {
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            albumId: currentAlbum.id,
            selectedPhotoIds: calc.selectedIds
          })
        });
        const data = await res.json();
        if (res.ok && data.pixCopyPaste) {
          if (els.mpPixCode) els.mpPixCode.value = data.pixCopyPaste;
          renderVisualQrCanvas(els.mpQrCanvas, data.pixCopyPaste);
          if (els.btnMpCardLink && data.checkoutUrl) {
            els.btnMpCardLink.onclick = () => window.open(data.checkoutUrl, '_blank', 'noopener');
          }
          return;
        }
      } catch (_) {}
    }

    // Modo Local de Validação: simula payload dinâmico Mercado Pago + exibe gatilho de Webhook
    const mpSimulatedPayload = window.AlbumsStore.generatePixPayload({
      pixKey: 'mercadopago-checkout@instantesdecarly.com.br',
      merchantName: payCfg.merchantName || brand.studioName,
      merchantCity: payCfg.merchantCity || brand.city,
      amount: calc.extraTotal,
      txid: `MP${txid.slice(0, 18)}`
    });
    if (els.mpPixCode) els.mpPixCode.value = mpSimulatedPayload;
    renderVisualQrCanvas(els.mpQrCanvas, mpSimulatedPayload);
    if (els.mpLocalSimBox) els.mpLocalSimBox.hidden = !isLocalEnv;
  }

  async function finalizeFreeSelection() {
    const calc = window.AlbumsStore.calculateSelectionPricing(currentAlbum);
    currentAlbum.selectionLocked = true;
    currentAlbum.status = 'selection_completed';
    currentAlbum.activityLog = currentAlbum.activityLog || [];
    currentAlbum.activityLog.unshift({
      at: new Date().toISOString(),
      type: 'selection',
      text: `Cliente concluiu a seleção dentro do pacote (${calc.selectedCount} fotos).`
    });

    await window.AlbumsStore.saveState(rootState);
    els.chkDialog?.close();
    renderProofingHeader(currentAlbum);
    renderPhotosGrid(currentAlbum);
    updateSelectionDock(currentAlbum);
    showToast('✅ Seleção enviada com sucesso para edição!');
  }

  async function finalizeMercadoPagoApproved(methodLabel = 'Mercado Pago Pix') {
    const calc = window.AlbumsStore.calculateSelectionPricing(currentAlbum);
    currentAlbum.selectionLocked = true;
    currentAlbum.status = 'selection_paid';
    currentAlbum.paymentOrder = {
      id: `mp_${Date.now()}`,
      method: 'mercadopago_pix',
      status: 'approved',
      extraCount: calc.extraCount,
      unitPrice: calc.extraPhotoPrice,
      totalAmount: calc.extraTotal,
      paidAt: new Date().toISOString()
    };
    currentAlbum.activityLog = currentAlbum.activityLog || [];
    currentAlbum.activityLog.unshift({
      at: new Date().toISOString(),
      type: 'payment',
      text: `Webhook ${methodLabel}: Pagamento de ${formatBRL(calc.extraTotal)} (${calc.extraCount} extras) APROVADO! Total: ${calc.selectedCount} fotos.`
    });

    await window.AlbumsStore.saveState(rootState);
    els.chkDialog?.close();
    renderProofingHeader(currentAlbum);
    renderPhotosGrid(currentAlbum);
    updateSelectionDock(currentAlbum);
    showToast('✅ Pagamento confirmado! Seleção liberada para edição.');
  }

  async function finalizeDirectPixWithWhatsapp() {
    const calc = window.AlbumsStore.calculateSelectionPricing(currentAlbum);
    const brand = window.AlbumsStore.getBrandDefaults();
    const orderCode = `PIX-${Date.now().toString().slice(-5)}`;

    currentAlbum.selectionLocked = true;
    currentAlbum.status = 'awaiting_pix_confirm';
    currentAlbum.paymentOrder = {
      id: orderCode,
      method: 'direct_pix',
      status: 'pending_receipt',
      extraCount: calc.extraCount,
      unitPrice: calc.extraPhotoPrice,
      totalAmount: calc.extraTotal,
      createdAt: new Date().toISOString()
    };
    currentAlbum.activityLog = currentAlbum.activityLog || [];
    currentAlbum.activityLog.unshift({
      at: new Date().toISOString(),
      type: 'pix_pending',
      text: `Cliente finalizou seleção (${calc.selectedCount} fotos) via Pix Direto (${formatBRL(calc.extraTotal)}) — aguardando comprovante (${orderCode}).`
    });

    await window.AlbumsStore.saveState(rootState);
    els.chkDialog?.close();
    renderProofingHeader(currentAlbum);
    renderPhotosGrid(currentAlbum);
    updateSelectionDock(currentAlbum);

    const msg = `Olá ${brand.shortName}! Acabei de finalizar a seleção do álbum "${currentAlbum.clientName}" (${calc.selectedCount} fotos no total, sendo ${calc.extraCount} extras = ${formatBRL(calc.extraTotal)}). Segue o comprovante do Pix (Pedido ${orderCode})!`;
    window.open(`https://wa.me/${brand.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  }

  /* ==========================================================================
     8. DOWNLOAD COM PIN DE 4 DÍGITOS & COMPACTADOR .ZIP REAL (PIXIESET)
     ========================================================================== */
  function isPinVerifiedForSession(album) {
    if (!album.downloadPin) return true;
    try {
      return sessionStorage.getItem(`dl_pin_ok_${album.id}`) === album.downloadPin;
    } catch (_) {
      return false;
    }
  }

  function openDownloadDialog(singlePhoto = null) {
    if (!currentAlbum || !els.dlDialog) return;
    pendingDownloadTarget = singlePhoto;

    if (els.dlTitle) {
      els.dlTitle.textContent = singlePhoto
        ? `Baixar ${singlePhoto.filename}`
        : `Baixar Álbum Completo (${(currentAlbum.photos || []).length} fotos)`;
    }

    const needPin = !isPinVerifiedForSession(currentAlbum);
    if (els.dlPinGroup) els.dlPinGroup.hidden = !needPin;
    if (els.dlPinError) els.dlPinError.hidden = true;
    if (els.dlPinInput) els.dlPinInput.value = '';
    if (els.dlProgressBox) els.dlProgressBox.hidden = true;
    if (els.btnStartDownload) els.btnStartDownload.disabled = false;

    if (needPin && isLocalEnv && els.dlPinHint && currentAlbum.downloadPin) {
      els.dlPinHint.hidden = false;
      els.dlPinHint.textContent = `🧪 Dica ambiente local: PIN de download = ${currentAlbum.downloadPin}`;
    }

    els.dlDialog.showModal();
  }

  async function executeDownloadFlow() {
    if (!currentAlbum) return;

    if (!isPinVerifiedForSession(currentAlbum)) {
      const typed = (els.dlPinInput?.value || '').trim();
      if (typed !== String(currentAlbum.downloadPin).trim()) {
        if (els.dlPinError) els.dlPinError.hidden = false;
        return;
      }
      try {
        sessionStorage.setItem(`dl_pin_ok_${currentAlbum.id}`, currentAlbum.downloadPin);
      } catch (_) {}
    }

    const resMode = document.querySelector('input[name="dl-res"]:checked')?.value || 'high';
    const resLabel = resMode === 'high' ? 'Alta Resolução' : 'Tamanho Web (1600px)';

    if (els.btnStartDownload) els.btnStartDownload.disabled = true;
    if (els.dlProgressBox) els.dlProgressBox.hidden = false;
    if (els.dlProgressBar) els.dlProgressBar.style.width = '8%';

    try {
      if (pendingDownloadTarget) {
        if (els.dlProgressText) els.dlProgressText.textContent = `Preparando ${pendingDownloadTarget.filename}...`;
        const bytes = await window.AlbumsStore.fetchImageAsBytes(pendingDownloadTarget.originalSrc, resMode);
        if (els.dlProgressBar) els.dlProgressBar.style.width = '100%';
        triggerBlobDownload(new Blob([bytes], { type: 'image/jpeg' }), pendingDownloadTarget.filename);

        await registerDownloadLog(`Download individual: ${pendingDownloadTarget.filename} (${resLabel})`);
      } else {
        const photos = currentAlbum.photos || [];
        const zipEntries = [];
        for (let i = 0; i < photos.length; i++) {
          const p = photos[i];
          if (els.dlProgressText) {
            els.dlProgressText.textContent = `Compactando foto ${i + 1} de ${photos.length} (${p.filename})...`;
          }
          const bytes = await window.AlbumsStore.fetchImageAsBytes(p.originalSrc, resMode);
          const cleanFolder = (p.folder || '').replace(/[\\/:*?"<>|]/g, '').trim();
          const entryPath = cleanFolder ? `${cleanFolder}/${p.filename}` : p.filename;
          zipEntries.push({ name: entryPath, data: bytes });
          const pct = Math.round(((i + 1) / photos.length) * 92);
          if (els.dlProgressBar) els.dlProgressBar.style.width = `${pct}%`;
        }

        const zipBlob = window.AlbumsStore.buildZipBlob(zipEntries);
        if (els.dlProgressBar) els.dlProgressBar.style.width = '100%';
        const zipName = `${currentAlbum.slug}-${resMode === 'high' ? 'alta-resolucao' : 'web'}.zip`;
        triggerBlobDownload(zipBlob, zipName);

        await registerDownloadLog(`Cliente baixou Álbum Completo .ZIP (${photos.length} fotos • ${resLabel}).`);
      }

      showToast('⬇️ Download iniciado com sucesso!');
      setTimeout(() => els.dlDialog?.close(), 500);
    } catch (err) {
      showToast('Erro ao preparar download: ' + err.message);
    } finally {
      if (els.btnStartDownload) els.btnStartDownload.disabled = false;
    }
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function registerDownloadLog(text) {
    currentAlbum.activityLog = currentAlbum.activityLog || [];
    currentAlbum.activityLog.unshift({
      at: new Date().toISOString(),
      type: 'download',
      text
    });
    await window.AlbumsStore.saveState(rootState);
  }

  /* ==========================================================================
     9. EVENTOS DE INTERFACE & INICIALIZAÇÃO
     ========================================================================== */
  function bindEvents() {
    els.portalForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const typed = (els.portalSlugIn?.value || '').trim().toLowerCase();
      const found = (rootState.albums || []).find((a) => a.slug.toLowerCase() === typed);
      if (!found) {
        if (els.portalError) {
          els.portalError.hidden = false;
          els.portalError.textContent = 'Álbum não encontrado. Verifique o código enviado pela sua fotógrafa.';
        }
        return;
      }
      window.location.href = `${galeriaRoute}?id=${encodeURIComponent(found.slug)}`;
    });

    els.pwForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!currentAlbum) return;
      const typed = (els.pwInput?.value || '').trim();
      if (typed === String(currentAlbum.password || '').trim()) {
        markAlbumUnlocked(currentAlbum);
        openAlbumExperience(currentAlbum);
      } else if (els.pwError) {
        els.pwError.hidden = false;
      }
    });

    els.btnScrollGallery?.addEventListener('click', () => {
      els.toolbar?.scrollIntoView({ behavior: 'smooth' });
    });

    els.btnHeroDownloadAll?.addEventListener('click', () => openDownloadDialog(null));
    els.btnToolbarZip?.addEventListener('click', () => openDownloadDialog(null));

    els.btnFilterSelectedQuick?.addEventListener('click', () => {
      activeFilter = activeFilter === 'selected' ? 'all' : 'selected';
      renderToolbarFilters(currentAlbum);
      renderPhotosGrid(currentAlbum);
    });

    els.btnFinishSelection?.addEventListener('click', openCheckoutModal);

    // Lightbox
    els.lbClose?.addEventListener('click', () => els.lbDialog?.close());
    els.lbPrev?.addEventListener('click', () => {
      if (!lightboxList.length) return;
      lightboxIdx = (lightboxIdx - 1 + lightboxList.length) % lightboxList.length;
      refreshLightboxUI();
    });
    els.lbNext?.addEventListener('click', () => {
      if (!lightboxList.length) return;
      lightboxIdx = (lightboxIdx + 1) % lightboxList.length;
      refreshLightboxUI();
    });
    els.lbSelectBtn?.addEventListener('click', () => {
      const p = lightboxList[lightboxIdx];
      if (p) togglePhotoSelection(p.id);
    });
    els.lbSaveComment?.addEventListener('click', async () => {
      const p = lightboxList[lightboxIdx];
      if (!p || !currentAlbum || currentAlbum.selectionLocked) return;
      if (!currentAlbum.photoComments) currentAlbum.photoComments = {};
      currentAlbum.photoComments[p.id] = (els.lbCommentIn?.value || '').trim();
      await window.AlbumsStore.saveState(rootState);
      renderToolbarFilters(currentAlbum);
      renderPhotosGrid(currentAlbum);
      showToast('💬 Observação salva na fotografia!');
    });
    els.lbFavBtn?.addEventListener('click', () => {
      const p = lightboxList[lightboxIdx];
      if (p) toggleDeliveryFavorite(p.id);
    });
    els.lbDownloadSingle?.addEventListener('click', () => {
      const p = lightboxList[lightboxIdx];
      if (p) openDownloadDialog(p);
    });

    document.addEventListener('keydown', (e) => {
      if (!els.lbDialog?.open) return;
      if (document.activeElement === els.lbCommentIn) return;
      if (e.key === 'ArrowLeft') els.lbPrev?.click();
      if (e.key === 'ArrowRight') els.lbNext?.click();
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        const p = lightboxList[lightboxIdx];
        if (!p) return;
        if (currentAlbum?.phase === 'proofing') togglePhotoSelection(p.id);
        else toggleDeliveryFavorite(p.id);
      }
    });

    // Checkout Modal
    els.chkClose?.addEventListener('click', () => els.chkDialog?.close());
    document.querySelectorAll('.pay-tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        document.querySelectorAll('.pay-tab').forEach((b) => b.classList.remove('active'));
        tabBtn.classList.add('active');
        const which = tabBtn.getAttribute('data-pay-tab');
        if (els.payPaneMp) els.payPaneMp.hidden = which !== 'mp';
        if (els.payPaneDirect) els.payPaneDirect.hidden = which !== 'direct';
      });
    });

    els.btnCopyMpPix?.addEventListener('click', () => {
      navigator.clipboard?.writeText(els.mpPixCode?.value || '');
      showToast('📋 Código Pix Mercado Pago copiado!');
    });

    els.btnCopyDirectPix?.addEventListener('click', () => {
      navigator.clipboard?.writeText(els.directPixCode?.value || '');
      showToast('📋 Código Pix copiado! Pague no app do seu banco.');
    });

    els.btnMpCardLink?.addEventListener('click', () => {
      if (isLocalEnv) {
        finalizeMercadoPagoApproved('Mercado Pago Cartão');
      }
    });

    els.btnConfirmFree?.addEventListener('click', finalizeFreeSelection);
    els.btnSimulateWebhook?.addEventListener('click', () => finalizeMercadoPagoApproved('Mercado Pago Pix'));
    els.btnConfirmDirectPix?.addEventListener('click', finalizeDirectPixWithWhatsapp);

    // Download Modal
    els.dlClose?.addEventListener('click', () => els.dlDialog?.close());
    document.querySelectorAll('input[name="dl-res"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        document.querySelectorAll('.dl-radio-card').forEach((card) => {
          card.classList.toggle('active', card.contains(radio) && radio.checked);
        });
      });
    });
    els.btnStartDownload?.addEventListener('click', executeDownloadFlow);
  }

  async function boot() {
    hydrateBrandStrings();
    setupAntiCopyProtection();
    bindEvents();

    rootState = await window.AlbumsStore.loadState();

    // Sincronização em tempo real caso o fotógrafo edite o álbum no /admin na outra aba
    window.AlbumsStore.subscribe(async () => {
      rootState = await window.AlbumsStore.loadState();
      if (currentAlbum) {
        const updated = (rootState.albums || []).find((a) => a.id === currentAlbum.id);
        if (updated && isAlbumUnlocked(updated)) {
          await openAlbumExperience(updated);
        }
      } else if (!initialSlug) {
        renderPortalView();
      }
    });

    if (!initialSlug) {
      renderPortalView();
      return;
    }

    const found = (rootState.albums || []).find((a) => a.slug.toLowerCase() === initialSlug);
    if (!found) {
      renderPortalView();
      if (els.portalError) {
        els.portalError.hidden = false;
        els.portalError.textContent = `O álbum "${initialSlug}" não foi localizado.`;
      }
      return;
    }

    currentAlbum = found;
    if (isAlbumUnlocked(found)) {
      await openAlbumExperience(found);
    } else {
      renderPasswordGate(found);
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();

