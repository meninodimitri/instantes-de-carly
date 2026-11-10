/**
 * ============================================================================
 * ÁREA DO CLIENTE V3 — GALERIA DE SELEÇÃO (SINETO) & ENTREGA (PIXIESET)
 * Inclui Design Customizável (Capa, Tipografia, Cor, Grade) +
 * Foco Interativo no Cursor / Toque na Grade e no Lightbox
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
  const isDesignPreview = params.get('designPreview') === '1';

  const SVG_HEART_OUTLINE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  const SVG_HEART_SOLID = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  const SVG_COMMENT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  const SVG_DOWNLOAD = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

  let rootState = null;
  let currentAlbum = null;
  let activeFilter = 'all'; // 'all' | 'selected' | 'unselected' | 'commented' | 'favorites'
  let lightboxList = [];
  let lightboxIdx = 0;
  let pendingDownloadTarget = null;
  let activeTouchSpotlightTile = null;

  // Cache em memória da sessão para os bundles protegidos (primarySrc + revealSrc)
  const runtimeProofMap = new Map();

  const els = {
    portalView: document.getElementById('portal-view'),
    portalForm: document.getElementById('portal-code-form'),
    portalSlugIn: document.getElementById('portal-slug-input'),
    portalError: document.getElementById('portal-error'),

    pwView: document.getElementById('password-view'),
    pwCoverImg: document.getElementById('pw-cover-img'),
    pwTitle: document.getElementById('pw-album-title'),
    pwSubtitle: document.getElementById('pw-album-subtitle'),
    pwForm: document.getElementById('password-form'),
    pwInput: document.getElementById('pw-input'),
    pwError: document.getElementById('pw-error'),

    albumView: document.getElementById('album-view'),
    deliveryHero: document.getElementById('delivery-hero'),
    deliveryHeroImg: document.getElementById('delivery-hero-img'),
    deliveryCoverLogo: document.getElementById('delivery-cover-logo'),
    deliveryHeroAuthor: document.getElementById('delivery-hero-author'),
    deliveryHeroFootAuthor: document.getElementById('delivery-hero-foot-author'),
    deliveryBoxAuthor: document.getElementById('delivery-box-author'),
    deliveryHeroDate: document.getElementById('delivery-hero-date'),
    deliveryHeroFootDate: document.getElementById('delivery-hero-foot-date'),
    deliveryBoxDate: document.getElementById('delivery-box-date'),
    deliveryHeroKicker: document.getElementById('delivery-hero-kicker'),
    deliveryHeroTitle: document.getElementById('delivery-hero-title'),
    deliveryHeroMsg: document.getElementById('delivery-hero-msg'),
    joyCutoutImg: document.getElementById('joy-cutout-img'),
    btnScrollGallery: document.getElementById('btn-scroll-gallery'),
    btnCoverScrollDown: document.getElementById('btn-cover-scroll-down'),

    topbar: document.getElementById('gallery-topbar'),
    proofingTitle: document.getElementById('proofing-title'),
    deliveryTopbarTitle: document.getElementById('delivery-topbar-title'),
    proofingPkgMeta: document.getElementById('proofing-pkg-meta'),
    topbarProofingActions: document.getElementById('topbar-proofing-actions'),
    topSelStat: document.getElementById('top-sel-stat'),
    topExtraStat: document.getElementById('top-extra-stat'),
    btnFinishTop: document.getElementById('btn-finish-selection-top'),
    topbarDeliveryActions: document.getElementById('topbar-delivery-actions'),
    btnDeliveryZip: document.getElementById('btn-delivery-download-zip'),

    toolbarFilters: document.getElementById('toolbar-filters'),
    toolbarCount: document.getElementById('toolbar-count-label'),

    lockedWrap: document.getElementById('proofing-locked-wrap'),
    lockedBanner: document.getElementById('proofing-locked-banner'),

    loadingBox: document.getElementById('photos-loading'),
    grid: document.getElementById('gallery-grid'),
    emptyBox: document.getElementById('gallery-empty'),

    dock: document.getElementById('selection-dock'),
    dockMainStat: document.getElementById('dock-main-stat'),
    dockExtraStat: document.getElementById('dock-extra-stat'),
    btnFinishDock: document.getElementById('btn-finish-selection'),

    lbDialog: document.getElementById('gal-lightbox'),
    lbClose: document.getElementById('lb-close'),
    lbGuard: document.getElementById('lb-canvas-guard'),
    lbImg: document.getElementById('lb-img'),
    lbRevealImg: document.getElementById('lb-reveal-img'),
    lbPrev: document.getElementById('lb-prev'),
    lbNext: document.getElementById('lb-next'),
    lbStrip: document.getElementById('lb-filmstrip'),
    lbIndex: document.getElementById('lb-index'),
    lbFilename: document.getElementById('lb-filename'),
    lbAssistBox: document.getElementById('lb-protection-assist'),
    lbAssistText: document.getElementById('lb-protection-hint'),
    btnHoldSharp: document.getElementById('btn-hold-sharp'),
    lbProofControls: document.getElementById('lb-proofing-controls'),
    lbSelectBtn: document.getElementById('lb-select-btn'),
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
    dlPinError: document.getElementById('dl-pin-error'),
    dlProgressBox: document.getElementById('dl-progress-box'),
    dlProgressText: document.getElementById('dl-progress-text'),
    dlProgressBar: document.getElementById('dl-progress-bar'),
    btnStartDownload: document.getElementById('btn-start-download'),

    modalCopyright: document.getElementById('modal-copyright'),
    btnCloseCopyright: document.getElementById('btn-close-copyright'),

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
    if (footerBrand) footerBrand.textContent = brand.studioName;
    document.querySelectorAll('img[alt="Instantes de Carly"]').forEach((img) => {
      img.alt = brand.studioName;
    });
  }

  /* ==========================================================================
     0. MOTOR DE APRESENTAÇÃO PIXIESET (COR, TIPOGRAFIA, CAPA E GRADE)
     ========================================================================== */
  function applyAlbumDesign(album) {
    const presets = window.AlbumsStore.DESIGN_PRESETS;
    const d = (album && album.design) || window.AlbumsStore.getDefaultDesign();

    const theme = presets.colorThemes.find((t) => t.id === d.colorTheme) || presets.colorThemes[0];
    const typo = presets.typographies.find((t) => t.id === d.typography) || presets.typographies[0];
    const gSpacing = presets.gridSpacings.find((g) => g.id === d.gridSpacing) || presets.gridSpacings[0];
    const gSize = presets.gridSizes.find((g) => g.id === d.gridSize) || presets.gridSizes[0];
    const gStyle = d.gridStyle || 'vertical';
    const coverStyle = d.coverStyle || 'centro';

    const root = document.documentElement;
    root.style.setProperty('--ground', theme.ground);
    root.style.setProperty('--surface', theme.surface);
    root.style.setProperty('--ink', theme.ink);
    root.style.setProperty('--ink-secondary', theme.inkSecondary);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-hover', theme.accentHover);
    root.style.setProperty('--font-display', typo.fontFamily);
    root.style.setProperty('--title-weight', String(typo.weight));
    root.style.setProperty('--title-tracking', typo.tracking);
    root.style.setProperty('--title-transform', typo.transform);
    root.style.setProperty('--title-style', typo.fontStyle || 'normal');
    root.style.setProperty('--grid-gap', `${gSpacing.gapPx}px`);
    root.style.setProperty('--grid-cols', String(gSize.cols));
    root.style.setProperty('--row-h', `${gSize.rowHeight}px`);

    // 1 & 5. Harmoniza o fundo e a barra lateral do Lightbox 100% com o tema de cor selecionado no álbum
    root.style.setProperty('--lb-bg', theme.ground);
    root.style.setProperty('--lb-sidebar-bg', theme.surface);
    root.style.setProperty('--lb-backdrop', theme.ground);
    root.style.setProperty('--lb-ink', theme.ink);
    root.style.setProperty('--lb-ink-secondary', theme.inkSecondary);
    root.style.setProperty('--lb-accent', theme.accent);

    if (theme.isDark) {
      root.style.setProperty('--lb-icon-bg', 'rgba(255, 255, 255, 0.12)');
      root.style.setProperty('--lb-icon-color', '#FFFDF3');
      root.style.setProperty('--lb-border', 'rgba(255, 255, 255, 0.14)');
      root.style.setProperty('--lb-box-bg', 'rgba(255, 255, 255, 0.06)');
    } else {
      root.style.setProperty('--lb-icon-bg', 'rgba(255, 255, 255, 0.88)');
      root.style.setProperty('--lb-icon-color', theme.ink);
      root.style.setProperty('--lb-border', 'rgba(0, 0, 0, 0.10)');
      root.style.setProperty('--lb-box-bg', 'rgba(0, 0, 0, 0.04)');
    }

    document.body.classList.toggle('theme-is-dark', Boolean(theme.isDark));

    // Alterna logos da topbar e login conforme o tema
    const surfaceLogo = theme.isDark ? 'assets/images/logo-light.png' : 'assets/images/logo-dark.png';
    document.querySelectorAll('.topbar-logo-link img').forEach((img) => {
      img.setAttribute('src', surfaceLogo);
    });

    // 4C. Controle de Exibição e Cor da Logo na Capa do Álbum
    const logoVisible = d.coverLogoVisible !== false;
    if (els.deliveryHero) {
      els.deliveryHero.setAttribute('data-cover', coverStyle);
      els.deliveryHero.setAttribute('data-logo-visible', String(logoVisible));
    }

    if (els.deliveryCoverLogo) {
      const logoColorChoice = d.coverLogoColor || 'auto';
      let chosenLogoSrc = 'assets/images/logo-light.png';

      if (logoColorChoice === 'light') {
        chosenLogoSrc = 'assets/images/logo-light.png';
      } else if (logoColorChoice === 'dark') {
        chosenLogoSrc = 'assets/images/logo-dark.png';
      } else {
        // 'auto': capas com fundo claro usam logo escura; capas escuras/fotográficas usam logo clara
        const lightBackingCovers = ['alegria', 'romance', 'vintage', 'diario', 'carimbo', 'classico', 'dividido', 'rotulo', 'borda', 'album'];
        const useDarkOnCover = lightBackingCovers.includes(coverStyle) && !theme.isDark;
        chosenLogoSrc = useDarkOnCover ? 'assets/images/logo-dark.png' : 'assets/images/logo-light.png';
      }
      els.deliveryCoverLogo.setAttribute('src', chosenLogoSrc);
    }

    if (els.grid) {
      els.grid.setAttribute('data-grid-style', gStyle);
    }

    if (els.topbar) {
      els.topbar.setAttribute('data-grid-nav', d.gridNavStyle || 'icons_text');
    }
  }

  function showCopyrightModal() {
    if (!els.modalCopyright) return;
    if (typeof els.modalCopyright.showModal === 'function') {
      if (!els.modalCopyright.open) {
        els.modalCopyright.showModal();
      }
    } else {
      els.modalCopyright.setAttribute('open', '');
    }
  }

  /* ==========================================================================
     1. PROTEÇÃO ANTI-CÓPIA E ANTI-PRINT (DIREITOS AUTORAIS LEI 9.610/98)
     ========================================================================== */
  function setupAntiCopyProtection() {
    // 1. Desabilita menu de contexto com abertura do modal de proteção
    document.addEventListener('contextmenu', (e) => {
      if (currentAlbum && (currentAlbum.phase === 'proofing' || currentAlbum.antiPrintEnabled !== false)) {
        if (e.target.closest('.masonry-wall, .gal-lightbox, .pixieset-cover, .auth-fullscreen-view')) {
          e.preventDefault();
          showCopyrightModal();
        }
      }
    });

    // 2. Desabilita arraste de fotografias
    document.addEventListener('dragstart', (e) => {
      if (e.target.tagName === 'IMG') {
        e.preventDefault();
      }
    });

    const hideAllSpotlights = () => {
      if (els.lbRevealImg) els.lbRevealImg.style.opacity = '0';
      document.querySelectorAll('.tile-spotlight-reveal').forEach((el) => {
        el.style.opacity = '0';
      });
    };

    // 3. Detecção de PrintScreen (tecla física)
    window.addEventListener('keyup', (e) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        hideAllSpotlights();
        showCopyrightModal();
      }
    });

    // 4. Detecção de atalhos de impressão e captura (Ctrl+P, Cmd+P, Ctrl+Shift+S, Cmd+Shift+3/4)
    window.addEventListener('keydown', (e) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (isCmdOrCtrl && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        showCopyrightModal();
      } else if (isCmdOrCtrl && e.shiftKey && (e.key === 's' || e.key === 'S' || e.key === '3' || e.key === '4')) {
        e.preventDefault();
        showCopyrightModal();
      }
    });

    // 5. Intercepta cópia de área de transferência
    document.addEventListener('copy', (e) => {
      if (currentAlbum && (currentAlbum.phase === 'proofing' || currentAlbum.antiPrintEnabled !== false)) {
        showCopyrightModal();
      }
    });

    window.addEventListener('blur', hideAllSpotlights);
    document.addEventListener('visibilitychange', hideAllSpotlights);
  }

  /* ==========================================================================
     2. CONTROLE ESTRITO DAS 3 TELAS (APENAS 1 VISÍVEL POR VEZ)
     ========================================================================== */
  function showOnlySection(target) {
    [els.portalView, els.pwView, els.albumView].forEach((sec) => {
      if (sec) sec.hidden = sec !== target;
    });
  }

  function renderPortalView() {
    currentAlbum = null;
    applyAlbumDesign(null);
    showOnlySection(els.portalView);
    document.body.classList.remove('is-proofing-protected');
    document.title = `Área do Cliente — ${window.AlbumsStore.getBrandDefaults().studioName}`;
  }

  function isAlbumUnlocked(album) {
    if (album.passwordEnabled === false || !album.password || isAdminPreview) return true;
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
    applyAlbumDesign(album);
    showOnlySection(els.pwView);
    document.body.classList.remove('is-proofing-protected');
    const cover = album.coverSrc || album.photos?.[0]?.originalSrc || 'assets/images/carly-perfil.jpg';
    if (els.pwCoverImg) {
      els.pwCoverImg.src = cover;
      els.pwCoverImg.style.objectPosition = album.coverFocal || '50% 34%';
    }
    if (els.pwTitle) els.pwTitle.textContent = album.title || album.clientName;
    if (els.pwSubtitle) {
      els.pwSubtitle.textContent = album.subtitle
        ? `${album.subtitle} · Digite a senha enviada pela sua fotógrafa para abrir o álbum.`
        : 'Digite a senha enviada pela sua fotógrafa para abrir o álbum.';
    }
    if (els.pwError) els.pwError.hidden = true;
    if (els.pwInput) els.pwInput.value = '';
    document.title = `${album.clientName} — Acesso Privado`;
  }

  /* ==========================================================================
     3. GERAÇÃO E CACHE DOS 3 NÍVEIS DE PROTEÇÃO DE IMAGEM
     ========================================================================== */
  function getProofKey(album, photo) {
    const sig = window.AlbumsStore.getWatermarkSignature(
      rootState.watermarkConfig,
      album.protectionLevel || 'watermark',
      album.watermarkEnabled !== false
    );
    return `${photo.id}::${sig}`;
  }

  async function ensureProtectedProofsReady(album) {
    if (album.phase !== 'proofing') return;
    const photos = album.photos || [];
    const level = album.protectionLevel || 'watermark';
    const wmCfg = rootState.watermarkConfig || {};
    const wmEnabled = album.watermarkEnabled !== false;

    const pending = photos.filter((p) => !runtimeProofMap.has(getProofKey(album, p)));
    if (!pending.length) return;

    if (els.loadingBox) els.loadingBox.hidden = false;
    if (els.grid) els.grid.innerHTML = '';

    await Promise.all(pending.map(async (photo) => {
      try {
        const bundle = await window.AlbumsStore.generateProtectedProofBundle(
          photo.originalSrc,
          wmCfg,
          level,
          1080,
          wmEnabled
        );
        runtimeProofMap.set(getProofKey(album, photo), bundle);
      } catch (_) {
        runtimeProofMap.set(getProofKey(album, photo), {
          primarySrc: photo.originalSrc,
          revealSrc: photo.originalSrc
        });
      }
    }));

    if (els.loadingBox) els.loadingBox.hidden = true;
  }

  function getPhotoPrimarySrc(album, photo) {
    if (album.phase === 'proofing') {
      const hit = runtimeProofMap.get(getProofKey(album, photo));
      return hit ? hit.primarySrc : '';
    }
    return photo.originalSrc;
  }

  function getPhotoRevealSrc(album, photo) {
    if (album.phase === 'proofing') {
      const hit = runtimeProofMap.get(getProofKey(album, photo));
      return hit ? hit.revealSrc : '';
    }
    return photo.originalSrc;
  }

  /* ==========================================================================
     4. EXPERIÊNCIA DA GALERIA (SELEÇÃO SINETO OU ENTREGA PIXIESET)
     ========================================================================== */
  async function openAlbumExperience(album) {
    currentAlbum = album;
    applyAlbumDesign(album);
    showOnlySection(els.albumView);
    document.title = `${album.clientName} — ${window.AlbumsStore.getBrandDefaults().studioName}`;

    const isProof = album.phase === 'proofing';
    const coverStyle = album.design?.coverStyle || 'borda';
    const shouldShowCover = (!isProof || isDesignPreview) && coverStyle !== 'none';

    document.body.classList.toggle('is-proofing-protected', isProof);

    if (els.deliveryHero) els.deliveryHero.hidden = !shouldShowCover;
    if (els.proofingTitle) els.proofingTitle.hidden = !isProof;
    if (els.deliveryTopbarTitle) els.deliveryTopbarTitle.hidden = isProof;
    if (els.topbarProofingActions) els.topbarProofingActions.hidden = !isProof;
    if (els.topbarDeliveryActions) els.topbarDeliveryActions.hidden = isProof;
    if (els.dock) els.dock.hidden = !isProof || Boolean(album.selectionLocked);

    if (isProof && activeFilter === 'favorites') activeFilter = 'all';
    if (!isProof && ['selected', 'unselected', 'commented'].includes(activeFilter)) activeFilter = 'all';

    if (shouldShowCover) {
      hydrateCoverHero(album);
    }

    if (isProof) {
      updateProofingChrome(album);
      await ensureProtectedProofsReady(album);
      syncLivePaymentForAlbum(album);
    } else {
      updateDeliveryChrome(album);
      if (els.lockedWrap) els.lockedWrap.hidden = true;
    }

    renderFilterTabs(album);
    renderMasonryWall(album);
  }

  async function syncLivePaymentForAlbum(album) {
    if (!album || isLocalEnv || album.status === 'selection_paid') return;
    try {
      const res = await fetch(`/api/payments?albumId=${encodeURIComponent(album.id)}`);
      if (!res.ok) return;
      const data = await res.json();
      const approved = (data.payments || []).find((p) => p.status === 'approved');
      if (approved && album.status !== 'selection_paid') {
        album.status = 'selection_paid';
        album.selectionLocked = true;
        if (Array.isArray(approved.selectedIds) && approved.selectedIds.length > 0) {
          album.selectedIds = approved.selectedIds;
        }
        album.paymentOrder = {
          id: approved.id,
          method: approved.paymentMethod || 'mercadopago',
          status: 'approved',
          extraCount: approved.extraCount || 0,
          totalAmount: approved.amount,
          paidAt: approved.paidAt || new Date().toISOString()
        };
        await window.AlbumsStore.saveState(rootState);
        updateProofingChrome(album);
        renderMasonryWall(album);
      }
    } catch (_) {}
  }

  function hydrateCoverHero(album) {
    const cover = album.coverSrc || album.photos?.[0]?.originalSrc || 'assets/images/carly-perfil.jpg';
    if (els.deliveryHeroImg) {
      els.deliveryHeroImg.src = cover;
      els.deliveryHeroImg.alt = album.title || album.clientName || 'Capa do ensaio';
      els.deliveryHeroImg.style.objectPosition = album.coverFocal || '50% 36%';
    }
    if (els.joyCutoutImg) {
      els.joyCutoutImg.src = cover;
      els.joyCutoutImg.style.objectPosition = album.coverFocal || '50% 36%';
    }
    const kText = (album.coverKicker !== undefined ? album.coverKicker : 'GALERIA OFICIAL EM ALTA RESOLUÇÃO').trim();
    if (els.deliveryHeroKicker) {
      els.deliveryHeroKicker.textContent = kText;
      els.deliveryHeroKicker.hidden = !kText;
      els.deliveryHeroKicker.style.display = kText ? '' : 'none';
    }
    const authorText = (album.coverAuthor !== undefined ? album.coverAuthor : 'CARLIANE CARVALHO').trim();
    if (els.deliveryHeroAuthor) {
      els.deliveryHeroAuthor.textContent = authorText.toUpperCase();
      els.deliveryHeroAuthor.hidden = !authorText;
      els.deliveryHeroAuthor.style.display = authorText ? '' : 'none';
    }
    if (els.deliveryHeroFootAuthor) {
      els.deliveryHeroFootAuthor.textContent = authorText.toUpperCase();
      els.deliveryHeroFootAuthor.hidden = !authorText;
      els.deliveryHeroFootAuthor.style.display = authorText ? '' : 'none';
    }
    if (els.deliveryBoxAuthor) {
      els.deliveryBoxAuthor.textContent = authorText.toUpperCase();
      els.deliveryBoxAuthor.hidden = !authorText;
      els.deliveryBoxAuthor.style.display = authorText ? '' : 'none';
    }

    const dateOrSub = (album.subtitle || '').trim();
    if (els.deliveryHeroDate) {
      els.deliveryHeroDate.textContent = dateOrSub;
      els.deliveryHeroDate.hidden = !dateOrSub;
      els.deliveryHeroDate.style.display = dateOrSub ? '' : 'none';
    }
    if (els.deliveryHeroFootDate) {
      els.deliveryHeroFootDate.textContent = dateOrSub;
      els.deliveryHeroFootDate.hidden = !dateOrSub;
      els.deliveryHeroFootDate.style.display = dateOrSub ? '' : 'none';
    }
    if (els.deliveryBoxDate) {
      els.deliveryBoxDate.textContent = dateOrSub;
      els.deliveryBoxDate.hidden = !dateOrSub;
      els.deliveryBoxDate.style.display = dateOrSub ? '' : 'none';
    }

    const titleText = (album.title || album.clientName || '').trim();
    if (els.deliveryHeroTitle) {
      els.deliveryHeroTitle.textContent = titleText;
      els.deliveryHeroTitle.hidden = !titleText;
      els.deliveryHeroTitle.style.display = titleText ? '' : 'none';
    }

    const wMsg = (album.welcomeMessage || '').trim();
    if (els.deliveryHeroMsg) {
      els.deliveryHeroMsg.textContent = wMsg;
      els.deliveryHeroMsg.hidden = !wMsg;
      els.deliveryHeroMsg.style.display = wMsg ? '' : 'none';
    }
  }

  function updateProofingChrome(album) {
    const calc = window.AlbumsStore.calculateSelectionPricing(album);
    if (els.proofingTitle) els.proofingTitle.textContent = album.title || album.clientName;
    if (els.proofingPkgMeta) {
      els.proofingPkgMeta.textContent = calc.extrasEnabled
        ? `${album.packageName || 'Pacote'}: ${calc.packageIncluded} fotos inclusas · Foto extra ${formatBRL(album.extraPhotoPrice)}`
        : `${album.packageName || 'Pacote'}: selecione até ${calc.packageIncluded} fotos inclusas`;
    }

    if (els.topSelStat) {
      els.topSelStat.textContent = `Selecionadas: ${calc.selectedCount} / ${calc.packageIncluded}`;
    }
    if (els.topExtraStat) {
      if (calc.hasExtras) {
        els.topExtraStat.hidden = false;
        els.topExtraStat.textContent = `+${calc.extraCount} ${calc.extraCount === 1 ? 'extra' : 'extras'} (${formatBRL(calc.extraTotal)})`;
      } else {
        els.topExtraStat.hidden = true;
      }
    }

    if (els.btnFinishTop) {
      const isLocked = Boolean(album.selectionLocked);
      els.btnFinishTop.disabled = isLocked || calc.selectedCount === 0;
      const finishText = isLocked
        ? 'Seleção concluída'
        : (calc.hasExtras ? `Concluir e pagar extras (${formatBRL(calc.extraTotal)})` : 'Concluir seleção');
      els.btnFinishTop.title = finishText;
      let labelEl = els.btnFinishTop.querySelector('.btn-label');
      let iconEl = els.btnFinishTop.querySelector('.topbar-btn-icon');
      if (!labelEl || !iconEl) {
        els.btnFinishTop.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="topbar-btn-icon" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="btn-label">${escapeHtml(finishText)}</span>
        `;
      } else {
        labelEl.textContent = finishText;
      }
    }

    if (els.dock) {
      els.dock.hidden = Boolean(album.selectionLocked);
      if (els.dockMainStat) {
        els.dockMainStat.textContent = `Selecionadas: ${calc.selectedCount} / ${calc.packageIncluded}`;
      }
      if (els.dockExtraStat) {
        els.dockExtraStat.textContent = calc.hasExtras
          ? `+${calc.extraCount} extras · ${formatBRL(calc.extraTotal)}`
          : `${calc.remainingInPackage} restantes no pacote`;
      }
      if (els.btnFinishDock) {
        els.btnFinishDock.disabled = calc.selectedCount === 0;
        els.btnFinishDock.textContent = calc.hasExtras
          ? `Pagar extras (${formatBRL(calc.extraTotal)})`
          : 'Concluir';
      }
    }

    if (els.lockedWrap && els.lockedBanner) {
      if (album.selectionLocked) {
        els.lockedWrap.hidden = false;
        if (album.status === 'selection_paid' && album.paymentOrder) {
          els.lockedBanner.textContent = `Seleção confirmada e pagamento de ${formatBRL(album.paymentOrder.totalAmount)} aprovado. Total de ${calc.selectedCount} fotografias liberadas para edição final.`;
        } else if (album.status === 'awaiting_pix_confirm' && album.paymentOrder) {
          els.lockedBanner.textContent = `Seleção registrada (${calc.selectedCount} fotografias). Aguardando confirmação do Pix de ${formatBRL(album.paymentOrder.totalAmount)} pelo estúdio.`;
        } else {
          els.lockedBanner.textContent = `Seleção finalizada (${calc.selectedCount} fotografias). Sua fotógrafa já recebeu sua lista para edição final.`;
        }
      } else {
        els.lockedWrap.hidden = true;
      }
    }
  }

  function updateDeliveryChrome(album) {
    hydrateCoverHero(album);
    if (els.deliveryTopbarTitle) els.deliveryTopbarTitle.textContent = album.clientName;
    if (els.proofingPkgMeta) {
      els.proofingPkgMeta.textContent = `${(album.photos || []).length} fotografias em alta resolução`;
    }
  }

  /* ==========================================================================
     5. FILTROS LIMPOS & PAREDE DE FOTOS (COM FOCO NO CURSOR/DEDO EM SPOTLIGHT)
     ========================================================================== */
  function getFilteredPhotos(album) {
    const photos = album.photos || [];
    const selectedSet = new Set(album.selectedIds || []);
    const favSet = new Set(album.deliveryFavorites || []);
    const comments = album.photoComments || {};

    if (activeFilter === 'selected') return photos.filter((p) => selectedSet.has(p.id));
    if (activeFilter === 'unselected') return photos.filter((p) => !selectedSet.has(p.id));
    if (activeFilter === 'commented') return photos.filter((p) => Boolean(comments[p.id]?.trim()));
    if (activeFilter === 'favorites') return photos.filter((p) => favSet.has(p.id));
    return photos;
  }

  function renderFilterTabs(album) {
    if (!els.toolbarFilters) return;
    const photos = album.photos || [];
    let tabs = [];

    if (album.phase === 'proofing') {
      const selCount = (album.selectedIds || []).length;
      const unselCount = Math.max(0, photos.length - selCount);
      const noteCount = Object.values(album.photoComments || {}).filter((v) => String(v || '').trim()).length;

      tabs = [
        { id: 'all', label: `Todas (${photos.length})` },
        { id: 'selected', label: `Selecionadas (${selCount})` },
        { id: 'unselected', label: `Não selecionadas (${unselCount})` },
        { id: 'commented', label: `Com observação (${noteCount})` }
      ];
    } else {
      const favCount = (album.deliveryFavorites || []).length;
      tabs = [
        { id: 'all', label: `Todas (${photos.length})` },
        { id: 'favorites', label: `Favoritas (${favCount})` }
      ];
    }

    els.toolbarFilters.innerHTML = tabs.map((t) => `
      <button
        type="button"
        class="filter-tab ${activeFilter === t.id ? 'active' : ''}"
        data-filter="${escapeHtml(t.id)}"
      >${escapeHtml(t.label)}</button>
    `).join('');

    els.toolbarFilters.querySelectorAll('.filter-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.getAttribute('data-filter') || 'all';
        renderFilterTabs(currentAlbum);
        renderMasonryWall(currentAlbum);
      });
    });
  }

  function updateTileSpotlightMask(tile, clientX, clientY) {
    const revealImg = tile?.querySelector('.tile-spotlight-reveal');
    const frame = tile?.querySelector('.masonry-img-btn');
    if (!revealImg || !frame) return;
    const rect = frame.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const radius = Math.max(76, Math.min(115, Math.round(Math.min(rect.width, rect.height) * 0.34)));
    const mask = `radial-gradient(circle ${radius}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0.88) 54%, rgba(0,0,0,0) 100%)`; // taste-skill-ignore: functional mask-image for cursor spotlight lens
    revealImg.style.webkitMaskImage = mask;
    revealImg.style.maskImage = mask;
    revealImg.style.opacity = '1';
  }

  function clearTileSpotlightMask(tile) {
    const revealImg = tile?.querySelector('.tile-spotlight-reveal');
    if (revealImg) revealImg.style.opacity = '0';
  }

  function renderMasonryWall(album) {
    if (!els.grid) return;
    const filtered = getFilteredPhotos(album);
    lightboxList = filtered;

    if (els.toolbarCount) {
      els.toolbarCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'foto' : 'fotos'}`;
    }
    if (els.emptyBox) els.emptyBox.hidden = filtered.length > 0;

    const isProof = album.phase === 'proofing';
    const isSpotlight = isProof && album.protectionLevel === 'watermark_spotlight';
    const selectedOrder = album.selectedIds || [];
    const selectedSet = new Set(selectedOrder);
    const favSet = new Set(album.deliveryFavorites || []);
    const comments = album.photoComments || {};
    const pkgLimit = Math.max(0, parseInt(album.packageIncluded, 10) || 0);
    const extrasOn = album.extrasEnabled !== false;

    els.grid.innerHTML = filtered.map((photo, idx) => {
      const src = getPhotoPrimarySrc(album, photo);
      const revealSrc = isSpotlight ? getPhotoRevealSrc(album, photo) : '';
      const ratioStyle = photo.aspectRatio ? `style="--ratio: ${Number(photo.aspectRatio).toFixed(3)};"` : '';

      if (isProof) {
        const isSel = selectedSet.has(photo.id);
        const selPos = selectedOrder.indexOf(photo.id);
        const isExtra = extrasOn && isSel && selPos >= pkgLimit && Number(album.extraPhotoPrice) > 0;
        const hasNote = Boolean(comments[photo.id]?.trim());

        return `
          <figure class="masonry-tile ${isSel ? 'is-selected' : ''} ${isSpotlight ? 'has-cursor-spotlight' : ''}" data-photo-id="${escapeHtml(photo.id)}" ${ratioStyle}>
            <button type="button" class="masonry-img-btn js-open-lb" data-lb-idx="${idx}" aria-label="Ampliar foto ${escapeHtml(photo.filename)}">
              <img src="${escapeHtml(src)}" alt="${escapeHtml(photo.filename)}" loading="lazy" draggable="false" class="tile-base-img" />
              ${isSpotlight ? `<img src="${escapeHtml(revealSrc)}" alt="" aria-hidden="true" draggable="false" class="tile-spotlight-reveal" />` : ''}
            </button>
            ${isExtra ? `<span class="tile-extra-flag">Extra · ${formatBRL(album.extraPhotoPrice)}</span>` : ''}
            <span class="tile-code-label">${escapeHtml(photo.filename)}</span>
            <button
              type="button"
              class="tile-heart-btn ${isSel ? 'active' : ''} js-toggle-select"
              data-photo-id="${escapeHtml(photo.id)}"
              aria-label="${isSel ? 'Remover seleção' : 'Selecionar foto'}"
              ${album.selectionLocked ? 'disabled' : ''}
            >${isSel ? SVG_HEART_SOLID : SVG_HEART_OUTLINE}</button>
            <button
              type="button"
              class="tile-action-btn ${hasNote ? 'has-note' : ''} js-open-note"
              data-lb-idx="${idx}"
              aria-label="Observação de edição"
              title="Observação de edição"
            >${SVG_COMMENT}</button>
          </figure>
        `;
      }

      const isFav = favSet.has(photo.id);
      return `
        <figure class="masonry-tile ${isFav ? 'is-selected' : ''}" data-photo-id="${escapeHtml(photo.id)}" ${ratioStyle}>
          <button type="button" class="masonry-img-btn js-open-lb" data-lb-idx="${idx}" aria-label="Ampliar foto ${escapeHtml(photo.filename)}">
            <img src="${escapeHtml(src)}" alt="${escapeHtml(photo.filename)}" loading="lazy" class="tile-base-img" />
          </button>
          <button
            type="button"
            class="tile-heart-btn ${isFav ? 'active' : ''} js-toggle-fav"
            data-photo-id="${escapeHtml(photo.id)}"
            aria-label="${isFav ? 'Remover das favoritas' : 'Adicionar às favoritas'}"
          >${isFav ? SVG_HEART_SOLID : SVG_HEART_OUTLINE}</button>
          <button
            type="button"
            class="tile-action-btn js-download-one"
            data-photo-id="${escapeHtml(photo.id)}"
            aria-label="Baixar esta foto"
            title="Baixar esta foto"
          >${SVG_DOWNLOAD}</button>
        </figure>
      `;
    }).join('');

    // Calcula aspect-ratio natural para fotos antigas na Grade Horizontal
    els.grid.querySelectorAll('img.tile-base-img').forEach((img) => {
      const syncRatio = () => {
        if (img.naturalWidth && img.naturalHeight) {
          const tile = img.closest('.masonry-tile');
          if (tile) {
            tile.style.setProperty('--ratio', (img.naturalWidth / img.naturalHeight).toFixed(3));
          }
        }
      };
      if (img.complete) syncRatio();
      else img.addEventListener('load', syncRatio, { once: true });
    });

    // Eventos de foco interativo por cursor/toque na miniatura (Nível 3: watermark_spotlight)
    if (isSpotlight) {
      els.grid.querySelectorAll('.masonry-tile.has-cursor-spotlight').forEach((tile) => {
        tile.addEventListener('pointermove', (e) => {
          if (e.pointerType === 'touch') return;
          updateTileSpotlightMask(tile, e.clientX, e.clientY);
        });
        tile.addEventListener('pointerleave', () => clearTileSpotlightMask(tile));
        tile.addEventListener('pointercancel', () => clearTileSpotlightMask(tile));
      });
    }

    els.grid.querySelectorAll('.js-open-lb').forEach((btn) => {
      btn.addEventListener('click', () => openLightboxAt(Number(btn.getAttribute('data-lb-idx')) || 0, false));
    });
    els.grid.querySelectorAll('.js-open-note').forEach((btn) => {
      btn.addEventListener('click', () => openLightboxAt(Number(btn.getAttribute('data-lb-idx')) || 0, true));
    });
    els.grid.querySelectorAll('.js-toggle-select').forEach((btn) => {
      btn.addEventListener('click', () => togglePhotoSelection(btn.getAttribute('data-photo-id')));
    });
    els.grid.querySelectorAll('.js-toggle-fav').forEach((btn) => {
      btn.addEventListener('click', () => toggleDeliveryFavorite(btn.getAttribute('data-photo-id')));
    });
    els.grid.querySelectorAll('.js-download-one').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (currentAlbum?.phase !== 'delivery') return;
        const p = (currentAlbum.photos || []).find((x) => x.id === btn.getAttribute('data-photo-id'));
        if (p) openDownloadDialog(p);
      });
    });
  }

  function setupGridTouchSpotlight() {
    if (!els.grid) return;
    const handleTouchPoint = (e) => {
      if (!currentAlbum || currentAlbum.phase !== 'proofing' || currentAlbum.protectionLevel !== 'watermark_spotlight') return;
      const t = e.touches?.[0];
      if (!t) return;
      const hitEl = document.elementFromPoint(t.clientX, t.clientY);
      const tile = hitEl?.closest?.('.masonry-tile.has-cursor-spotlight') || null;
      if (activeTouchSpotlightTile && activeTouchSpotlightTile !== tile) {
        clearTileSpotlightMask(activeTouchSpotlightTile);
      }
      activeTouchSpotlightTile = tile;
      if (tile) {
        updateTileSpotlightMask(tile, t.clientX, t.clientY);
      }
    };
    const clearTouch = () => {
      if (activeTouchSpotlightTile) {
        clearTileSpotlightMask(activeTouchSpotlightTile);
        activeTouchSpotlightTile = null;
      }
    };

    els.grid.addEventListener('touchstart', handleTouchPoint, { passive: true });
    els.grid.addEventListener('touchmove', handleTouchPoint, { passive: true });
    els.grid.addEventListener('touchend', clearTouch, { passive: true });
    els.grid.addEventListener('touchcancel', clearTouch, { passive: true });
  }

  async function togglePhotoSelection(photoId) {
    if (!currentAlbum || currentAlbum.phase !== 'proofing' || currentAlbum.selectionLocked) return;
    if (!Array.isArray(currentAlbum.selectedIds)) currentAlbum.selectedIds = [];

    const idx = currentAlbum.selectedIds.indexOf(photoId);
    if (idx >= 0) {
      currentAlbum.selectedIds.splice(idx, 1);
    } else {
      const pkgLimit = Math.max(0, parseInt(currentAlbum.packageIncluded, 10) || 0);
      if (currentAlbum.extrasEnabled === false && pkgLimit > 0 && currentAlbum.selectedIds.length >= pkgLimit) {
        showToast(`Limite do pacote atingido (${pkgLimit} fotos). Desmarque uma para trocar.`);
        return;
      }
      currentAlbum.selectedIds.push(photoId);
      const calc = window.AlbumsStore.calculateSelectionPricing(currentAlbum);
      if (calc.hasExtras && calc.extraCount === 1 && currentAlbum.selectedIds.length === calc.packageIncluded + 1) {
        showToast(`Pacote completo (${calc.packageIncluded} fotos). Fotos extras adicionam ${formatBRL(calc.extraPhotoPrice)} cada.`);
      }
    }

    await window.AlbumsStore.saveState(rootState);
    updateProofingChrome(currentAlbum);
    renderFilterTabs(currentAlbum);
    renderMasonryWall(currentAlbum);
    if (els.lbDialog?.open) refreshLightboxUI();
  }

  async function toggleDeliveryFavorite(photoId) {
    if (!currentAlbum || currentAlbum.phase !== 'delivery') return;
    if (!Array.isArray(currentAlbum.deliveryFavorites)) currentAlbum.deliveryFavorites = [];
    const idx = currentAlbum.deliveryFavorites.indexOf(photoId);
    if (idx >= 0) currentAlbum.deliveryFavorites.splice(idx, 1);
    else currentAlbum.deliveryFavorites.push(photoId);

    await window.AlbumsStore.saveState(rootState);
    renderFilterTabs(currentAlbum);
    renderMasonryWall(currentAlbum);
    if (els.lbDialog?.open) refreshLightboxUI();
  }

  /* ==========================================================================
     6. LIGHTBOX & FOCO INTERATIVO ATRELADO AO CURSOR / TOQUE
     ========================================================================== */
  function applyLightboxSpotlightAtPoint(clientX, clientY) {
    if (!els.lbRevealImg || !els.lbGuard) return;
    const rect = els.lbGuard.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const mask = `radial-gradient(circle 138px at ${x.toFixed(1)}px ${y.toFixed(1)}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0.88) 56%, rgba(0,0,0,0) 100%)`; // taste-skill-ignore: functional mask-image for spotlight protection lens
    els.lbRevealImg.style.webkitMaskImage = mask;
    els.lbRevealImg.style.maskImage = mask;
    els.lbRevealImg.style.opacity = '1';
  }

  function hideLightboxSpotlight() {
    if (els.lbRevealImg) {
      els.lbRevealImg.style.opacity = '0';
    }
  }

  function setupLightboxProtectionLens() {
    if (!els.lbGuard) return;

    const isSpotlightActive = () =>
      currentAlbum && currentAlbum.phase === 'proofing' && currentAlbum.protectionLevel === 'watermark_spotlight';

    els.lbGuard.addEventListener('pointermove', (e) => {
      if (!isSpotlightActive()) return;
      applyLightboxSpotlightAtPoint(e.clientX, e.clientY);
    });
    els.lbGuard.addEventListener('pointerleave', () => {
      if (isSpotlightActive()) hideLightboxSpotlight();
    });
    els.lbGuard.addEventListener('pointercancel', () => {
      if (isSpotlightActive()) hideLightboxSpotlight();
    });
    els.lbGuard.addEventListener('touchstart', (e) => {
      if (!isSpotlightActive()) return;
      const t = e.touches?.[0];
      if (t) applyLightboxSpotlightAtPoint(t.clientX, t.clientY);
    }, { passive: true });
    els.lbGuard.addEventListener('touchmove', (e) => {
      if (!isSpotlightActive()) return;
      const t = e.touches?.[0];
      if (t) applyLightboxSpotlightAtPoint(t.clientX, t.clientY);
    }, { passive: true });
    els.lbGuard.addEventListener('touchend', () => {
      if (isSpotlightActive()) hideLightboxSpotlight();
    }, { passive: true });
    els.lbGuard.addEventListener('touchcancel', () => {
      if (isSpotlightActive()) hideLightboxSpotlight();
    }, { passive: true });
  }

  function openLightboxAt(idx, focusComment = false) {
    if (!lightboxList.length || !els.lbDialog) return;
    lightboxIdx = Math.max(0, Math.min(idx, lightboxList.length - 1));
    renderLightboxFilmstrip();
    refreshLightboxUI();
    if (!els.lbDialog.open) els.lbDialog.showModal();
    if (focusComment && els.lbCommentIn) {
      setTimeout(() => els.lbCommentIn.focus(), 60);
    }
  }

  function renderLightboxFilmstrip() {
    if (!els.lbStrip) return;
    els.lbStrip.innerHTML = lightboxList.map((p, i) => `
      <img
        src="${escapeHtml(getPhotoPrimarySrc(currentAlbum, p))}"
        alt=""
        width="50"
        height="50"
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

    const primarySrc = getPhotoPrimarySrc(currentAlbum, photo);
    const revealSrc = getPhotoRevealSrc(currentAlbum, photo);
    const isProof = currentAlbum.phase === 'proofing';
    const level = currentAlbum.protectionLevel || 'watermark';

    if (els.lbImg) {
      els.lbImg.src = primarySrc;
      els.lbImg.alt = photo.filename || '';
    }
    if (els.lbIndex) els.lbIndex.textContent = `${lightboxIdx + 1} / ${lightboxList.length}`;
    if (els.lbFilename) els.lbFilename.textContent = photo.filename || '';

    if (els.btnHoldSharp) els.btnHoldSharp.hidden = true;

    if (isProof && level === 'watermark_spotlight') {
      if (els.lbRevealImg) {
        els.lbRevealImg.src = revealSrc;
        els.lbRevealImg.hidden = false;
        els.lbRevealImg.style.opacity = '0';
      }
      if (els.lbAssistBox) els.lbAssistBox.hidden = false;
      if (els.lbAssistText) {
        els.lbAssistText.textContent = 'Passe o mouse ou deslize o dedo sobre a foto para focar exatamente onde deseja inspecionar.';
      }
    } else if (isProof && level === 'watermark_lowres') {
      if (els.lbRevealImg) {
        els.lbRevealImg.hidden = true;
        els.lbRevealImg.style.opacity = '0';
      }
      if (els.lbAssistBox) els.lbAssistBox.hidden = false;
      if (els.lbAssistText) {
        els.lbAssistText.textContent = 'Prévia em baixa resolução para escolha. Suas fotos selecionadas serão entregues em alta definição.';
      }
    } else {
      if (els.lbRevealImg) {
        els.lbRevealImg.hidden = true;
        els.lbRevealImg.style.opacity = '0';
      }
      if (els.lbAssistBox) els.lbAssistBox.hidden = true;
    }

    if (els.lbProofControls) els.lbProofControls.hidden = !isProof;
    if (els.lbDeliveryControls) els.lbDeliveryControls.hidden = isProof;

    if (isProof) {
      const isSel = (currentAlbum.selectedIds || []).includes(photo.id);
      if (els.lbSelectBtn) {
        els.lbSelectBtn.disabled = Boolean(currentAlbum.selectionLocked);
        els.lbSelectBtn.classList.toggle('active', isSel);
        els.lbSelectBtn.textContent = isSel ? 'Fotografia selecionada (remover)' : 'Selecionar fotografia';
      }
      if (els.lbCommentIn) {
        els.lbCommentIn.disabled = Boolean(currentAlbum.selectionLocked);
        els.lbCommentIn.value = (currentAlbum.photoComments && currentAlbum.photoComments[photo.id]) || '';
      }
    } else {
      const isFav = (currentAlbum.deliveryFavorites || []).includes(photo.id);
      if (els.lbFavBtn) {
        els.lbFavBtn.textContent = isFav ? 'Remover das favoritas' : 'Marcar como favorita';
      }
    }

    // Sincroniza fita de miniaturas com scrollTo (nunca scrollIntoView)
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
  function renderQrMatrix(canvas, payloadStr) {
    if (!canvas || !payloadStr) return;
    if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
      window.QRCode.toCanvas(canvas, payloadStr, {
        width: canvas.width || 168,
        margin: 1,
        color: {
          dark: '#1B2733',
          light: '#FFFFFF'
        }
      }, (err) => {
        if (err) console.error('Erro ao renderizar QR Code:', err);
      });
      return;
    }

    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
  }

  function openCheckoutModal() {
    if (!currentAlbum || currentAlbum.phase !== 'proofing' || !els.chkDialog) return;
    const calc = window.AlbumsStore.calculateSelectionPricing(currentAlbum);
    if (calc.selectedCount === 0) {
      showToast('Selecione ao menos uma fotografia antes de concluir.');
      return;
    }

    if (els.chkIncludedVal) {
      els.chkIncludedVal.textContent = `${calc.includedSelected} de ${calc.packageIncluded} fotos (incluso)`;
    }
    if (els.chkExtraLabel) {
      els.chkExtraLabel.textContent = calc.hasExtras
        ? `Fotografias extras (${calc.extraCount} × ${formatBRL(calc.extraPhotoPrice)})`
        : 'Fotografias extras';
    }
    if (els.chkExtraVal) els.chkExtraVal.textContent = formatBRL(calc.extraTotal);
    if (els.chkTotalVal) els.chkTotalVal.textContent = formatBRL(calc.extraTotal);
    if (els.chkThumbsLabel) els.chkThumbsLabel.textContent = `Fotografias escolhidas (${calc.selectedCount})`;

    const selectedSet = new Set(calc.selectedIds);
    const chosen = (currentAlbum.photos || []).filter((p) => selectedSet.has(p.id));
    if (els.chkThumbsStrip) {
      els.chkThumbsStrip.innerHTML = chosen.map((p) => `
        <img src="${escapeHtml(getPhotoPrimarySrc(currentAlbum, p))}" alt="${escapeHtml(p.filename)}" width="52" height="52" />
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

    const directPayload = window.AlbumsStore.generatePixPayload({
      pixKey: payCfg.pixKey || 'contato@instantesdecarly.com.br',
      merchantName: payCfg.merchantName || brand.studioName,
      merchantCity: payCfg.merchantCity || brand.city,
      amount: calc.extraTotal,
      txid
    });

    const rawDirectKey = payCfg.pixKey || 'contato@instantesdecarly.com.br';
    const digitsKey = rawDirectKey.replace(/\D/g, '');
    let displayDirectKey = rawDirectKey;
    if (digitsKey.length === 11 && !rawDirectKey.includes('@')) {
      displayDirectKey = `(${digitsKey.slice(0, 2)}) ${digitsKey.slice(2, 7)}-${digitsKey.slice(7)}`;
    }
    if (els.directPixKeyLabel) els.directPixKeyLabel.textContent = displayDirectKey;
    if (els.directPixCode) els.directPixCode.value = directPayload;
    renderQrMatrix(els.directQrCanvas, directPayload);

    if (!isLocalEnv) {
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            albumId: currentAlbum.id,
            slug: currentAlbum.slug,
            clientName: currentAlbum.clientName,
            clientEmail: currentAlbum.clientEmail,
            packageIncluded: calc.packageIncluded,
            extraPrice: calc.extraPhotoPrice,
            extraCount: calc.extraCount,
            totalAmount: calc.extraTotal,
            selectedPhotoIds: calc.selectedIds
          })
        });
        const data = await res.json();
        if (res.ok && data.pixCopyPaste) {
          if (els.mpPixCode) els.mpPixCode.value = data.pixCopyPaste;
          if (data.pixQrBase64) {
            const qrImg = new Image();
            qrImg.onload = () => {
              const ctx = els.mpQrCanvas?.getContext('2d');
              if (ctx && els.mpQrCanvas) {
                ctx.clearRect(0, 0, els.mpQrCanvas.width, els.mpQrCanvas.height);
                ctx.drawImage(qrImg, 0, 0, els.mpQrCanvas.width, els.mpQrCanvas.height);
              }
            };
            qrImg.src = `data:image/png;base64,${data.pixQrBase64}`;
          } else {
            renderQrMatrix(els.mpQrCanvas, data.pixCopyPaste);
          }
          if (els.btnMpCardLink && data.checkoutUrl) {
            els.btnMpCardLink.onclick = () => window.open(data.checkoutUrl, '_blank', 'noopener');
          }
          return;
        }
      } catch (_) {}
    }

    const mpSimulated = window.AlbumsStore.generatePixPayload({
      pixKey: 'mercadopago@instantesdecarly.com.br',
      merchantName: payCfg.merchantName || brand.studioName,
      merchantCity: payCfg.merchantCity || brand.city,
      amount: calc.extraTotal,
      txid: `MP${txid.slice(0, 18)}`
    });
    if (els.mpPixCode) els.mpPixCode.value = mpSimulated;
    renderQrMatrix(els.mpQrCanvas, mpSimulated);
    if (els.mpLocalSimBox) els.mpLocalSimBox.hidden = !isLocalEnv;
  }

  async function finalizeFreeSelection() {
    const calc = window.AlbumsStore.calculateSelectionPricing(currentAlbum);
    const brand = window.AlbumsStore.getBrandDefaults();
    const orderCode = `SEL-${Date.now().toString().slice(-5)}`;

    currentAlbum.selectionLocked = true;
    currentAlbum.status = 'selection_completed';
    currentAlbum.paymentOrder = {
      id: orderCode,
      method: 'free_package',
      status: 'approved',
      extraCount: 0,
      unitPrice: 0,
      totalAmount: 0,
      createdAt: new Date().toISOString()
    };
    currentAlbum.activityLog = currentAlbum.activityLog || [];
    currentAlbum.activityLog.unshift({
      at: new Date().toISOString(),
      type: 'selection',
      text: `Seleção concluída dentro do pacote (${calc.selectedCount} fotografias).`
    });

    await window.AlbumsStore.saveState(rootState);
    els.chkDialog?.close();
    updateProofingChrome(currentAlbum);
    renderMasonryWall(currentAlbum);
    showToast('Seleção confirmada com sucesso!');

    // Sincroniza em nuvem para o painel admin do fotógrafo em tempo real
    try {
      fetch('/api/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: currentAlbum.id,
          slug: currentAlbum.slug,
          clientName: currentAlbum.clientName,
          selectedIds: currentAlbum.selectedIds,
          photoComments: currentAlbum.photoComments,
          status: 'selection_completed',
          method: 'free_package',
          orderCode,
          totalAmount: 0,
          extraCount: 0
        })
      }).catch(() => {});
    } catch (_) {}

    const selectedList = (currentAlbum.selectedIds || []).map((id, idx) => {
      const p = (currentAlbum.photos || []).find((x) => x.id === id);
      return `${idx + 1}. ${p?.filename || id}`;
    }).slice(0, 15).join('\n');

    const msg = `Olá ${brand.shortName}! Concluí a escolha das ${calc.selectedCount} fotografias do meu ensaio "${currentAlbum.clientName}". Minha seleção já está pronta para edição final!\n\n📸 *Fotografias Escolhidas:*\n${selectedList}`;
    window.open(`https://wa.me/${brand.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  }

  async function finalizeMercadoPagoApproved(label = 'Mercado Pago Pix') {
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
      text: `Pagamento confirmado (${label}): ${formatBRL(calc.extraTotal)} por ${calc.extraCount} extras. Total: ${calc.selectedCount} fotos.`
    });

    await window.AlbumsStore.saveState(rootState);
    els.chkDialog?.close();
    updateProofingChrome(currentAlbum);
    renderMasonryWall(currentAlbum);
    showToast('Pagamento aprovado. Seleção liberada para edição.');

    // Sincroniza em nuvem
    try {
      fetch('/api/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: currentAlbum.id,
          slug: currentAlbum.slug,
          clientName: currentAlbum.clientName,
          selectedIds: currentAlbum.selectedIds,
          photoComments: currentAlbum.photoComments,
          status: 'selection_paid',
          method: 'mercadopago',
          orderCode: currentAlbum.paymentOrder.id,
          totalAmount: calc.extraTotal,
          extraCount: calc.extraCount
        })
      }).catch(() => {});
    } catch (_) {}
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
      text: `Seleção concluída (${calc.selectedCount} fotos) via Pix Direto (${formatBRL(calc.extraTotal)}) — aguardando comprovante (${orderCode}).`
    });

    await window.AlbumsStore.saveState(rootState);
    els.chkDialog?.close();
    updateProofingChrome(currentAlbum);
    renderMasonryWall(currentAlbum);

    // Sincroniza em nuvem para o painel admin do fotógrafo em tempo real
    try {
      fetch('/api/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: currentAlbum.id,
          slug: currentAlbum.slug,
          clientName: currentAlbum.clientName,
          selectedIds: currentAlbum.selectedIds,
          photoComments: currentAlbum.photoComments,
          status: 'awaiting_pix_confirm',
          method: 'direct_pix',
          orderCode,
          totalAmount: calc.extraTotal,
          extraCount: calc.extraCount
        })
      }).catch(() => {});
    } catch (_) {}

    const selectedList = (currentAlbum.selectedIds || []).map((id, idx) => {
      const p = (currentAlbum.photos || []).find((x) => x.id === id);
      return `${idx + 1}. ${p?.filename || id}`;
    }).slice(0, 15).join('\n');

    const msg = `Olá ${brand.shortName}! Concluí a seleção do álbum "${currentAlbum.clientName}" (${calc.selectedCount} fotos no total, sendo ${calc.extraCount} extras = ${formatBRL(calc.extraTotal)}).\n\n📸 *Fotografias Escolhidas:*\n${selectedList}\n\nSegue o comprovante do Pix (${orderCode}).`;
    window.open(`https://wa.me/${brand.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  }

  /* ==========================================================================
     8. DOWNLOAD COM PIN (BLOQUEADO POR CÓDIGO SE NÃO FOR 'delivery')
     ========================================================================== */
  function isPinVerifiedForSession(album) {
    if (album.pinEnabled === false || !album.downloadPin) return true;
    try {
      return sessionStorage.getItem(`dl_pin_ok_${album.id}`) === album.downloadPin;
    } catch (_) {
      return false;
    }
  }

  function openDownloadDialog(singlePhoto = null) {
    if (!currentAlbum || currentAlbum.phase !== 'delivery' || !els.dlDialog) return;
    pendingDownloadTarget = singlePhoto;

    if (els.dlTitle) {
      els.dlTitle.textContent = singlePhoto
        ? `Baixar ${singlePhoto.filename}`
        : `Baixar álbum completo (${(currentAlbum.photos || []).length} fotos)`;
    }

    const needPin = !isPinVerifiedForSession(currentAlbum);
    if (els.dlPinGroup) els.dlPinGroup.hidden = !needPin;
    if (els.dlPinError) els.dlPinError.hidden = true;
    if (els.dlPinInput) els.dlPinInput.value = '';
    if (els.dlProgressBox) els.dlProgressBox.hidden = true;
    if (els.btnStartDownload) els.btnStartDownload.disabled = false;

    els.dlDialog.showModal();
  }

  async function executeDownloadFlow() {
    if (!currentAlbum || currentAlbum.phase !== 'delivery') return;

    if (!isPinVerifiedForSession(currentAlbum)) {
      const typed = (els.dlPinInput?.value || '').trim();
      if (typed !== String(currentAlbum.downloadPin).trim()) {
        if (els.dlPinError) els.dlPinError.hidden = false;
        els.dlPinInput?.focus();
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
    if (els.dlProgressBar) els.dlProgressBar.style.width = '10%';

    try {
      if (pendingDownloadTarget) {
        if (els.dlProgressText) els.dlProgressText.textContent = `Preparando ${pendingDownloadTarget.filename}…`;
        const bytes = await window.AlbumsStore.fetchImageAsBytes(pendingDownloadTarget.originalSrc, resMode);
        if (els.dlProgressBar) els.dlProgressBar.style.width = '100%';
        triggerBlobDownload(new Blob([bytes], { type: 'image/jpeg' }), pendingDownloadTarget.filename);
        await registerDownloadLog(`Download individual: ${pendingDownloadTarget.filename} (${resLabel}).`);
      } else {
        const photos = currentAlbum.photos || [];
        const zipEntries = [];
        for (let i = 0; i < photos.length; i++) {
          const p = photos[i];
          if (els.dlProgressText) {
            els.dlProgressText.textContent = `Compactando fotografia ${i + 1} de ${photos.length}…`;
          }
          const bytes = await window.AlbumsStore.fetchImageAsBytes(p.originalSrc, resMode);
          zipEntries.push({ name: p.filename, data: bytes });
          if (els.dlProgressBar) els.dlProgressBar.style.width = `${Math.round(((i + 1) / photos.length) * 92)}%`;
        }
        const zipBlob = window.AlbumsStore.buildZipBlob(zipEntries);
        if (els.dlProgressBar) els.dlProgressBar.style.width = '100%';
        triggerBlobDownload(zipBlob, `${currentAlbum.slug}-${resMode === 'high' ? 'alta-resolucao' : 'web'}.zip`);
        await registerDownloadLog(`Cliente baixou álbum completo .ZIP (${photos.length} fotos · ${resLabel}).`);
      }

      showToast('Download iniciado.');
      setTimeout(() => els.dlDialog?.close(), 450);
    } catch (err) {
      showToast('Erro ao gerar download: ' + err.message);
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
    currentAlbum.activityLog.unshift({ at: new Date().toISOString(), type: 'download', text });
    await window.AlbumsStore.saveState(rootState);
  }

  /* ==========================================================================
     9. EVENTOS E BOOTSTRAP
     ========================================================================== */
  function bindEvents() {
    els.portalForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const parsedSlug = window.AlbumsStore.parseAlbumSlugFromInput(els.portalSlugIn?.value);
      const found = (rootState.albums || []).find(
        (a) => (a.slug && a.slug.toLowerCase() === parsedSlug) || (a.id && a.id.toLowerCase() === parsedSlug)
      );
      if (!found) {
        if (els.portalError) {
          els.portalError.hidden = false;
          els.portalError.textContent = 'Álbum não encontrado. Confira o link ou código recebido no seu WhatsApp.';
        }
        els.portalSlugIn?.focus();
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
      } else {
        if (els.pwError) els.pwError.hidden = false;
        els.pwInput?.focus();
      }
    });

    const scrollDownToGallery = () => {
      const target = els.topbar || document.getElementById('main-stage') || els.grid;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
      }
    };

    els.btnScrollGallery?.addEventListener('click', scrollDownToGallery);
    els.btnCoverScrollDown?.addEventListener('click', scrollDownToGallery);

    els.btnFinishTop?.addEventListener('click', openCheckoutModal);
    els.btnFinishDock?.addEventListener('click', openCheckoutModal);
    els.btnDeliveryZip?.addEventListener('click', () => openDownloadDialog(null));

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
      renderFilterTabs(currentAlbum);
      renderMasonryWall(currentAlbum);
      showToast('Observação salva.');
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
      showToast('Código Pix copiado.');
    });
    els.btnCopyDirectPix?.addEventListener('click', () => {
      navigator.clipboard?.writeText(els.directPixCode?.value || '');
      showToast('Código Pix copiado.');
    });
    els.btnMpCardLink?.addEventListener('click', () => {
      if (isLocalEnv) finalizeMercadoPagoApproved('Mercado Pago Cartão');
    });
    els.btnConfirmFree?.addEventListener('click', finalizeFreeSelection);
    els.btnSimulateWebhook?.addEventListener('click', () => finalizeMercadoPagoApproved('Mercado Pago Pix'));
    els.btnConfirmDirectPix?.addEventListener('click', finalizeDirectPixWithWhatsapp);

    // Download Modal
    els.dlClose?.addEventListener('click', () => els.dlDialog?.close());
    document.querySelectorAll('input[name="dl-res"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        document.querySelectorAll('.res-option').forEach((card) => {
          card.classList.toggle('active', card.contains(radio) && radio.checked);
        });
      });
    });
    els.btnStartDownload?.addEventListener('click', executeDownloadFlow);
  }

  let lastGalleryRevalidateAt = 0;
  async function revalidateGalleryDataFromServer() {
    const now = Date.now();
    if (now - lastGalleryRevalidateAt < 8000) return;
    lastGalleryRevalidateAt = now;

    try {
      const res = await fetch(`assets/js/data.js?t=${now}`, { cache: 'no-store' });
      if (!res.ok) return;
      const text = await res.text();
      let freshData = null;
      try {
        const fn = new Function(`${text}; return typeof SITE_DATA !== 'undefined' ? SITE_DATA : null;`);
        freshData = fn();
      } catch (_) {}
      if (!freshData || typeof freshData !== 'object') return;

      const freshVer = String(freshData.cmsVersion || '');
      const curVer = String((window.SITE_DATA && window.SITE_DATA.cmsVersion) || '');
      if (!freshVer || freshVer <= curVer) return;

      window.SITE_DATA = freshData;
      rootState = await window.AlbumsStore.loadState();
      if (currentAlbum) {
        const updated = (rootState.albums || []).find(
          (a) => a.id === currentAlbum.id || (a.slug && a.slug.toLowerCase() === currentAlbum.slug.toLowerCase())
        );
        if (updated) {
          currentAlbum = updated;
          runtimeProofMap.clear();
          if (isAlbumUnlocked(currentAlbum)) {
            await openAlbumExperience(currentAlbum);
            if (els.lbDialog?.open) refreshLightboxUI();
          } else {
            renderPasswordGate(currentAlbum);
          }
        }
      }
    } catch (_) {}
  }

  async function boot() {
    hydrateBrandStrings();
    setupAntiCopyProtection();
    setupGridTouchSpotlight();
    setupLightboxProtectionLens();
    bindEvents();

    rootState = await window.AlbumsStore.loadState();

    // Sincronização BroadcastChannel entre abas abertas no mesmo aparelho em 0 segundos
    try {
      const syncChannel = new BroadcastChannel('instantes_carly_cms_sync');
      syncChannel.onmessage = async (e) => {
        if (e.data && e.data.type === 'CMS_PUBLISHED' && e.data.payload) {
          window.SITE_DATA = e.data.payload;
          rootState = await window.AlbumsStore.loadState();
          if (currentAlbum) {
            const updated = (rootState.albums || []).find(
              (a) => a.id === currentAlbum.id || (a.slug && a.slug.toLowerCase() === currentAlbum.slug.toLowerCase())
            );
            if (updated) {
              currentAlbum = updated;
              runtimeProofMap.clear();
              if (isAlbumUnlocked(currentAlbum)) {
                await openAlbumExperience(currentAlbum);
                if (els.lbDialog?.open) refreshLightboxUI();
              } else {
                renderPasswordGate(currentAlbum);
              }
            }
          }
        }
      };
    } catch (_) {}

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') revalidateGalleryDataFromServer();
    });
    window.addEventListener('focus', revalidateGalleryDataFromServer);
    setInterval(revalidateGalleryDataFromServer, 12000);

    window.AlbumsStore.subscribe(async () => {
      rootState = await window.AlbumsStore.loadState();
      if (currentAlbum) {
        const updated = (rootState.albums || []).find((a) => a.id === currentAlbum.id);
        if (updated && isAlbumUnlocked(updated)) {
          await openAlbumExperience(updated);
          if (els.lbDialog?.open) refreshLightboxUI();
        }
      }
    });

    // Sincronização instantânea ao vivo em 0ms enquanto a fotógrafa digita no Painel Admin
    window.addEventListener('message', (event) => {
      if (!event.data) return;
      if (event.data.type === 'SCROLL_TO_SECTION') {
        if (event.data.section === 'grid' || event.data.section === 'topbar') {
          document.getElementById('gallery-topbar')?.scrollIntoView({ behavior: 'smooth' });
        } else if (event.data.section === 'cover') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }
      if (event.data.type === 'WATERMARK_LIVE_UPDATE') {
        if (event.data.watermarkConfig) {
          rootState.watermarkConfig = event.data.watermarkConfig;
        }
        runtimeProofMap.clear();
        if (currentAlbum) {
          renderMasonryGrid(currentAlbum);
          if (els.lbDialog?.open) refreshLightboxUI();
        }
        return;
      }
      if (event.data.type !== 'ALBUM_LIVE_UPDATE') return;
      const alb = event.data.album;
      if (!alb) return;
      if (!currentAlbum) currentAlbum = alb;
      Object.assign(currentAlbum, alb);
      const isInsideIframe = window.self !== window.top;
      const isProof = currentAlbum.phase === 'proofing';
      const coverStyle = currentAlbum.design?.coverStyle || 'centro';
      const shouldShowCover = (!isProof || isDesignPreview || isInsideIframe) && coverStyle !== 'none';
      if (els.deliveryHero) {
        els.deliveryHero.hidden = !shouldShowCover;
        els.deliveryHero.setAttribute('data-cover', coverStyle);
      }
      applyAlbumDesign(currentAlbum);
      hydrateCoverHero(currentAlbum);
      if (currentAlbum.phase === 'delivery') {
        updateDeliveryChrome(currentAlbum);
      } else {
        updateProofingChrome(currentAlbum);
      }
    });

    if (!initialSlug) {
      renderPortalView();
      return;
    }

    const isMatchingSlug = (a, s) => {
      if (!a || !s) return false;
      const target = s.toLowerCase().trim();
      const slug = (a.slug || '').toLowerCase().trim();
      const id = (a.id || '').toLowerCase().trim();
      if (slug === target || id === target) return true;
      const cleanTarget = target.replace(/[^a-z0-9]/g, '');
      const cleanSlug = slug.replace(/[^a-z0-9]/g, '');
      if (cleanTarget === cleanSlug) return true;
      if ((cleanTarget === 'yangordinho' && cleanSlug === 'yangordin') || (cleanTarget === 'yangordin' && cleanSlug === 'yangordinho')) return true;
      return false;
    };

    let found = (rootState.albums || []).find((a) => isMatchingSlug(a, initialSlug));

    // Fallback inteligente para álbuns centrais publicados via SITE_DATA
    const activeSiteData = typeof SITE_DATA !== 'undefined'
      ? SITE_DATA
      : (typeof window !== 'undefined' && window.SITE_DATA ? window.SITE_DATA : null);
    if (!found && activeSiteData && Array.isArray(activeSiteData.clientAlbums)) {
      found = activeSiteData.clientAlbums.find((a) => isMatchingSlug(a, initialSlug));
      if (found) {
        rootState.albums = rootState.albums || [];
        rootState.albums.push(found);
        window.AlbumsStore.saveState(rootState, { silent: true });
      }
    }

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
