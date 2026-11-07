/**
 * ============================================================================
 * INSTANTES DE CARLY — MOTOR UNIFICADO DE ÁLBUNS DE CLIENTES (V2)
 * Galeria de Seleção & Extras (estilo Sineto Studio) +
 * Galeria de Entrega em Alta Resolução (estilo Pixieset).
 *
 * Inclui:
 * - Marca d'água personalizada (PNG enviado pelo fotógrafo ou texto) gravada no Canvas
 * - 3 Níveis de Proteção:
 *     1. 'watermark'           -> Marca d'Água
 *     2. 'watermark_blur'      -> Marca d'Água + Desfoque Anti-Print
 *     3. 'watermark_spotlight' -> Marca d'Água + Foco Centralizado (Lupa Interativa)
 * - Cálculo seguro de pacote + fotos extras, BRCode Pix Banco Central e .ZIP nativo
 * ============================================================================
 */
(function (window) {
  'use strict';

  const DB_NAME = 'instantes_carly_albums_db_v2';
  const STORE_NAME = 'albums_state';
  const STATE_KEY = 'studio_albums_root';
  const SYNC_CHANNEL_NAME = 'instantes_carly_albums_sync_v2';

  const syncChannel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(SYNC_CHANNEL_NAME)
    : null;

  function getBrandDefaults() {
    const b = (window.SITE_DATA && window.SITE_DATA.brand) || {};
    return {
      studioName: b.name || 'Instantes de Carly',
      shortName: b.shortName || b.founder || 'Carly',
      whatsappNumber: b.whatsappNumber || '5585920015290',
      city: 'FORTALEZA',
      defaultWatermarkImg: 'assets/images/logo-light.png'
    };
  }

  /* ==========================================================================
     1. ESTADO INICIAL LIMPO (COM FOTOS REAIS DE PORTFÓLIO PARA TESTE LOCAL)
     ========================================================================== */
  function createInitialDemoState() {
    const brand = getBrandDefaults();
    return {
      version: Date.now(),
      storageMode: 'local',
      watermarkConfig: {
        mode: 'image',          // 'image' (PNG do fotógrafo) | 'text'
        imageSrc: brand.defaultWatermarkImg,
        text: brand.studioName.toUpperCase(),
        pattern: 'tiled',       // 'tiled' (grade diagonal) | 'center' (centralizada)
        opacity: 0.45,          // 0.15 a 0.85
        scale: 0.28,            // proporção em relação à foto
        updatedAt: 1
      },
      paymentConfig: {
        enableMercadoPago: true,
        enableDirectPix: true,
        pixKey: 'contato@instantesdecarly.com.br',
        merchantName: brand.studioName,
        merchantCity: brand.city
      },
      albums: [
        {
          id: 'alb_demo_selecao_01',
          slug: 'ana-e-lucas',
          clientName: 'Ana & Lucas',
          title: 'Ana & Lucas — À Espera de Bento',
          subtitle: 'Ensaio Gestante · Praia de Iracema',
          shootDate: '2026-11-05',
          welcomeMessage: 'Escolham com calma as fotografias favoritas de vocês. Se desejarem guardar registros além do pacote contratado, o valor adicional é calculado automaticamente.',
          phase: 'proofing', // 'proofing' | 'delivery'
          status: 'awaiting_selection',
          protectionLevel: 'watermark', // 'watermark' | 'watermark_blur' | 'watermark_spotlight'
          password: '1234',
          downloadPin: '4580',
          packageName: 'Ensaio Afeto',
          packageIncluded: 5,
          extraPhotoPrice: 20.00,
          coverSrc: 'assets/images/real/IMG_7513.jpg',
          coverFocal: 'center 32%',
          selectionLocked: false,
          selectedIds: ['p_01', 'p_02', 'p_04', 'p_05'],
          deliveryFavorites: [],
          photoComments: {
            p_02: 'Carly, amei essa luz! Pode suavizar só um fiozinho de cabelo no rosto?'
          },
          paymentOrder: null,
          activityLog: [
            { at: '2026-11-07T14:20:00.000Z', type: 'created', text: 'Galeria de seleção criada e protegida por senha.' }
          ],
          photos: [
            { id: 'p_01', filename: 'IMG_7513.jpg', originalSrc: 'assets/images/real/IMG_7513.jpg' },
            { id: 'p_02', filename: 'IMG_7525.jpg', originalSrc: 'assets/images/real/IMG_7525.jpg' },
            { id: 'p_03', filename: 'IMG_7467.jpg', originalSrc: 'assets/images/real/IMG_7467.jpg' },
            { id: 'p_04', filename: 'IMG_6297.jpg', originalSrc: 'assets/images/real/IMG_6297.jpg' },
            { id: 'p_05', filename: 'IMG_6409.jpg', originalSrc: 'assets/images/real/IMG_6409.jpg' },
            { id: 'p_06', filename: 'IMG_6438.jpg', originalSrc: 'assets/images/real/IMG_6438.jpg' },
            { id: 'p_07', filename: 'IMG_2811.jpg', originalSrc: 'assets/images/real/IMG_2811.jpg' },
            { id: 'p_08', filename: 'IMG_2819.jpg', originalSrc: 'assets/images/real/IMG_2819.jpg' },
            { id: 'p_09', filename: 'IMG_2887.jpg', originalSrc: 'assets/images/real/IMG_2887.jpg' }
          ]
        },
        {
          id: 'alb_demo_entrega_02',
          slug: 'marina-e-pedro',
          clientName: 'Marina & Pedro',
          title: 'Marina & Pedro',
          subtitle: '28 de Outubro, 2026 · Praia de Iracema',
          shootDate: '2026-10-28',
          welcomeMessage: 'Cada fotografia aqui guarda o riso solto e o abraço de vocês naquela tarde dourada. Galeria liberada em alta resolução.',
          phase: 'delivery',
          status: 'delivered',
          protectionLevel: 'watermark',
          password: '1234',
          downloadPin: '7788',
          packageName: 'Ensaio Completo',
          packageIncluded: 8,
          extraPhotoPrice: 20.00,
          coverSrc: 'assets/images/real/IMG_1186.jpg',
          coverFocal: 'center 38%',
          selectionLocked: true,
          selectedIds: ['d_01', 'd_02', 'd_03', 'd_04', 'd_05', 'd_06', 'd_07', 'd_08'],
          deliveryFavorites: ['d_01', 'd_04'],
          photoComments: {},
          paymentOrder: {
            id: 'ord_mp_99812',
            method: 'mercadopago_pix',
            status: 'approved',
            extraCount: 2,
            unitPrice: 20.00,
            totalAmount: 40.00,
            paidAt: '2026-10-30T19:15:00.000Z'
          },
          activityLog: [
            { at: '2026-10-29T13:00:00.000Z', type: 'selection', text: 'Seleção concluída pelo cliente (8 fotos: 6 do pacote + 2 extras).' },
            { at: '2026-10-30T19:15:00.000Z', type: 'payment', text: 'Pagamento de R$ 40,00 aprovado via Mercado Pago Pix.' },
            { at: '2026-11-02T16:40:00.000Z', type: 'delivered', text: 'Galeria de Entrega Final publicada em Alta Resolução.' }
          ],
          photos: [
            { id: 'd_01', filename: 'IMG_1186.jpg', originalSrc: 'assets/images/real/IMG_1186.jpg' },
            { id: 'd_02', filename: 'IMG_1197.jpg', originalSrc: 'assets/images/real/IMG_1197.jpg' },
            { id: 'd_03', filename: 'IMG_0975.jpg', originalSrc: 'assets/images/real/IMG_0975.jpg' },
            { id: 'd_04', filename: 'IMG_0978.jpg', originalSrc: 'assets/images/real/IMG_0978.jpg' },
            { id: 'd_05', filename: 'IMG_0997.jpg', originalSrc: 'assets/images/real/IMG_0997.jpg' },
            { id: 'd_06', filename: 'IMG_1919.jpg', originalSrc: 'assets/images/real/IMG_1919.jpg' },
            { id: 'd_07', filename: 'IMG_1943.jpg', originalSrc: 'assets/images/real/IMG_1943.jpg' },
            { id: 'd_08', filename: 'IMG_2046.jpg', originalSrc: 'assets/images/real/IMG_2046.jpg' }
          ]
        }
      ]
    };
  }

  /* ==========================================================================
     2. PERSISTÊNCIA INDEXEDDB + BROADCAST SINCRONIZADO
     ========================================================================== */
  function openAlbumsDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB indisponível'));
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function loadState() {
    try {
      const db = await openAlbumsDb();
      const saved = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(STATE_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      if (saved && Array.isArray(saved.albums)) {
        if (!saved.watermarkConfig) {
          saved.watermarkConfig = createInitialDemoState().watermarkConfig;
        }
        return saved;
      }
    } catch (_) {}
    const seed = createInitialDemoState();
    await saveState(seed, { silent: true });
    return seed;
  }

  async function saveState(nextState, opts = {}) {
    nextState.version = Date.now();
    try {
      const db = await openAlbumsDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(nextState, STATE_KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (_) {
      try {
        localStorage.setItem(STATE_KEY, JSON.stringify(nextState));
      } catch (__) {}
    }

    if (!opts.silent && syncChannel) {
      try {
        syncChannel.postMessage({ type: 'ALBUMS_UPDATED', version: nextState.version });
      } catch (_) {}
    }
    return nextState;
  }

  function subscribe(onUpdate) {
    if (!syncChannel || typeof onUpdate !== 'function') return () => {};
    const handler = (ev) => {
      if (ev.data && ev.data.type === 'ALBUMS_UPDATED') {
        onUpdate(ev.data);
      }
    };
    syncChannel.addEventListener('message', handler);
    return () => syncChannel.removeEventListener('message', handler);
  }

  /* ==========================================================================
     3. CÁLCULO SEGURO DE PACOTE + FOTOS EXTRAS
     ========================================================================== */
  function calculateSelectionPricing(album, customSelectedIds) {
    const rawIds = Array.isArray(customSelectedIds) ? customSelectedIds : (album.selectedIds || []);
    const validSet = new Set((album.photos || []).map((p) => p.id));
    const uniqueIds = [...new Set(rawIds)].filter((id) => validSet.has(id));

    const packageIncluded = Math.max(0, parseInt(album.packageIncluded, 10) || 0);
    const extraPhotoPrice = Math.max(0, Number(album.extraPhotoPrice) || 0);
    const selectedCount = uniqueIds.length;
    const includedSelected = Math.min(selectedCount, packageIncluded);
    const remainingInPackage = Math.max(0, packageIncluded - selectedCount);
    const extraCount = Math.max(0, selectedCount - packageIncluded);
    const extraTotal = Number((extraCount * extraPhotoPrice).toFixed(2));

    return {
      selectedIds: uniqueIds,
      selectedCount,
      packageIncluded,
      includedSelected,
      remainingInPackage,
      extraCount,
      extraPhotoPrice,
      extraTotal,
      hasExtras: extraCount > 0
    };
  }

  /* ==========================================================================
     4. MOTOR DE PROTEÇÃO DE PROVAS EM CANVAS (3 NÍVEIS + MARCA D'ÁGUA PNG/TEXTO)
     ========================================================================== */
  const imgCache = new Map();
  function loadImageElement(src) {
    if (!src) return Promise.reject(new Error('Imagem vazia'));
    if (imgCache.has(src)) return imgCache.get(src);
    const p = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        imgCache.delete(src);
        reject(new Error('Falha ao carregar imagem: ' + src));
      };
      img.src = src;
    });
    imgCache.set(src, p);
    return p;
  }

  function getWatermarkSignature(wmConfig, protectionLevel) {
    const cfg = wmConfig || {};
    return [
      protectionLevel || 'watermark',
      cfg.mode || 'image',
      (cfg.imageSrc || '').slice(-48),
      cfg.text || '',
      cfg.pattern || 'tiled',
      Number(cfg.opacity || 0.45).toFixed(2),
      Number(cfg.scale || 0.28).toFixed(2),
      cfg.updatedAt || 1
    ].join('|');
  }

  async function drawWatermarkOverlay(ctx, w, h, wmConfig) {
    const cfg = wmConfig || {};
    const opacity = Math.max(0.12, Math.min(0.9, Number(cfg.opacity) || 0.45));
    const scaleFactor = Math.max(0.14, Math.min(0.65, Number(cfg.scale) || 0.28));
    const pattern = cfg.pattern || 'tiled';

    let wmImg = null;
    if (cfg.mode !== 'text' && cfg.imageSrc) {
      try {
        wmImg = await loadImageElement(cfg.imageSrc);
      } catch (_) {
        wmImg = null;
      }
    }

    ctx.save();
    ctx.globalAlpha = opacity;

    if (wmImg && (wmImg.naturalWidth || wmImg.width)) {
      const iw = wmImg.naturalWidth || wmImg.width;
      const ih = wmImg.naturalHeight || wmImg.height;
      const aspect = iw / Math.max(1, ih);

      if (pattern === 'center') {
        const targetW = Math.round(Math.min(w, h) * Math.min(0.75, scaleFactor * 1.65));
        const targetH = Math.round(targetW / aspect);
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 8;
        ctx.drawImage(wmImg, (w - targetW) / 2, (h - targetH) / 2, targetW, targetH);
      } else {
        const tileW = Math.max(90, Math.round(Math.min(w, h) * scaleFactor * 0.78));
        const tileH = Math.max(28, Math.round(tileW / aspect));
        const stepX = Math.round(tileW * 1.85);
        const stepY = Math.round(Math.max(tileH * 2.5, 110));
        const span = Math.hypot(w, h);

        ctx.translate(w / 2, h / 2);
        ctx.rotate(-Math.PI / 7);
        ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
        ctx.shadowBlur = 4;

        for (let y = -span; y <= span; y += stepY) {
          const offset = (Math.round(y / stepY) % 2) * (stepX / 2);
          for (let x = -span; x <= span; x += stepX) {
            ctx.drawImage(wmImg, x + offset - tileW / 2, y - tileH / 2, tileW, tileH);
          }
        }
      }
    } else {
      const label = (cfg.text || getBrandDefaults().studioName).toUpperCase();
      const fontSize = Math.max(15, Math.round(Math.min(w, h) * scaleFactor * 0.16));
      ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (pattern === 'center') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillText(label, w / 2 + 1.5, h / 2 + 1.5);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.fillText(label, w / 2, h / 2);
      } else {
        const stepX = Math.max(210, Math.round(fontSize * 12));
        const stepY = Math.max(105, Math.round(fontSize * 5.2));
        const span = Math.hypot(w, h);
        ctx.translate(w / 2, h / 2);
        ctx.rotate(-Math.PI / 7);

        for (let y = -span; y <= span; y += stepY) {
          const offset = (Math.round(y / stepY) % 2) * (stepX / 2);
          for (let x = -span; x <= span; x += stepX) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
            ctx.fillText(label, x + offset + 1, y + 1);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
            ctx.fillText(label, x + offset, y);
          }
        }
      }
    }

    ctx.restore();
  }

  /**
   * Gera as versões protegidas nos pixels do Canvas conforme o nível escolhido:
   * - 'watermark': foto nítida em baixa resolução + marca d'água
   * - 'watermark_blur': foto borrada + marca d'água (com sharpWatermarked para inspeção segurando o clique)
   * - 'watermark_spotlight': bordas borradas + centro em foco nítido + marca d'água em toda a área
   */
  async function generateProtectedProofBundle(originalSrc, wmConfig, protectionLevel = 'watermark', maxDim = 1080) {
    const img = await loadImageElement(originalSrc);
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    const scale = Math.min(1, maxDim / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));

    // Base 1: Foto com Marca d'Água Nítida (usada no nível 'watermark' e dentro da lente de inspeção)
    const sharpCanvas = document.createElement('canvas');
    sharpCanvas.width = w;
    sharpCanvas.height = h;
    const sCtx = sharpCanvas.getContext('2d');
    sCtx.drawImage(img, 0, 0, w, h);
    await drawWatermarkOverlay(sCtx, w, h, wmConfig);
    const sharpWatermarkedUrl = sharpCanvas.toDataURL('image/jpeg', 0.78);

    if (protectionLevel === 'watermark') {
      return {
        primarySrc: sharpWatermarkedUrl,
        revealSrc: sharpWatermarkedUrl
      };
    }

    // Base 2: Versão Desfocada nos Pixels + Marca d'Água Nítida por cima
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = w;
    blurCanvas.height = h;
    const bCtx = blurCanvas.getContext('2d');
    const blurPx = Math.max(8, Math.round(Math.min(w, h) * 0.018));
    bCtx.filter = `blur(${blurPx}px)`;
    // Expande levemente nas bordas para evitar halo transparente do blur
    bCtx.drawImage(img, -blurPx * 2, -blurPx * 2, w + blurPx * 4, h + blurPx * 4);
    bCtx.filter = 'none';

    if (protectionLevel === 'watermark_blur') {
      await drawWatermarkOverlay(bCtx, w, h, wmConfig);
      return {
        primarySrc: blurCanvas.toDataURL('image/jpeg', 0.74),
        revealSrc: sharpWatermarkedUrl
      };
    }

    // Nível 3 ('watermark_spotlight'): Foco Centralizado + Bordas Desfocadas + Marca d'Água
    const focusCanvas = document.createElement('canvas');
    focusCanvas.width = w;
    focusCanvas.height = h;
    const fCtx = focusCanvas.getContext('2d');

    // Primeiro desenha a foto nítida e aplica máscara radial suave no centro
    fCtx.drawImage(img, 0, 0, w, h);
    fCtx.globalCompositeOperation = 'destination-in';
    const cx = w / 2;
    const cy = h * 0.46; // levemente acima do meio onde costumam ficar os rostos
    const innerR = Math.min(w, h) * 0.21;
    const outerR = Math.min(w, h) * 0.46;
    const grad = fCtx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.85)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    fCtx.fillStyle = grad;
    fCtx.fillRect(0, 0, w, h);

    // Combina o centro em foco sobre o fundo desfocado e grava a marca d'água por cima de tudo
    bCtx.drawImage(focusCanvas, 0, 0);
    await drawWatermarkOverlay(bCtx, w, h, wmConfig);

    return {
      primarySrc: blurCanvas.toDataURL('image/jpeg', 0.76),
      revealSrc: sharpWatermarkedUrl
    };
  }

  async function processUploadedAlbumFile(file, maxHighRes = 2048) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Erro ao ler imagem'));
      reader.readAsDataURL(file);
    });

    const img = await loadImageElement(dataUrl);
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    const scale = Math.min(1, maxHighRes / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));

    const hiCanvas = document.createElement('canvas');
    hiCanvas.width = w;
    hiCanvas.height = h;
    hiCanvas.getContext('2d').drawImage(img, 0, 0, w, h);

    return {
      filename: file.name || `FOTO_${Date.now()}.jpg`,
      originalSrc: hiCanvas.toDataURL('image/jpeg', 0.90)
    };
  }

  async function readWatermarkImageFile(file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Erro ao ler marca d\'água'));
      reader.readAsDataURL(file);
    });
    const img = await loadImageElement(dataUrl);
    const maxW = 700;
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    const scale = Math.min(1, maxW / Math.max(1, w0));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w0 * scale));
    canvas.height = Math.max(1, Math.round(h0 * scale));
    // Mantém transparência PNG para marcas d'água!
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  /* ==========================================================================
     5. EXPORTADOR LIGHTROOM, BRCODE PIX BANCO CENTRAL & ARQUIVO .ZIP
     ========================================================================== */
  function formatLightroomCodes(album) {
    const selectedSet = new Set(album.selectedIds || []);
    const chosen = (album.photos || []).filter((p) => selectedSet.has(p.id));
    const baseNames = chosen.map((p) => String(p.filename || '').replace(/\.[^.]+$/, '').trim()).filter(Boolean);
    const fullNames = chosen.map((p) => String(p.filename || '').trim()).filter(Boolean);

    return {
      count: chosen.length,
      lightroomComma: baseNames.join(', '),
      spaceList: baseNames.join(' '),
      windowsOrQuery: fullNames.map((n) => `"${n}"`).join(' OR '),
      photos: chosen
    };
  }

  function emvField(id, value) {
    const str = String(value || '');
    return `${id}${String(str.length).padStart(2, '0')}${str}`;
  }

  function sanitizeAscii(str, maxLen) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .toUpperCase()
      .slice(0, maxLen);
  }

  function crc16Ccitt(payload) {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  function generatePixPayload({ pixKey, merchantName, merchantCity, amount, txid }) {
    const cleanKey = String(pixKey || '').trim();
    const cleanName = sanitizeAscii(merchantName || 'ESTUDIO FOTOGRAFIA', 25) || 'ESTUDIO';
    const cleanCity = sanitizeAscii(merchantCity || 'FORTALEZA', 15) || 'FORTALEZA';
    const cleanTxid = sanitizeAscii(txid || 'FOTOSEXTRAS', 25).replace(/\s+/g, '') || '***';
    const formattedAmount = Number(amount || 0).toFixed(2);

    const merchantAccount = emvField('26', emvField('00', 'br.gov.bcb.pix') + emvField('01', cleanKey));
    const body =
      emvField('00', '01') +
      merchantAccount +
      emvField('52', '0000') +
      emvField('53', '986') +
      (Number(amount) > 0 ? emvField('54', formattedAmount) : '') +
      emvField('58', 'BR') +
      emvField('59', cleanName) +
      emvField('60', cleanCity) +
      emvField('62', emvField('05', cleanTxid)) +
      '6304';

    return body + crc16Ccitt(body);
  }

  const CRC32_TABLE = (function () {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32Bytes(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function buildZipBlob(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    const now = new Date();
    const dosTime = ((now.getHours() & 0x1F) << 11) | ((now.getMinutes() & 0x3F) << 5) | ((now.getSeconds() >> 1) & 0x1F);
    const dosDate = (((Math.max(1980, now.getFullYear()) - 1980) & 0x7F) << 9) | (((now.getMonth() + 1) & 0x0F) << 5) | (now.getDate() & 0x1F);

    for (const file of files) {
      const nameBytes = encoder.encode(file.name);
      const data = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
      const crc = crc32Bytes(data);
      const size = data.length;

      const localHeader = new ArrayBuffer(30);
      const lv = new DataView(localHeader);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);
      lv.setUint16(8, 0, true);
      lv.setUint16(10, dosTime, true);
      lv.setUint16(12, dosDate, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);

      localParts.push(new Uint8Array(localHeader), nameBytes, data);

      const centralHeader = new ArrayBuffer(46);
      const cv = new DataView(centralHeader);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, dosTime, true);
      cv.setUint14 ? null : null;
      cv.setUint16(14, dosDate, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);

      centralParts.push(new Uint8Array(centralHeader), nameBytes);
      offset += 30 + nameBytes.length + size;
    }

    let centralSize = 0;
    for (const part of centralParts) centralSize += part.length;

    const eocd = new ArrayBuffer(22);
    const ev = new DataView(eocd);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    return new Blob([...localParts, ...centralParts, new Uint8Array(eocd)], {
      type: 'application/zip'
    });
  }

  async function fetchImageAsBytes(src, resolutionMode = 'high') {
    if (resolutionMode === 'high') {
      const res = await fetch(src);
      return new Uint8Array(await res.arrayBuffer());
    }
    const img = await loadImageElement(src);
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    const scale = Math.min(1, 1600 / Math.max(w0, h0));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w0 * scale));
    canvas.height = Math.max(1, Math.round(h0 * scale));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    return new Uint8Array(await blob.arrayBuffer());
  }

  /**
   * Extrai código limpo caso o cliente cole o link completo (ex: https://.../galeria?id=ana-e-lucas)
   */
  function parseAlbumSlugFromInput(rawInput) {
    const trimmed = String(rawInput || '').trim();
    if (!trimmed) return '';
    try {
      if (trimmed.includes('://') || trimmed.includes('?')) {
        const u = new URL(trimmed, window.location.origin);
        const fromParam = u.searchParams.get('id') || u.searchParams.get('album');
        if (fromParam) return fromParam.trim().toLowerCase();
        const segs = u.pathname.split('/').filter(Boolean);
        return (segs[segs.length - 1] || '').toLowerCase();
      }
    } catch (_) {}
    return trimmed.replace(/^#/, '').toLowerCase();
  }

  window.AlbumsStore = {
    loadState,
    saveState,
    subscribe,
    getBrandDefaults,
    createInitialDemoState,
    calculateSelectionPricing,
    getWatermarkSignature,
    generateProtectedProofBundle,
    processUploadedAlbumFile,
    readWatermarkImageFile,
    formatLightroomCodes,
    generatePixPayload,
    buildZipBlob,
    fetchImageAsBytes,
    parseAlbumSlugFromInput,
    async resetToDemo() {
      const fresh = createInitialDemoState();
      await saveState(fresh);
      return fresh;
    }
  };
})(window);
