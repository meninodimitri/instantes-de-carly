/**
 * ============================================================================
 * INSTANTES DE CARLY — MOTOR UNIFICADO DE ÁLBUNS DE CLIENTES (WHITE-LABEL)
 * Combina Galeria de Seleção & Extras (estilo Sineto Studio) +
 * Galeria de Entrega em Alta Resolução (estilo Pixieset).
 *
 * Em Modo Local (localhost / validação), persiste no IndexedDB com sincronização
 * instantânea entre abas via BroadcastChannel. Arquitetura pronta para plugar
 * Supabase + Cloudflare R2 + API Mercado Pago em produção.
 * ============================================================================
 */
(function (window) {
  'use strict';

  const DB_NAME = 'instantes_carly_albums_db_v1';
  const STORE_NAME = 'albums_state';
  const STATE_KEY = 'studio_albums_root';
  const SYNC_CHANNEL_NAME = 'instantes_carly_albums_sync';

  const syncChannel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(SYNC_CHANNEL_NAME)
    : null;

  function getBrandDefaults() {
    const b = (window.SITE_DATA && window.SITE_DATA.brand) || {};
    return {
      studioName: b.name || 'Instantes de Carly',
      shortName: b.shortName || b.founder || 'Carly',
      whatsappNumber: b.whatsappNumber || '5585920015290',
      city: 'FORTALEZA'
    };
  }

  /* ==========================================================================
     1. DADOS INICIAIS DE DEMONSTRAÇÃO (USANDO FOTOS REAIS DO ACERVO)
     ========================================================================== */
  function createInitialDemoState() {
    const brand = getBrandDefaults();
    return {
      version: Date.now(),
      storageMode: 'local', // 'local' (IndexedDB) | 'cloud' (Supabase + Cloudflare R2)
      paymentConfig: {
        enableMercadoPago: true,
        mercadoPagoPublicKey: '',
        enableDirectPix: true,
        pixKey: 'contato@instantesdecarly.com.br',
        pixKeyType: 'email',
        merchantName: brand.studioName,
        merchantCity: brand.city
      },
      albums: [
        {
          id: 'alb_demo_selecao_01',
          slug: 'ana-e-lucas',
          clientName: 'Ana & Lucas',
          title: 'À Espera de Bento — Luz da Manhã',
          subtitle: 'Ensaio Gestante • Praia de Iracema, Fortaleza',
          shootDate: '2026-11-05',
          welcomeMessage: 'Queridos Ana e Lucas, escolham com calma as fotos que mais tocam o coração de vocês. Se quiserem guardar momentos além do pacote, o sistema já calcula automaticamente.',
          phase: 'proofing', // 'proofing' (Seleção Sineto) | 'delivery' (Entrega Pixieset)
          status: 'awaiting_selection', // 'awaiting_selection' | 'awaiting_pix_confirm' | 'selection_paid' | 'selection_completed' | 'delivered'
          password: '1234',
          downloadPin: '4580',
          packageName: 'Ensaio Afeto',
          packageIncluded: 5,
          extraPhotoPrice: 20.00,
          watermarkEnabled: true,
          watermarkText: brand.studioName.toUpperCase(),
          coverSrc: 'assets/images/real/IMG_7513.jpg',
          coverFocal: 'center 32%',
          allowComments: true,
          selectionLocked: false,
          selectedIds: ['p_01', 'p_02', 'p_04', 'p_05'],
          photoComments: {
            p_02: 'Carly, amei essa! Pode suavizar só um fiozinho de cabelo no rosto?'
          },
          paymentOrder: null,
          activityLog: [
            { at: '2026-11-07T14:20:00.000Z', type: 'created', text: 'Álbum de seleção criado e protegido por senha.' }
          ],
          photos: [
            { id: 'p_01', filename: 'IMG_7513.jpg', folder: 'Beira-Mar', originalSrc: 'assets/images/real/IMG_7513.jpg', proofSrc: '' },
            { id: 'p_02', filename: 'IMG_7525.jpg', folder: 'Beira-Mar', originalSrc: 'assets/images/real/IMG_7525.jpg', proofSrc: '' },
            { id: 'p_03', filename: 'IMG_7467.jpg', folder: 'Beira-Mar', originalSrc: 'assets/images/real/IMG_7467.jpg', proofSrc: '' },
            { id: 'p_04', filename: 'IMG_6297.jpg', folder: 'Luz Dourada', originalSrc: 'assets/images/real/IMG_6297.jpg', proofSrc: '' },
            { id: 'p_05', filename: 'IMG_6409.jpg', folder: 'Luz Dourada', originalSrc: 'assets/images/real/IMG_6409.jpg', proofSrc: '' },
            { id: 'p_06', filename: 'IMG_6438.jpg', folder: 'Luz Dourada', originalSrc: 'assets/images/real/IMG_6438.jpg', proofSrc: '' },
            { id: 'p_07', filename: 'IMG_2811.jpg', folder: 'Retratos & Afeto', originalSrc: 'assets/images/real/IMG_2811.jpg', proofSrc: '' },
            { id: 'p_08', filename: 'IMG_2819.jpg', folder: 'Retratos & Afeto', originalSrc: 'assets/images/real/IMG_2819.jpg', proofSrc: '' },
            { id: 'p_09', filename: 'IMG_2887.jpg', folder: 'Retratos & Afeto', originalSrc: 'assets/images/real/IMG_2887.jpg', proofSrc: '' }
          ]
        },
        {
          id: 'alb_demo_entrega_02',
          slug: 'marina-e-pedro',
          clientName: 'Marina & Pedro',
          title: 'Marina & Pedro — Onde o Mar Encontra o Sol',
          subtitle: 'Ensaio de Casal • Fortaleza, Ceará',
          shootDate: '2026-10-28',
          welcomeMessage: 'Marina e Pedro, cada fotografia aqui guarda o riso solto e o abraço de vocês naquela tarde dourada. O álbum já está liberado em alta resolução para guardar para sempre!',
          phase: 'delivery',
          status: 'delivered',
          password: '1234',
          downloadPin: '7788',
          packageName: 'Ensaio Completo',
          packageIncluded: 8,
          extraPhotoPrice: 20.00,
          watermarkEnabled: false,
          watermarkText: brand.studioName.toUpperCase(),
          coverSrc: 'assets/images/real/IMG_1186.jpg',
          coverFocal: 'center 38%',
          allowComments: false,
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
            { at: '2026-10-29T13:00:00.000Z', type: 'selection', text: 'Cliente finalizou seleção (8 fotos: 6 do pacote + 2 extras).' },
            { at: '2026-10-30T19:15:00.000Z', type: 'payment', text: 'Pagamento de R$ 40,00 aprovado automaticamente (Mercado Pago Pix).' },
            { at: '2026-11-02T16:40:00.000Z', type: 'delivered', text: 'Galeria de Entrega Final publicada em Alta Resolução.' }
          ],
          photos: [
            { id: 'd_01', filename: 'IMG_1186.jpg', folder: 'Pôr do Sol', originalSrc: 'assets/images/real/IMG_1186.jpg', proofSrc: '' },
            { id: 'd_02', filename: 'IMG_1197.jpg', folder: 'Pôr do Sol', originalSrc: 'assets/images/real/IMG_1197.jpg', proofSrc: '' },
            { id: 'd_03', filename: 'IMG_0975.jpg', folder: 'Caminhada na Areia', originalSrc: 'assets/images/real/IMG_0975.jpg', proofSrc: '' },
            { id: 'd_04', filename: 'IMG_0978.jpg', folder: 'Caminhada na Areia', originalSrc: 'assets/images/real/IMG_0978.jpg', proofSrc: '' },
            { id: 'd_05', filename: 'IMG_0997.jpg', folder: 'Caminhada na Areia', originalSrc: 'assets/images/real/IMG_0997.jpg', proofSrc: '' },
            { id: 'd_06', filename: 'IMG_1919.jpg', folder: 'Detalhes & Abraços', originalSrc: 'assets/images/real/IMG_1919.jpg', proofSrc: '' },
            { id: 'd_07', filename: 'IMG_1943.jpg', folder: 'Detalhes & Abraços', originalSrc: 'assets/images/real/IMG_1943.jpg', proofSrc: '' },
            { id: 'd_08', filename: 'IMG_2046.jpg', folder: 'Detalhes & Abraços', originalSrc: 'assets/images/real/IMG_2046.jpg', proofSrc: '' }
          ]
        }
      ]
    };
  }

  /* ==========================================================================
     2. PERSISTÊNCIA INDEXEDDB + SINCRONIZAÇÃO EM TEMPO REAL
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
        return saved;
      }
    } catch (_) {
      // Fallback para memória/localStorage se navegador restringir IDB
    }
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
     4. MOTOR DE MARCA D'ÁGUA ANTI-CÓPIA EM CANVAS (GRAVADA NOS PIXELS)
     ========================================================================== */
  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Falha ao carregar imagem: ' + src));
      img.src = src;
    });
  }

  async function burnProofWatermark(srcOrDataUrl, watermarkLabel, maxDim = 1150) {
    const img = await loadImageElement(srcOrDataUrl);
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    const scale = Math.min(1, maxDim / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    const label = (watermarkLabel || getBrandDefaults().studioName).toUpperCase();

    // Camada 1: Malha diagonal sutil em toda a fotografia (impede recorte limpo)
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 6);
    const fontSize = Math.max(14, Math.round(Math.min(w, h) * 0.032));
    ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const stepX = Math.max(220, Math.round(fontSize * 13));
    const stepY = Math.max(120, Math.round(fontSize * 6.2));
    const span = Math.hypot(w, h);

    for (let y = -span; y <= span; y += stepY) {
      const offset = (Math.round(y / stepY) % 2) * (stepX / 2);
      for (let x = -span; x <= span; x += stepX) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.20)';
        ctx.fillText(`PROVA • ${label}`, x + offset + 1, y + 1);
        ctx.fillStyle = 'rgba(255, 253, 243, 0.34)';
        ctx.fillText(`PROVA • ${label}`, x + offset, y);
      }
    }
    ctx.restore();

    // Camada 2: Selo central editorial translúcido
    ctx.save();
    const badgeW = Math.min(w * 0.72, 420);
    const badgeH = Math.max(44, Math.round(Math.min(w, h) * 0.085));
    const bx = (w - badgeW) / 2;
    const by = (h - badgeH) / 2;

    ctx.fillStyle = 'rgba(20, 29, 38, 0.38)';
    ctx.strokeStyle = 'rgba(255, 253, 243, 0.48)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(bx, by, badgeW, badgeH, 6);
    } else {
      ctx.rect(bx, by, badgeW, badgeH);
    }
    ctx.fill();
    ctx.stroke();

    const centerFont = Math.max(13, Math.round(badgeH * 0.34));
    ctx.font = `700 ${centerFont}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = 'rgba(255, 253, 243, 0.88)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`PROVA DE SELEÇÃO • ${label}`, w / 2, h / 2);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.78);
  }

  async function processUploadedAlbumFile(file, options = {}) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    });

    const img = await loadImageElement(dataUrl);
    const maxHighRes = options.maxHighRes || 2048;
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    const scale = Math.min(1, maxHighRes / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));

    const hiCanvas = document.createElement('canvas');
    hiCanvas.width = w;
    hiCanvas.height = h;
    hiCanvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const originalSrc = hiCanvas.toDataURL('image/jpeg', 0.90);

    const proofSrc = await burnProofWatermark(originalSrc, options.watermarkText);

    return {
      filename: file.name || `FOTO_${Date.now()}.jpg`,
      originalSrc,
      proofSrc
    };
  }

  /* ==========================================================================
     5. EXPORTADOR DE CÓDIGO PARA LIGHTROOM CLASSIC / WINDOWS / MAC
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

  /* ==========================================================================
     6. GERADOR OFICIAL DE BRCODE PIX (PADRÃO BANCO CENTRAL EMV + CRC16)
     ========================================================================== */
  function emvField(id, value) {
    const str = String(value || '');
    const len = String(str.length).padStart(2, '0');
    return `${id}${len}${str}`;
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
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
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

    const gui = emvField('00', 'br.gov.bcb.pix');
    const keyField = emvField('01', cleanKey);
    const merchantAccount = emvField('26', gui + keyField);

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

  /* ==========================================================================
     7. GERADOR NATIVO DE ARQUIVO .ZIP (IEEE CRC32 STORE — ZERO DEPENDÊNCIAS)
     ========================================================================== */
  const CRC32_TABLE = (function () {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32Bytes(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function buildZipBlob(files) {
    // files: [{ name: 'Pasta/IMG_01.jpg', data: Uint8Array }]
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

      // Local File Header (30 bytes)
      const localHeader = new ArrayBuffer(30);
      const lv = new DataView(localHeader);
      lv.setUint32(0, 0x04034b50, true); // Signature
      lv.setUint16(4, 20, true);         // Version needed (2.0)
      lv.setUint16(6, 0x0800, true);     // UTF-8 filename flag
      lv.setUint16(8, 0, true);          // Compression method: 0 (STORE)
      lv.setUint16(10, dosTime, true);
      lv.setUint16(12, dosDate, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);

      localParts.push(new Uint8Array(localHeader), nameBytes, data);

      // Central Directory File Header (46 bytes)
      const centralHeader = new ArrayBuffer(46);
      const cv = new DataView(centralHeader);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, dosTime, true);
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
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf);
    }
    // Modo Web / Redes Sociais (1600px otimizado)
    const img = await loadImageElement(src);
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    const scale = Math.min(1, 1600 / Math.max(w0, h0));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w0 * scale));
    canvas.height = Math.max(1, Math.round(h0 * scale));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  }

  /* ==========================================================================
     8. API PÚBLICA DO MÓDULO
     ========================================================================== */
  window.AlbumsStore = {
    loadState,
    saveState,
    subscribe,
    getBrandDefaults,
    createInitialDemoState,
    calculateSelectionPricing,
    burnProofWatermark,
    processUploadedAlbumFile,
    formatLightroomCodes,
    generatePixPayload,
    buildZipBlob,
    fetchImageAsBytes,
    async resetToDemo() {
      const fresh = createInitialDemoState();
      await saveState(fresh);
      return fresh;
    }
  };
})(window);

