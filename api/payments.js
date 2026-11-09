/**
 * Vercel Serverless Function — GET /api/payments
 * Consulta os pagamentos oficiais diretamente no Mercado Pago.
 * Funciona como fonte segura da verdade entre dispositivos (PC do fotógrafo, celular do cliente).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawToken = (process.env.MP_ACCESS_TOKEN || '').trim();
  const mpToken = rawToken.replace(/^Bearer\s+/i, '').trim();

  if (!mpToken) {
    return res.status(200).json({ payments: [] });
  }

  try {
    const { albumId } = req.query || {};
    const url = new URL('https://api.mercadopago.com/v1/payments/search');
    url.searchParams.set('sort', 'date_created');
    url.searchParams.set('criteria', 'desc');
    url.searchParams.set('limit', '50');

    const mpRes = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${mpToken}`
      }
    });

    if (!mpRes.ok) {
      return res.status(200).json({ payments: [] });
    }

    const data = await mpRes.json();
    const results = Array.isArray(data.results) ? data.results : [];

    const payments = results.map((p) => ({
      id: String(p.id),
      status: p.status, // 'approved', 'pending', etc.
      statusDetail: p.status_detail,
      amount: p.transaction_amount,
      paidAt: p.date_approved || p.date_created,
      paymentMethod: p.payment_method_id,
      albumId: p.metadata?.album_id || '',
      albumSlug: p.metadata?.album_slug || p.metadata?.slug || '',
      selectedIds: p.metadata?.selected_ids || [],
      extraCount: p.metadata?.extra_count || 0,
      clientEmail: p.payer?.email || ''
    }));

    if (albumId) {
      const q = String(albumId).trim().toLowerCase();
      const filtered = payments.filter((p) =>
        (p.albumId && p.albumId.toLowerCase() === q) ||
        (p.albumSlug && p.albumSlug.toLowerCase() === q)
      );
      return res.status(200).json({ payments: filtered });
    }

    return res.status(200).json({ payments });
  } catch (err) {
    return res.status(500).json({ error: err.message, payments: [] });
  }
}

