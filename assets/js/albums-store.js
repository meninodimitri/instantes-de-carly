/**
 * ============================================================================
 * INSTANTES DE CARLY — MOTOR UNIFICADO DE ÁLBUNS DE CLIENTES (V3)
 * Galeria de Seleção & Extras (estilo Sineto Studio) +
 * Galeria de Entrega em Alta Resolução & Design Customizável (estilo Pixieset).
 *
 * Inclui:
 * - Marca d'água personalizada (PNG enviado pelo fotógrafo ou texto) com chave ON/OFF
 * - 3 Níveis de Proteção:
 *     1. 'watermark'           -> Marca d'Água (resolução de prova nítida)
 *     2. 'watermark_lowres'    -> Marca d'Água + Baixa Resolução (visível p/ decidir, imprópria p/ uso)
 *     3. 'watermark_spotlight' -> Marca d'Água + Foco no Cursor/Toque (100% desfocada em repouso; foca só onde o mouse/dedo passa)
 * - Sistema completo de Design Pixieset (Capa, Tipografia, Cor, Grade)
 * - Cálculo seguro de pacote + fotos extras (com chave ON/OFF), BRCode Pix e .ZIP nativo
 * ============================================================================
 */
(function (window) {
  'use strict';

  // IMPORTANTE: Mantém DB_NAME v2 para preservar álbuns reais já criados localmente!
  const DB_NAME = 'instantes_carly_albums_db_v2';
  const STORE_NAME = 'albums_state';
  const STATE_KEY = 'studio_albums_root';
  const SYNC_CHANNEL_NAME = 'instantes_carly_albums_sync_v2';

  const syncChannel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(SYNC_CHANNEL_NAME)
    : null;

  /* ==========================================================================
     0. CATÁLOGO COMPLETO DE DESIGN (16 CAPAS PIXIESET + BRANDBOOK)
     ========================================================================== */
  const LEGACY_COVER_MAP = {
    cosmos: 'centro',
    minimal: 'centro',
    bondi: 'moldura',
    oeste: 'esquerda',
    recife: 'listra',
    oakwood: 'contorno',
    ancora: 'esquerda',
    iracema: 'moldura',
    passepartout: 'borda',
    aero: 'dividido',
    split: 'romance'
  };

  const DESIGN_PRESETS = {
    coverStyles: [
      { id: 'centro', label: 'Centro', desc: 'Fotografia em tela cheia com título e botão centralizados' },
      { id: 'alegria', label: 'Alegria', desc: 'Tipografia editorial JOY com recorte da fotografia na letra O' },
      { id: 'esquerda', label: 'Esquerda', desc: 'Fotografia em tela cheia com título e data alinhados na base esquerda' },
      { id: 'romance', label: 'Romance', desc: 'Painel editorial branco à esquerda e fotografia em destaque à direita' },
      { id: 'vintage', label: 'Vintage', desc: 'Fotografia emoldurada no topo e faixa polaroid clássica abaixo' },
      { id: 'moldura', label: 'Moldura', desc: 'Fotografia em tela cheia com moldura retangular branca interna' },
      { id: 'listra', label: 'Listra', desc: 'Duas listras brancas horizontais com título em destaque ao centro' },
      { id: 'divisor', label: 'Divisor', desc: 'Linha vertical no centro dividindo título e fotografia' },
      { id: 'diario', label: 'Diário', desc: 'Fotografia quadrada à esquerda e bloco tipográfico à direita' },
      { id: 'carimbo', label: 'Carimbo', desc: 'Fundo branco com miniatura fotográfica central em formato de selo' },
      { id: 'contorno', label: 'Contorno', desc: 'Moldura retangular vertical esbelta com autor, data e título' },
      { id: 'retangulo', label: 'Retângulo Vertical', badge: 'Novo', desc: 'Moldura vertical esbelta de tela cheia estilo Pixieset' },
      { id: 'classico', label: 'Clássico', desc: 'Foto de abertura limpa com barra tipográfica minimalista' },
      { id: 'dividido', label: 'Dividido', desc: 'Faixa fotográfica panorâmica no topo e bloco branco abaixo' },
      { id: 'rotulo', label: 'Rótulo', desc: 'Fotografia ampla com etiqueta branca vertical na lateral' },
      { id: 'borda', label: 'Borda', desc: 'Passe-partout branco ao redor de toda a fotografia' },
      { id: 'album', label: 'Álbum', desc: 'Abertura fotográfica limpa com título e acesso imediato' },
      { id: 'none', label: 'Sem Capa', desc: 'Abre diretamente na grade de fotografias' }
    ],
    typographies: [
      {
        id: 'carly',
        label: 'Autoral Carly',
        badge: 'Marca',
        sample: 'Instantes',
        desc: 'Cormorant editorial da marca',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        weight: 500,
        tracking: '0.01em',
        transform: 'none',
        fontStyle: 'normal'
      },
      {
        id: 'cinema',
        label: 'Cinema Wide',
        badge: 'Marca',
        sample: 'ENSAIO',
        desc: 'Clássica espaçada de galeria',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        weight: 400,
        tracking: '0.18em',
        transform: 'uppercase',
        fontStyle: 'normal'
      },
      {
        id: 'afeto',
        label: 'Caligrafia',
        badge: 'Marca',
        sample: 'Afeto & Luz',
        desc: 'Manuscrita delicada do Brandbook',
        fontFamily: "'Alex Brush', 'Cormorant Garamond', cursive",
        weight: 400,
        tracking: '0.02em',
        transform: 'none',
        fontStyle: 'normal'
      },
      {
        id: 'sans',
        label: 'Sans',
        sample: 'SANS',
        desc: 'Uma fonte neutra',
        fontFamily: "'Jost', 'Plus Jakarta Sans', sans-serif",
        weight: 600,
        tracking: '0.09em',
        transform: 'uppercase',
        fontStyle: 'normal'
      },
      {
        id: 'serif',
        label: 'Serif',
        sample: 'Serif',
        desc: 'Uma fonte clássica',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        weight: 600,
        tracking: '-0.01em',
        transform: 'none',
        fontStyle: 'normal'
      },
      {
        id: 'modern',
        label: 'Modern',
        sample: 'Modern',
        desc: 'Uma fonte sofisticada',
        fontFamily: "'Jost', 'Plus Jakarta Sans', sans-serif",
        weight: 300,
        tracking: '0.03em',
        transform: 'none',
        fontStyle: 'normal'
      },
      {
        id: 'timeless',
        label: 'Timeless',
        sample: 'Timeless',
        desc: 'Uma fonte leve e arejada',
        fontFamily: "'Libre Baskerville', 'Cormorant Garamond', Georgia, serif",
        weight: 400,
        tracking: '0.01em',
        transform: 'none',
        fontStyle: 'normal'
      },
      {
        id: 'bold',
        label: 'Bold',
        sample: 'BOLD',
        desc: 'Uma fonte marcante',
        fontFamily: "'Syne', 'Plus Jakarta Sans', sans-serif",
        weight: 700,
        tracking: '0.06em',
        transform: 'uppercase',
        fontStyle: 'normal'
      },
      {
        id: 'subtle',
        label: 'Subtle',
        sample: 'SUBTLE',
        desc: 'Uma fonte minimalista',
        fontFamily: "'Jost', 'Plus Jakarta Sans', sans-serif",
        weight: 300,
        tracking: '0.16em',
        transform: 'uppercase',
        fontStyle: 'normal'
      }
    ],
    colorThemes: [
      {
        id: 'amarelinho',
        label: 'Amarelinho Bebê',
        badge: 'Marca',
        dots: ['#FFFDF3', '#FDF6DF', '#E7C378'],
        ground: '#FFFDF3',
        surface: '#FDF6DF',
        ink: '#22262A',
        inkSecondary: '#4E565E',
        accent: '#8A6218',
        accentHover: '#6E4E12',
        isDark: false
      },
      {
        id: 'iracema',
        label: 'Azul Iracema',
        badge: 'Marca',
        dots: ['#F7FAFC', '#EBF2F6', '#3B7293'],
        ground: '#F7FAFC',
        surface: '#EBF2F6',
        ink: '#1B2733',
        inkSecondary: '#465869',
        accent: '#2F607D',
        accentHover: '#234B63',
        isDark: false
      },
      {
        id: 'maresia',
        label: 'Azul Maresia',
        badge: 'Marca',
        dots: ['#1B2733', '#253545', '#E7C378'],
        ground: '#1B2733',
        surface: '#243342',
        ink: '#FFFDF3',
        inkSecondary: '#C8D2DC',
        accent: '#E7C378',
        accentHover: '#F0D290',
        isDark: true
      },
      {
        id: 'ysla',
        label: 'Rosa Bebê Ysla',
        badge: 'Marca',
        dots: ['#FDF4F5', '#F3C1C6', '#9E4756'],
        ground: '#FDF4F5',
        surface: '#F8E6E8',
        ink: '#2B2023',
        inkSecondary: '#5E474C',
        accent: '#8F3F4D',
        accentHover: '#75313D',
        isDark: false
      },
      {
        id: 'claro',
        label: 'Claro',
        dots: ['#FFFFFF', '#F2F2F2', '#2E3236'],
        ground: '#FFFFFF',
        surface: '#F3F4F5',
        ink: '#1E242B',
        inkSecondary: '#525C68',
        accent: '#2E3236',
        accentHover: '#191C1F',
        isDark: false
      },
      {
        id: 'dourado',
        label: 'Dourado',
        dots: ['#FCFBF7', '#F6F2E7', '#9A8762'],
        ground: '#FAF8F4',
        surface: '#F1EDE3',
        ink: '#1B2733',
        inkSecondary: '#3C4A57',
        accent: '#6E5B39',
        accentHover: '#58482B',
        isDark: false
      },
      {
        id: 'rosa',
        label: 'Rosa',
        dots: ['#FBF6F6', '#F4EAEA', '#9C7375'],
        ground: '#FBF6F6',
        surface: '#F3E8E8',
        ink: '#2F2224',
        inkSecondary: '#594346',
        accent: '#7D5154',
        accentHover: '#663F42',
        isDark: false
      },
      {
        id: 'terracota',
        label: 'Terracota',
        dots: ['#FAF6F2', '#EFE7DF', '#9E7358'],
        ground: '#FAF6F2',
        surface: '#EFE7DF',
        ink: '#2C221D',
        inkSecondary: '#57453C',
        accent: '#7E543B',
        accentHover: '#66422D',
        isDark: false
      },
      {
        id: 'areia',
        label: 'Areia',
        dots: ['#F7F4F0', '#E9E3DC', '#9C897B'],
        ground: '#F7F4F0',
        surface: '#E9E3DC',
        ink: '#2B2623',
        inkSecondary: '#524943',
        accent: '#6B594D',
        accentHover: '#56473D',
        isDark: false
      },
      {
        id: 'oliva',
        label: 'Oliva',
        dots: ['#F6F7F4', '#EAECE5', '#8F967A'],
        ground: '#F6F7F4',
        surface: '#EAECE5',
        ink: '#232820',
        inkSecondary: '#485042',
        accent: '#596146',
        accentHover: '#474E37',
        isDark: false
      },
      {
        id: 'agave',
        label: 'Agave',
        dots: ['#F4F7F6', '#E6ECEA', '#7E968D'],
        ground: '#F4F7F6',
        surface: '#E6ECEA',
        ink: '#1E2926',
        inkSecondary: '#41524D',
        accent: '#4B665D',
        accentHover: '#3B524A',
        isDark: false
      },
      {
        id: 'mar',
        label: 'Mar',
        dots: ['#F5F6F8', '#E7E9EE', '#8B8F9E'],
        ground: '#F5F6F8',
        surface: '#E7E9EE',
        ink: '#202530',
        inkSecondary: '#454C5B',
        accent: '#52586B',
        accentHover: '#404556',
        isDark: false
      },
      {
        id: 'escuro',
        label: 'Escuro',
        dots: ['#16181A', '#24272B', '#52575E'],
        ground: '#15181C',
        surface: '#20252B',
        ink: '#F5F3EE',
        inkSecondary: '#B5BCC4',
        accent: '#D8C29D',
        accentHover: '#E5D3B3',
        isDark: true
      }
    ],
    gridStyles: [
      { id: 'vertical', label: 'Vertical', desc: 'Mosaico fluido valorizando retratos e paisagens' },
      { id: 'horizontal', label: 'Horizontal', desc: 'Linhas panorâmicas alinhadas pela altura' },
      { id: 'square', label: 'Editorial 4:5', desc: 'Grade uniforme alinhada estilo livro de arte' },
      { id: 'passepartout', label: 'Passe-Partout', badge: 'Marca', desc: 'Cada foto emoldurada em papel algodão da marca' }
    ],
    gridSpacings: [
      { id: 'regular', label: 'Regular', gapPx: 8 },
      { id: 'large', label: 'Amplo', gapPx: 20 }
    ],
    gridSizes: [
      { id: 'regular', label: 'Regular', cols: 4, rowHeight: 250 },
      { id: 'large', label: 'Grande', cols: 3, rowHeight: 330 }
    ],
    gridNavStyles: [
      { id: 'icons_text', label: 'Ícones e Texto' },
      { id: 'icons_only', label: 'Apenas Ícones' }
    ]
  };

  function getDefaultDesign() {
    return {
      coverStyle: 'centro',
      typography: 'carly',
      colorTheme: 'amarelinho',
      gridStyle: 'vertical',
      gridSpacing: 'regular',
      gridSize: 'regular',
      gridNavStyle: 'icons_text',
      coverLogoVisible: true,
      coverLogoColor: 'auto'
    };
  }

  function normalizeAlbum(alb) {
    if (!alb || typeof alb !== 'object') return alb;

    // Migra 'watermark_blur' legado para o novo 'watermark_lowres'
    if (alb.protectionLevel === 'watermark_blur') {
      alb.protectionLevel = 'watermark_lowres';
    }
    if (!['watermark', 'watermark_lowres', 'watermark_spotlight'].includes(alb.protectionLevel)) {
      alb.protectionLevel = 'watermark';
    }

    if (typeof alb.watermarkEnabled !== 'boolean') {
      alb.watermarkEnabled = true;
    }
    if (typeof alb.antiPrintEnabled !== 'boolean') {
      alb.antiPrintEnabled = true;
    }
    if (typeof alb.passwordEnabled !== 'boolean') {
      alb.passwordEnabled = Boolean(alb.password && String(alb.password).trim());
    }
    if (typeof alb.extrasEnabled !== 'boolean') {
      alb.extrasEnabled = Number(alb.extraPhotoPrice ?? 20) > 0;
    }
    if (typeof alb.pinEnabled !== 'boolean') {
      alb.pinEnabled = Boolean(alb.downloadPin && String(alb.downloadPin).trim());
    }

    const defDesign = getDefaultDesign();
    const d = alb.design && typeof alb.design === 'object' ? alb.design : {};
    if (d.coverStyle && LEGACY_COVER_MAP[d.coverStyle]) {
      d.coverStyle = LEGACY_COVER_MAP[d.coverStyle];
    }
    const validLogoColors = ['auto', 'light', 'dark'];
    alb.design = {
      coverStyle: DESIGN_PRESETS.coverStyles.some((x) => x.id === d.coverStyle) ? d.coverStyle : defDesign.coverStyle,
      typography: DESIGN_PRESETS.typographies.some((x) => x.id === d.typography) ? d.typography : defDesign.typography,
      colorTheme: DESIGN_PRESETS.colorThemes.some((x) => x.id === d.colorTheme) ? d.colorTheme : defDesign.colorTheme,
      gridStyle: DESIGN_PRESETS.gridStyles.some((x) => x.id === d.gridStyle) ? d.gridStyle : defDesign.gridStyle,
      gridSpacing: DESIGN_PRESETS.gridSpacings.some((x) => x.id === d.gridSpacing) ? d.gridSpacing : defDesign.gridSpacing,
      gridSize: DESIGN_PRESETS.gridSizes.some((x) => x.id === d.gridSize) ? d.gridSize : defDesign.gridSize,
      gridNavStyle: DESIGN_PRESETS.gridNavStyles.some((x) => x.id === d.gridNavStyle) ? d.gridNavStyle : defDesign.gridNavStyle,
      coverLogoVisible: typeof d.coverLogoVisible === 'boolean' ? d.coverLogoVisible : defDesign.coverLogoVisible,
      coverLogoColor: validLogoColors.includes(d.coverLogoColor) ? d.coverLogoColor : defDesign.coverLogoColor
    };

    if (alb.coverKicker === undefined) alb.coverKicker = 'GALERIA OFICIAL EM ALTA RESOLUÇÃO';
    if (alb.coverAuthor === undefined) alb.coverAuthor = 'Carliane Carvalho';
    if (!alb.coverFocal) alb.coverFocal = '50% 35%';
    if (!Array.isArray(alb.photos)) alb.photos = [];
    if (!Array.isArray(alb.selectedIds)) alb.selectedIds = [];
    if (!Array.isArray(alb.deliveryFavorites)) alb.deliveryFavorites = [];
    if (!alb.photoComments || typeof alb.photoComments !== 'object') alb.photoComments = {};
    if (!Array.isArray(alb.activityLog)) alb.activityLog = [];

    return alb;
  }

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
    const state = {
      version: Date.now(),
      storageMode: 'local',
      watermarkConfig: {
        enabled: true,
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
          phase: 'proofing',
          status: 'awaiting_selection',
          protectionLevel: 'watermark',
          watermarkEnabled: true,
          passwordEnabled: true,
          password: '1234',
          pinEnabled: true,
          downloadPin: '4580',
          extrasEnabled: true,
          packageName: 'Ensaio Afeto',
          packageIncluded: 5,
          extraPhotoPrice: 20.00,
          coverSrc: 'assets/images/real/IMG_7513.jpg',
          coverFocal: '50% 32%',
          design: {
            coverStyle: 'borda',
            typography: 'serif',
            colorTheme: 'dourado',
            gridStyle: 'vertical',
            gridSpacing: 'regular',
            gridSize: 'regular'
          },
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
          watermarkEnabled: true,
          passwordEnabled: true,
          password: '1234',
          pinEnabled: true,
          downloadPin: '7788',
          extrasEnabled: true,
          packageName: 'Ensaio Completo',
          packageIncluded: 8,
          extraPhotoPrice: 20.00,
          coverSrc: 'assets/images/real/IMG_1186.jpg',
          coverFocal: '50% 38%',
          design: {
            coverStyle: 'borda',
            typography: 'modern',
            colorTheme: 'dourado',
            gridStyle: 'vertical',
            gridSpacing: 'regular',
            gridSize: 'regular'
          },
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
    state.albums.forEach(normalizeAlbum);
    return state;
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
    let saved = null;
    try {
      const db = await openAlbumsDb();
      saved = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(STATE_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (_) {}

    if (!saved) {
      try {
        const rawLocal = localStorage.getItem(STATE_KEY);
        if (rawLocal) saved = JSON.parse(rawLocal);
      } catch (__) {}
    }

    const cloudAlbums = (typeof window !== 'undefined' && window.SITE_DATA && Array.isArray(window.SITE_DATA.clientAlbums))
      ? window.SITE_DATA.clientAlbums
      : [];

    let root = saved;
    if (!root || !Array.isArray(root.albums) || root.albums.length === 0) {
      root = createInitialDemoState();
      if (cloudAlbums.length > 0) {
        root.albums = JSON.parse(JSON.stringify(cloudAlbums));
      }
    } else if (cloudAlbums.length > 0) {
      // Mescla álbuns centrais do SITE_DATA para garantir disponibilidade cross-device (celular / PC)
      cloudAlbums.forEach((cAlb) => {
        const existingIdx = root.albums.findIndex((a) => a.id === cAlb.id || (cAlb.slug && a.slug === cAlb.slug));
        if (existingIdx === -1) {
          root.albums.push(JSON.parse(JSON.stringify(cAlb)));
        } else {
          const localAlb = root.albums[existingIdx];
          if ((!localAlb.photos || localAlb.photos.length === 0) && cAlb.photos && cAlb.photos.length > 0) {
            root.albums[existingIdx] = JSON.parse(JSON.stringify(cAlb));
          }
        }
      });
    }

    if (!root.watermarkConfig) {
      root.watermarkConfig = createInitialDemoState().watermarkConfig;
    }
    if (typeof root.watermarkConfig.enabled !== 'boolean') {
      root.watermarkConfig.enabled = true;
    }
    if (!root.paymentConfig) {
      root.paymentConfig = createInitialDemoState().paymentConfig;
    }
    root.albums.forEach(normalizeAlbum);
    return root;
  }

  async function saveState(nextState, opts = {}) {
    nextState.version = Date.now();
    if (Array.isArray(nextState.albums)) {
      nextState.albums.forEach(normalizeAlbum);
    }
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
     3. CÁLCULO SEGURO DE PACOTE + FOTOS EXTRAS (RESPEITA CHAVE ON/OFF)
     ========================================================================== */
  function calculateSelectionPricing(album, customSelectedIds) {
    const rawIds = Array.isArray(customSelectedIds) ? customSelectedIds : (album.selectedIds || []);
    const validSet = new Set((album.photos || []).map((p) => p.id));
    const uniqueIds = [...new Set(rawIds)].filter((id) => validSet.has(id));

    const extrasEnabled = album.extrasEnabled !== false;
    const packageIncluded = Math.max(0, parseInt(album.packageIncluded, 10) || 0);
    const extraPhotoPrice = extrasEnabled ? Math.max(0, Number(album.extraPhotoPrice) || 0) : 0;
    const selectedCount = uniqueIds.length;
    const includedSelected = Math.min(selectedCount, packageIncluded);
    const remainingInPackage = Math.max(0, packageIncluded - selectedCount);
    const extraCount = extrasEnabled ? Math.max(0, selectedCount - packageIncluded) : 0;
    const extraTotal = Number((extraCount * extraPhotoPrice).toFixed(2));

    return {
      selectedIds: uniqueIds,
      selectedCount,
      packageIncluded,
      includedSelected,
      remainingInPackage,
      extrasEnabled,
      extraCount,
      extraPhotoPrice,
      extraTotal,
      hasExtras: extrasEnabled && extraCount > 0 && extraPhotoPrice > 0
    };
  }

  /* ==========================================================================
     4. MOTOR DE PROTEÇÃO DE PROVAS EM CANVAS (3 NÍVEIS ATUALIZADOS)
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

  function getWatermarkSignature(wmConfig, protectionLevel, watermarkEnabled = true) {
    const cfg = wmConfig || {};
    const activeWm = Boolean(watermarkEnabled) && cfg.enabled !== false;
    return [
      protectionLevel || 'watermark',
      activeWm ? 'wm1' : 'wm0',
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
    if (cfg.enabled === false) return;
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
        const tileW = Math.max(82, Math.round(Math.min(w, h) * scaleFactor * 0.78));
        const tileH = Math.max(24, Math.round(tileW / aspect));
        const stepX = Math.round(tileW * 1.85);
        const stepY = Math.round(Math.max(tileH * 2.5, 96));
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
      const fontSize = Math.max(14, Math.round(Math.min(w, h) * scaleFactor * 0.16));
      ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (pattern === 'center') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillText(label, w / 2 + 1.5, h / 2 + 1.5);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.fillText(label, w / 2, h / 2);
      } else {
        const stepX = Math.max(190, Math.round(fontSize * 12));
        const stepY = Math.max(96, Math.round(fontSize * 5.2));
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
   * 1. 'watermark'           -> Prova nítida (1080px) + marca d'água
   * 2. 'watermark_lowres'    -> Foto em baixa resolução (~420px reamostrada, clara p/ escolher mas sem definição p/ print/post) + marca d'água nítida
   * 3. 'watermark_spotlight' -> Foto 100% desfocada em repouso + marca d'água; revealSrc nítida p/ foco exclusivo onde o cursor/dedo passa
   */
  async function generateProtectedProofBundle(
    originalSrc,
    wmConfig,
    protectionLevel = 'watermark',
    maxDim = 1080,
    watermarkEnabled = true
  ) {
    const img = await loadImageElement(originalSrc);
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    const shouldDrawWm = Boolean(watermarkEnabled) && (wmConfig?.enabled !== false);

    // NÍVEL 2: MARCA D'ÁGUA + BAIXA RESOLUÇÃO
    if (protectionLevel === 'watermark_lowres') {
      const lowMax = Math.min(410, maxDim);
      const lowScale = Math.min(1, lowMax / Math.max(w0, h0));
      const lw = Math.max(1, Math.round(w0 * lowScale));
      const lh = Math.max(1, Math.round(h0 * lowScale));

      const tinyCanvas = document.createElement('canvas');
      tinyCanvas.width = lw;
      tinyCanvas.height = lh;
      const tCtx = tinyCanvas.getContext('2d');
      tCtx.drawImage(img, 0, 0, lw, lh);

      // Reamostra para ~820px preservando o aspecto de baixa resolução da foto, mas aplicando marca d'água nítida por cima
      const outScale = Math.min(1, Math.min(820, maxDim) / Math.max(w0, h0));
      const ow = Math.max(lw, Math.round(w0 * outScale));
      const oh = Math.max(lh, Math.round(h0 * outScale));

      const outCanvas = document.createElement('canvas');
      outCanvas.width = ow;
      outCanvas.height = oh;
      const oCtx = outCanvas.getContext('2d');
      oCtx.imageSmoothingEnabled = true;
      oCtx.imageSmoothingQuality = 'low';
      oCtx.drawImage(tinyCanvas, 0, 0, lw, lh, 0, 0, ow, oh);

      if (shouldDrawWm) {
        await drawWatermarkOverlay(oCtx, ow, oh, wmConfig);
      }

      const lowResUrl = outCanvas.toDataURL('image/jpeg', 0.54);
      return {
        primarySrc: lowResUrl,
        revealSrc: lowResUrl
      };
    }

    const scale = Math.min(1, maxDim / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));

    // Base Nítida com Marca d'Água (usada em 'watermark' e dentro do foco do cursor em 'watermark_spotlight')
    const sharpCanvas = document.createElement('canvas');
    sharpCanvas.width = w;
    sharpCanvas.height = h;
    const sCtx = sharpCanvas.getContext('2d');
    sCtx.drawImage(img, 0, 0, w, h);
    if (shouldDrawWm) {
      await drawWatermarkOverlay(sCtx, w, h, wmConfig);
    }
    const sharpWatermarkedUrl = sharpCanvas.toDataURL('image/jpeg', 0.78);

    // NÍVEL 1: MARCA D'ÁGUA PADRÃO
    if (protectionLevel === 'watermark') {
      return {
        primarySrc: sharpWatermarkedUrl,
        revealSrc: sharpWatermarkedUrl
      };
    }

    // NÍVEL 3 ('watermark_spotlight'): 100% DESFOCADA EM REPOUSO + FOCO ATRELADO AO CURSOR / DEDO
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = w;
    blurCanvas.height = h;
    const bCtx = blurCanvas.getContext('2d');
    const blurPx = Math.max(10, Math.round(Math.min(w, h) * 0.022));
    bCtx.filter = `blur(${blurPx}px)`;
    bCtx.drawImage(img, -blurPx * 2, -blurPx * 2, w + blurPx * 4, h + blurPx * 4);
    bCtx.filter = 'none';

    if (shouldDrawWm) {
      await drawWatermarkOverlay(bCtx, w, h, wmConfig);
    }

    return {
      primarySrc: blurCanvas.toDataURL('image/jpeg', 0.74),
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
      width: w,
      height: h,
      aspectRatio: Number((w / Math.max(1, h)).toFixed(3)),
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

  function isValidCpf(s) {
    if (s.length !== 11 || /^(\d)\1{10}$/.test(s)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(s[i], 10) * (10 - i);
    let r = 11 - (sum % 11);
    let d1 = r >= 10 ? 0 : r;
    if (d1 !== parseInt(s[9], 10)) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(s[i], 10) * (11 - i);
    r = 11 - (sum % 11);
    let d2 = r >= 10 ? 0 : r;
    return d2 === parseInt(s[10], 10);
  }

  function normalizePixKey(rawKey) {
    const raw = String(rawKey || '').trim();
    if (!raw) return '';
    if (raw.includes('@')) return raw.toLowerCase();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
      return raw.toLowerCase();
    }
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 14) return digits; // CNPJ
    if (raw.startsWith('+55')) return `+${digits}`;
    if (digits.length === 11) {
      if (isValidCpf(digits)) return digits; // CPF válido
      return `+55${digits}`; // Telefone celular celular sem +55 (ex: 85985247276)
    }
    if (digits.length === 10) return `+55${digits}`; // Telefone fixo (ex: 8532001122)
    return raw;
  }

  function generatePixPayload({ pixKey, merchantName, merchantCity, amount, txid }) {
    const cleanKey = normalizePixKey(pixKey);
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
    DESIGN_PRESETS,
    getDefaultDesign,
    normalizeAlbum,
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
    normalizePixKey,
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
