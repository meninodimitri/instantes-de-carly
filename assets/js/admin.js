/**
 * Instantes de Carly — Motor do Painel Admin & Editor Visual (Studio CMS)
 * Suporta:
 * - Otimização automática de imagens via Canvas (DSLR 15MB -> ~320KB Retina)
 * - Detecção automática de orientação Horizontal (3:2) / Vertical (3:4)
 * - Preview em tempo real (PC & Celular iPhone) via postMessage + IndexedDB
 * - Publicação atômica em 1 clique direto na API do GitHub (Vercel / Netlify)
 */

const FACTORY_DATA = JSON.parse(JSON.stringify(SITE_DATA));
let cmsData = JSON.parse(JSON.stringify(SITE_DATA));

let isDirty = false;
let activeTab = 'portfolio';
let activeSubTab = 'sec-hero';
let adminPortfolioFilter = 'vitrine';
let adminPortfolioSearch = '';
let previewDebounceTimer = null;
let galleryPickerCallback = null;
const expandedPortfolioKeys = new Set();
const expandedHeroKeys = new Set();
const expandedPackageKeys = new Set();

const GH_STORAGE_KEY = 'instantes_carly_gh_config';
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

/* ==========================================================================
   1. UTILITÁRIOS, INDEXEDDB & NOTIFICAÇÕES TOAST
   ========================================================================== */
function escapeAttr(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugifyCategory(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `cat-${Date.now()}`;
}

function parseFocalPercent(objectPos) {
  if (!objectPos) return 25;
  const match = String(objectPos).match(/(\d+(?:\.\d+)?)%/);
  return match ? Math.min(100, Math.max(0, Math.round(Number(match[1])))) : 30;
}

function formatBytes(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function showToast(message, type = 'info', durationMs = 4200) {
  const container = document.getElementById('cms-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `cms-toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 220);
  }, durationMs);
}

function openCmsDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('IndexedDB não suportado'));
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

async function readCmsSnapshot(key) {
  try {
    const db = await openCmsDB();
    return await new Promise((resolve) => {
      const tx = db.transaction('snapshots', 'readonly');
      const req = tx.objectStore('snapshots').get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function writeCmsSnapshot(key, dataObj) {
  try {
    const db = await openCmsDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readwrite');
      tx.objectStore('snapshots').put({
        updatedAt: new Date().toISOString(),
        data: JSON.parse(JSON.stringify(dataObj))
      }, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Falha ao gravar snapshot local:', e);
  }
}

async function clearCmsSnapshots() {
  try {
    const db = await openCmsDB();
    await new Promise((resolve) => {
      const tx = db.transaction('snapshots', 'readwrite');
      tx.objectStore('snapshots').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {}
}

function getSavedGitHubConfig() {
  try {
    const raw = localStorage.getItem(GH_STORAGE_KEY) || sessionStorage.getItem(GH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.repo && parsed.token) return parsed;
  } catch (e) {}
  return null;
}

/* ==========================================================================
   2. OTIMIZADOR DE FOTOGRAFIAS CLIENT-SIDE (CANVAS RETINA 1920PX)
   ========================================================================== */
function compressAndReadImage(file, maxDimension = 1920, quality = 0.86) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Selecione um arquivo de imagem válido (JPG, PNG ou WebP).'));
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;
      const aspect = origW >= origH ? 'landscape' : 'portrait';

      let targetW = origW;
      let targetH = origH;

      if (origW > maxDimension || origH > maxDimension) {
        if (origW >= origH) {
          targetW = maxDimension;
          targetH = Math.round((origH / origW) * maxDimension);
        } else {
          targetH = maxDimension;
          targetW = Math.round((origW / origH) * maxDimension);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const approxBytes = Math.round((dataUrl.length * 3) / 4);

      const cleanBaseName = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\bIMG\s*\d+\b/i, '')
        .trim();

      resolve({
        dataUrl,
        width: targetW,
        height: targetH,
        aspect,
        originalBytes: file.size,
        compressedBytes: approxBytes,
        suggestedTitle: cleanBaseName || 'Novo Registro Autoral'
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Não foi possível processar a imagem "${file.name}".`));
    };

    img.src = objectUrl;
  });
}

/* ==========================================================================
   3. SINCRONIZAÇÃO COM PREVIEW AO VIVO E BARRA DE STATUS
   ========================================================================== */
function updateStatusUI() {
  const pill = document.getElementById('cms-status-pill');
  const statusText = document.getElementById('cms-status-text');
  const publishLabel = document.getElementById('btn-publish-label');
  const ghCfg = getSavedGitHubConfig();

  if (pill) {
    pill.classList.toggle('is-dirty', isDirty);
  }

  if (statusText) {
    if (isDirty) {
      statusText.textContent = ghCfg
        ? 'Alterações prontas para publicar'
        : 'Rascunho editado (clique em Salvar)';
    } else {
      statusText.textContent = ghCfg
        ? `Conectado • ${ghCfg.repo}`
        : (isLocalhost ? 'Modo Local Sincronizado' : 'Sincronizado');
    }
  }

  if (publishLabel) {
    publishLabel.textContent = ghCfg
      ? 'Publicar no Site Oficial'
      : 'Salvar & Aplicar no Site';
  }

  // Contadores na barra lateral
  const countPort = document.getElementById('count-portfolio');
  const countHero = document.getElementById('count-hero');
  const countCats = document.getElementById('count-categories');
  const countPkgs = document.getElementById('count-packages');

  if (countPort) countPort.textContent = (cmsData.portfolio || []).length;
  if (countHero) countHero.textContent = (cmsData.heroSlides || []).length;
  if (countCats) countCats.textContent = (cmsData.categories || []).filter((c) => c.id !== 'todos').length;
  if (countPkgs) countPkgs.textContent = (cmsData.packages || []).length;
}

function sendToPreviewIframe(messageObj) {
  const iframe = document.getElementById('cms-preview-iframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(messageObj, '*');
  }
}

function markDirtyAndSync(immediate = false) {
  isDirty = true;
  updateStatusUI();

  if (previewDebounceTimer) clearTimeout(previewDebounceTimer);

  const runSync = () => {
    writeCmsSnapshot('draft_working', cmsData);
    sendToPreviewIframe({
      type: 'CMS_LIVE_UPDATE',
      payload: cmsData
    });
  };

  if (immediate) {
    runSync();
  } else {
    previewDebounceTimer = setTimeout(runSync, 130);
  }
}

function scrollPreviewTo(selector) {
  sendToPreviewIframe({
    type: 'CMS_SCROLL_TO',
    selector
  });
}

/* ==========================================================================
   4. PORTÃO DE ACESSO (AUTH GATE) & CONEXÃO GITHUB
   ========================================================================== */
async function verifyGitHubCredentials(repo, branch, token) {
  const cleanRepo = String(repo || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '');
  if (!cleanRepo.includes('/')) {
    throw new Error('Informe o repositório no formato usuario/nome-do-repositorio.');
  }
  if (!token || token.trim().length < 10) {
    throw new Error('Informe um GitHub Personal Access Token válido.');
  }

  const res = await fetch(`https://api.github.com/repos/${cleanRepo}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token.trim()}`
    }
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('Token inválido ou expirado no GitHub.');
    if (res.status === 404) throw new Error(`Repositório "${cleanRepo}" não encontrado ou sem permissão.`);
    throw new Error(`Erro do GitHub (HTTP ${res.status}).`);
  }

  const repoInfo = await res.json();
  if (repoInfo.permissions && repoInfo.permissions.push === false) {
    throw new Error('Este Token possui apenas leitura. Habilite a permissão "Contents: Read and write".');
  }

  return {
    repo: cleanRepo,
    branch: (branch || repoInfo.default_branch || 'main').trim(),
    token: token.trim()
  };
}

function unlockStudio() {
  const gate = document.getElementById('auth-gate');
  if (gate) {
    gate.hidden = true;
    gate.style.display = 'none';
  }
  syncGitHubSettingsPanel();
  updateStatusUI();
  sendToPreviewIframe({ type: 'CMS_LIVE_UPDATE', payload: cmsData });
}

function initAuthGate() {
  const gate = document.getElementById('auth-gate');
  const localBox = document.getElementById('auth-local-box');
  const divider = document.getElementById('auth-divider');
  const btnLocal = document.getElementById('btn-enter-local');
  const ghForm = document.getElementById('auth-gh-form');
  const errBox = document.getElementById('auth-error-msg');
  const btnLogout = document.getElementById('btn-logout-studio');

  if (isLocalhost) {
    if (localBox) localBox.hidden = false;
    if (divider) divider.hidden = false;
  }

  const savedGh = getSavedGitHubConfig();
  if (savedGh) {
    unlockStudio();
  } else if (isLocalhost && (sessionStorage.getItem('cms_local_unlocked') === '1' || new URLSearchParams(window.location.search).has('local'))) {
    sessionStorage.setItem('cms_local_unlocked', '1');
    unlockStudio();
  }

  btnLocal?.addEventListener('click', () => {
    sessionStorage.setItem('cms_local_unlocked', '1');
    unlockStudio();
    showToast('Bem-vindo ao Editor Visual (Modo Local)!', 'success');
  });

  ghForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const repo = document.getElementById('auth-repo')?.value || '';
    const branch = document.getElementById('auth-branch')?.value || 'main';
    const token = document.getElementById('auth-token')?.value || '';
    const remember = document.getElementById('auth-remember')?.checked;
    const submitBtn = document.getElementById('btn-auth-gh');

    if (errBox) errBox.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;

    try {
      const verified = await verifyGitHubCredentials(repo, branch, token);
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(GH_STORAGE_KEY, JSON.stringify(verified));
      unlockStudio();
      showToast(`Conectado com sucesso ao repositório ${verified.repo}!`, 'success');
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message;
        errBox.style.display = 'block';
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  btnLogout?.addEventListener('click', () => {
    sessionStorage.removeItem('cms_local_unlocked');
    sessionStorage.removeItem(GH_STORAGE_KEY);
    if (gate) gate.hidden = false;
  });
}

/* ==========================================================================
   5. MODAL SELETOR DE GALERIA EXISTENTE (<dialog>)
   ========================================================================== */
function openGalleryPicker(onSelectImage) {
  const dialog = document.getElementById('gallery-picker-dialog');
  const grid = document.getElementById('gallery-picker-grid');
  if (!dialog || !grid) return;

  galleryPickerCallback = onSelectImage;

  // Coletar imagens únicas do portfólio + capa + perfil
  const seen = new Set();
  const candidates = [];

  (cmsData.portfolio || []).forEach((p) => {
    if (p.image && !seen.has(p.image)) {
      seen.add(p.image);
      candidates.push({ image: p.image, label: `${p.title} (${p.categoryName || p.category})` });
    }
  });

  (cmsData.heroSlides || []).forEach((s) => {
    if (s.image && !seen.has(s.image)) {
      seen.add(s.image);
      candidates.push({ image: s.image, label: `Capa: ${s.shortLabel || s.category}` });
    }
  });

  if (cmsData.sections?.sobre?.profilePhoto && !seen.has(cmsData.sections.sobre.profilePhoto)) {
    candidates.push({ image: cmsData.sections.sobre.profilePhoto, label: 'Retrato Carly' });
  }

  grid.innerHTML = candidates.map((item, idx) => `
    <button type="button" class="gallery-picker-item" data-pick-idx="${idx}">
      <img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.label)}" loading="lazy" />
      <span>${escapeAttr(item.label)}</span>
    </button>
  `).join('');

  grid.querySelectorAll('.gallery-picker-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-pick-idx'), 10);
      const chosen = candidates[idx];
      if (chosen && typeof galleryPickerCallback === 'function') {
        galleryPickerCallback(chosen.image, chosen.label);
      }
      dialog.close();
    });
  });

  dialog.showModal();
}

/* ==========================================================================
   6. ABA 1: PORTFÓLIO & UPLOAD DE FOTOS
   ========================================================================== */
function populateUploadCategorySelect() {
  const select = document.getElementById('upload-default-category');
  if (!select) return;

  const editableCats = (cmsData.categories || []).filter((c) => c.id !== 'todos');
  const prevVal = select.value;
  select.innerHTML = editableCats.map((c) => `
    <option value="${escapeAttr(c.id)}">${escapeAttr(c.name)}</option>
  `).join('');

  if (editableCats.some((c) => c.id === prevVal)) {
    select.value = prevVal;
  }
}

function renderAdminPortfolioFilterPills() {
  const container = document.getElementById('admin-portfolio-cat-pills');
  if (!container) return;

  const cats = cmsData.categories || [];
  const editableCats = cats.filter((c) => c.id !== 'todos');

  // Contagem de capas da Vitrine (uma para cada categoria com fotos)
  let vitrineCount = 0;
  editableCats.forEach((cat) => {
    const hasPhoto = (cmsData.portfolio || []).some((p) => p.category === cat.id);
    if (hasPhoto) vitrineCount++;
  });
  const totalPhotos = (cmsData.portfolio || []).length;

  if (adminPortfolioFilter !== 'vitrine' && adminPortfolioFilter !== 'todas' && !cats.some((c) => c.id === adminPortfolioFilter)) {
    adminPortfolioFilter = 'vitrine';
  }

  const isVitrine = adminPortfolioFilter === 'vitrine' || adminPortfolioFilter === 'todos';
  const isTodas = adminPortfolioFilter === 'todas';

  let html = `
    <button type="button" class="admin-cat-pill admin-cat-pill-vitrine ${isVitrine ? 'active' : ''}" data-filter-cat="vitrine" title="Vitrine do Acervo: As fotos-capa que aparecem na entrada do site (1 por categoria)">
      ✨ Vitrine do Acervo (${vitrineCount} capas)
    </button>
    <button type="button" class="admin-cat-pill ${isTodas ? 'active' : ''}" data-filter-cat="todas" title="Banco Geral: Gerencie e visualize todas as fotografias enviadas">
      📁 Todas as Fotos (${totalPhotos})
    </button>
    <span class="admin-cat-pill-sep" aria-hidden="true"></span>
  `;

  html += editableCats.map((cat) => {
    const count = (cmsData.portfolio || []).filter((p) => p.category === cat.id).length;
    const isAct = cat.id === adminPortfolioFilter;
    return `
      <button type="button" class="admin-cat-pill ${isAct ? 'active' : ''}" data-filter-cat="${escapeAttr(cat.id)}">
        ${escapeAttr(cat.name)} (${count})
      </button>
    `;
  }).join('');

  container.innerHTML = html;

  container.querySelectorAll('.admin-cat-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      adminPortfolioFilter = pill.getAttribute('data-filter-cat');
      renderPortfolioAdmin();

      // Sincroniza o preview ao vivo para o filtro correspondente
      if (adminPortfolioFilter === 'vitrine' || adminPortfolioFilter === 'todas') {
        sendToPreviewIframe({
          type: 'CMS_SELECT_PORTFOLIO_CATEGORY',
          category: 'todos'
        });
      } else {
        sendToPreviewIframe({
          type: 'CMS_SELECT_PORTFOLIO_CATEGORY',
          category: adminPortfolioFilter
        });
      }
    });
  });
}

function isEffectiveAcervoCover(photo, portfolio) {
  if (!photo || !photo.category) return false;
  const catItems = (portfolio || []).filter((p) => p.category === photo.category);
  const explicitCover = catItems.find((p) => p.isAcervoCover === true);
  if (explicitCover) return explicitCover === photo;
  return catItems[0] === photo;
}

function renderPortfolioAdmin() {
  populateUploadCategorySelect();
  renderAdminPortfolioFilterPills();

  const listEl = document.getElementById('portfolio-cards-list');
  if (!listEl) return;

  const editableCats = (cmsData.categories || []).filter((c) => c.id !== 'todos');
  const query = adminPortfolioSearch.trim().toLowerCase();

  const isVitrine = adminPortfolioFilter === 'vitrine' || adminPortfolioFilter === 'todos';
  const isTodas = adminPortfolioFilter === 'todas';

  if (isVitrine) {
    // =========================================================================
    // MODO VITRINE DO ACERVO: APENAS AS FOTOS-CAPA (1 POR CATEGORIA)
    // A ordem dos cartões reflete a ordem real das categorias na vitrine!
    // =========================================================================
    const vitrineItems = [];
    editableCats.forEach((cat) => {
      const catPhotos = (cmsData.portfolio || []).filter((p) => p.category === cat.id);
      if (!catPhotos.length) return;
      const explicitCover = catPhotos.find((p) => p.isAcervoCover === true);
      const coverPhoto = explicitCover || catPhotos[0];
      const realIdx = cmsData.portfolio.indexOf(coverPhoto);
      const catIdx = editableCats.indexOf(cat);

      if (query) {
        const matchSearch = (coverPhoto.title || '').toLowerCase().includes(query)
          || (coverPhoto.location || '').toLowerCase().includes(query)
          || (cat.name || '').toLowerCase().includes(query)
          || (coverPhoto.caption || '').toLowerCase().includes(query);
        if (!matchSearch) return;
      }

      vitrineItems.push({
        photo: coverPhoto,
        realIdx,
        cat,
        catPhotos,
        catIdx
      });
    });

    if (vitrineItems.length === 0) {
      listEl.innerHTML = `
        <div class="cms-section-card" style="text-align: center; color: var(--cms-text-muted);">
          Nenhuma capa encontrada na Vitrine do Acervo com este termo de busca.
        </div>
      `;
      return;
    }

    listEl.innerHTML = vitrineItems.map(({ photo, realIdx, cat, catPhotos }, vIdx) => {
      const focalPct = parseFocalPercent(photo.objectPosition);
      const numStr = (vIdx + 1).toString().padStart(2, '0');
      const cardKey = `vitrine-${cat.id}-${photo.id ?? realIdx}`;
      const isOpen = expandedPortfolioKeys.has(cardKey);

      return `
        <article class="cms-compact-card photo-editor-card-v3 is-vitrine-card ${isOpen ? 'is-open' : ''}" data-real-idx="${realIdx}" data-cat-id="${escapeAttr(cat.id)}" data-v-idx="${vIdx}" data-card-key="${escapeAttr(cardKey)}">
          <div class="cms-compact-summary">
            <div class="cms-compact-left">
              <div class="cms-quick-order">
                <button type="button" class="cms-quick-order-btn js-vitrine-up" ${vIdx === 0 ? 'disabled' : ''} title="Subir esta capa na vitrine">▲</button>
                <button type="button" class="cms-quick-order-btn js-vitrine-down" ${vIdx === vitrineItems.length - 1 ? 'disabled' : ''} title="Descer esta capa na vitrine">▼</button>
              </div>

              <div class="cms-compact-thumb" data-aspect="${escapeAttr(photo.aspect || 'landscape')}">
                <span class="cms-compact-num">#${numStr}</span>
                <img src="${escapeAttr(photo.image)}" alt="${escapeAttr(photo.title)}" style="object-position: center ${focalPct}%;" />
              </div>

              <div class="cms-compact-main">
                <input type="text" class="cms-inline-title-input js-port-title" value="${escapeAttr(photo.title || '')}" placeholder="Título da fotografia de capa…" aria-label="Título da fotografia" />
                <div class="cms-compact-subrow" style="align-items: center; gap: 8px;">
                  <span class="admin-cat-pill" style="padding: 2px 8px; font-size: 0.70rem; font-weight: 700; background: var(--cms-surface); border-color: var(--cms-border);">
                    ${escapeAttr(cat.name)}
                  </span>
                  <span style="font-size: 0.70rem; color: var(--cms-text-muted);">${catPhotos.length} foto(s) no acervo</span>
                </div>

                ${catPhotos.length > 1 ? `
                  <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                    <label style="font-size: 0.68rem; color: var(--cms-text-muted); white-space: nowrap; font-weight: 600;">Trocar Foto da Capa:</label>
                    <select class="cms-select-compact js-vitrine-select-cover" title="Escolha qual foto deste ensaio será a foto-capa na Vitrine do Acervo">
                      ${catPhotos.map((p, pIdx) => {
                        const isSelected = p === photo;
                        const pName = p.title ? p.title : `Foto #${(pIdx + 1).toString().padStart(2, '0')}`;
                        return `<option value="${escapeAttr(p.id ?? pIdx)}" ${isSelected ? 'selected' : ''}>${escapeAttr(pName)}</option>`;
                      }).join('')}
                    </select>
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="cms-compact-right">
              <span style="font-size: 0.70rem; font-weight: 700; color: #10b981; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 999px; padding: 3px 8px; white-space: nowrap;">
                ★ Capa da Vitrine
              </span>

              <button type="button" class="cms-drawer-btn js-toggle-port-drawer" aria-expanded="${isOpen ? 'true' : 'false'}">
                ${isOpen ? 'Fechar ▲' : 'Editar ▾'}
              </button>
            </div>
          </div>

          <div class="cms-compact-drawer" ${isOpen ? '' : 'hidden'}>
            <div class="field-grid">
              <div class="field-group">
                <label class="field-label">Local do Ensaio</label>
                <input type="text" class="cms-input js-port-location" value="${escapeAttr(photo.location || '')}" placeholder="Ex: Praia de Iracema" />
              </div>

              <div class="field-group">
                <label class="field-label">Formato na Grade</label>
                <select class="cms-select js-port-aspect">
                  <option value="landscape" ${photo.aspect !== 'portrait' ? 'selected' : ''}>Horizontal (Paisagem 3:2)</option>
                  <option value="portrait" ${photo.aspect === 'portrait' ? 'selected' : ''}>Vertical (Retrato 3:4)</option>
                </select>
              </div>
            </div>

            <div class="field-grid" style="align-items: center;">
              <div class="field-group" style="margin-bottom: 10px;">
                <label class="field-label" style="display: flex; justify-content: space-between;">
                  <span>Enquadramento Vertical</span>
                  <strong class="focal-val-label">${focalPct}%</strong>
                </label>
                <input type="range" min="0" max="100" value="${focalPct}" class="js-port-focal" style="width: 100%;" />
              </div>

              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
                <input type="file" accept="image/jpeg,image/png,image/webp" class="js-port-replace-input" hidden />
                <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-port-replace-btn">Trocar Foto</button>
                <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-port-send-hero" title="Enviar também para o topo do site">+ Enviar p/ Capa do Site</button>
              </div>
            </div>

            <div class="field-group">
              <label class="field-label">História / Legenda Afetiva</label>
              <textarea class="cms-textarea js-port-caption" style="min-height: 60px;">${escapeAttr(photo.caption || '')}</textarea>
            </div>

            <div class="photo-card-toolbar">
              <div class="order-btns">
                <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-vitrine-up" ${vIdx === 0 ? 'disabled' : ''} title="Mover categoria para cima na Vitrine do site">↑ Subir Capa</button>
                <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-vitrine-down" ${vIdx === vitrineItems.length - 1 ? 'disabled' : ''} title="Mover categoria para baixo na Vitrine do site">↓ Descer Capa</button>
              </div>
              <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-vitrine-open-cat" data-cat-id="${escapeAttr(cat.id)}">
                Ver todas as fotos de ${escapeAttr(cat.name)} (${catPhotos.length}) →
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    bindVitrineCardsEvents(listEl);
    return;
  }

  // =========================================================================
  // MODO TODAS AS FOTOS OU CATEGORIA ESPECÍFICA
  // =========================================================================
  const indexedItems = (cmsData.portfolio || []).map((photo, realIdx) => ({ photo, realIdx }));
  const filtered = indexedItems.filter(({ photo }) => {
    const matchCat = isTodas || photo.category === adminPortfolioFilter;
    const matchSearch = !query
      || (photo.title || '').toLowerCase().includes(query)
      || (photo.location || '').toLowerCase().includes(query)
      || (photo.caption || '').toLowerCase().includes(query);
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="cms-section-card" style="text-align: center; color: var(--cms-text-muted);">
        Nenhuma fotografia encontrada neste filtro. Envie novas fotos na área acima!
      </div>
    `;
    return;
  }

  const catPhotosForFilter = isTodas ? [] : (cmsData.portfolio || []).filter((p) => p.category === adminPortfolioFilter);

  listEl.innerHTML = filtered.map(({ photo, realIdx }) => {
    const focalPct = parseFocalPercent(photo.objectPosition);
    const isUploadedNew = String(photo.image || '').startsWith('data:image/');
    const catPhotoIdx = isTodas ? realIdx : catPhotosForFilter.indexOf(photo);
    const numStr = (catPhotoIdx + 1).toString().padStart(2, '0');
    const isAcervoCover = isEffectiveAcervoCover(photo, cmsData.portfolio);
    const cardKey = String(photo.id ?? realIdx);
    const isOpen = expandedPortfolioKeys.has(cardKey);

    const isFirstInOrder = isTodas ? (realIdx === 0) : (catPhotoIdx === 0);
    const isLastInOrder = isTodas ? (realIdx === cmsData.portfolio.length - 1) : (catPhotoIdx === catPhotosForFilter.length - 1);

    return `
      <article class="cms-compact-card photo-editor-card-v3 ${isOpen ? 'is-open' : ''}" data-real-idx="${realIdx}" data-card-key="${escapeAttr(cardKey)}">
        <div class="cms-compact-summary">
          <div class="cms-compact-left">
            <div class="cms-compact-thumb" data-aspect="${escapeAttr(photo.aspect || 'landscape')}">
              <span class="cms-compact-num">#${numStr}</span>
              <img src="${escapeAttr(photo.image)}" alt="${escapeAttr(photo.title)}" style="object-position: center ${focalPct}%;" />
            </div>

            <div class="cms-compact-main">
              <input type="text" class="cms-inline-title-input js-port-title" value="${escapeAttr(photo.title || '')}" placeholder="Título da fotografia…" aria-label="Título da fotografia" />
              <div class="cms-compact-subrow">
                <select class="cms-select-compact js-port-category" aria-label="Categoria da fotografia">
                  ${editableCats.map((c) => `
                    <option value="${escapeAttr(c.id)}" ${c.id === photo.category ? 'selected' : ''}>${escapeAttr(c.name)}</option>
                  `).join('')}
                </select>
                ${isUploadedNew ? '<span class="admin-cat-pill" style="padding: 2px 8px; font-size: 0.68rem;">Nova</span>' : ''}
              </div>
            </div>
          </div>

          <div class="cms-compact-right">
            <label class="cms-switch" title="Usar esta foto como capa desta categoria no filtro Acervo Completo">
              <input type="checkbox" class="js-port-acervo-switch" ${isAcervoCover ? 'checked' : ''} />
              <span class="cms-switch-track"></span>
              <span>Capa da Categoria</span>
            </label>

            <button type="button" class="cms-drawer-btn js-toggle-port-drawer" aria-expanded="${isOpen ? 'true' : 'false'}">
              ${isOpen ? 'Fechar ▲' : 'Editar ▾'}
            </button>
          </div>
        </div>

        <div class="cms-compact-drawer" ${isOpen ? '' : 'hidden'}>
          <div class="field-grid">
            <div class="field-group">
              <label class="field-label">Local do Ensaio</label>
              <input type="text" class="cms-input js-port-location" value="${escapeAttr(photo.location || '')}" placeholder="Ex: Praia de Iracema" />
            </div>

            <div class="field-group">
              <label class="field-label">Formato na Grade</label>
              <select class="cms-select js-port-aspect">
                <option value="landscape" ${photo.aspect !== 'portrait' ? 'selected' : ''}>Horizontal (Paisagem 3:2)</option>
                <option value="portrait" ${photo.aspect === 'portrait' ? 'selected' : ''}>Vertical (Retrato 3:4)</option>
              </select>
            </div>
          </div>

          <div class="field-grid" style="align-items: center;">
            <div class="field-group" style="margin-bottom: 10px;">
              <label class="field-label" style="display: flex; justify-content: space-between;">
                <span>Enquadramento Vertical</span>
                <strong class="focal-val-label">${focalPct}%</strong>
              </label>
              <input type="range" min="0" max="100" value="${focalPct}" class="js-port-focal" style="width: 100%;" />
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
              <input type="file" accept="image/jpeg,image/png,image/webp" class="js-port-replace-input" hidden />
              <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-port-replace-btn">Trocar Foto</button>
              <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-port-send-hero" title="Enviar também para o topo do site">+ Enviar p/ Capa do Site</button>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">História / Legenda Afetiva</label>
            <textarea class="cms-textarea js-port-caption" style="min-height: 60px;">${escapeAttr(photo.caption || '')}</textarea>
          </div>

          <div class="photo-card-toolbar">
            <div class="order-btns">
              <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-port-up" ${isFirstInOrder ? 'disabled' : ''}>↑ Subir</button>
              <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-port-down" ${isLastInOrder ? 'disabled' : ''}>↓ Descer</button>
            </div>
            <button type="button" class="cms-btn cms-btn-danger cms-btn-sm js-port-delete">Excluir Foto</button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  bindGeneralPortfolioEvents(listEl, isTodas);
}

function bindVitrineCardsEvents(listEl) {
  const editableCats = (cmsData.categories || []).filter((c) => c.id !== 'todos');

  listEl.querySelectorAll('.is-vitrine-card').forEach((card) => {
    const realIdx = parseInt(card.getAttribute('data-real-idx'), 10);
    const catId = card.getAttribute('data-cat-id');
    const catIdx = parseInt(card.getAttribute('data-cat-idx'), 10);
    const cardKey = card.getAttribute('data-card-key');
    const photo = cmsData.portfolio[realIdx];
    if (!photo) return;

    const thumbImg = card.querySelector('.cms-compact-thumb img');
    const thumbFrame = card.querySelector('.cms-compact-thumb');
    const focalLabel = card.querySelector('.focal-val-label');
    const drawer = card.querySelector('.cms-compact-drawer');
    const toggleBtn = card.querySelector('.js-toggle-port-drawer');

    toggleBtn?.addEventListener('click', () => {
      const willOpen = drawer.hidden;
      drawer.hidden = !willOpen;
      card.classList.toggle('is-open', willOpen);
      toggleBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      toggleBtn.textContent = willOpen ? 'Fechar ▲' : 'Editar ▾';
      if (willOpen) expandedPortfolioKeys.add(cardKey);
      else expandedPortfolioKeys.delete(cardKey);
    });

    card.querySelector('.js-port-title')?.addEventListener('input', (e) => {
      photo.title = e.target.value;
      markDirtyAndSync(false);
    });

    card.querySelector('.js-port-location')?.addEventListener('input', (e) => {
      photo.location = e.target.value;
      markDirtyAndSync(false);
    });

    card.querySelector('.js-port-caption')?.addEventListener('input', (e) => {
      photo.caption = e.target.value;
      markDirtyAndSync(false);
    });

    card.querySelector('.js-port-aspect')?.addEventListener('change', (e) => {
      photo.aspect = e.target.value;
      if (thumbFrame) thumbFrame.setAttribute('data-aspect', photo.aspect);
      markDirtyAndSync(true);
    });

    card.querySelector('.js-port-focal')?.addEventListener('input', (e) => {
      const val = e.target.value;
      photo.objectPosition = `center ${val}%`;
      if (thumbImg) thumbImg.style.objectPosition = photo.objectPosition;
      if (focalLabel) focalLabel.textContent = `${val}%`;

      // Atualização imediata em tempo real no Preview ao vivo (sem debounce)
      sendToPreviewIframe({
        type: 'CMS_UPDATE_FOCAL',
        image: photo.image,
        objectPosition: photo.objectPosition
      });

      markDirtyAndSync(false);
    });

    // Seletor rápido de qual foto assume a capa desta categoria
    card.querySelector('.js-vitrine-select-cover')?.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      const catPhotos = (cmsData.portfolio || []).filter((p) => p.category === catId);
      catPhotos.forEach((p, pIdx) => {
        const match = String(p.id ?? pIdx) === String(selectedId);
        p.isAcervoCover = match;
      });
      markDirtyAndSync(true);
      renderPortfolioAdmin();
      showToast('Foto de capa da categoria atualizada na Vitrine!', 'success');
    });

    // Trocar imagem
    const repInput = card.querySelector('.js-port-replace-input');
    card.querySelector('.js-port-replace-btn')?.addEventListener('click', () => repInput?.click());
    repInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const res = await compressAndReadImage(file);
        photo.image = res.dataUrl;
        photo.aspect = res.aspect;
        markDirtyAndSync(true);
        renderPortfolioAdmin();
        showToast(`Foto substituída e otimizada (${formatBytes(res.originalBytes)} → ${formatBytes(res.compressedBytes)})`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Copiar para Capa (Hero)
    card.querySelector('.js-port-send-hero')?.addEventListener('click', () => {
      cmsData.heroSlides.push({
        id: String(cmsData.heroSlides.length + 1).padStart(2, '0'),
        image: photo.image,
        category: photo.categoryName || 'Ensaio Autoral',
        shortLabel: photo.categoryName || 'Ensaio',
        title: photo.title || 'Instantes de Carly',
        location: photo.location || 'Fortaleza, Ceará',
        quote: `“${photo.caption || 'Memórias reais registradas com calma e afeto.'}”`,
        objectPosition: photo.objectPosition || 'center 35%'
      });
      markDirtyAndSync(true);
      showToast(`"${photo.title || 'Foto'}" adicionada à Capa do Site!`, 'success');
    });

    // Reordenar Capas na Vitrine (Subir / Descer)
    const handleMoveUp = () => {
      const idxInCats = cmsData.categories.findIndex((c) => c.id === catId);
      // Índice 0 é 'todos'; o primeiro da vitrine é índice 1
      if (idxInCats <= 1) return;
      const tmp = cmsData.categories[idxInCats - 1];
      cmsData.categories[idxInCats - 1] = cmsData.categories[idxInCats];
      cmsData.categories[idxInCats] = tmp;
      markDirtyAndSync(true);
      renderPortfolioAdmin();
      showToast('Ordem da vitrine atualizada!', 'success');
    };

    const handleMoveDown = () => {
      const idxInCats = cmsData.categories.findIndex((c) => c.id === catId);
      if (idxInCats === -1 || idxInCats >= cmsData.categories.length - 1) return;
      const tmp = cmsData.categories[idxInCats + 1];
      cmsData.categories[idxInCats + 1] = cmsData.categories[idxInCats];
      cmsData.categories[idxInCats] = tmp;
      markDirtyAndSync(true);
      renderPortfolioAdmin();
      showToast('Ordem da vitrine atualizada!', 'success');
    };

    card.querySelectorAll('.js-vitrine-up').forEach((b) => b.addEventListener('click', handleMoveUp));
    card.querySelectorAll('.js-vitrine-down').forEach((b) => b.addEventListener('click', handleMoveDown));

    // Abrir categoria completa
    card.querySelector('.js-vitrine-open-cat')?.addEventListener('click', () => {
      adminPortfolioFilter = catId;
      renderPortfolioAdmin();
      sendToPreviewIframe({
        type: 'CMS_SELECT_PORTFOLIO_CATEGORY',
        category: catId
      });
    });
  });
}

function bindGeneralPortfolioEvents(listEl, isTodas) {
  listEl.querySelectorAll('.photo-editor-card-v3:not(.is-vitrine-card)').forEach((card) => {
    const idx = parseInt(card.getAttribute('data-real-idx'), 10);
    const cardKey = card.getAttribute('data-card-key');
    const item = cmsData.portfolio[idx];
    if (!item) return;

    const thumbImg = card.querySelector('.cms-compact-thumb img');
    const thumbFrame = card.querySelector('.cms-compact-thumb');
    const focalLabel = card.querySelector('.focal-val-label');
    const drawer = card.querySelector('.cms-compact-drawer');
    const toggleBtn = card.querySelector('.js-toggle-port-drawer');

    toggleBtn?.addEventListener('click', () => {
      const willOpen = drawer.hidden;
      drawer.hidden = !willOpen;
      card.classList.toggle('is-open', willOpen);
      toggleBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      toggleBtn.textContent = willOpen ? 'Fechar ▲' : 'Editar ▾';
      if (willOpen) expandedPortfolioKeys.add(cardKey);
      else expandedPortfolioKeys.delete(cardKey);
    });

    card.querySelector('.js-port-title')?.addEventListener('input', (e) => {
      item.title = e.target.value;
      markDirtyAndSync(false);
    });

    card.querySelector('.js-port-location')?.addEventListener('input', (e) => {
      item.location = e.target.value;
      markDirtyAndSync(false);
    });

    card.querySelector('.js-port-caption')?.addEventListener('input', (e) => {
      item.caption = e.target.value;
      markDirtyAndSync(false);
    });

    card.querySelector('.js-port-category')?.addEventListener('change', (e) => {
      const newCatId = e.target.value;
      const catObj = (cmsData.categories || []).find((c) => c.id === newCatId);
      const targetHasExplicitCover = (cmsData.portfolio || []).some(
        (p) => p !== item && p.category === newCatId && p.isAcervoCover === true
      );
      item.category = newCatId;
      item.categoryName = catObj ? catObj.name : newCatId;
      if (targetHasExplicitCover) {
        item.isAcervoCover = false;
      }
      markDirtyAndSync(true);
      renderPortfolioAdmin();
    });

    card.querySelector('.js-port-aspect')?.addEventListener('change', (e) => {
      item.aspect = e.target.value;
      if (thumbFrame) thumbFrame.setAttribute('data-aspect', item.aspect);
      markDirtyAndSync(true);
    });

    card.querySelector('.js-port-focal')?.addEventListener('input', (e) => {
      const val = e.target.value;
      item.objectPosition = `center ${val}%`;
      if (thumbImg) thumbImg.style.objectPosition = item.objectPosition;
      if (focalLabel) focalLabel.textContent = `${val}%`;

      // Atualização imediata em tempo real no Preview ao vivo (sem debounce)
      sendToPreviewIframe({
        type: 'CMS_UPDATE_FOCAL',
        image: item.image,
        objectPosition: item.objectPosition
      });

      markDirtyAndSync(false);
    });

    // Trocar imagem
    const repInput = card.querySelector('.js-port-replace-input');
    card.querySelector('.js-port-replace-btn')?.addEventListener('click', () => repInput?.click());
    repInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const res = await compressAndReadImage(file);
        item.image = res.dataUrl;
        item.aspect = res.aspect;
        markDirtyAndSync(true);
        renderPortfolioAdmin();
        showToast(`Foto substituída e otimizada (${formatBytes(res.originalBytes)} → ${formatBytes(res.compressedBytes)})`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Copiar para Capa (Hero)
    card.querySelector('.js-port-send-hero')?.addEventListener('click', () => {
      cmsData.heroSlides.push({
        id: String(cmsData.heroSlides.length + 1).padStart(2, '0'),
        image: item.image,
        category: item.categoryName || 'Ensaio Autoral',
        shortLabel: item.categoryName || 'Ensaio',
        title: item.title || 'Instantes de Carly',
        location: item.location || 'Fortaleza, Ceará',
        quote: `“${item.caption || 'Memórias reais registradas com calma e afeto.'}”`,
        objectPosition: item.objectPosition || 'center 35%'
      });
      markDirtyAndSync(true);
      showToast(`"${item.title}" adicionada à Capa do Site!`, 'success');
    });

    // Chave ON/OFF: Definir como Capa da Categoria no Acervo Completo
    card.querySelector('.js-port-acervo-switch')?.addEventListener('change', (e) => {
      if (!e.target.checked) {
        e.target.checked = true;
        showToast('Escolha outra foto desta categoria caso queira trocar a capa do Acervo.', 'info');
        return;
      }
      (cmsData.portfolio || []).forEach((p) => {
        if (p.category === item.category) {
          p.isAcervoCover = (p === item);
        }
      });
      const catObj = (cmsData.categories || []).find((c) => c.id === item.category);
      const catLabel = catObj ? catObj.name : (item.categoryName || item.category);
      markDirtyAndSync(true);
      renderPortfolioAdmin();
      showToast(`"${item.title || 'Fotografia'}" definida como capa de "${catLabel}" no Acervo!`, 'success');
    });

    // Subir / Descer / Excluir
    card.querySelector('.js-port-up')?.addEventListener('click', () => {
      if (isTodas) {
        if (idx <= 0) return;
        const tmp = cmsData.portfolio[idx - 1];
        cmsData.portfolio[idx - 1] = cmsData.portfolio[idx];
        cmsData.portfolio[idx] = tmp;
        markDirtyAndSync(true);
        renderPortfolioAdmin();
      } else {
        const catPhotos = (cmsData.portfolio || []).filter((p) => p.category === item.category);
        const catItemIdx = catPhotos.indexOf(item);
        if (catItemIdx <= 0) return;
        const targetPhoto = catPhotos[catItemIdx - 1];
        const realA = cmsData.portfolio.indexOf(item);
        const realB = cmsData.portfolio.indexOf(targetPhoto);
        if (realA !== -1 && realB !== -1) {
          cmsData.portfolio[realA] = targetPhoto;
          cmsData.portfolio[realB] = item;
          markDirtyAndSync(true);
          renderPortfolioAdmin();
        }
      }
    });

    card.querySelector('.js-port-down')?.addEventListener('click', () => {
      if (isTodas) {
        if (idx >= cmsData.portfolio.length - 1) return;
        const tmp = cmsData.portfolio[idx + 1];
        cmsData.portfolio[idx + 1] = cmsData.portfolio[idx];
        cmsData.portfolio[idx] = tmp;
        markDirtyAndSync(true);
        renderPortfolioAdmin();
      } else {
        const catPhotos = (cmsData.portfolio || []).filter((p) => p.category === item.category);
        const catItemIdx = catPhotos.indexOf(item);
        if (catItemIdx >= catPhotos.length - 1) return;
        const targetPhoto = catPhotos[catItemIdx + 1];
        const realA = cmsData.portfolio.indexOf(item);
        const realB = cmsData.portfolio.indexOf(targetPhoto);
        if (realA !== -1 && realB !== -1) {
          cmsData.portfolio[realA] = targetPhoto;
          cmsData.portfolio[realB] = item;
          markDirtyAndSync(true);
          renderPortfolioAdmin();
        }
      }
    });

    card.querySelector('.js-port-delete')?.addEventListener('click', () => {
      if (!confirm(`Deseja realmente remover a fotografia "${item.title}" do portfólio?`)) return;
      cmsData.portfolio.splice(idx, 1);
      markDirtyAndSync(true);
      renderPortfolioAdmin();
      showToast('Fotografia removida do portfólio.', 'info');
    });
  });
}

async function handleMultiplePortfolioFiles(fileList) {
  const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;

  const catSelect = document.getElementById('upload-default-category');
  const locInput = document.getElementById('upload-default-location');
  const chosenCatId = catSelect?.value || 'casais';
  const catObj = (cmsData.categories || []).find((c) => c.id === chosenCatId);
  const chosenCatName = catObj ? catObj.name : 'Ensaio';
  const chosenLoc = (locInput?.value || 'Fortaleza, Ceará').trim();

  showToast(`Otimizando ${files.length} ${files.length === 1 ? 'fotografia' : 'fotografias'}...`, 'info', 2500);

  let addedCount = 0;
  const newItems = [];

  for (const file of files) {
    try {
      const optimized = await compressAndReadImage(file);
      newItems.push({
        id: Date.now() + Math.floor(Math.random() * 10000),
        title: optimized.suggestedTitle,
        category: chosenCatId,
        categoryName: chosenCatName,
        aspect: optimized.aspect,
        image: optimized.dataUrl,
        objectPosition: 'center 25%',
        location: chosenLoc,
        caption: 'Registros conduzidos com calma, escuta e luz natural em Fortaleza.'
      });
      addedCount++;
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  if (addedCount > 0) {
    cmsData.portfolio.unshift(...newItems);
    adminPortfolioFilter = 'todos';
    markDirtyAndSync(true);
    renderPortfolioAdmin();
    scrollPreviewTo('#portfolio');
    showToast(`${addedCount} ${addedCount === 1 ? 'nova foto adicionada' : 'novas fotos adicionadas'} em "${chosenCatName}"!`, 'success');
  }
}

function initPortfolioUploadZone() {
  const box = document.getElementById('portfolio-upload-box');
  const trigger = document.getElementById('portfolio-drop-trigger');
  const fileInput = document.getElementById('portfolio-file-input');
  const searchInput = document.getElementById('admin-portfolio-search');

  trigger?.addEventListener('click', () => fileInput?.click());
  trigger?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput?.click();
    }
  });

  fileInput?.addEventListener('change', async (e) => {
    await handleMultiplePortfolioFiles(e.target.files);
    fileInput.value = '';
  });

  box?.addEventListener('dragover', (e) => {
    e.preventDefault();
    box.classList.add('drag-over');
  });

  box?.addEventListener('dragleave', () => {
    box.classList.remove('drag-over');
  });

  box?.addEventListener('drop', async (e) => {
    e.preventDefault();
    box.classList.remove('drag-over');
    if (e.dataTransfer?.files?.length) {
      await handleMultiplePortfolioFiles(e.dataTransfer.files);
    }
  });

  searchInput?.addEventListener('input', (e) => {
    adminPortfolioSearch = e.target.value || '';
    renderPortfolioAdmin();
  });
}

/* ==========================================================================
   7. ABA 2: CAPA DO SITE (HERO FULL-BLEED)
   ========================================================================== */
function renderHeroAdmin() {
  const listEl = document.getElementById('hero-cards-list');
  if (!listEl) return;

  const slides = cmsData.heroSlides || [];

  listEl.innerHTML = slides.map((slide, idx) => {
    const numStr = (idx + 1).toString().padStart(2, '0');
    const focalPct = parseFocalPercent(slide.objectPosition);
    const heroKey = String(slide.id || idx);
    const isOpen = expandedHeroKeys.has(heroKey);

    return `
      <article class="cms-compact-card hero-card-v3 ${isOpen ? 'is-open' : ''}" data-hero-idx="${idx}" data-hero-key="${escapeAttr(heroKey)}">
        <div class="cms-compact-summary">
          <div class="cms-compact-left">
            <div class="cms-compact-thumb" style="width: 100px; aspect-ratio: 16 / 10;">
              <span class="cms-compact-num">CAPA ${numStr}</span>
              <img src="${escapeAttr(slide.image)}" alt="${escapeAttr(slide.shortLabel || slide.category)}" style="object-position: center ${focalPct}%;" />
            </div>

            <div class="cms-compact-main">
              <input type="text" class="cms-inline-title-input js-hero-short" value="${escapeAttr(slide.shortLabel || slide.category || '')}" placeholder="Nome no botão da capa…" aria-label="Nome do botão da capa" />
              <span class="field-hint" style="margin: 0;">${escapeAttr(slide.location || 'Fortaleza, Ceará')}</span>
            </div>
          </div>

          <div class="cms-compact-right">
            <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-hero-preview-this">👁️ Ver</button>
            <button type="button" class="cms-drawer-btn js-toggle-hero-drawer" aria-expanded="${isOpen ? 'true' : 'false'}">
              ${isOpen ? 'Fechar ▲' : 'Editar ▾'}
            </button>
          </div>
        </div>

        <div class="cms-compact-drawer" ${isOpen ? '' : 'hidden'}>
          <div class="field-grid">
            <div class="field-group">
              <label class="field-label">Título da Categoria no Cartão</label>
              <input type="text" class="cms-input js-hero-cat" value="${escapeAttr(slide.category || '')}" placeholder="Ex: Gestantes & Maternidade" />
            </div>
            <div class="field-group">
              <label class="field-label">Localização Exibida no Cartão</label>
              <input type="text" class="cms-input js-hero-loc" value="${escapeAttr(slide.location || '')}" placeholder="Ex: Píer da Praia de Iracema" />
            </div>
          </div>

          <div class="field-grid" style="align-items: center;">
            <div class="field-group" style="margin-bottom: 10px;">
              <label class="field-label" style="display: flex; justify-content: space-between;">
                <span>Enquadramento Vertical</span>
                <strong class="focal-val-label">${focalPct}%</strong>
              </label>
              <input type="range" min="0" max="100" value="${focalPct}" class="js-hero-focal" style="width: 100%;" />
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
              <input type="file" accept="image/jpeg,image/png,image/webp" class="js-hero-replace-input" hidden />
              <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-hero-replace-btn">Enviar Foto</button>
              <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-hero-pick-btn">Escolher do Portfólio</button>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Frase / Citação do Cartão Lateral</label>
            <textarea class="cms-textarea js-hero-quote" style="min-height: 58px;">${escapeAttr(slide.quote || '')}</textarea>
          </div>

          <div class="photo-card-toolbar">
            <div class="order-btns">
              <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-hero-up" ${idx === 0 ? 'disabled' : ''}>↑ Subir</button>
              <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-hero-down" ${idx === slides.length - 1 ? 'disabled' : ''}>↓ Descer</button>
            </div>
            <button type="button" class="cms-btn cms-btn-danger cms-btn-sm js-hero-delete" ${slides.length <= 1 ? 'disabled' : ''}>Remover da Capa</button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  listEl.querySelectorAll('.hero-card-v3').forEach((card) => {
    const idx = parseInt(card.getAttribute('data-hero-idx'), 10);
    const heroKey = card.getAttribute('data-hero-key');
    const slide = cmsData.heroSlides[idx];
    if (!slide) return;

    const thumbImg = card.querySelector('.cms-compact-thumb img');
    const focalLabel = card.querySelector('.focal-val-label');
    const drawer = card.querySelector('.cms-compact-drawer');
    const toggleBtn = card.querySelector('.js-toggle-hero-drawer');

    toggleBtn?.addEventListener('click', () => {
      const willOpen = drawer.hidden;
      drawer.hidden = !willOpen;
      card.classList.toggle('is-open', willOpen);
      toggleBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      toggleBtn.textContent = willOpen ? 'Fechar ▲' : 'Editar ▾';
      if (willOpen) expandedHeroKeys.add(heroKey);
      else expandedHeroKeys.delete(heroKey);
    });

    const focusThisSlideInPreview = () => {
      sendToPreviewIframe({ type: 'CMS_HERO_SELECT_SLIDE', slideIndex: idx });
    };

    card.querySelector('.js-hero-preview-this')?.addEventListener('click', focusThisSlideInPreview);

    card.querySelector('.js-hero-short')?.addEventListener('input', (e) => {
      slide.shortLabel = e.target.value;
      markDirtyAndSync(false);
    });

    card.querySelector('.js-hero-cat')?.addEventListener('input', (e) => {
      slide.category = e.target.value;
      markDirtyAndSync(false);
      focusThisSlideInPreview();
    });

    card.querySelector('.js-hero-loc')?.addEventListener('input', (e) => {
      slide.location = e.target.value;
      markDirtyAndSync(false);
      focusThisSlideInPreview();
    });

    card.querySelector('.js-hero-quote')?.addEventListener('input', (e) => {
      slide.quote = e.target.value;
      markDirtyAndSync(false);
      focusThisSlideInPreview();
    });

    card.querySelector('.js-hero-focal')?.addEventListener('input', (e) => {
      const val = e.target.value;
      slide.objectPosition = `center ${val}%`;
      if (thumbImg) thumbImg.style.objectPosition = slide.objectPosition;
      if (focalLabel) focalLabel.textContent = `${val}%`;
      markDirtyAndSync(false);
      focusThisSlideInPreview();
    });

    const repInput = card.querySelector('.js-hero-replace-input');
    card.querySelector('.js-hero-replace-btn')?.addEventListener('click', () => repInput?.click());
    repInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const res = await compressAndReadImage(file);
        slide.image = res.dataUrl;
        markDirtyAndSync(true);
        renderHeroAdmin();
        focusThisSlideInPreview();
        showToast('Foto de capa atualizada!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    card.querySelector('.js-hero-pick-btn')?.addEventListener('click', () => {
      openGalleryPicker((pickedImage) => {
        slide.image = pickedImage;
        markDirtyAndSync(true);
        renderHeroAdmin();
        focusThisSlideInPreview();
      });
    });

    card.querySelector('.js-hero-up')?.addEventListener('click', () => {
      if (idx <= 0) return;
      const tmp = cmsData.heroSlides[idx - 1];
      cmsData.heroSlides[idx - 1] = cmsData.heroSlides[idx];
      cmsData.heroSlides[idx] = tmp;
      markDirtyAndSync(true);
      renderHeroAdmin();
    });

    card.querySelector('.js-hero-down')?.addEventListener('click', () => {
      if (idx >= cmsData.heroSlides.length - 1) return;
      const tmp = cmsData.heroSlides[idx + 1];
      cmsData.heroSlides[idx + 1] = cmsData.heroSlides[idx];
      cmsData.heroSlides[idx] = tmp;
      markDirtyAndSync(true);
      renderHeroAdmin();
    });

    card.querySelector('.js-hero-delete')?.addEventListener('click', () => {
      if (cmsData.heroSlides.length <= 1) return;
      if (!confirm(`Remover o slide "${slide.shortLabel || slide.category}" da capa?`)) return;
      cmsData.heroSlides.splice(idx, 1);
      markDirtyAndSync(true);
      renderHeroAdmin();
    });
  });
}

function initHeroTopActions() {
  const addInput = document.getElementById('hero-add-file-input');
  document.getElementById('btn-hero-upload-new')?.addEventListener('click', () => addInput?.click());

  addInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await compressAndReadImage(file);
      cmsData.heroSlides.push({
        id: String(cmsData.heroSlides.length + 1).padStart(2, '0'),
        image: res.dataUrl,
        category: 'Novo Ensaio',
        shortLabel: 'Novo Ensaio',
        title: res.suggestedTitle,
        location: 'Fortaleza, Ceará',
        quote: '“Registros conduzidos com calma, escuta e luz natural.”',
        objectPosition: 'center 35%'
      });
      markDirtyAndSync(true);
      renderHeroAdmin();
      sendToPreviewIframe({ type: 'CMS_HERO_SELECT_SLIDE', slideIndex: cmsData.heroSlides.length - 1 });
      showToast('Novo slide adicionado à Capa!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
    addInput.value = '';
  });

  document.getElementById('btn-hero-pick-existing')?.addEventListener('click', () => {
    openGalleryPicker((pickedImage, pickedLabel) => {
      const cleanName = (pickedLabel || 'Ensaio').split('(')[0].trim();
      cmsData.heroSlides.push({
        id: String(cmsData.heroSlides.length + 1).padStart(2, '0'),
        image: pickedImage,
        category: cleanName,
        shortLabel: cleanName,
        title: cleanName,
        location: 'Fortaleza, Ceará',
        quote: '“Registros conduzidos com calma, escuta e luz natural.”',
        objectPosition: 'center 35%'
      });
      markDirtyAndSync(true);
      renderHeroAdmin();
      sendToPreviewIframe({ type: 'CMS_HERO_SELECT_SLIDE', slideIndex: cmsData.heroSlides.length - 1 });
      showToast('Foto adicionada à Capa!', 'success');
    });
  });
}

/* ==========================================================================
   8. ABA 3: CATEGORIAS & FILTROS DO PORTFÓLIO
   ========================================================================== */
function renderCategoriesAdmin() {
  const listEl = document.getElementById('categories-list');
  if (!listEl) return;

  const cats = cmsData.categories || [];

  listEl.innerHTML = cats.map((cat, idx) => {
    const isAll = cat.id === 'todos';
    const photoCount = isAll
      ? (cmsData.portfolio || []).length
      : (cmsData.portfolio || []).filter((p) => p.category === cat.id).length;

    return `
      <div class="category-row-card" data-cat-idx="${idx}">
        <div style="flex: 1; min-width: 220px;">
          <input type="text" class="cms-input js-cat-name-input" value="${escapeAttr(cat.name)}" />
          <span class="field-hint">Código interno: <code>${escapeAttr(cat.id)}</code> • <strong>${photoCount}</strong> ${photoCount === 1 ? 'foto vinculada' : 'fotos vinculadas'}</span>
        </div>

        <div class="order-btns">
          ${isAll ? '<span class="admin-cat-pill active">Aba Principal (Fixa)</span>' : `
            <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-cat-up" ${idx <= 1 ? 'disabled' : ''}>↑</button>
            <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-cat-down" ${idx === cats.length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" class="cms-btn cms-btn-danger cms-btn-sm js-cat-delete">Excluir</button>
          `}
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.category-row-card').forEach((row) => {
    const idx = parseInt(row.getAttribute('data-cat-idx'), 10);
    const cat = cmsData.categories[idx];
    if (!cat) return;

    row.querySelector('.js-cat-name-input')?.addEventListener('input', (e) => {
      cat.name = e.target.value;
      // Atualiza também o nome legível nas fotos desta categoria
      if (cat.id !== 'todos') {
        (cmsData.portfolio || []).forEach((p) => {
          if (p.category === cat.id) p.categoryName = cat.name;
        });
      }
      markDirtyAndSync(false);
    });

    row.querySelector('.js-cat-up')?.addEventListener('click', () => {
      if (idx <= 1) return;
      const tmp = cmsData.categories[idx - 1];
      cmsData.categories[idx - 1] = cmsData.categories[idx];
      cmsData.categories[idx] = tmp;
      markDirtyAndSync(true);
      renderCategoriesAdmin();
    });

    row.querySelector('.js-cat-down')?.addEventListener('click', () => {
      if (idx >= cmsData.categories.length - 1) return;
      const tmp = cmsData.categories[idx + 1];
      cmsData.categories[idx + 1] = cmsData.categories[idx];
      cmsData.categories[idx] = tmp;
      markDirtyAndSync(true);
      renderCategoriesAdmin();
    });

    row.querySelector('.js-cat-delete')?.addEventListener('click', () => {
      const linked = (cmsData.portfolio || []).filter((p) => p.category === cat.id);
      if (linked.length > 0) {
        const fallbackCat = cmsData.categories.find((c) => c.id !== 'todos' && c.id !== cat.id);
        if (!fallbackCat) {
          showToast('É necessário manter pelo menos uma categoria ativa.', 'error');
          return;
        }
        if (!confirm(`Existem ${linked.length} fotos em "${cat.name}". Ao excluir, elas serão movidas para "${fallbackCat.name}". Confirmar?`)) {
          return;
        }
        linked.forEach((p) => {
          p.category = fallbackCat.id;
          p.categoryName = fallbackCat.name;
        });
      } else if (!confirm(`Excluir a categoria "${cat.name}"?`)) {
        return;
      }

      cmsData.categories.splice(idx, 1);
      markDirtyAndSync(true);
      renderCategoriesAdmin();
      renderPortfolioAdmin();
      showToast('Categoria removida.', 'info');
    });
  });
}

function initCategoryAddAction() {
  const input = document.getElementById('new-cat-name');
  const btn = document.getElementById('btn-add-category');

  btn?.addEventListener('click', () => {
    const name = (input?.value || '').trim();
    if (!name) {
      showToast('Digite o nome da nova categoria.', 'error');
      return;
    }

    let id = slugifyCategory(name);
    if (cmsData.categories.some((c) => c.id === id)) {
      id = `${id}-${Math.floor(Math.random() * 90 + 10)}`;
    }

    cmsData.categories.push({ id, name });
    if (input) input.value = '';
    markDirtyAndSync(true);
    renderCategoriesAdmin();
    renderPortfolioAdmin();
    scrollPreviewTo('#portfolio');
    showToast(`Categoria "${name}" criada! Já disponível nos filtros e no formulário.`, 'success');
  });
}

/* ==========================================================================
   9. ABA 4: EXPERIÊNCIAS & PREÇOS
   ========================================================================== */
function renderPackagesAdmin() {
  const listEl = document.getElementById('packages-cards-list');
  if (!listEl) return;

  const pkgs = cmsData.packages || [];

  listEl.innerHTML = pkgs.map((pkg, idx) => {
    const pkgKey = String(pkg.id || idx);
    const isOpen = expandedPackageKeys.has(pkgKey);
    const priceTag = (pkg.price && String(pkg.price).trim()) ? pkg.price : 'Sob consulta';

    return `
      <article class="cms-compact-card pkg-card-v3 ${isOpen ? 'is-open' : ''}" data-pkg-idx="${idx}" data-pkg-key="${escapeAttr(pkgKey)}">
        <div class="cms-compact-summary">
          <div class="cms-compact-left">
            <div class="cms-compact-main">
              <strong class="cms-section-card-title" style="font-size: 1.2rem;">${escapeAttr(pkg.index || 'I')}. ${escapeAttr(pkg.name || 'Formato')}</strong>
              <span class="field-hint" style="margin: 0;"><strong style="color: var(--cms-blue);">${escapeAttr(priceTag)}</strong> · ${escapeAttr(pkg.photosCount || '')} · ${escapeAttr(pkg.duration || '')}</span>
            </div>
          </div>

          <div class="cms-compact-right">
            <label class="cms-switch">
              <input type="checkbox" class="js-pkg-popular" ${pkg.popular ? 'checked' : ''} />
              <span class="cms-switch-track"></span>
              <span>Mais Escolhido</span>
            </label>

            <button type="button" class="cms-drawer-btn js-toggle-pkg-drawer" aria-expanded="${isOpen ? 'true' : 'false'}">
              ${isOpen ? 'Fechar ▲' : 'Editar ▾'}
            </button>
          </div>
        </div>

        <div class="cms-compact-drawer" ${isOpen ? '' : 'hidden'}>
          <div class="field-grid-3">
            <div class="field-group">
              <label class="field-label">Nome do Formato</label>
              <input type="text" class="cms-input js-pkg-name" value="${escapeAttr(pkg.name || '')}" placeholder="Ex: Ensaio Simples" />
            </div>
            <div class="field-group">
              <label class="field-label">Valor / Preço (Opcional)</label>
              <input type="text" class="cms-input js-pkg-price" value="${escapeAttr(pkg.price || '')}" placeholder="Ex: R$ 550 (ou vazio)" />
            </div>
            <div class="field-group">
              <label class="field-label">Selo / Subtítulo Curto</label>
              <input type="text" class="cms-input js-pkg-badge" value="${escapeAttr(pkg.badge || '')}" placeholder="Ex: O Mais Escolhido" />
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Descrição Resumida</label>
            <input type="text" class="cms-input js-pkg-summary" value="${escapeAttr(pkg.summary || '')}" />
          </div>

          <div class="field-grid-3">
            <div class="field-group">
              <label class="field-label">Duração</label>
              <input type="text" class="cms-input js-pkg-duration" value="${escapeAttr(pkg.duration || '')}" placeholder="Ex: 1h – 1h30" />
            </div>
            <div class="field-group">
              <label class="field-label">Quantidade de Fotos</label>
              <input type="text" class="cms-input js-pkg-photos" value="${escapeAttr(pkg.photosCount || '')}" placeholder="Ex: 20 fotos editadas" />
            </div>
            <div class="field-group">
              <label class="field-label">Prazo de Entrega</label>
              <input type="text" class="cms-input js-pkg-delivery" value="${escapeAttr(pkg.deliveryTime || '')}" placeholder="Ex: Entrega em 4 dias" />
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Itens Inclusos (Escreva 1 item por linha)</label>
            <textarea class="cms-textarea js-pkg-details">${escapeAttr((pkg.details || []).join('\n'))}</textarea>
          </div>

          <div class="field-group">
            <label class="field-label">Mensagem Automática ao Clicar em “Consultar no WhatsApp”</label>
            <input type="text" class="cms-input js-pkg-wa" value="${escapeAttr(pkg.whatsappMsg || '')}" />
          </div>

          <div class="photo-card-toolbar">
            <div class="order-btns">
              <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-pkg-up" ${idx === 0 ? 'disabled' : ''}>↑ Subir</button>
              <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-pkg-down" ${idx === pkgs.length - 1 ? 'disabled' : ''}>↓ Descer</button>
            </div>
            <button type="button" class="cms-btn cms-btn-danger cms-btn-sm js-pkg-delete" ${pkgs.length <= 1 ? 'disabled' : ''}>Excluir Formato</button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

  listEl.querySelectorAll('[data-pkg-idx]').forEach((card) => {
    const idx = parseInt(card.getAttribute('data-pkg-idx'), 10);
    const pkgKey = card.getAttribute('data-pkg-key');
    const pkg = cmsData.packages[idx];
    if (!pkg) return;

    const titleEl = card.querySelector('.cms-section-card-title');
    const drawer = card.querySelector('.cms-compact-drawer');
    const toggleBtn = card.querySelector('.js-toggle-pkg-drawer');

    toggleBtn?.addEventListener('click', () => {
      const willOpen = drawer.hidden;
      drawer.hidden = !willOpen;
      card.classList.toggle('is-open', willOpen);
      toggleBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      toggleBtn.textContent = willOpen ? 'Fechar ▲' : 'Editar ▾';
      if (willOpen) expandedPackageKeys.add(pkgKey);
      else expandedPackageKeys.delete(pkgKey);
    });

    card.querySelector('.js-pkg-popular')?.addEventListener('change', (e) => {
      pkg.popular = e.target.checked;
      markDirtyAndSync(true);
    });

    card.querySelector('.js-pkg-name')?.addEventListener('input', (e) => {
      pkg.name = e.target.value;
      if (titleEl) titleEl.textContent = `${pkg.index || romans[idx] || idx + 1}. ${pkg.name}`;
      markDirtyAndSync(false);
    });

    card.querySelector('.js-pkg-price')?.addEventListener('input', (e) => {
      pkg.price = e.target.value;
      markDirtyAndSync(false);
    });

    card.querySelector('.js-pkg-badge')?.addEventListener('input', (e) => {
      pkg.badge = e.target.value;
      markDirtyAndSync(false);
    });

    card.querySelector('.js-pkg-summary')?.addEventListener('input', (e) => {
      pkg.summary = e.target.value;
      markDirtyAndSync(false);
    });

    card.querySelector('.js-pkg-duration')?.addEventListener('input', (e) => {
      pkg.duration = e.target.value;
      markDirtyAndSync(false);
    });

    card.querySelector('.js-pkg-photos')?.addEventListener('input', (e) => {
      pkg.photosCount = e.target.value;
      markDirtyAndSync(false);
    });

    card.querySelector('.js-pkg-delivery')?.addEventListener('input', (e) => {
      pkg.deliveryTime = e.target.value;
      markDirtyAndSync(false);
    });

    card.querySelector('.js-pkg-details')?.addEventListener('input', (e) => {
      pkg.details = e.target.value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      markDirtyAndSync(false);
    });

    card.querySelector('.js-pkg-wa')?.addEventListener('input', (e) => {
      pkg.whatsappMsg = e.target.value;
      markDirtyAndSync(false);
    });

    card.querySelector('.js-pkg-up')?.addEventListener('click', () => {
      if (idx <= 0) return;
      const tmp = cmsData.packages[idx - 1];
      cmsData.packages[idx - 1] = cmsData.packages[idx];
      cmsData.packages[idx] = tmp;
      cmsData.packages.forEach((p, i) => { p.index = romans[i] || String(i + 1); });
      markDirtyAndSync(true);
      renderPackagesAdmin();
    });

    card.querySelector('.js-pkg-down')?.addEventListener('click', () => {
      if (idx >= cmsData.packages.length - 1) return;
      const tmp = cmsData.packages[idx + 1];
      cmsData.packages[idx + 1] = cmsData.packages[idx];
      cmsData.packages[idx] = tmp;
      cmsData.packages.forEach((p, i) => { p.index = romans[i] || String(i + 1); });
      markDirtyAndSync(true);
      renderPackagesAdmin();
    });

    card.querySelector('.js-pkg-delete')?.addEventListener('click', () => {
      if (!confirm(`Excluir o formato "${pkg.name}"?`)) return;
      cmsData.packages.splice(idx, 1);
      cmsData.packages.forEach((p, i) => { p.index = romans[i] || String(i + 1); });
      markDirtyAndSync(true);
      renderPackagesAdmin();
    });
  });
}

function initPackageAddAction() {
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  document.getElementById('btn-add-package')?.addEventListener('click', () => {
    const nextIdx = cmsData.packages.length;
    cmsData.packages.push({
      id: `exp-${Date.now()}`,
      index: romans[nextIdx] || String(nextIdx + 1),
      name: 'Novo Formato',
      badge: 'Formato Especial',
      popular: false,
      price: 'R$ 450',
      summary: 'Sessão fotográfica conduzida com escuta, calma e direção leve.',
      duration: '1h',
      photosCount: '20 fotos editadas',
      deliveryTime: 'Entrega em 4 dias',
      details: [
        '1 locação externa ou em domicílio',
        'Direção acolhedora no seu ritmo',
        'Galeria online em alta resolução'
      ],
      whatsappMsg: `Olá ${cmsData.brand?.shortName || cmsData.brand?.founder || ''}! Gostaria de saber mais sobre o Novo Formato.`
    });
    markDirtyAndSync(true);
    renderPackagesAdmin();
    scrollPreviewTo('#servicos');
    showToast('Novo formato adicionado!', 'success');
  });
}

/* ==========================================================================
   10. ABA 5: TEXTOS, FOTOS DAS SEÇÕES (00 A 07) & CONTATOS
   ========================================================================== */
function buildInlineImageControlHtml(keyId, labelText, imgSrc, focalStr) {
  const pct = parseFocalPercent(focalStr);
  return `
    <div class="inline-photo-field" data-inline-img="${keyId}">
      <img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(labelText)}" class="inline-photo-thumb" style="object-position: center ${pct}%;" />
      <div class="inline-photo-controls">
        <strong class="field-label">${escapeAttr(labelText)}</strong>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <input type="file" accept="image/jpeg,image/png,image/webp" class="js-inline-file" hidden />
          <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-inline-upload">Enviar Nova Foto</button>
          <button type="button" class="cms-btn cms-btn-outline cms-btn-sm js-inline-gallery">Escolher da Galeria</button>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="field-hint">Foco Vertical: <strong class="js-inline-pct">${pct}%</strong></span>
          <input type="range" min="0" max="100" value="${pct}" class="js-inline-focal" style="flex: 1; max-width: 180px;" />
        </div>
      </div>
    </div>
  `;
}

function bindInlineImageControl(container, keyId, onUpdatePhoto, onUpdateFocal) {
  const box = container.querySelector(`[data-inline-img="${keyId}"]`);
  if (!box) return;

  const thumb = box.querySelector('.inline-photo-thumb');
  const fileIn = box.querySelector('.js-inline-file');
  const pctEl = box.querySelector('.js-inline-pct');

  box.querySelector('.js-inline-upload')?.addEventListener('click', () => fileIn?.click());
  fileIn?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await compressAndReadImage(file);
      if (thumb) thumb.src = res.dataUrl;
      onUpdatePhoto(res.dataUrl);
      markDirtyAndSync(true);
      showToast('Fotografia da seção atualizada!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  box.querySelector('.js-inline-gallery')?.addEventListener('click', () => {
    openGalleryPicker((pickedUrl) => {
      if (thumb) thumb.src = pickedUrl;
      onUpdatePhoto(pickedUrl);
      markDirtyAndSync(true);
    });
  });

  box.querySelector('.js-inline-focal')?.addEventListener('input', (e) => {
    const val = e.target.value;
    const pos = `center ${val}%`;
    if (thumb) thumb.style.objectPosition = pos;
    if (pctEl) pctEl.textContent = `${val}%`;
    onUpdateFocal(pos);
    markDirtyAndSync(false);
  });
}

function renderSectionsAdmin() {
  const container = document.getElementById('sections-form-container');
  if (!container) return;

  const s = cmsData.sections;
  const b = cmsData.brand;

  if (activeSubTab === 'sec-hero') {
    const h = s.hero;
    container.innerHTML = `
      <div class="cms-section-card">
        <div class="cms-section-card-head">
          <h3 class="cms-section-card-title">00. Textos da Capa &amp; Cabeçalho</h3>
        </div>
        <div class="field-group">
          <label class="field-label">Linha Superior (Kicker)</label>
          <input type="text" id="f-hero-kicker" class="cms-input" value="${escapeAttr(h.kickerText)}" />
        </div>
        <div class="field-grid">
          <div class="field-group">
            <label class="field-label">Título Principal (Linha 1)</label>
            <input type="text" id="f-hero-t1" class="cms-input" value="${escapeAttr(h.titleLine1)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Destaque em Itálico Dourado (Linha 2)</label>
            <input type="text" id="f-hero-t2" class="cms-input" value="${escapeAttr(h.titleHighlight)}" />
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Frase de Apresentação Abaixo do Título</label>
          <textarea id="f-hero-lead" class="cms-textarea">${escapeAttr(h.leadText)}</textarea>
        </div>
        <div class="field-grid-3">
          <div class="field-group">
            <label class="field-label">Botão Principal da Capa</label>
            <input type="text" id="f-hero-btn1" class="cms-input" value="${escapeAttr(h.primaryBtnText)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Segundo Botão da Capa</label>
            <input type="text" id="f-hero-btn2" class="cms-input" value="${escapeAttr(h.secondaryBtnText)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Botão do Topo (Cabeçalho)</label>
            <input type="text" id="f-header-cta" class="cms-input" value="${escapeAttr(b.headerCtaText || 'Agendar conversa')}" />
          </div>
        </div>
      </div>
    `;

    container.querySelector('#f-hero-kicker')?.addEventListener('input', (e) => { h.kickerText = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-hero-t1')?.addEventListener('input', (e) => { h.titleLine1 = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-hero-t2')?.addEventListener('input', (e) => { h.titleHighlight = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-hero-lead')?.addEventListener('input', (e) => { h.leadText = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-hero-btn1')?.addEventListener('input', (e) => { h.primaryBtnText = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-hero-btn2')?.addEventListener('input', (e) => { h.secondaryBtnText = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-header-cta')?.addEventListener('input', (e) => { b.headerCtaText = e.target.value; markDirtyAndSync(); });
    return;
  }

  if (activeSubTab === 'sec-proposta') {
    const p = s.proposta;
    container.innerHTML = `
      <div class="cms-section-card">
        <div class="cms-section-card-head">
          <h3 class="cms-section-card-title">01. A Proposta — Fotos &amp; Narrativa</h3>
        </div>

        ${buildInlineImageControlHtml('prop-img1', 'Foto Principal (Esquerda)', p.primaryPhoto, p.primaryPhotoFocal)}
        ${buildInlineImageControlHtml('prop-img2', 'Foto Secundária (Detalhe à Direita)', p.secondaryPhoto, p.secondaryPhotoFocal)}

        <div class="field-grid">
          <div class="field-group">
            <label class="field-label">Legenda da Foto (Esquerda)</label>
            <input type="text" id="f-prop-cap1" class="cms-input" value="${escapeAttr(p.captionLeft)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Legenda da Foto (Direita)</label>
            <input type="text" id="f-prop-cap2" class="cms-input" value="${escapeAttr(p.captionRight)}" />
          </div>
        </div>

        <div class="field-grid">
          <div class="field-group">
            <label class="field-label">Título (Parte 1)</label>
            <input type="text" id="f-prop-t1" class="cms-input" value="${escapeAttr(p.titleLine1)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Destaque em Itálico Azul</label>
            <input type="text" id="f-prop-t2" class="cms-input" value="${escapeAttr(p.titleHighlight)}" />
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">Frase em Destaque (Citação)</label>
          <textarea id="f-prop-quote" class="cms-textarea" style="min-height: 62px;">${escapeAttr(p.pullquote)}</textarea>
        </div>

        <div class="field-group">
          <label class="field-label">Parágrafos do Texto (Separe cada parágrafo com uma linha em branco)</label>
          <textarea id="f-prop-paras" class="cms-textarea" style="min-height: 150px;">${escapeAttr((p.paragraphs || []).join('\n\n'))}</textarea>
        </div>
      </div>

      <div class="cms-section-card">
        <div class="cms-section-card-head">
          <h3 class="cms-section-card-title">Os 4 Pilares Horizontais (I a IV)</h3>
        </div>
        <div class="field-grid">
          ${(p.pillars || []).map((pil, idx) => `
            <div style="background: var(--cms-bg); border: 1px solid var(--cms-border); padding: 12px; border-radius: 8px;">
              <div class="field-group">
                <label class="field-label">Pilar ${escapeAttr(pil.num)} — Título</label>
                <input type="text" class="cms-input js-prop-pil-title" data-idx="${idx}" value="${escapeAttr(pil.title)}" />
              </div>
              <div class="field-group">
                <label class="field-label">Descrição</label>
                <textarea class="cms-textarea js-prop-pil-desc" data-idx="${idx}" style="min-height: 64px;">${escapeAttr(pil.description)}</textarea>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    bindInlineImageControl(container, 'prop-img1', (url) => { p.primaryPhoto = url; }, (pos) => { p.primaryPhotoFocal = pos; });
    bindInlineImageControl(container, 'prop-img2', (url) => { p.secondaryPhoto = url; }, (pos) => { p.secondaryPhotoFocal = pos; });

    container.querySelector('#f-prop-cap1')?.addEventListener('input', (e) => { p.captionLeft = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-prop-cap2')?.addEventListener('input', (e) => { p.captionRight = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-prop-t1')?.addEventListener('input', (e) => { p.titleLine1 = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-prop-t2')?.addEventListener('input', (e) => { p.titleHighlight = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-prop-quote')?.addEventListener('input', (e) => { p.pullquote = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-prop-paras')?.addEventListener('input', (e) => {
      p.paragraphs = e.target.value.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
      markDirtyAndSync();
    });

    container.querySelectorAll('.js-prop-pil-title').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(inp.getAttribute('data-idx'), 10);
        p.pillars[i].title = e.target.value;
        markDirtyAndSync();
      });
    });
    container.querySelectorAll('.js-prop-pil-desc').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(inp.getAttribute('data-idx'), 10);
        p.pillars[i].description = e.target.value;
        markDirtyAndSync();
      });
    });
    return;
  }

  if (activeSubTab === 'sec-portfolio') {
    const ps = s.portfolioSection;
    container.innerHTML = `
      <div class="cms-section-card">
        <div class="cms-section-card-head">
          <h3 class="cms-section-card-title">02. Cabeçalho da Seção Portfólio</h3>
        </div>
        <div class="field-grid">
          <div class="field-group">
            <label class="field-label">Título (Parte 1)</label>
            <input type="text" id="f-ps-t1" class="cms-input" value="${escapeAttr(ps.titleLine1)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Destaque em Itálico Azul</label>
            <input type="text" id="f-ps-t2" class="cms-input" value="${escapeAttr(ps.titleHighlight)}" />
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Texto de Apoio ao Lado do Título</label>
          <textarea id="f-ps-desc" class="cms-textarea">${escapeAttr(ps.description)}</textarea>
        </div>
      </div>
    `;
    container.querySelector('#f-ps-t1')?.addEventListener('input', (e) => { ps.titleLine1 = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ps-t2')?.addEventListener('input', (e) => { ps.titleHighlight = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ps-desc')?.addEventListener('input', (e) => { ps.description = e.target.value; markDirtyAndSync(); });
    return;
  }

  if (activeSubTab === 'sec-abordagem') {
    const ab = s.abordagem;
    container.innerHTML = `
      <div class="cms-section-card">
        <div class="cms-section-card-head">
          <h3 class="cms-section-card-title">03. Abordagem Humanizada &amp; Fotos</h3>
        </div>

        ${buildInlineImageControlHtml('ab-img1', 'Foto Vertical Principal', ab.mainPhoto, ab.mainPhotoFocal)}
        ${buildInlineImageControlHtml('ab-img2', 'Foto Horizontal Sobreposta', ab.insetPhoto, ab.insetPhotoFocal)}

        <div class="field-grid">
          <div class="field-group">
            <label class="field-label">Título (Parte 1)</label>
            <input type="text" id="f-ab-t1" class="cms-input" value="${escapeAttr(ab.titleLine1)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Destaque em Itálico Azul</label>
            <input type="text" id="f-ab-t2" class="cms-input" value="${escapeAttr(ab.titleHighlight)}" />
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">Parágrafo Introdutório 1</label>
          <textarea id="f-ab-p1" class="cms-textarea" style="min-height: 68px;">${escapeAttr(ab.introParagraph1)}</textarea>
        </div>
        <div class="field-group">
          <label class="field-label">Parágrafo Introdutório 2</label>
          <textarea id="f-ab-p2" class="cms-textarea" style="min-height: 62px;">${escapeAttr(ab.introParagraph2)}</textarea>
        </div>

        <div class="field-grid">
          <div class="field-group">
            <label class="field-label">Frase no Cartão Sobre a Foto</label>
            <input type="text" id="f-ab-qt" class="cms-input" value="${escapeAttr(ab.quoteText)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Assinatura do Cartão</label>
            <input type="text" id="f-ab-qa" class="cms-input" value="${escapeAttr(ab.quoteAuthor)}" />
          </div>
        </div>
      </div>

      <div class="cms-section-card">
        <div class="cms-section-card-head">
          <h3 class="cms-section-card-title">Os 3 Movimentos do Ensaio (01 a 03)</h3>
        </div>
        ${(ab.movements || []).map((m, idx) => `
          <div style="background: var(--cms-bg); border: 1px solid var(--cms-border); padding: 14px; border-radius: 8px; margin-bottom: 10px;">
            <div class="field-group">
              <label class="field-label">Movimento ${escapeAttr(m.num)} — Título</label>
              <input type="text" class="cms-input js-ab-mov-title" data-idx="${idx}" value="${escapeAttr(m.title)}" />
            </div>
            <div class="field-group">
              <label class="field-label">Descrição</label>
              <textarea class="cms-textarea js-ab-mov-desc" data-idx="${idx}" style="min-height: 60px;">${escapeAttr(m.description)}</textarea>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    bindInlineImageControl(container, 'ab-img1', (url) => { ab.mainPhoto = url; }, (pos) => { ab.mainPhotoFocal = pos; });
    bindInlineImageControl(container, 'ab-img2', (url) => { ab.insetPhoto = url; }, (pos) => { ab.insetPhotoFocal = pos; });

    container.querySelector('#f-ab-t1')?.addEventListener('input', (e) => { ab.titleLine1 = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ab-t2')?.addEventListener('input', (e) => { ab.titleHighlight = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ab-p1')?.addEventListener('input', (e) => { ab.introParagraph1 = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ab-p2')?.addEventListener('input', (e) => { ab.introParagraph2 = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ab-qt')?.addEventListener('input', (e) => { ab.quoteText = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ab-qa')?.addEventListener('input', (e) => { ab.quoteAuthor = e.target.value; markDirtyAndSync(); });

    container.querySelectorAll('.js-ab-mov-title').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        ab.movements[parseInt(inp.getAttribute('data-idx'), 10)].title = e.target.value;
        markDirtyAndSync();
      });
    });
    container.querySelectorAll('.js-ab-mov-desc').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        ab.movements[parseInt(inp.getAttribute('data-idx'), 10)].description = e.target.value;
        markDirtyAndSync();
      });
    });
    return;
  }

  if (activeSubTab === 'sec-experiencias') {
    const ex = s.experiencias;
    container.innerHTML = `
      <div class="cms-section-card">
        <div class="cms-section-card-head">
          <h3 class="cms-section-card-title">04. Cabeçalho &amp; Barra de Dúvidas dos Formatos e Valores</h3>
        </div>
        <div class="field-grid">
          <div class="field-group">
            <label class="field-label">Título (Parte 1)</label>
            <input type="text" id="f-ex-t1" class="cms-input" value="${escapeAttr(ex.titleLine1)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Destaque em Itálico Azul</label>
            <input type="text" id="f-ex-t2" class="cms-input" value="${escapeAttr(ex.titleHighlight)}" />
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Subtítulo Explicativo</label>
          <textarea id="f-ex-desc" class="cms-textarea" style="min-height: 62px;">${escapeAttr(ex.description)}</textarea>
        </div>
        <div class="field-grid">
          <div class="field-group">
            <label class="field-label">Barra Inferior — Pergunta em Negrito</label>
            <input type="text" id="f-ex-bt" class="cms-input" value="${escapeAttr(ex.conciseBarTitle)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Texto do Botão da Barra Inferior</label>
            <input type="text" id="f-ex-bbtn" class="cms-input" value="${escapeAttr(ex.conciseBarBtnText)}" />
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Barra Inferior — Texto Complementar</label>
          <textarea id="f-ex-btxt" class="cms-textarea" style="min-height: 60px;">${escapeAttr(ex.conciseBarText)}</textarea>
        </div>
      </div>
    `;
    container.querySelector('#f-ex-t1')?.addEventListener('input', (e) => { ex.titleLine1 = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ex-t2')?.addEventListener('input', (e) => { ex.titleHighlight = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ex-desc')?.addEventListener('input', (e) => { ex.description = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ex-bt')?.addEventListener('input', (e) => { ex.conciseBarTitle = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ex-bbtn')?.addEventListener('input', (e) => { ex.conciseBarBtnText = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ex-btxt')?.addEventListener('input', (e) => { ex.conciseBarText = e.target.value; markDirtyAndSync(); });
    return;
  }

  if (activeSubTab === 'sec-sobre') {
    const sb = s.sobre;
    container.innerHTML = `
      <div class="cms-section-card">
        <div class="cms-section-card-head">
          <h3 class="cms-section-card-title">05. Sobre Carly &amp; Manifesto</h3>
        </div>

        ${buildInlineImageControlHtml('sb-profile', 'Foto de Perfil da Carly', sb.profilePhoto, sb.profilePhotoFocal)}

        <div class="field-grid">
          <div class="field-group">
            <label class="field-label">Nome no Cartão Abaixo da Foto</label>
            <input type="text" id="f-sb-bname" class="cms-input" value="${escapeAttr(sb.badgeName)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Subtítulo no Cartão Abaixo da Foto</label>
            <input type="text" id="f-sb-brole" class="cms-input" value="${escapeAttr(sb.badgeRole)}" />
          </div>
        </div>

        <div class="field-grid">
          <div class="field-group">
            <label class="field-label">Título (Parte 1)</label>
            <input type="text" id="f-sb-t1" class="cms-input" value="${escapeAttr(sb.titleLine1)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Destaque em Itálico Dourado</label>
            <input type="text" id="f-sb-t2" class="cms-input" value="${escapeAttr(sb.titleHighlight)}" />
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">Linha de Destaque Dourada (Lead)</label>
          <input type="text" id="f-sb-lead" class="cms-input" value="${escapeAttr(sb.lead)}" />
        </div>

        <div class="field-group">
          <label class="field-label">Biografia &amp; Manifesto (Separe parágrafos com linha em branco)</label>
          <textarea id="f-sb-paras" class="cms-textarea" style="min-height: 170px;">${escapeAttr((sb.paragraphs || []).join('\n\n'))}</textarea>
        </div>

        <div class="field-group">
          <label class="field-label">Nota de Compromisso Ético (Psicologia)</label>
          <textarea id="f-sb-ethics" class="cms-textarea" style="min-height: 70px;">${escapeAttr(sb.ethicsText)}</textarea>
        </div>
      </div>
    `;

    bindInlineImageControl(container, 'sb-profile', (url) => { sb.profilePhoto = url; }, (pos) => { sb.profilePhotoFocal = pos; });

    container.querySelector('#f-sb-bname')?.addEventListener('input', (e) => { sb.badgeName = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-sb-brole')?.addEventListener('input', (e) => { sb.badgeRole = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-sb-t1')?.addEventListener('input', (e) => { sb.titleLine1 = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-sb-t2')?.addEventListener('input', (e) => { sb.titleHighlight = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-sb-lead')?.addEventListener('input', (e) => { sb.lead = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-sb-paras')?.addEventListener('input', (e) => {
      sb.paragraphs = e.target.value.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
      markDirtyAndSync();
    });
    container.querySelector('#f-sb-ethics')?.addEventListener('input', (e) => { sb.ethicsText = e.target.value; markDirtyAndSync(); });
    return;
  }

  if (activeSubTab === 'sec-avaliacoes') {
    const av = s.avaliacoes;
    const gr = cmsData.googleReviews;
    container.innerHTML = `
      <div class="cms-section-card">
        <div class="cms-section-card-head">
          <h3 class="cms-section-card-title">06. Avaliações Automáticas do Google Meu Negócio</h3>
        </div>
        <div class="field-grid">
          <div class="field-group">
            <label class="field-label">Título (Parte 1)</label>
            <input type="text" id="f-av-t1" class="cms-input" value="${escapeAttr(av.titleLine1)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Destaque em Itálico Azul</label>
            <input type="text" id="f-av-t2" class="cms-input" value="${escapeAttr(av.titleHighlight)}" />
          </div>
        </div>

        <div class="field-grid">
          <div class="field-group">
            <label class="field-label">Featurable Widget ID (Sincronização Viva Gratuita)</label>
            <input type="text" id="f-gr-feat" class="cms-input" value="${escapeAttr(gr.featurableWidgetId || '')}" />
          </div>
          <div class="field-group">
            <label class="field-label">Google Place ID do Perfil</label>
            <input type="text" id="f-gr-place" class="cms-input" value="${escapeAttr(gr.googlePlaceId || '')}" />
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">Link Direto para Cliente Deixar Avaliação no Google</label>
          <input type="url" id="f-gr-write" class="cms-input" value="${escapeAttr(gr.googleReviewFormUrl || '')}" />
        </div>
      </div>
    `;

    container.querySelector('#f-av-t1')?.addEventListener('input', (e) => { av.titleLine1 = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-av-t2')?.addEventListener('input', (e) => { av.titleHighlight = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-gr-feat')?.addEventListener('input', (e) => { gr.featurableWidgetId = e.target.value.trim(); markDirtyAndSync(); });
    container.querySelector('#f-gr-place')?.addEventListener('input', (e) => {
      const pid = e.target.value.trim();
      gr.googlePlaceId = pid;
      if (pid) {
        gr.googleProfileUrl = `https://www.google.com/maps/place/?q=place_id:${pid}`;
        gr.googleReviewFormUrl = `https://search.google.com/local/writereview?placeid=${pid}`;
        const writeIn = container.querySelector('#f-gr-write');
        if (writeIn) writeIn.value = gr.googleReviewFormUrl;
      }
      markDirtyAndSync();
    });
    container.querySelector('#f-gr-write')?.addEventListener('input', (e) => { gr.googleReviewFormUrl = e.target.value.trim(); markDirtyAndSync(); });
    return;
  }

  if (activeSubTab === 'sec-contato') {
    const ct = s.contato;
    container.innerHTML = `
      <div class="cms-section-card">
        <div class="cms-section-card-head">
          <h3 class="cms-section-card-title">07. WhatsApp, Instagram, Contato &amp; Rodapé</h3>
        </div>

        <div class="field-grid-3">
          <div class="field-group">
            <label class="field-label">WhatsApp Visível no Site</label>
            <input type="text" id="f-b-wa" class="cms-input" value="${escapeAttr(b.whatsappFormatted)}" placeholder="+55 (85) 92001-5290" />
            <span class="field-hint">Atualiza todos os links automaticamente.</span>
          </div>
          <div class="field-group">
            <label class="field-label">Arroba do Instagram</label>
            <input type="text" id="f-b-ig" class="cms-input" value="${escapeAttr(b.instagram)}" placeholder="@instantesdecarly" />
          </div>
          <div class="field-group">
            <label class="field-label">Cidade &amp; Região</label>
            <input type="text" id="f-b-loc" class="cms-input" value="${escapeAttr(b.location)}" />
          </div>
        </div>

        <div class="field-grid">
          <div class="field-group">
            <label class="field-label">Título da Seção Contato (Parte 1)</label>
            <input type="text" id="f-ct-t1" class="cms-input" value="${escapeAttr(ct.titleLine1)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Destaque em Itálico Azul</label>
            <input type="text" id="f-ct-t2" class="cms-input" value="${escapeAttr(ct.titleHighlight)}" />
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">Texto de Convite Abaixo do Título</label>
          <textarea id="f-ct-lead" class="cms-textarea" style="min-height: 62px;">${escapeAttr(ct.lead)}</textarea>
        </div>

        <div class="field-group">
          <label class="field-label">Nota Sobre Locação e Horário</label>
          <textarea id="f-ct-note" class="cms-textarea" style="min-height: 68px;">${escapeAttr(ct.noteText)}</textarea>
        </div>

        <div class="field-grid">
          <div class="field-group">
            <label class="field-label">Título do Cartão de Pré-Agendamento</label>
            <input type="text" id="f-ct-ft" class="cms-input" value="${escapeAttr(ct.formTitle)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Equipamento Exibido no Rodapé</label>
            <input type="text" id="f-ct-eq" class="cms-input" value="${escapeAttr(ct.equipmentText)}" />
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">Frase Institucional do Rodapé</label>
          <textarea id="f-ct-fdesc" class="cms-textarea" style="min-height: 58px;">${escapeAttr(ct.footerDescription)}</textarea>
        </div>
      </div>
    `;

    container.querySelector('#f-b-wa')?.addEventListener('input', (e) => {
      b.whatsappFormatted = e.target.value;
      const digits = e.target.value.replace(/\D/g, '');
      if (digits.length >= 10) {
        b.whatsappNumber = digits.startsWith('55') ? digits : `55${digits}`;
      }
      markDirtyAndSync();
    });

    container.querySelector('#f-b-ig')?.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      b.instagram = val.startsWith('@') ? val : `@${val}`;
      const handle = b.instagram.replace(/^@/, '');
      if (handle) b.instagramUrl = `https://www.instagram.com/${handle}`;
      markDirtyAndSync();
    });

    container.querySelector('#f-b-loc')?.addEventListener('input', (e) => { b.location = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ct-t1')?.addEventListener('input', (e) => { ct.titleLine1 = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ct-t2')?.addEventListener('input', (e) => { ct.titleHighlight = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ct-lead')?.addEventListener('input', (e) => { ct.lead = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ct-note')?.addEventListener('input', (e) => { ct.noteText = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ct-ft')?.addEventListener('input', (e) => { ct.formTitle = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ct-eq')?.addEventListener('input', (e) => { ct.equipmentText = e.target.value; markDirtyAndSync(); });
    container.querySelector('#f-ct-fdesc')?.addEventListener('input', (e) => { ct.footerDescription = e.target.value; markDirtyAndSync(); });
  }
}

function initSectionSubtabs() {
  const subtabMap = {
    'sec-hero': '#inicio',
    'sec-proposta': '#proposta',
    'sec-portfolio': '#portfolio',
    'sec-abordagem': '#humanizada',
    'sec-experiencias': '#servicos',
    'sec-sobre': '#sobre',
    'sec-avaliacoes': '#avaliacoes',
    'sec-contato': '#contato'
  };

  document.querySelectorAll('#sections-subtabs .subtab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#sections-subtabs .subtab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeSubTab = btn.getAttribute('data-subtab');
      renderSectionsAdmin();
      const targetSel = subtabMap[activeSubTab];
      if (targetSel) scrollPreviewTo(targetSel);
    });
  });
}

/* ==========================================================================
   11. ABA 6: PUBLICAÇÃO ATÔMICA NO GITHUB API & BACKUPS
   ========================================================================== */
function serializeDataJsContent(dataObject) {
  return `/**
 * Instantes de Carly - Camada de Dados Autêntica
 * Gerenciado via Painel Admin Visual (CMS)
 * Paleta Solar: Amarelinho Bebê, Luz Dourada & Azul Iracema.
 */

const SITE_DATA = ${JSON.stringify(dataObject, null, 2)};

if (typeof window !== 'undefined') {
  window.SITE_DATA = SITE_DATA;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SITE_DATA;
}
`;
}

async function publishToGitHubAtomic(ghCfg) {
  const { repo, branch, token } = ghCfg;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Clonar dados para substituir data:image/... por arquivos reais em assets/images/uploads/
  const cleanPayload = JSON.parse(JSON.stringify(cmsData));
  cleanPayload.cmsVersion = cmsData.cmsVersion || new Date().toISOString();

  const pendingBlobs = [];
  let imgCounter = 0;

  function extractBase64Images(node) {
    if (!node || typeof node !== 'object') return;
    Object.keys(node).forEach((key) => {
      const val = node[key];
      if (typeof val === 'string' && val.startsWith('data:image/')) {
        const commaIdx = val.indexOf(',');
        if (commaIdx !== -1) {
          imgCounter++;
          const base64Content = val.slice(commaIdx + 1);
          const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
          const repoFilePath = `assets/images/uploads/foto-${stamp}-${String(imgCounter).padStart(2, '0')}.jpg`;
          pendingBlobs.push({
            path: repoFilePath,
            base64: base64Content
          });
          node[key] = repoFilePath;
        }
      } else if (typeof val === 'object') {
        extractBase64Images(val);
      }
    });
  }

  extractBase64Images(cleanPayload);

  // 1. Buscar referência atual da branch
  const refRes = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`, { headers });
  if (!refRes.ok) {
    throw new Error(`Não foi possível ler a branch "${branch}" em ${repo} (HTTP ${refRes.status}).`);
  }
  const refData = await refRes.json();
  const latestCommitSha = refData.object.sha;

  // 2. Buscar árvore base do último commit
  const commitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits/${latestCommitSha}`, { headers });
  if (!commitRes.ok) throw new Error('Falha ao obter árvore atual do repositório.');
  const commitData = await commitRes.json();
  const baseTreeSha = commitData.tree.sha;

  const treeEntries = [];

  // 3. Enviar cada nova foto otimizada como Git Blob
  if (pendingBlobs.length > 0) {
    showToast(`Enviando ${pendingBlobs.length} ${pendingBlobs.length === 1 ? 'nova foto otimizada' : 'novas fotos otimizadas'} para o servidor...`, 'info');
  }

  for (const item of pendingBlobs) {
    const blobRes = await fetch(`https://api.github.com/repos/${repo}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: item.base64,
        encoding: 'base64'
      })
    });
    if (!blobRes.ok) throw new Error(`Falha ao enviar imagem ${item.path}.`);
    const blobData = await blobRes.json();
    treeEntries.push({
      path: item.path,
      mode: '100644',
      type: 'blob',
      sha: blobData.sha
    });
  }

  // 4. Criar Blob para assets/js/data.js atualizado
  const dataJsText = serializeDataJsContent(cleanPayload);
  const dataBlobRes = await fetch(`https://api.github.com/repos/${repo}/git/blobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      content: dataJsText,
      encoding: 'utf-8'
    })
  });
  if (!dataBlobRes.ok) throw new Error('Falha ao preparar camada de dados data.js.');
  const dataBlob = await dataBlobRes.json();

  treeEntries.push({
    path: 'assets/js/data.js',
    mode: '100644',
    type: 'blob',
    sha: dataBlob.sha
  });

  // 5. Criar nova Git Tree única
  const newTreeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeEntries
    })
  });
  if (!newTreeRes.ok) throw new Error('Falha ao montar pacote de atualização no GitHub.');
  const newTree = await newTreeRes.json();

  // 6. Criar Commit atômico único
  const newCommitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: `✨ Atualização via Painel Admin (${pendingBlobs.length} fotos novas)`,
      tree: newTree.sha,
      parents: [latestCommitSha]
    })
  });
  if (!newCommitRes.ok) throw new Error('Falha ao registrar versão no GitHub.');
  const newCommit = await newCommitRes.json();

  // 7. Atualizar ponteiro da branch (dispara 1 único deploy na Vercel / Netlify!)
  const updateRefRes = await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      sha: newCommit.sha,
      force: false
    })
  });
  if (!updateRefRes.ok) throw new Error('Falha ao finalizar publicação na branch principal.');

  return { uploadedPhotos: pendingBlobs.length, cleanPayload };
}

function broadcastPublishedSiteData(payload) {
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    const channel = new BroadcastChannel('instantes_carly_cms_sync');
    channel.postMessage({
      type: 'CMS_PUBLISHED',
      payload: JSON.parse(JSON.stringify(payload))
    });
    channel.close();
  } catch (_) {}
}

async function handleMainPublishClick() {
  const btn = document.getElementById('btn-publish-main');
  const label = document.getElementById('btn-publish-label');
  if (btn) btn.disabled = true;

  try {
    // Sincroniza álbuns de clientes com o payload oficial do site antes de publicar
    if (window.AlbumsStore && typeof window.AlbumsStore.loadState === 'function') {
      try {
        const albState = await window.AlbumsStore.loadState();
        if (albState && Array.isArray(albState.albums)) {
          cmsData.clientAlbums = albState.albums;
        }
      } catch (_) {}
    }

    // Sempre grava localmente e avisa outras abas abertas imediatamente (0s, sem F5)
    cmsData.cmsVersion = new Date().toISOString();
    await writeCmsSnapshot('local_published', cmsData);
    await writeCmsSnapshot('draft_working', cmsData);
    sendToPreviewIframe({ type: 'CMS_LIVE_UPDATE', payload: cmsData });
    broadcastPublishedSiteData(cmsData);

    const ghCfg = getSavedGitHubConfig();
    if (ghCfg) {
      if (label) label.textContent = 'Publicando...';
      const result = await publishToGitHubAtomic(ghCfg);
      // Em produção (fora do localhost), já adota os caminhos limpos publicados
      if (!isLocalhost && result && result.cleanPayload) {
        cmsData = result.cleanPayload;
        await writeCmsSnapshot('draft_working', cmsData);
        if (result.cleanPayload.clientAlbums && window.AlbumsStore && typeof window.AlbumsStore.saveState === 'function') {
          try {
            const albState = await window.AlbumsStore.loadState();
            albState.albums = result.cleanPayload.clientAlbums;
            await window.AlbumsStore.saveState(albState);
            if (typeof renderAlbumsAdminPanel === 'function') {
              renderAlbumsAdminPanel();
            }
          } catch (_) {}
        }
      }
      isDirty = false;
      updateStatusUI();
      showToast('Publicado com sucesso! O site oficial e as galerias estarão atualizados em ~15 segundos.', 'success', 6000);
    } else {
      isDirty = false;
      updateStatusUI();
      showToast('Alterações salvas e aplicadas no seu site local (localhost)! Quando estiver em produção, conecte o GitHub na aba Publicação.', 'success', 5200);
    }
  } catch (err) {
    showToast(`Erro ao publicar: ${err.message}`, 'error', 6500);
  } finally {
    if (btn) btn.disabled = false;
    updateStatusUI();
  }
}

function syncGitHubSettingsPanel() {
  const cfg = getSavedGitHubConfig();
  const repoIn = document.getElementById('cfg-gh-repo');
  const branchIn = document.getElementById('cfg-gh-branch');
  const tokenIn = document.getElementById('cfg-gh-token');
  const badge = document.getElementById('gh-connection-badge');

  if (cfg) {
    if (repoIn) repoIn.value = cfg.repo;
    if (branchIn) branchIn.value = cfg.branch || 'main';
    if (tokenIn) tokenIn.value = cfg.token;
    if (badge) {
      badge.textContent = `🟢 Conectado (${cfg.repo})`;
      badge.classList.add('active');
    }
  } else {
    if (badge) {
      badge.textContent = 'Não conectado (Modo Local)';
      badge.classList.remove('active');
    }
  }
}

function initPublishAndBackupActions() {
  document.getElementById('btn-publish-main')?.addEventListener('click', handleMainPublishClick);

  document.getElementById('btn-save-test-gh')?.addEventListener('click', async () => {
    const repo = document.getElementById('cfg-gh-repo')?.value || '';
    const branch = document.getElementById('cfg-gh-branch')?.value || 'main';
    const token = document.getElementById('cfg-gh-token')?.value || '';
    const resBox = document.getElementById('gh-test-result');

    try {
      const verified = await verifyGitHubCredentials(repo, branch, token);
      localStorage.setItem(GH_STORAGE_KEY, JSON.stringify(verified));
      syncGitHubSettingsPanel();
      updateStatusUI();
      if (resBox) {
        resBox.className = 'alert-banner success';
        resBox.textContent = `Conexão confirmada com "${verified.repo}" (branch: ${verified.branch})! Agora o botão "Publicar no Site Oficial" atualizará o site online automaticamente.`;
        resBox.style.display = 'block';
      }
      showToast('GitHub conectado com sucesso!', 'success');
    } catch (err) {
      if (resBox) {
        resBox.className = 'alert-banner';
        resBox.style.color = 'var(--cms-danger)';
        resBox.textContent = err.message;
        resBox.style.display = 'block';
      }
    }
  });

  document.getElementById('btn-clear-gh')?.addEventListener('click', () => {
    localStorage.removeItem(GH_STORAGE_KEY);
    sessionStorage.removeItem(GH_STORAGE_KEY);
    const tokenIn = document.getElementById('cfg-gh-token');
    if (tokenIn) tokenIn.value = '';
    syncGitHubSettingsPanel();
    updateStatusUI();
    showToast('Conexão GitHub desconectada deste navegador.', 'info');
  });

  // Exportar data.js
  document.getElementById('btn-export-datajs')?.addEventListener('click', () => {
    const content = serializeDataJsContent(cmsData);
    const blob = new Blob([content], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.js';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Arquivo data.js baixado com sucesso!', 'success');
  });

  // Exportar JSON
  document.getElementById('btn-export-json')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(cmsData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-instantes-de-carly-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON exportado!', 'success');
  });

  // Importar JSON
  const importInput = document.getElementById('import-json-input');
  document.getElementById('btn-import-json')?.addEventListener('click', () => importInput?.click());
  importInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      const parsed = JSON.parse(txt);
      if (!parsed.portfolio || !parsed.categories) {
        throw new Error('Arquivo JSON não parece um backup válido do site.');
      }
      cmsData = parsed;
      markDirtyAndSync(true);
      renderAllPanels();
      showToast('Backup importado com sucesso!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
    importInput.value = '';
  });

  // Restaurar padrão de fábrica
  document.getElementById('btn-reset-factory')?.addEventListener('click', async () => {
    if (!confirm('Deseja descartar todas as edições locais não enviadas ao servidor e recarregar o conteúdo original?')) return;
    await clearCmsSnapshots();
    cmsData = JSON.parse(JSON.stringify(FACTORY_DATA));
    isDirty = false;
    renderAllPanels();
    updateStatusUI();
    sendToPreviewIframe({ type: 'CMS_LIVE_UPDATE', payload: cmsData });
    showToast('Conteúdo restaurado para a versão original do servidor.', 'info');
  });
}

/* ==========================================================================
   12. NAVEGAÇÃO ENTRE ABAS, MODOS DE PREVIEW E BOOTSTRAP
   ========================================================================== */
function initTabsAndPreviewModes() {
  const tabScrollTargets = {
    portfolio: '#portfolio',
    hero: '#inicio',
    categories: '#portfolio',
    packages: '#servicos',
    sections: '#inicio'
  };

  document.querySelectorAll('.sidebar-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      activeTab = tab;

      document.querySelectorAll('.sidebar-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.cms-panel').forEach((p) => p.classList.remove('active'));
      document.getElementById(`panel-${tab}`)?.classList.add('active');

      if (tabScrollTargets[tab]) {
        scrollPreviewTo(tabScrollTargets[tab]);
      }
    });
  });

  const urlTab = new URLSearchParams(window.location.search).get('tab');
  if (urlTab) {
    const targetTabBtn = document.querySelector(`.sidebar-tab[data-tab="${urlTab}"]`);
    if (targetTabBtn) {
      setTimeout(() => targetTabBtn.click(), 50);
    }
  }

  const workspace = document.getElementById('cms-workspace');
  const stage = document.getElementById('preview-stage');

  document.querySelectorAll('.preview-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preview-mode-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.getAttribute('data-preview-mode');
      if (mode === 'hidden') {
        workspace?.classList.add('preview-hidden');
        workspace?.classList.remove('force-mobile-preview');
      } else if (mode === 'mobile') {
        workspace?.classList.remove('preview-hidden');
        workspace?.classList.add('force-mobile-preview');
        stage?.classList.add('is-mobile-mode');
      } else {
        workspace?.classList.remove('preview-hidden');
        workspace?.classList.remove('force-mobile-preview');
        stage?.classList.remove('is-mobile-mode');
      }
    });
  });

  // Alternar Menu Lateral Recolhido / Expandido (Mais Espaço no Editor — Estilo Pixieset)
  const SIDEBAR_COLLAPSED_KEY = 'cms_main_sidebar_collapsed';
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const btnCollapseRail = document.getElementById('btn-collapse-sidebar-rail');
  const iconToggle = document.getElementById('sidebar-toggle-icon');
  const labelToggle = document.getElementById('sidebar-toggle-label');

  function setSidebarCollapsedState(collapsed) {
    workspace?.classList.toggle('sidebar-collapsed', collapsed);
    if (btnToggleSidebar) btnToggleSidebar.classList.toggle('active', collapsed);
    if (iconToggle) iconToggle.textContent = collapsed ? '▶|' : '◀|';
    if (labelToggle) labelToggle.textContent = collapsed ? 'Mostrar Menu' : 'Recolher Menu';
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? 'true' : 'false');
    } catch (_) {}
  }

  try {
    if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true') {
      setSidebarCollapsedState(true);
    }
  } catch (_) {}

  const toggleSidebar = () => {
    const isCurrentlyCollapsed = workspace?.classList.contains('sidebar-collapsed');
    setSidebarCollapsedState(!isCurrentlyCollapsed);
  };

  btnToggleSidebar?.addEventListener('click', toggleSidebar);
  btnCollapseRail?.addEventListener('click', () => setSidebarCollapsedState(true));

  const iframe = document.getElementById('cms-preview-iframe');
  iframe?.addEventListener('load', () => {
    sendToPreviewIframe({ type: 'CMS_LIVE_UPDATE', payload: cmsData });
  });

  document.getElementById('btn-reload-preview')?.addEventListener('click', () => {
    if (iframe) iframe.contentWindow.location.reload();
  });

  document.getElementById('btn-close-picker')?.addEventListener('click', () => {
    document.getElementById('gallery-picker-dialog')?.close();
  });
}

function syncAdminBrandUI() {
  const brandName = cmsData?.brand?.name || 'Painel do Estúdio';
  document.title = `Painel do Estúdio (Editor Visual) — ${brandName}`;
  const authTitle = document.getElementById('auth-title');
  if (authTitle) authTitle.textContent = `Estúdio ${brandName}`;
  const topbarTitle = document.querySelector('.topbar-title');
  if (topbarTitle) topbarTitle.textContent = brandName;
  document.querySelectorAll('.auth-logo-box img, .topbar-logo').forEach((img) => {
    img.alt = brandName;
  });
}

function renderAllPanels() {
  syncAdminBrandUI();
  renderPortfolioAdmin();
  renderHeroAdmin();
  renderCategoriesAdmin();
  renderPackagesAdmin();
  renderSectionsAdmin();
  syncGitHubSettingsPanel();
  updateStatusUI();
}

document.addEventListener('DOMContentLoaded', async () => {
  // Carrega rascunho de trabalho ou versão local salva se existir
  const draftSnap = await readCmsSnapshot('draft_working');
  const pubSnap = await readCmsSnapshot('local_published');

  if (draftSnap && draftSnap.data) {
    cmsData = draftSnap.data;
  } else if (pubSnap && pubSnap.data) {
    cmsData = pubSnap.data;
  }

  // Garante compatibilidade com novos campos de sections
  if (!cmsData.sections) {
    cmsData.sections = JSON.parse(JSON.stringify(FACTORY_DATA.sections));
  }

  initAuthGate();
  initTabsAndPreviewModes();
  initPortfolioUploadZone();
  initHeroTopActions();
  initCategoryAddAction();
  initPackageAddAction();
  initSectionSubtabs();
  initPublishAndBackupActions();

  renderAllPanels();
});

