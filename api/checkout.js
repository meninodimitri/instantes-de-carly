/**
 * Vercel Serverless Function — POST /api/checkout
 * Calcula o valor das fotos extras ESTRITAMENTE no servidor (impede adulteração via F12)
 * e gera cobrança Pix / Cartão na API oficial do Mercado Pago.
 *
 * Variáveis de ambiente necessárias na Vercel (quando ativar modo nuvem):
 * - MP_ACCESS_TOKEN
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { albumId, selectedPhotoIds } = req.body || {};
    if (!albumId || !Array.isArray(selectedPhotoIds) || selectedPhotoIds.length === 0) {
      return res.status(400).json({ error: 'Dados de seleção inválidos.' });
    }

    const mpToken = process.env.MP_ACCESS_TOKEN;
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!mpToken || !sbUrl || !sbKey) {
      return res.status(503).json({
        error: 'Chaves de nuvem ainda não configuradas na Vercel (rodando em modo local).'
      });
    }

    // 1. Busca o álbum direto no banco seguro (nunca confia no preço vindo do cliente!)
    const albRes = await fetch(
      `${sbUrl}/rest/v1/client_albums?id=eq.${encodeURIComponent(albumId)}&select=*`,
      {
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${sbKey}`
        }
      }
    );
    const rows = await albRes.json();
    const album = rows?.[0];
    if (!album) {
      return res.status(404).json({ error: 'Álbum não encontrado.' });
    }

    // 2. Filtra IDs únicos válidos e calcula excedente no servidor
    const validPhotoIds = new Set((album.photos || []).map((p) => p.id));
    const uniqueSelected = [...new Set(selectedPhotoIds)].filter((id) => validPhotoIds.has(id));
    const packageLimit = Math.max(0, Number(album.package_included) || 0);
    const extraPrice = Math.max(0, Number(album.extra_photo_price) || 0);
    const extraCount = Math.max(0, uniqueSelected.length - packageLimit);
    const totalAmount = Number((extraCount * extraPrice).toFixed(2));

    if (extraCount <= 0 || totalAmount <= 0) {
      return res.status(200).json({ noPaymentRequired: true, totalAmount: 0 });
    }

    // 3. Cria pagamento Pix imediato + Preferência Checkout Pro (Cartão) no Mercado Pago
    const externalRef = `${album.id}:${Date.now()}`;
    const mpPaymentRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': externalRef
      },
      body: JSON.stringify({
        transaction_amount: totalAmount,
        description: `${extraCount} fotos extras — Álbum ${album.client_name}`,
        payment_method_id: 'pix',
        external_reference: externalRef,
        metadata: {
          album_id: album.id,
          selected_ids: uniqueSelected,
          extra_count: extraCount
        },
        payer: {
          email: album.client_email || 'cliente@instantesdecarly.com.br'
        }
      })
    });

    const mpData = await mpPaymentRes.json();
    if (!mpPaymentRes.ok) {
      return res.status(502).json({ error: 'Falha ao gerar cobrança no Mercado Pago.', details: mpData });
    }

    const txData = mpData.point_of_interaction?.transaction_data || {};
    return res.status(200).json({
      paymentId: mpData.id,
      totalAmount,
      extraCount,
      pixCopyPaste: txData.qr_code || '',
      pixQrBase64: txData.qr_code_base64 || '',
      checkoutUrl: txData.ticket_url || ''
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno no checkout.', message: err.message });
  }
}

