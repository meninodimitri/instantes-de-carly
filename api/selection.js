/**
 * Vercel Serverless Function — /api/selection
 * Sincroniza seleções de fotos e confirmações de Pix Direto entre dispositivos
 * (Celular do cliente <-> PC do fotógrafo) com persistência no GitHub e cache em memória.
 */

// Cache em memória durante a vida útil da instância serverless
const memorySelections = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GH_PAT || req.headers['x-github-token'] || '').trim();
  const GITHUB_REPO = (process.env.GITHUB_REPO || process.env.GH_REPO || 'meninodimitri/instantes-de-carly').trim();
  const GITHUB_BRANCH = (process.env.GITHUB_BRANCH || process.env.GH_BRANCH || 'main').trim();

  // GET: Retorna seleções ativas
  if (req.method === 'GET') {
    const { albumId } = req.query || {};
    const list = Array.from(memorySelections.values());
    if (albumId) {
      const q = String(albumId).trim().toLowerCase();
      const filtered = list.filter((s) =>
        (s.albumId && s.albumId.toLowerCase() === q) ||
        (s.slug && s.slug.toLowerCase() === q)
      );
      return res.status(200).json({ selections: filtered });
    }
    return res.status(200).json({ selections: list });
  }

  // POST: Registra ou atualiza seleção do cliente
  if (req.method === 'POST') {
    try {
      const {
        albumId,
        slug,
        selectedIds = [],
        photoComments = {},
        status = 'awaiting_pix_confirm',
        method = 'direct_pix',
        orderCode = `PIX-${Date.now().toString().slice(-5)}`,
        totalAmount = 0,
        extraCount = 0,
        clientName = 'Cliente',
        draftOnly = false
      } = req.body || {};

      if (!albumId && !slug) {
        return res.status(400).json({ error: 'Identificador do álbum ausente.' });
      }

      const existingRec = memorySelections.get(albumId || slug) || (slug && memorySelections.get(slug)) || null;
      const mergedComments = { ...(existingRec?.photoComments || {}) };
      if (photoComments && typeof photoComments === 'object') {
        Object.entries(photoComments).forEach(([pid, txt]) => {
          const clean = String(txt || '').trim();
          if (clean) mergedComments[pid] = clean;
          else delete mergedComments[pid];
        });
      }

      const effectiveStatus = draftOnly && existingRec && existingRec.status !== 'awaiting_selection'
        ? existingRec.status
        : (draftOnly ? 'awaiting_selection' : status);

      const record = {
        id: draftOnly && existingRec ? existingRec.id : orderCode,
        albumId: albumId || slug,
        slug: slug || albumId,
        clientName,
        selectedIds: Array.isArray(selectedIds) && selectedIds.length > 0
          ? [...new Set(selectedIds)]
          : (existingRec?.selectedIds || []),
        photoComments: mergedComments,
        status: effectiveStatus, // 'awaiting_selection' | 'awaiting_pix_confirm' | 'selection_completed' | 'selection_paid'
        method: draftOnly && existingRec ? existingRec.method : method,
        totalAmount: draftOnly && existingRec ? existingRec.totalAmount : (Number(totalAmount) || 0),
        extraCount: draftOnly && existingRec ? existingRec.extraCount : (Number(extraCount) || 0),
        draftOnly: Boolean(draftOnly && !existingRec),
        updatedAt: new Date().toISOString()
      };

      // Guarda no cache em memória
      memorySelections.set(record.albumId, record);
      if (record.slug) memorySelections.set(record.slug, record);

      // Persiste no GitHub se houver token disponível (para seleção finalizada ou pagamento)
      if (GITHUB_TOKEN && GITHUB_REPO && !draftOnly) {
        try {
          const ghHeaders = {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            'User-Agent': 'InstantesDeCarly-Selection-Sync'
          };

          const fileUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/assets/js/data.js?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
          const getRes = await fetch(fileUrl, { headers: ghHeaders });

          if (getRes.ok) {
            const fileData = await getRes.json();
            const rawContent = Buffer.from(fileData.content, 'base64').toString('utf8');

            const fn = new Function(`let window = {}; ${rawContent}; return window.SITE_DATA || SITE_DATA;`);
            const siteData = fn();

            if (siteData && Array.isArray(siteData.clientAlbums)) {
              const alb = siteData.clientAlbums.find(
                (a) => a.id === record.albumId || (a.slug && a.slug.toLowerCase() === (record.slug || '').toLowerCase())
              );

              if (alb) {
                if (record.selectedIds.length > 0) alb.selectedIds = record.selectedIds;
                alb.photoComments = { ...(alb.photoComments || {}), ...record.photoComments };
                alb.selectionLocked = true;
                alb.status = record.status;
                alb.paymentOrder = {
                  id: record.id,
                  method: record.method,
                  status: record.status === 'awaiting_pix_confirm' ? 'pending_receipt' : 'approved',
                  extraCount: record.extraCount,
                  totalAmount: record.totalAmount,
                  createdAt: record.updatedAt
                };
                alb.activityLog = alb.activityLog || [];
                alb.activityLog.unshift({
                  at: record.updatedAt,
                  type: record.status === 'awaiting_pix_confirm' ? 'pix_pending' : 'selection',
                  text: `Seleção registrada (${record.selectedIds.length} fotos) via ${record.method === 'direct_pix' ? 'Pix Direto' : record.method === 'mercadopago' ? 'Mercado Pago' : 'Pacote'} (${record.id}).`
                });

                siteData.cmsVersion = new Date().toISOString();
                const newCode = `const SITE_DATA = ${JSON.stringify(siteData, null, 2)};\n\nif (typeof window !== 'undefined') {\n  window.SITE_DATA = SITE_DATA;\n}\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = SITE_DATA;\n}\n`;

                await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/assets/js/data.js`, {
                  method: 'PUT',
                  headers: {
                    ...ghHeaders,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    message: `📸 Seleção do cliente: ${alb.clientName} (${record.selectedIds.length} fotos via ${record.method})`,
                    content: Buffer.from(newCode, 'utf8').toString('base64'),
                    sha: fileData.sha,
                    branch: GITHUB_BRANCH
                  })
                });
              }
            }
          }
        } catch (ghErr) {
          console.warn('[Selection Sync] Falha ao persistir no GitHub, mantendo em memória:', ghErr.message);
        }
      }

      return res.status(200).json({ ok: true, order: record });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
