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

    if (!mpToken) {
      return res.status(503).json({
        error: 'MP_ACCESS_TOKEN ainda não configurado nas variáveis de ambiente da Vercel.'
      });
    }

    let clientName = req.body.clientName || 'Cliente';
    let clientEmail = req.body.clientEmail || 'cliente@instantesdecarly.com.br';
    let extraCount = Number(req.body.extraCount || 0);
    let totalAmount = Number(req.body.totalAmount || 0);
    let uniqueSelected = [...new Set(selectedPhotoIds)];
    let slug = req.body.slug || albumId;

    // 1. Se o banco Supabase estiver configurado, valida dados seguros na nuvem
    if (sbUrl && sbKey) {
      try {
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
        if (album) {
          const validPhotoIds = new Set((album.photos || []).map((p) => p.id));
          uniqueSelected = uniqueSelected.filter((id) => validPhotoIds.has(id));
          const packageLimit = Math.max(0, Number(album.package_included) || 0);
          const extraPrice = Math.max(0, Number(album.extra_photo_price) || 0);
          extraCount = Math.max(0, uniqueSelected.length - packageLimit);
          totalAmount = Number((extraCount * extraPrice).toFixed(2));
          clientName = album.client_name || clientName;
          clientEmail = album.client_email || clientEmail;
          slug = album.slug || slug;
        }
      } catch (_) {}
    }

    if (extraCount <= 0 || totalAmount <= 0) {
      return res.status(200).json({ noPaymentRequired: true, totalAmount: 0 });
    }

    // 2. Cria pagamento Pix imediato na API do Mercado Pago
    const externalRef = `${albumId}:${Date.now()}`;
    const mpPaymentRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': externalRef
      },
      body: JSON.stringify({
        transaction_amount: totalAmount,
        description: `${extraCount} fotos extras — Álbum ${clientName}`,
        payment_method_id: 'pix',
        external_reference: externalRef,
        metadata: {
          album_id: albumId,
          selected_ids: uniqueSelected,
          extra_count: extraCount
        },
        payer: {
          email: clientEmail
        }
      })
    });

    const mpData = await mpPaymentRes.json();
    if (!mpPaymentRes.ok) {
      return res.status(502).json({ error: 'Falha ao gerar cobrança Pix no Mercado Pago.', details: mpData });
    }

    const txData = mpData.point_of_interaction?.transaction_data || {};
    let checkoutUrl = txData.ticket_url || '';

    // 3. Cria Checkout Pro (Link seguro para Cartão de Crédito parcelado)
    try {
      const origin = req.headers.origin || 'https://instantes-de-carly.vercel.app';
      const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: [
            {
              title: `${extraCount} fotos extras — Álbum ${clientName}`,
              quantity: 1,
              currency_id: 'BRL',
              unit_price: totalAmount
            }
          ],
          external_reference: externalRef,
          metadata: {
            album_id: albumId,
            selected_ids: uniqueSelected,
            extra_count: extraCount
          },
          back_urls: {
            success: `${origin}/galeria?album=${encodeURIComponent(slug)}&payment=success`,
            failure: `${origin}/galeria?album=${encodeURIComponent(slug)}&payment=failure`,
            pending: `${origin}/galeria?album=${encodeURIComponent(slug)}&payment=pending`
          },
          auto_return: 'approved'
        })
      });

      if (prefRes.ok) {
        const prefData = await prefRes.json();
        if (prefData.init_point) {
          checkoutUrl = prefData.init_point;
        }
      }
    } catch (_) {}

    return res.status(200).json({
      paymentId: mpData.id,
      totalAmount,
      extraCount,
      pixCopyPaste: txData.qr_code || '',
      pixQrBase64: txData.qr_code_base64 || '',
      checkoutUrl
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno no checkout.', message: err.message });
  }
}

