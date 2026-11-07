/**
 * Instantes de Carly — Interatividade Editorial, Cinema Hero, Hidratação CMS & Galeria Curatorial
 */

let heroCinemaController = null;
let reviewsController = null;
let currentCategory = 'todos';
let visiblePhotos = [];
let currentLightboxIndex = 0;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ==========================================================================
   0. INTEGRAÇÃO COM PAINEL ADMIN (PREVIEW EM TEMPO REAL + RASCUNHO LOCAL)
   ========================================================================== */
function openCmsIndexedDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('IndexedDB indisponível'));
    const req = indexedDB.open('instantes_carly_cms_db', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('snapshots')) {
        db.createObjectStore('snapshots');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadLocalPublishedDataIfDev() {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const params = new URLSearchParams(window.location.search);
  const isCmsPreview = params.get('cmsPreview') === '1';

  if (!isLocal && !isCmsPreview) return;

  try {
    const db = await openCmsIndexedDB();
    const keyToRead = isCmsPreview ? 'draft_working' : 'local_published';
    const record = await new Promise((resolve) => {
      const tx = db.transaction('snapshots', 'readonly');
      const store = tx.objectStore('snapshots');
      const getReq = store.get(keyToRead);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => resolve(null);
    });

    if (record && record.data && typeof record.data === 'object') {
      applyIncomingSiteData(record.data, false);
    } else if (isCmsPreview) {
      // Fallback para local_published se draft_working ainda não existir
      const pubRecord = await new Promise((resolve) => {
        const tx = db.transaction('snapshots', 'readonly');
        const getReq = tx.objectStore('snapshots').get('local_published');
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      });
      if (pubRecord && pubRecord.data) {
        applyIncomingSiteData(pubRecord.data, false);
      }
    }
  } catch (err) {
    // Segue normalmente com o SITE_DATA estático do data.js
  }
}

function applyIncomingSiteData(newData, isLiveUpdate = true) {
  if (!newData || typeof newData !== 'object') return;

  Object.keys(newData).forEach((k) => {
    SITE_DATA[k] = newData[k];
  });

  hydrateSiteContent();

  if (heroCinemaController) {
    heroCinemaController.rebuild();
  }
  renderPortfolioFiltersAndGrid(currentCategory);
  initPackages();
  syncContactServiceDropdown();

  if (isLiveUpdate && reviewsController) {
    reviewsController.refreshMeta();
  }
}

function initCmsPreviewBridge() {
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'CMS_LIVE_UPDATE' && msg.payload) {
      applyIncomingSiteData(msg.payload, true);
    } else if (msg.type === 'CMS_SCROLL_TO' && msg.selector) {
      const target = document.querySelector(msg.selector);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (msg.type === 'CMS_HERO_SELECT_SLIDE' && typeof msg.slideIndex === 'number') {
      document.getElementById('inicio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (heroCinemaController) {
        heroCinemaController.selectSlide(msg.slideIndex);
      }
    }
  });
}

/* ==========================================================================
   0.1 HIDRATAÇÃO COMPLETA DE TEXTOS, LINKS E FOTOS DE TODAS AS SEÇÕES
   ========================================================================== */
function setTitleWithItalic(el, line1, highlight, useLineBreak = false) {
  if (!el) return;
  const sep = useLineBreak ? '<br />' : ' ';
  el.innerHTML = `${escapeHtml(line1 || '')}${highlight ? `${sep}<em>${escapeHtml(highlight)}</em>` : ''}`;
}

function hydrateSiteContent() {
  const brand = SITE_DATA.brand || {};
  const sec = SITE_DATA.sections || {};

  // Cabeçalho & Identidade
  document.querySelectorAll('.logo-on-dark, .footer-logo-img, .about-badge-card img').forEach((img) => {
    if (brand.logoLight) img.src = brand.logoLight;
  });
  document.querySelectorAll('.logo-on-light').forEach((img) => {
    if (brand.logoDark) img.src = brand.logoDark;
  });
  const headerCta = document.querySelector('.btn-header-cta');
  if (headerCta && brand.headerCtaText) {
    headerCta.textContent = brand.headerCtaText;
  }

  // 00. Hero
  if (sec.hero) {
    const h = sec.hero;
    const kickerText = document.querySelector('.hero-kicker-text');
    if (kickerText && h.kickerText !== undefined) kickerText.textContent = h.kickerText;

    setTitleWithItalic(document.getElementById('hero-title'), h.titleLine1, h.titleHighlight, true);

    const heroLead = document.querySelector('.hero-cinema-lead');
    if (heroLead && h.leadText !== undefined) {
      const highlightName = brand.founderHighlight || 'Carliane Carvalho';
      let safeLead = escapeHtml(h.leadText);
      const safeName = escapeHtml(highlightName);
      if (safeName && safeLead.includes(safeName)) {
        safeLead = safeLead.replace(safeName, `<strong>${safeName}</strong>`);
      }
      heroLead.innerHTML = safeLead;
    }

    const primaryBtnSpan = document.querySelector('.btn-hero-primary span');
    if (primaryBtnSpan && h.primaryBtnText) primaryBtnSpan.textContent = h.primaryBtnText;

    const secondaryBtnSpan = document.querySelector('.btn-hero-glass span');
    if (secondaryBtnSpan && h.secondaryBtnText) secondaryBtnSpan.textContent = h.secondaryBtnText;
  }

  // 01. Proposta
  if (sec.proposta) {
    const p = sec.proposta;
    const propSec = document.getElementById('proposta');
    if (propSec) {
      const rIdx = propSec.querySelector('.rule-index');
      const rMeta = propSec.querySelector('.rule-meta');
      const tag = propSec.querySelector('.section-tag');
      const quote = propSec.querySelector('.spread-pullquote');
      const prose = propSec.querySelector('.spread-prose');
      const img1 = propSec.querySelector('.diptych-primary img');
      const img2 = propSec.querySelector('.diptych-secondary img');
      const capSpans = propSec.querySelectorAll('.diptych-caption span');
      const matrix = propSec.querySelector('.pillars-editorial-matrix');

      if (rIdx && p.ruleIndex) rIdx.textContent = p.ruleIndex;
      if (rMeta && p.ruleMeta) rMeta.textContent = p.ruleMeta;
      if (tag && p.tag) tag.textContent = p.tag;
      setTitleWithItalic(document.getElementById('intro-title'), p.titleLine1, p.titleHighlight, true);
      if (quote && p.pullquote !== undefined) quote.textContent = p.pullquote;

      if (prose && Array.isArray(p.paragraphs)) {
        prose.innerHTML = p.paragraphs
          .filter((txt) => txt && txt.trim())
          .map((txt) => `<p>${escapeHtml(txt)}</p>`)
          .join('');
      }

      if (img1 && p.primaryPhoto) {
        img1.src = p.primaryPhoto;
        if (p.primaryPhotoFocal) img1.style.objectPosition = p.primaryPhotoFocal;
      }
      if (img2 && p.secondaryPhoto) {
        img2.src = p.secondaryPhoto;
        if (p.secondaryPhotoFocal) img2.style.objectPosition = p.secondaryPhotoFocal;
      }
      if (capSpans[0] && p.captionLeft !== undefined) capSpans[0].textContent = p.captionLeft;
      if (capSpans[1] && p.captionRight !== undefined) capSpans[1].textContent = p.captionRight;

      if (matrix && Array.isArray(p.pillars)) {
        matrix.innerHTML = p.pillars.map((pil) => `
          <article class="pillar-cell">
            <span class="pillar-num">${escapeHtml(pil.num)}</span>
            <h3>${escapeHtml(pil.title)}</h3>
            <p>${escapeHtml(pil.description)}</p>
          </article>
        `).join('');
      }
    }
  }

  // 02. Portfólio Cabeçalho
  if (sec.portfolioSection) {
    const ps = sec.portfolioSection;
    const portSec = document.getElementById('portfolio');
    if (portSec) {
      const rIdx = portSec.querySelector('.rule-index');
      const tag = portSec.querySelector('.section-tag');
      const desc = portSec.querySelector('.portfolio-header-desc');
      if (rIdx && ps.ruleIndex) rIdx.textContent = ps.ruleIndex;
      if (tag && ps.tag) tag.textContent = ps.tag;
      setTitleWithItalic(document.getElementById('portfolio-title'), ps.titleLine1, ps.titleHighlight, false);
      if (desc && ps.description !== undefined) desc.textContent = ps.description;
    }
  }

  // 03. Abordagem
  if (sec.abordagem) {
    const ab = sec.abordagem;
    const abSec = document.getElementById('humanizada');
    if (abSec) {
      const rIdx = abSec.querySelector('.rule-index');
      const rMeta = abSec.querySelector('.rule-meta');
      const tag = abSec.querySelector('.section-tag');
      const intros = abSec.querySelectorAll('.humanized-intro');
      const movList = abSec.querySelector('.movements-list');
      const mainImg = abSec.querySelector('.humanized-main-photo img');
      const insetImg = abSec.querySelector('.humanized-inset-photo img');
      const qCardP = abSec.querySelector('.humanized-quote-card p');
      const qCardSpan = abSec.querySelector('.humanized-quote-card span');

      if (rIdx && ab.ruleIndex) rIdx.textContent = ab.ruleIndex;
      if (rMeta && ab.ruleMeta) rMeta.textContent = ab.ruleMeta;
      if (tag && ab.tag) tag.textContent = ab.tag;
      setTitleWithItalic(document.getElementById('humanized-title'), ab.titleLine1, ab.titleHighlight, false);

      if (intros[0] && ab.introParagraph1 !== undefined) intros[0].textContent = ab.introParagraph1;
      if (intros[1] && ab.introParagraph2 !== undefined) intros[1].textContent = ab.introParagraph2;

      if (movList && Array.isArray(ab.movements)) {
        movList.innerHTML = ab.movements.map((m) => `
          <div class="movement-item">
            <div class="movement-index">${escapeHtml(m.num)}</div>
            <div class="movement-body">
              <h3>${escapeHtml(m.title)}</h3>
              <p>${escapeHtml(m.description)}</p>
            </div>
          </div>
        `).join('');
      }

      if (mainImg && ab.mainPhoto) {
        mainImg.src = ab.mainPhoto;
        if (ab.mainPhotoFocal) mainImg.style.objectPosition = ab.mainPhotoFocal;
      }
      if (insetImg && ab.insetPhoto) {
        insetImg.src = ab.insetPhoto;
        if (ab.insetPhotoFocal) insetImg.style.objectPosition = ab.insetPhotoFocal;
      }
      if (qCardP && ab.quoteText !== undefined) qCardP.textContent = ab.quoteText;
      if (qCardSpan && ab.quoteAuthor !== undefined) qCardSpan.textContent = ab.quoteAuthor;
    }
  }

  // 04. Experiências
  if (sec.experiencias) {
    const ex = sec.experiencias;
    const exSec = document.getElementById('servicos');
    if (exSec) {
      const rIdx = exSec.querySelector('.rule-index');
      const rMeta = exSec.querySelector('.rule-meta');
      const tag = exSec.querySelector('.section-tag');
      const desc = exSec.querySelector('.services-header-desc');
      const barP = exSec.querySelector('.packages-concise-bar p');
      const barBtn = exSec.querySelector('.packages-concise-bar a');
      const barBtnSpan = exSec.querySelector('.packages-concise-bar a span');

      if (rIdx && ex.ruleIndex) rIdx.textContent = ex.ruleIndex;
      if (rMeta && ex.ruleMeta) rMeta.textContent = ex.ruleMeta;
      if (tag && ex.tag) tag.textContent = ex.tag;
      setTitleWithItalic(document.getElementById('services-title'), ex.titleLine1, ex.titleHighlight, false);
      if (desc && ex.description !== undefined) desc.textContent = ex.description;

      if (barP) {
        barP.innerHTML = `<strong>${escapeHtml(ex.conciseBarTitle || '')}</strong> ${escapeHtml(ex.conciseBarText || '')}`;
      }
      if (barBtn && brand.whatsappNumber) {
        const msg = encodeURIComponent(ex.conciseBarWhatsappMsg || 'Olá Carly! Vi os formatos e valores no site e gostaria de tirar uma dúvida.');
        barBtn.href = `https://wa.me/${brand.whatsappNumber}?text=${msg}`;
      }
      if (barBtnSpan && ex.conciseBarBtnText) {
        barBtnSpan.textContent = ex.conciseBarBtnText;
      }
    }
  }

  // 05. Sobre Carly
  if (sec.sobre) {
    const sb = sec.sobre;
    const sbSec = document.getElementById('sobre');
    if (sbSec) {
      const rIdx = sbSec.querySelector('.rule-index');
      const rMeta = sbSec.querySelector('.rule-meta');
      const tag = sbSec.querySelector('.section-tag');
      const lead = sbSec.querySelector('.about-lead');
      const profileImg = sbSec.querySelector('.about-frame img');
      const badgeH4 = sbSec.querySelector('.about-badge-card h4');
      const badgeP = sbSec.querySelector('.about-badge-card p');
      const paras = sbSec.querySelector('.about-paragraphs');
      const pilGrid = sbSec.querySelector('.about-pillars-grid');
      const ethics = sbSec.querySelector('.about-ethics-box');

      if (rIdx && sb.ruleIndex) rIdx.textContent = sb.ruleIndex;
      if (rMeta && sb.ruleMeta) rMeta.textContent = sb.ruleMeta;
      if (tag && sb.tag) tag.textContent = sb.tag;
      setTitleWithItalic(document.getElementById('about-title'), sb.titleLine1, sb.titleHighlight, false);
      if (lead && sb.lead !== undefined) lead.textContent = sb.lead;

      if (profileImg && sb.profilePhoto) {
        profileImg.src = sb.profilePhoto;
        if (sb.profilePhotoFocal) profileImg.style.objectPosition = sb.profilePhotoFocal;
      }
      if (badgeH4 && sb.badgeName !== undefined) badgeH4.textContent = sb.badgeName;
      if (badgeP && sb.badgeRole !== undefined) badgeP.textContent = sb.badgeRole;

      if (paras && Array.isArray(sb.paragraphs)) {
        paras.innerHTML = sb.paragraphs
          .filter((txt) => txt && txt.trim())
          .map((txt) => `<p>${escapeHtml(txt)}</p>`)
          .join('');
      }

      if (pilGrid && Array.isArray(sb.pillars)) {
        pilGrid.innerHTML = sb.pillars.map((pil) => `
          <div class="about-pillar-item">
            <h4>${escapeHtml(pil.title)}</h4>
            <p>${escapeHtml(pil.description)}</p>
          </div>
        `).join('');
      }

      if (ethics) {
        ethics.innerHTML = `<strong>${escapeHtml(sb.ethicsTitle || '')}</strong> ${escapeHtml(sb.ethicsText || '')}`;
      }
    }
  }

  // 06. Avaliações
  if (sec.avaliacoes) {
    const av = sec.avaliacoes;
    const avSec = document.getElementById('avaliacoes');
    if (avSec) {
      const rIdx = avSec.querySelector('.rule-index');
      const tag = avSec.querySelector('.reviews-header-row .section-tag');
      if (rIdx && av.ruleIndex) rIdx.textContent = av.ruleIndex;
      if (tag && av.tag) tag.textContent = av.tag;
      setTitleWithItalic(document.getElementById('reviews-title'), av.titleLine1, av.titleHighlight, false);
    }
  }

  if (SITE_DATA.googleReviews) {
    const gr = SITE_DATA.googleReviews;
    const badgeLink = document.querySelector('.google-rating-badge-card');
    const reviewBtn = document.querySelector('.google-rating-actions a');
    if (badgeLink && gr.googleProfileUrl) badgeLink.href = gr.googleProfileUrl;
    if (reviewBtn && gr.googleReviewFormUrl) reviewBtn.href = gr.googleReviewFormUrl;
  }

  // 07. Contato & Rodapé
  if (sec.contato) {
    const ct = sec.contato;
    const ctSec = document.getElementById('contato');
    if (ctSec) {
      const rIdx = ctSec.querySelector('.rule-index');
      const rMeta = ctSec.querySelector('.rule-meta');
      const tag = ctSec.querySelector('.section-tag');
      const lead = ctSec.querySelector('.contact-lead');
      const channels = ctSec.querySelectorAll('.contact-channels-editorial .channel-row');
      const note = ctSec.querySelector('.contact-editorial-note');
      const formKicker = ctSec.querySelector('.form-kicker');
      const formH3 = ctSec.querySelector('.form-header h3');
      const formP = ctSec.querySelector('.form-header p');
      const submitSpan = ctSec.querySelector('.btn-submit-editorial span');

      if (rIdx && ct.ruleIndex) rIdx.textContent = ct.ruleIndex;
      if (rMeta && ct.ruleMeta) rMeta.textContent = ct.ruleMeta;
      if (tag && ct.tag) tag.textContent = ct.tag;
      setTitleWithItalic(document.getElementById('contact-title'), ct.titleLine1, ct.titleHighlight, false);
      if (lead && ct.lead !== undefined) lead.textContent = ct.lead;

      // Canal 1: WhatsApp
      if (channels[0]) {
        if (brand.whatsappNumber) {
          channels[0].href = `https://wa.me/${brand.whatsappNumber}?text=${encodeURIComponent('Olá Carly! Gostaria de conversar sobre um ensaio.')}`;
        }
        const val = channels[0].querySelector('.channel-value');
        if (val && brand.whatsappFormatted) val.textContent = brand.whatsappFormatted;
      }
      // Canal 2: Instagram
      if (channels[1]) {
        if (brand.instagramUrl) channels[1].href = brand.instagramUrl;
        const val = channels[1].querySelector('.channel-value');
        if (val && brand.instagram) val.textContent = brand.instagram;
      }
      // Canal 3: Localização
      if (channels[2]) {
        const val = channels[2].querySelector('.channel-value');
        if (val && brand.location) val.textContent = brand.location;
      }

      if (note) {
        note.innerHTML = `<strong>${escapeHtml(ct.noteTitle || '')}</strong> ${escapeHtml(ct.noteText || '')}`;
      }
      if (formKicker && ct.formKicker !== undefined) formKicker.textContent = ct.formKicker;
      if (formH3 && ct.formTitle !== undefined) formH3.textContent = ct.formTitle;
      if (formP && ct.formSubtitle !== undefined) formP.textContent = ct.formSubtitle;
      if (submitSpan && ct.submitBtnText) submitSpan.textContent = ct.submitBtnText;
    }

    // Rodapé
    const footerBrandP = document.querySelector('.footer-brand p');
    if (footerBrandP && (ct.footerQuote || ct.footerDescription)) {
      footerBrandP.innerHTML = `${escapeHtml(ct.footerQuote || '')}<br />${escapeHtml(ct.footerDescription || '')}`;
    }

    const footerContactCols = document.querySelectorAll('.site-footer .footer-col');
    const rightFooterCol = footerContactCols[1];
    if (rightFooterCol) {
      const lis = rightFooterCol.querySelectorAll('li');
      if (lis[0]) {
        const a = lis[0].querySelector('a');
        if (a) {
          if (brand.instagramUrl) a.href = brand.instagramUrl;
          if (brand.instagram) a.textContent = `Instagram: ${brand.instagram}`;
        }
      }
      if (lis[1]) {
        const a = lis[1].querySelector('a');
        if (a) {
          if (brand.whatsappNumber) a.href = `https://wa.me/${brand.whatsappNumber}?text=${encodeURIComponent('Olá Carly! Gostaria de conversar sobre um ensaio.')}`;
          if (brand.whatsappFormatted) a.textContent = `WhatsApp: ${brand.whatsappFormatted}`;
        }
      }
      if (lis[2]) {
        const sp = lis[2].querySelector('span');
        if (sp && brand.location) sp.textContent = brand.location;
      }
      if (lis[3] && ct.equipmentText !== undefined) {
        lis[3].textContent = ct.equipmentText;
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initCmsPreviewBridge();
  hydrateSiteContent();
  initNavigation();
  initHeroCinema();
  initScrollReveal();
  initPortfolio();
  initLightbox();
  initPackages();
  initReviewsCarousel();
  initCustomSelect();
  initCalendarDatePicker();
  initContactForm();

  await loadLocalPublishedDataIfDev();
});

/* ==========================================================================
   1. NAVEGAÇÃO ADAPTATIVA E OBSERVADOR DE SEÇÕES
   ========================================================================== */
function initNavigation() {
  const header = document.getElementById('site-header');
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const mainNav = document.getElementById('main-nav');
  const navLinks = document.querySelectorAll('.nav-link');

  function updateHeaderState() {
    if (!header) return;
    if (window.scrollY > 70) {
      header.classList.remove('is-over-hero');
      header.classList.add('is-scrolled');
    } else {
      header.classList.add('is-over-hero');
      header.classList.remove('is-scrolled');
    }
  }

  window.addEventListener('scroll', updateHeaderState, { passive: true });
  updateHeaderState();

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', isOpen);
      menuToggle.innerHTML = isOpen
        ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
        : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        if (mainNav.classList.contains('open')) {
          mainNav.classList.remove('open');
          menuToggle.setAttribute('aria-expanded', 'false');
          menuToggle.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
        }
      });
    });
  }

  const sections = document.querySelectorAll('section[id]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach((link) => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else if (link.getAttribute('href')?.startsWith('#')) {
            link.classList.remove('active');
          }
        });
      }
    });
  }, { threshold: 0.25 });

  sections.forEach((sec) => observer.observe(sec));
}

/* ==========================================================================
   1.1 HERO FULL-BLEED CINEMATOGRÁFICO (100VW x 100VH — DINÂMICO VIA SITE_DATA)
   ========================================================================== */
function initHeroCinema() {
  const stage = document.getElementById('hero-slides-stage');
  const tabsContainer = document.getElementById('hero-scrubber-tabs');
  const kickerIndex = document.getElementById('hero-kicker-index');
  const activeCat = document.getElementById('hero-active-category');
  const activeQuote = document.getElementById('hero-active-quote');
  const activeLoc = document.getElementById('hero-active-location');
  const workNote = document.querySelector('.hero-work-note');

  if (!stage || !tabsContainer) return;

  let currentSlide = 0;
  let timer = null;
  const SLIDE_DURATION = 6500;

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startTimer() {
    stopTimer();
    const list = SITE_DATA.heroSlides || [];
    if (list.length <= 1) return;
    timer = setInterval(() => {
      goToSlide(currentSlide + 1);
    }, SLIDE_DURATION);
  }

  function renderDomSlides() {
    const list = SITE_DATA.heroSlides || [];
    if (!list.length) return;
    if (currentSlide >= list.length) currentSlide = 0;

    stage.innerHTML = list.map((slide, idx) => {
      const num = (idx + 1).toString().padStart(2, '0');
      slide.id = num;
      const objPos = slide.objectPosition || 'center 35%';
      const loadingAttr = idx === 0 ? 'fetchpriority="high"' : (idx === 1 ? 'loading="eager"' : 'loading="lazy"');
      return `
        <div class="hero-slide ${idx === currentSlide ? 'active' : ''}" data-slide-index="${idx}">
          <img src="${escapeHtml(slide.image)}" alt="${escapeHtml(slide.title || slide.category || 'Instantes de Carly')}" class="hero-slide-img" ${loadingAttr} style="object-position: ${escapeHtml(objPos)};" />
        </div>
      `;
    }).join('');

    tabsContainer.innerHTML = list.map((slide, idx) => {
      const num = (idx + 1).toString().padStart(2, '0');
      const isAct = idx === currentSlide;
      return `
        <button type="button" class="hero-scrubber-tab ${isAct ? 'active' : ''}" data-slide="${idx}" role="tab" aria-selected="${isAct ? 'true' : 'false'}">
          <span class="scrubber-num">${num}</span>
          <span class="scrubber-label">${escapeHtml(slide.shortLabel || slide.category)}</span>
          <span class="scrubber-progress"><span class="scrubber-bar-fill"></span></span>
        </button>
      `;
    }).join('');

    tabsContainer.querySelectorAll('.hero-scrubber-tab').forEach((tab, idx) => {
      tab.addEventListener('click', () => {
        goToSlide(idx, false);
        startTimer();
      });
    });

    goToSlide(currentSlide, true);
  }

  function goToSlide(index, instant = false) {
    const slides = stage.querySelectorAll('.hero-slide');
    const tabs = tabsContainer.querySelectorAll('.hero-scrubber-tab');
    const list = SITE_DATA.heroSlides || [];
    if (!slides.length || !list.length) return;

    currentSlide = (index + slides.length) % slides.length;
    const data = list[currentSlide];

    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === currentSlide);
    });

    tabs.forEach((tab, i) => {
      const isActive = i === currentSlide;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      const fill = tab.querySelector('.scrubber-bar-fill');
      if (fill) {
        fill.style.animation = 'none';
        void fill.offsetWidth;
        fill.style.animation = isActive ? `heroTabProgress ${SLIDE_DURATION}ms linear forwards` : 'none';
      }
    });

    if (kickerIndex && data) {
      const curStr = (currentSlide + 1).toString().padStart(2, '0');
      const totStr = slides.length.toString().padStart(2, '0');
      kickerIndex.textContent = `${curStr} / ${totStr}`;
    }

    if (data && workNote) {
      if (instant) {
        if (activeCat) activeCat.textContent = data.category || '';
        if (activeQuote) activeQuote.textContent = data.quote || '';
        if (activeLoc) activeLoc.textContent = data.location || '';
        workNote.style.opacity = '1';
      } else {
        workNote.style.opacity = '0.3';
        setTimeout(() => {
          if (activeCat) activeCat.textContent = data.category || '';
          if (activeQuote) activeQuote.textContent = data.quote || '';
          if (activeLoc) activeLoc.textContent = data.location || '';
          workNote.style.opacity = '1';
        }, 160);
      }
    }
  }

  renderDomSlides();
  startTimer();

  heroCinemaController = {
    rebuild() {
      renderDomSlides();
      startTimer();
    },
    selectSlide(idx) {
      stopTimer();
      goToSlide(idx, true);
      startTimer();
    }
  };
}

/* ==========================================================================
   1.2 REVELAÇÃO SUTIL NO SCROLL (INTERSECTION OBSERVER)
   ========================================================================== */
function initScrollReveal() {
  const revealEls = document.querySelectorAll('.reveal-on-scroll');
  if (!revealEls.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach((el) => observer.observe(el));
}

/* ==========================================================================
   2. PORTFÓLIO CURATORIAL & EMPACOTADOR INTELIGENTE DE LINHAS (ZERO BURACOS)
   ========================================================================== */
function packEditorialRows(photos) {
  const queue = photos.map((p) => ({
    ...p,
    aspect: p.aspect === 'portrait' ? 'portrait' : 'landscape'
  }));
  const packed = [];

  while (queue.length > 0) {
    const first = queue[0];

    if (first.aspect === 'landscape') {
      const nextLIdx = queue.findIndex((item, idx) => idx > 0 && item.aspect === 'landscape');
      if (nextLIdx !== -1) {
        const second = queue.splice(nextLIdx, 1)[0];
        const firstOut = queue.shift();
        packed.push(
          { photo: firstOut, colSpan: '6', rowAspect: '3/2' },
          { photo: second, colSpan: '6', rowAspect: '3/2' }
        );
        continue;
      }

      // Não há mais outra horizontal na fila; verifica se há um trio vertical completo antes do rodapé
      const portraitIndices = [];
      queue.forEach((item, idx) => {
        if (item.aspect === 'portrait') portraitIndices.push(idx);
      });

      if (portraitIndices.length >= 3) {
        const i3 = portraitIndices[2];
        const i2 = portraitIndices[1];
        const i1 = portraitIndices[0];
        const p3 = queue.splice(i3, 1)[0];
        const p2 = queue.splice(i2, 1)[0];
        const p1 = queue.splice(i1, 1)[0];
        packed.push(
          { photo: p1, colSpan: '4', rowAspect: '3/4' },
          { photo: p2, colSpan: '4', rowAspect: '3/4' },
          { photo: p3, colSpan: '4', rowAspect: '3/4' }
        );
        continue;
      }

      // Sobraram apenas 1L + (0, 1 ou 2 P)
      if (queue.length === 3 && portraitIndices.length === 2) {
        const p2 = queue.splice(portraitIndices[1], 1)[0];
        const p1 = queue.splice(portraitIndices[0], 1)[0];
        packed.push(
          { photo: p1, colSpan: '6', rowAspect: '4/5' },
          { photo: p2, colSpan: '6', rowAspect: '4/5' }
        );
        continue;
      }

      if (queue.length === 2) {
        const a = queue.shift();
        const b = queue.shift();
        packed.push(
          { photo: a, colSpan: '6', rowAspect: '4/3' },
          { photo: b, colSpan: '6', rowAspect: '4/3' }
        );
        continue;
      }

      const single = queue.shift();
      packed.push({ photo: single, colSpan: 'center-6', rowAspect: '3/2' });
    } else {
      // first.aspect === 'portrait'
      const portraitIndices = [];
      queue.forEach((item, idx) => {
        if (item.aspect === 'portrait') portraitIndices.push(idx);
      });

      if (portraitIndices.length >= 3) {
        const p3 = queue.splice(portraitIndices[2], 1)[0];
        const p2 = queue.splice(portraitIndices[1], 1)[0];
        const p1 = queue.splice(portraitIndices[0], 1)[0];
        packed.push(
          { photo: p1, colSpan: '4', rowAspect: '3/4' },
          { photo: p2, colSpan: '4', rowAspect: '3/4' },
          { photo: p3, colSpan: '4', rowAspect: '3/4' }
        );
        continue;
      }

      // Menos de 3 verticais restantes: se houver par horizontal disponível, renderiza o par primeiro
      const landscapeIndices = [];
      queue.forEach((item, idx) => {
        if (item.aspect === 'landscape') landscapeIndices.push(idx);
      });

      if (landscapeIndices.length >= 2) {
        const l2 = queue.splice(landscapeIndices[1], 1)[0];
        const l1 = queue.splice(landscapeIndices[0], 1)[0];
        packed.push(
          { photo: l1, colSpan: '6', rowAspect: '3/2' },
          { photo: l2, colSpan: '6', rowAspect: '3/2' }
        );
        continue;
      }

      if (queue.length === 3 && portraitIndices.length === 2) {
        const p2 = queue.splice(portraitIndices[1], 1)[0];
        const p1 = queue.splice(portraitIndices[0], 1)[0];
        packed.push(
          { photo: p1, colSpan: '6', rowAspect: '4/5' },
          { photo: p2, colSpan: '6', rowAspect: '4/5' }
        );
        continue;
      }

      if (queue.length === 2) {
        const a = queue.shift();
        const b = queue.shift();
        const bothPortrait = a.aspect === 'portrait' && b.aspect === 'portrait';
        const aspect = bothPortrait ? '4/5' : '4/3';
        packed.push(
          { photo: a, colSpan: '6', rowAspect: aspect },
          { photo: b, colSpan: '6', rowAspect: aspect }
        );
        continue;
      }

      const single = queue.shift();
      packed.push({ photo: single, colSpan: 'center-6', rowAspect: '4/5' });
    }
  }

  return packed;
}

function getAcervoCoverPhotos(allItems, categories) {
  const orderedCats = (categories || []).filter((c) => c.id && c.id !== 'todos');
  const covers = [];
  const coveredCats = new Set();

  orderedCats.forEach((cat) => {
    const catItems = allItems.filter((p) => p.category === cat.id);
    if (!catItems.length) return;
    const chosen = catItems.find((p) => p.isAcervoCover === true) || catItems[0];
    covers.push(chosen);
    coveredCats.add(cat.id);
  });

  // Fallback para categorias presentes nas fotos mas ausentes na lista
  allItems.forEach((p) => {
    if (p.category && !coveredCats.has(p.category)) {
      const catItems = allItems.filter((item) => item.category === p.category);
      const chosen = catItems.find((item) => item.isAcervoCover === true) || catItems[0];
      covers.push(chosen);
      coveredCats.add(p.category);
    }
  });

  return covers;
}

function selectPortfolioCategory(categoryId, { scrollToFilters = false } = {}) {
  const filtersContainer = document.getElementById('portfolio-filters');
  const categories = SITE_DATA.categories || [];
  const exists = categories.some((c) => c.id === categoryId);
  currentCategory = exists ? categoryId : 'todos';

  if (filtersContainer) {
    let activeBtn = null;
    filtersContainer.querySelectorAll('.filter-btn').forEach((b) => {
      const isMatch = b.getAttribute('data-category') === currentCategory;
      b.classList.toggle('active', isMatch);
      b.setAttribute('aria-selected', isMatch ? 'true' : 'false');
      if (isMatch) activeBtn = b;
    });

    if (activeBtn && filtersContainer.scrollWidth > filtersContainer.clientWidth) {
      const targetLeft = activeBtn.offsetLeft - (filtersContainer.clientWidth / 2) + (activeBtn.offsetWidth / 2);
      filtersContainer.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }
  }

  const updateGrid = () => renderPortfolioGrid(currentCategory);
  if (document.startViewTransition) {
    document.startViewTransition(updateGrid);
  } else {
    updateGrid();
  }

  if (scrollToFilters && filtersContainer) {
    const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10) || 86;
    const rect = filtersContainer.getBoundingClientRect();
    if (rect.top < headerHeight || rect.top > window.innerHeight * 0.55) {
      const targetY = window.scrollY + rect.top - headerHeight - 20;
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }
  }
}

function renderPortfolioFiltersAndGrid(activeCat = 'todos') {
  const filtersContainer = document.getElementById('portfolio-filters');
  if (!filtersContainer) return;

  const categories = SITE_DATA.categories || [];
  const exists = categories.some((c) => c.id === activeCat);
  currentCategory = exists ? activeCat : 'todos';

  filtersContainer.innerHTML = categories.map((cat) => {
    const count = cat.id === 'todos'
      ? (SITE_DATA.portfolio || []).length
      : (SITE_DATA.portfolio || []).filter((p) => p.category === cat.id).length;
    const isAct = cat.id === currentCategory;
    return `
      <button class="filter-btn ${isAct ? 'active' : ''}" data-category="${escapeHtml(cat.id)}" role="tab" aria-selected="${isAct}">
        <span>${escapeHtml(cat.name)}</span>
        <sup>${count}</sup>
      </button>
    `;
  }).join('');

  renderPortfolioGrid(currentCategory);
}

function initPortfolio() {
  const filtersContainer = document.getElementById('portfolio-filters');
  const gridContainer = document.getElementById('portfolio-grid');

  if (!filtersContainer || !gridContainer) return;

  filtersContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    selectPortfolioCategory(btn.getAttribute('data-category'));
  });

  renderPortfolioFiltersAndGrid('todos');
}

function renderPortfolioGrid(category) {
  const gridContainer = document.getElementById('portfolio-grid');
  const countIndicator = document.getElementById('portfolio-count-indicator');
  if (!gridContainer) return;

  const allItems = SITE_DATA.portfolio || [];
  const isOverview = category === 'todos';
  const rawFiltered = isOverview
    ? getAcervoCoverPhotos(allItems, SITE_DATA.categories)
    : allItems.filter((p) => p.category === category);

  const packedRows = packEditorialRows(rawFiltered);
  visiblePhotos = packedRows.map((entry) => entry.photo);

  gridContainer.classList.toggle('is-filtered', !isOverview);
  gridContainer.classList.toggle('is-acervo-overview', isOverview);
  gridContainer.setAttribute('data-filtered-count', visiblePhotos.length.toString());

  if (countIndicator) {
    if (isOverview) {
      countIndicator.textContent = `COLEÇÕES AUTORAIS • ${visiblePhotos.length} ${visiblePhotos.length === 1 ? 'CATEGORIA' : 'CATEGORIAS'} (${allItems.length} ${allItems.length === 1 ? 'OBRA' : 'OBRAS'})`;
    } else {
      countIndicator.textContent = `CURADORIA AUTORAL • ${visiblePhotos.length} ${visiblePhotos.length === 1 ? 'OBRA' : 'OBRAS'}`;
    }
  }

  if (packedRows.length === 0) {
    gridContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--text-muted); font-family: var(--font-serif); font-size: 1.25rem;">
        Novos registros desta categoria estão sendo curados por Carly.
      </div>
    `;
    return;
  }

  gridContainer.innerHTML = packedRows.map((entry, index) => {
    const photo = entry.photo;
    const displayNum = (index + 1).toString().padStart(2, '0');
    const shortLocation = (photo.location || 'Fortaleza').split(',')[0];
    const objPos = photo.objectPosition || 'center 25%';
    const catObj = (SITE_DATA.categories || []).find((c) => c.id === photo.category);
    const catLabel = catObj ? catObj.name : (photo.categoryName || photo.category);
    const catCount = allItems.filter((p) => p.category === photo.category).length;

    const hoverCtaText = isOverview
      ? `Ver ensaios de ${escapeHtml(catLabel)} (${catCount} ${catCount === 1 ? 'foto' : 'fotos'}) →`
      : 'Abrir na sala de exibição ↗';

    const ariaLabel = isOverview
      ? `Abrir categoria ${escapeHtml(catLabel)} (${catCount} ${catCount === 1 ? 'foto' : 'fotos'})`
      : `Ampliar fotografia ${escapeHtml(photo.title)}`;

    const collectionBadgeHtml = isOverview
      ? `<span class="work-collection-pill"><span>${escapeHtml(catLabel)}</span><span class="work-collection-count">${catCount} ${catCount === 1 ? 'foto' : 'fotos'} →</span></span>`
      : '';

    return `
      <article class="work-item" data-index="${index}" data-category="${escapeHtml(photo.category)}" data-aspect="${escapeHtml(photo.aspect || 'landscape')}" data-col-span="${entry.colSpan}" data-row-aspect="${entry.rowAspect}" tabindex="0" role="button" aria-label="${ariaLabel}">
        <div class="work-frame">
          <div class="work-img-box">
            <img class="work-img" src="${escapeHtml(photo.image)}" alt="${escapeHtml(photo.title)} — ${escapeHtml(photo.location || '')}" loading="lazy" style="object-position: ${escapeHtml(objPos)};" />
            ${collectionBadgeHtml}
            <div class="work-hover-veil">
              <p class="work-hover-quote">“${escapeHtml(photo.caption || '')}”</p>
              <span class="work-hover-cta">${hoverCtaText}</span>
            </div>
          </div>
        </div>
        <div class="work-caption-bar">
          <div class="work-caption-top">
            <span class="work-index">Nº ${displayNum}</span>
            <span class="work-meta-right">${escapeHtml(catLabel)} • ${escapeHtml(shortLocation)}</span>
          </div>
          <h3 class="work-title">${escapeHtml(photo.title)}</h3>
        </div>
      </article>
    `;
  }).join('');

  gridContainer.querySelectorAll('.work-item').forEach((card) => {
    const activateCard = () => {
      if (isOverview) {
        const targetCat = card.getAttribute('data-category');
        if (targetCat) {
          selectPortfolioCategory(targetCat, { scrollToFilters: true });
        }
        return;
      }
      const idx = parseInt(card.getAttribute('data-index'), 10);
      openLightbox(idx);
    };

    card.addEventListener('click', activateCard);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateCard();
      }
    });
  });
}

/* ==========================================================================
   3. SALA DE EXIBIÇÃO / LIGHTBOX ARQUIVAL (<dialog>) COM FILMSTRIP
   ========================================================================== */
function initLightbox() {
  const dialog = document.getElementById('lightbox-dialog');
  const closeBtn = document.getElementById('lightbox-close-btn');
  const prevBtn = document.getElementById('lightbox-prev-btn');
  const nextBtn = document.getElementById('lightbox-next-btn');

  if (!dialog) return;

  closeBtn?.addEventListener('click', closeLightbox);
  prevBtn?.addEventListener('click', () => navigateLightbox(-1));
  nextBtn?.addEventListener('click', () => navigateLightbox(1));

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      closeLightbox();
    }
  });

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      navigateLightbox(-1);
    } else if (e.key === 'ArrowRight') {
      navigateLightbox(1);
    }
  });
}

function openLightbox(index) {
  const dialog = document.getElementById('lightbox-dialog');
  if (!dialog || visiblePhotos.length === 0) return;

  currentLightboxIndex = index;
  renderLightboxFilmstrip();
  updateLightboxContent();

  dialog.showModal();
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const dialog = document.getElementById('lightbox-dialog');
  if (!dialog) return;

  dialog.close();
  document.body.style.overflow = '';
}

function navigateLightbox(direction) {
  currentLightboxIndex += direction;
  if (currentLightboxIndex < 0) {
    currentLightboxIndex = visiblePhotos.length - 1;
  } else if (currentLightboxIndex >= visiblePhotos.length) {
    currentLightboxIndex = 0;
  }
  updateLightboxContent();
}

function renderLightboxFilmstrip() {
  const strip = document.getElementById('lightbox-filmstrip');
  if (!strip) return;

  strip.innerHTML = visiblePhotos.map((p, idx) => `
    <button type="button" class="filmstrip-thumb ${idx === currentLightboxIndex ? 'active' : ''}" data-idx="${idx}" aria-label="Ver foto ${idx + 1}: ${escapeHtml(p.title)}">
      <img src="${escapeHtml(p.image)}" alt="" loading="lazy" />
    </button>
  `).join('');

  strip.querySelectorAll('.filmstrip-thumb').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentLightboxIndex = parseInt(btn.getAttribute('data-idx'), 10);
      updateLightboxContent();
    });
  });
}

function updateLightboxContent() {
  const photo = visiblePhotos[currentLightboxIndex];
  if (!photo) return;

  const imgEl = document.getElementById('lightbox-img');
  const titleEl = document.getElementById('lightbox-title');
  const catEl = document.getElementById('lightbox-category');
  const locEl = document.getElementById('lightbox-location-text');
  const capEl = document.getElementById('lightbox-caption');
  const counterEl = document.getElementById('lightbox-counter');
  const ctaBtn = document.getElementById('lightbox-cta-btn');
  const strip = document.getElementById('lightbox-filmstrip');

  const catObj = (SITE_DATA.categories || []).find((c) => c.id === photo.category);
  const catLabel = photo.categoryName || (catObj ? catObj.name : photo.category);

  if (imgEl) {
    imgEl.src = photo.image;
    imgEl.alt = `${photo.title} — ${catLabel}`;
  }
  if (titleEl) titleEl.textContent = photo.title;
  if (catEl) catEl.textContent = catLabel;
  if (locEl) locEl.textContent = photo.location || 'Fortaleza, Ceará';
  if (capEl) capEl.textContent = `“${photo.caption || ''}”`;
  if (counterEl) {
    const cur = (currentLightboxIndex + 1).toString().padStart(2, '0');
    const tot = visiblePhotos.length.toString().padStart(2, '0');
    counterEl.textContent = `Obra ${cur} / ${tot}`;
  }

  if (strip) {
    strip.querySelectorAll('.filmstrip-thumb').forEach((thumb, i) => {
      const isAct = i === currentLightboxIndex;
      thumb.classList.toggle('active', isAct);
      if (isAct) {
        const targetScroll = thumb.offsetLeft - (strip.clientWidth / 2) + (thumb.clientWidth / 2);
        strip.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
      }
    });
  }

  if (ctaBtn) {
    ctaBtn.onclick = () => {
      closeLightbox();
      if (typeof window.selectCustomOption === 'function') {
        window.selectCustomOption(photo.category);
      }
      document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });
    };
  }
}

/* ==========================================================================
   4. EXPERIÊNCIAS FOTOGRÁFICAS (PRÉVIA ENXUTA DOS FORMATOS)
   ========================================================================== */
function initPackages() {
  const container = document.getElementById('packages-container');
  if (!container) return;

  const pkgs = SITE_DATA.packages || [];
  container.innerHTML = pkgs.map((pkg) => `
    <article class="package-card ${pkg.popular ? 'popular' : ''}">
      ${pkg.popular ? '<span class="popular-badge">Mais Escolhido</span>' : ''}
      <div class="package-header">
        <div class="package-top-row">
          <span class="package-roman">${escapeHtml(pkg.index || 'I')}.</span>
          <span class="package-badge-tag">${escapeHtml(pkg.badge || '')}</span>
        </div>
        <div class="package-title-price-row">
          <h3 class="package-name">${escapeHtml(pkg.name || '')}</h3>
          ${pkg.price ? `<span class="package-price-value">${escapeHtml(pkg.price)}</span>` : ''}
        </div>
        <p class="package-summary">${escapeHtml(pkg.summary || '')}</p>
        <div class="package-meta">
          ${pkg.duration ? `
          <div class="package-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span>${escapeHtml(pkg.duration)}</span>
          </div>` : ''}
          ${pkg.photosCount ? `
          <div class="package-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <span>${escapeHtml(pkg.photosCount)}</span>
          </div>` : ''}
          ${pkg.deliveryTime ? `
          <div class="package-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>${escapeHtml(pkg.deliveryTime)}</span>
          </div>` : ''}
        </div>
      </div>

      <div class="package-features">
        <ul class="package-features-list">
          ${(pkg.details || []).map((item) => `
            <li><span>${escapeHtml(item)}</span></li>
          `).join('')}
        </ul>
      </div>

      <div class="package-footer">
        <button class="btn btn-primary btn-select-package" data-package="${escapeHtml(pkg.id)}" style="width: 100%;">
          <span>Consultar no WhatsApp</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </button>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('.btn-select-package').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pkgId = btn.getAttribute('data-package');
      const pkg = (SITE_DATA.packages || []).find((p) => p.id === pkgId);
      if (!pkg) return;

      const encodedMsg = encodeURIComponent(pkg.whatsappMsg || `Olá Carly! Gostaria de saber mais sobre ${pkg.name}.`);
      const url = `https://wa.me/${SITE_DATA.brand.whatsappNumber}?text=${encodedMsg}`;
      window.open(url, '_blank');
    });
  });
}

/* ==========================================================================
   4.1 CARROSSEL DE AVALIAÇÕES VERIFICADAS NO GOOGLE (100% VIA API)
   ========================================================================== */
function initReviewsCarousel() {
  const track = document.getElementById('reviews-track');
  const viewport = document.getElementById('reviews-viewport');
  const prevBtn = document.getElementById('reviews-prev-btn');
  const nextBtn = document.getElementById('reviews-next-btn');
  const dotsContainer = document.getElementById('reviews-dots');
  const counterEl = document.getElementById('reviews-counter');

  if (!track || !viewport || !SITE_DATA.googleReviews) return;

  try {
    localStorage.removeItem('instantes_carly_live_reviews');
  } catch (e) {}

  const allReviews = [...(SITE_DATA.googleReviews.reviews || [])];
  let currentIndex = 0;
  let lastFetchedWidgetId = '';

  function getCardsPerView() {
    if (window.innerWidth <= 680) return 1;
    if (window.innerWidth <= 1024) return 2;
    return 3;
  }

  function getTotalItems() {
    return track.querySelectorAll('.review-card, .review-invite-card').length;
  }

  function getMaxIndex() {
    const cardsPerView = getCardsPerView();
    const total = getTotalItems();
    return Math.max(0, total - cardsPerView);
  }

  function cleanGoogleReviewText(rawText) {
    if (!rawText) return '';
    return rawText
      .replace(/\s*\(Translated by Google\)[\s\S]*$/i, '')
      .replace(/\s*\(Traduzido pelo Google\)[\s\S]*$/i, '')
      .trim();
  }

  function translateRelativeDate(rawDate) {
    if (!rawDate) return 'Recentemente no Google';
    if (/^\d{4}-\d{2}-\d{2}T/.test(rawDate)) {
      const created = new Date(rawDate);
      const now = new Date();
      const diffMs = Math.max(0, now - created);
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Hoje';
      if (diffDays === 1) return 'há 1 dia';
      if (diffDays < 30) return `há ${diffDays} dias`;
      const diffMonths = Math.floor(diffDays / 30);
      if (diffMonths === 1) return 'há 1 mês';
      if (diffMonths < 12) return `há ${diffMonths} meses`;
      const diffYears = Math.floor(diffMonths / 12);
      return diffYears === 1 ? 'há 1 ano' : `há ${diffYears} anos`;
    }
    return rawDate
      .replace(/(\d+)\s*months?\s*ago/i, 'há $1 meses')
      .replace(/a\s*month\s*ago/i, 'há 1 mês')
      .replace(/(\d+)\s*weeks?\s*ago/i, 'há $1 semanas')
      .replace(/a\s*week\s*ago/i, 'há 1 semana')
      .replace(/(\d+)\s*days?\s*ago/i, 'há $1 dias')
      .replace(/a\s*day\s*ago/i, 'há 1 dia');
  }

  function renderCards() {
    const googleLogoSvg = `
      <svg width="22" height="22" viewBox="0 0 24 24" aria-label="Avaliação verificada no Google">
        <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
        <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.4 1.9 7.8l3.7-2.9z"/>
        <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
      </svg>
    `;

    const reviewsHtml = allReviews.map((rev) => {
      const cleanedText = cleanGoogleReviewText(rev.text);
      const avatarContent = rev.avatarUrl
        ? `<img src="${escapeHtml(rev.avatarUrl)}" alt="${escapeHtml(rev.author)}" loading="lazy" referrerpolicy="no-referrer" />`
        : escapeHtml(rev.initials || rev.author.substring(0, 1).toUpperCase());

      return `
        <article class="review-card" tabindex="0">
          <div class="review-card-header">
            <div class="review-avatar" style="background-color: ${escapeHtml(rev.avatarBg || '#5F9E34')}; color: ${escapeHtml(rev.avatarColor || '#FFFFFF')};">
              ${avatarContent}
            </div>
            <div class="review-author-meta">
              <div class="review-author-name">
                <strong>${escapeHtml(rev.author)}</strong>
              </div>
              <span class="review-date-sub">${escapeHtml(translateRelativeDate(rev.date))}</span>
            </div>
          </div>

          <div class="review-text-body">
            <span class="review-text-content">${escapeHtml(cleanedText)}</span>
          </div>

          <div class="review-card-footer">
            <div class="review-stars-bottom" aria-label="${rev.stars || 5} de 5 estrelas">
              ${'★'.repeat(rev.stars || 5)}
            </div>
            ${googleLogoSvg}
          </div>
        </article>
      `;
    }).join('');

    const avSec = SITE_DATA.sections?.avaliacoes || {};
    const writeUrl = SITE_DATA.googleReviews?.googleReviewFormUrl || 'https://search.google.com/local/writereview?placeid=ChIJjZQfEEERvikRuXdgNX7jr3s';

    const inviteHtml = `
      <article class="review-invite-card" tabindex="0">
        <span class="section-tag" style="margin-bottom: 4px;">Sua História</span>
        <h4>${escapeHtml(avSec.inviteTitle || 'Já foi fotografado(a) por Carly?')}</h4>
        <p>${escapeHtml(avSec.inviteText || 'Sua avaliação no Google atualiza automaticamente este mural e ajuda novas famílias e casais em Fortaleza.')}</p>
        <a href="${escapeHtml(writeUrl)}" target="_blank" rel="noopener" class="btn btn-primary" style="padding: 10px 20px; font-size: 0.76rem; margin-top: 6px;">
          <span>Avaliar no Google ↗</span>
        </a>
      </article>
    `;

    track.innerHTML = reviewsHtml + inviteHtml;

    renderDots();
    updateCarousel();
  }

  function renderDots() {
    if (!dotsContainer) return;
    const max = getMaxIndex();
    const totalDots = max + 1;
    let dotsHtml = '';
    for (let i = 0; i < totalDots; i++) {
      dotsHtml += `<button type="button" class="carousel-dot ${i === currentIndex ? 'active' : ''}" data-index="${i}" aria-label="Ir para relato ${i + 1}"></button>`;
    }
    dotsContainer.innerHTML = dotsHtml;

    dotsContainer.querySelectorAll('.carousel-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        currentIndex = parseInt(dot.getAttribute('data-index'), 10);
        updateCarousel();
      });
    });
  }

  function updateCarousel() {
    const cardsPerView = getCardsPerView();
    const total = getTotalItems();
    const max = getMaxIndex();
    if (currentIndex > max) currentIndex = max;
    if (currentIndex < 0) currentIndex = 0;

    const cards = track.querySelectorAll('.review-card, .review-invite-card');
    if (cards.length > 0) {
      const cardWidth = cards[0].offsetWidth;
      const gap = 24;
      const offset = currentIndex * (cardWidth + gap);
      track.style.transform = `translateX(-${offset}px)`;
    }

    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex >= max;

    if (counterEl) {
      const start = currentIndex + 1;
      const end = Math.min(currentIndex + cardsPerView, total);
      counterEl.textContent = `${start}–${end} de ${total}`;
    }

    if (dotsContainer) {
      dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentIndex);
      });
    }
  }

  prevBtn?.addEventListener('click', () => {
    currentIndex = currentIndex > 0 ? currentIndex - 1 : getMaxIndex();
    updateCarousel();
  });

  nextBtn?.addEventListener('click', () => {
    const max = getMaxIndex();
    currentIndex = currentIndex < max ? currentIndex + 1 : 0;
    updateCarousel();
  });

  window.addEventListener('resize', () => {
    renderDots();
    updateCarousel();
  });

  async function fetchLiveGoogleReviews() {
    const cfg = SITE_DATA.googleReviews || {};
    const urlParams = new URLSearchParams(window.location.search);
    const featurableId = urlParams.get('featurableId') || cfg.featurableWidgetId || '';
    const placesKey = cfg.googlePlacesApiKey || '';
    const placeId = cfg.googlePlaceId || '';
    const avatarPalette = ['#5F9E34', '#3B7293', '#B58324', '#00897B', '#5C6BC0', '#8E24AA'];

    try {
      if (featurableId) {
        lastFetchedWidgetId = featurableId;
        const res = await fetch(`https://featurable.com/api/v1/widgets/${encodeURIComponent(featurableId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.reviews) && data.reviews.length > 0) {
            const totalCount = data.widget?.gbpLocationSummary?.reviewsCount || data.totalReviewCount || Math.max(16, data.reviews.length);
            const avgRating = Number(data.widget?.gbpLocationSummary?.rating || data.averageRating || 5).toFixed(1);

            const scoreEl = document.getElementById('g-badge-score-val');
            const countEl = document.getElementById('g-badge-count-label');
            const syncBadge = document.getElementById('google-sync-badge');
            if (scoreEl) scoreEl.textContent = avgRating;
            if (countEl) countEl.textContent = `Ler nossas ${totalCount} avaliações ↗`;
            if (syncBadge) syncBadge.textContent = `🟢 SINCRONIZADO AO VIVO VIA API • GOOGLE ${avgRating} ★ (${totalCount} AVALIAÇÕES)`;

            const liveMapped = data.reviews.map((r, idx) => {
              const authorName = r.author?.name || r.reviewer?.displayName || 'Cliente Google';
              return {
                id: r.reviewId || `live-ft-${idx}`,
                author: authorName,
                avatarUrl: r.author?.avatarUrl || r.reviewer?.profilePhotoUrl || '',
                reviewCount: 'Avaliação verificada',
                context: 'Sincronizado via Google Meu Negócio',
                date: r.relativePublishTimeDescription || r.createTime || 'Recentemente no Google',
                isNew: idx === 0,
                stars: r.rating || r.starRating || 5,
                text: r.text?.text || r.originalText?.text || r.comment || 'Excelente experiência fotográfica!',
                avatarBg: avatarPalette[idx % avatarPalette.length],
                avatarColor: '#FFFFFF',
                initials: authorName.substring(0, 1).toUpperCase()
              };
            });
            allReviews.splice(0, allReviews.length, ...liveMapped);
            renderCards();
            return;
          }
        }
      }

      if (placesKey && placeId) {
        const endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=rating,userRatingCount,reviews&languageCode=pt-BR&key=${encodeURIComponent(placesKey)}`;
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.reviews) && data.reviews.length > 0) {
            const liveMapped = data.reviews.map((r, idx) => {
              const authorName = r.authorAttribution?.displayName || 'Cliente Google';
              return {
                id: r.name || `live-gp-${idx}`,
                author: authorName,
                reviewCount: 'Avaliação verificada',
                context: 'Sincronizado via Google Places API',
                date: r.relativePublishTimeDescription || 'Recentemente no Google',
                isNew: idx === 0,
                stars: r.rating || 5,
                text: r.text?.text || r.originalText?.text || 'Excelente experiência fotográfica!',
                avatarBg: avatarPalette[idx % avatarPalette.length],
                avatarColor: '#FFFFFF',
                initials: authorName.substring(0, 1).toUpperCase()
              };
            });
            allReviews.splice(0, allReviews.length, ...liveMapped);
            renderCards();
          }
        }
      }
    } catch (err) {
      console.warn('Sincronização externa Google Reviews em espera:', err);
    }
  }

  renderCards();
  fetchLiveGoogleReviews();

  reviewsController = {
    refreshMeta() {
      renderCards();
      const newWidgetId = SITE_DATA.googleReviews?.featurableWidgetId || '';
      if (newWidgetId && newWidgetId !== lastFetchedWidgetId) {
        fetchLiveGoogleReviews();
      }
    }
  };
}

/* ==========================================================================
   4.2 CUSTOM SELECT MODERNO (SINCRONIZADO COM AS CATEGORIAS DO SITE)
   ========================================================================== */
function syncContactServiceDropdown() {
  const menu = document.getElementById('custom-service-menu');
  const label = document.getElementById('custom-service-label');
  const hiddenInput = document.getElementById('input-service');
  if (!menu || !hiddenInput) return;

  const cats = (SITE_DATA.categories || []).filter((c) => c.id !== 'todos');
  const optionsList = cats.map((c) => ({
    value: c.id,
    text: c.name
  }));
  if (!optionsList.some((o) => o.value === 'casamentos')) {
    optionsList.push({ value: 'casamentos', text: 'Casamento Intimista' });
  }
  optionsList.push({ value: 'outro', text: 'Outro formato ou projeto especial' });

  const currentVal = hiddenInput.value || (optionsList[0]?.value ?? 'gestantes');
  const activeOption = optionsList.find((o) => o.value === currentVal) || optionsList[0];

  if (activeOption) {
    hiddenInput.value = activeOption.value;
    if (label) label.textContent = activeOption.text;
  }

  menu.innerHTML = optionsList.map((opt) => {
    const isSel = opt.value === hiddenInput.value;
    return `
      <li class="custom-select-option ${isSel ? 'selected' : ''}" role="option" data-value="${escapeHtml(opt.value)}" aria-selected="${isSel}">
        <span>${escapeHtml(opt.text)}</span>
        <svg class="option-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </li>
    `;
  }).join('');
}

function initCustomSelect() {
  const wrapper = document.getElementById('custom-service-wrapper');
  const trigger = document.getElementById('custom-service-trigger');
  const menu = document.getElementById('custom-service-menu');
  const label = document.getElementById('custom-service-label');
  const hiddenInput = document.getElementById('input-service');

  if (!wrapper || !trigger || !menu || !hiddenInput) return;

  syncContactServiceDropdown();

  function toggleMenu(open) {
    const shouldOpen = open !== undefined ? open : !wrapper.classList.contains('open');
    wrapper.classList.toggle('open', shouldOpen);
    trigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  menu.addEventListener('click', (e) => {
    const option = e.target.closest('.custom-select-option');
    if (!option) return;
    e.stopPropagation();

    const val = option.getAttribute('data-value');
    const text = option.querySelector('span')?.textContent || '';

    hiddenInput.value = val;
    if (label) label.textContent = text;

    menu.querySelectorAll('.custom-select-option').forEach((opt) => {
      opt.classList.remove('selected');
      opt.setAttribute('aria-selected', 'false');
    });

    option.classList.add('selected');
    option.setAttribute('aria-selected', 'true');

    toggleMenu(false);
    trigger.focus();
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      toggleMenu(false);
    }
  });
}

window.selectCustomOption = function(categoryValue) {
  const hiddenInput = document.getElementById('input-service');
  const label = document.getElementById('custom-service-label');
  const menu = document.getElementById('custom-service-menu');

  if (!menu || !hiddenInput) return;

  const targetOption = menu.querySelector(`.custom-select-option[data-value="${categoryValue}"]`);
  if (targetOption) {
    hiddenInput.value = categoryValue;
    if (label) label.textContent = targetOption.querySelector('span')?.textContent || '';

    menu.querySelectorAll('.custom-select-option').forEach((opt) => {
      opt.classList.remove('selected');
      opt.setAttribute('aria-selected', 'false');
    });

    targetOption.classList.add('selected');
    targetOption.setAttribute('aria-selected', 'true');
  }
};

/* ==========================================================================
   4.3 CALENDÁRIO INTERATIVO DE ESCOLHA DE DATA
   ========================================================================== */
function initCalendarDatePicker() {
  const input = document.getElementById('input-date');
  const triggerBtn = document.getElementById('calendar-btn-trigger');
  const popover = document.getElementById('calendar-popover');
  const monthYearLabel = document.getElementById('cal-month-year');
  const daysGrid = document.getElementById('cal-days-grid');
  const prevMonthBtn = document.getElementById('cal-prev-month');
  const nextMonthBtn = document.getElementById('cal-next-month');
  const clearBtn = document.getElementById('cal-clear-btn');
  const closeBtn = document.getElementById('cal-close-btn');
  const chips = document.querySelectorAll('.cal-chip');

  if (!input || !popover || !daysGrid) return;

  const today = new Date();
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();
  let selectedDateObj = null;

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function togglePopover(show) {
    const isShowing = show !== undefined ? show : !popover.classList.contains('open');
    popover.classList.toggle('open', isShowing);
    popover.setAttribute('aria-hidden', isShowing ? 'false' : 'true');
    if (isShowing) {
      renderCalendar(currentYear, currentMonth);
    }
  }

  function renderCalendar(year, month) {
    if (!monthYearLabel || !daysGrid) return;
    monthYearLabel.textContent = `${monthNames[month]} de ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let gridHtml = '';
    for (let i = 0; i < firstDayIndex; i++) {
      gridHtml += '<span class="cal-day empty"></span>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      const isPast = dayDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isSelected = selectedDateObj && dayDate.toDateString() === selectedDateObj.toDateString();

      const classes = ['cal-day'];
      if (isPast) classes.push('disabled');
      if (isSelected) classes.push('selected');

      gridHtml += `
        <button type="button" class="${classes.join(' ')}" data-day="${d}" data-month="${month}" data-year="${year}" ${isPast ? 'disabled' : ''}>
          ${d}
        </button>
      `;
    }

    daysGrid.innerHTML = gridHtml;

    daysGrid.querySelectorAll('.cal-day:not(.disabled):not(.empty)').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const d = parseInt(btn.getAttribute('data-day'), 10);
        const m = parseInt(btn.getAttribute('data-month'), 10);
        const y = parseInt(btn.getAttribute('data-year'), 10);

        selectedDateObj = new Date(y, m, d);
        const weekday = weekdayNames[selectedDateObj.getDay()];
        input.value = `${d.toString().padStart(2, '0')}/${(m + 1).toString().padStart(2, '0')}/${y} (${weekday})`;

        renderCalendar(year, month);
        setTimeout(() => togglePopover(false), 200);
      });
    });
  }

  prevMonthBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar(currentYear, currentMonth);
  });

  nextMonthBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar(currentYear, currentMonth);
  });

  input.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePopover(true);
  });

  triggerBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePopover();
  });

  document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('calendar-input-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      togglePopover(false);
    }
  });

  chips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      input.value = chip.getAttribute('data-choice') || '';
      selectedDateObj = null;
      renderCalendar(currentYear, currentMonth);
      setTimeout(() => togglePopover(false), 160);
    });
  });

  clearBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    input.value = '';
    selectedDateObj = null;
    renderCalendar(currentYear, currentMonth);
  });

  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePopover(false);
  });
}

/* ==========================================================================
   5. FORMULÁRIO DE CONTATO INTELIGENTE
   ========================================================================== */
function initContactForm() {
  const form = document.getElementById('contact-form');
  const statusEl = document.getElementById('form-status');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = form.querySelector('#input-name')?.value.trim();
    const phone = form.querySelector('#input-whatsapp')?.value.trim();
    const service = form.querySelector('#input-service')?.value;
    const date = form.querySelector('#input-date')?.value.trim();
    const location = form.querySelector('#input-location')?.value.trim();
    const message = form.querySelector('#input-message')?.value.trim();

    if (!name || !phone) {
      if (statusEl) {
        statusEl.textContent = 'Por favor, informe seu nome e WhatsApp para iniciarmos a conversa.';
        statusEl.className = 'form-status error';
        statusEl.style.display = 'block';
      }
      return;
    }

    const catMatch = (SITE_DATA.categories || []).find((c) => c.id === service);
    const fallbackLabels = {
      casamentos: 'Casamento Intimista',
      outro: 'Outro formato ou projeto especial'
    };
    const serviceName = (catMatch ? catMatch.name : fallbackLabels[service]) || service;

    let text = `Olá, Carly! Vim pelo site do ${SITE_DATA.brand?.name || 'Instantes de Carly'}.\n\n`;
    text += `*Nome:* ${name}\n`;
    text += `*WhatsApp:* ${phone}\n`;
    if (serviceName) text += `*Momento:* ${serviceName}\n`;
    if (date) text += `*Data/Período:* ${date}\n`;
    if (location) text += `*Local de preferência:* ${location}\n`;
    if (message) text += `*História:* ${message}\n`;

    const encoded = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/${SITE_DATA.brand.whatsappNumber}?text=${encoded}`;

    if (statusEl) {
      statusEl.textContent = 'Tudo pronto! Abrindo conversa com Carly no WhatsApp...';
      statusEl.className = 'form-status success';
      statusEl.style.display = 'block';
    }

    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
      form.reset();
    }, 650);
  });
}
