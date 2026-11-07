/**
 * Vercel Serverless Function — POST /api/webhooks/mercadopago
 * Valida a assinatura HMAC-SHA256 (x-signature) do Mercado Pago e consulta o pagamento
 * diretamente na API oficial antes de marcar as fotos extras como PAGAS.
 */
import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  try {
    const mpToken = process.env.MP_ACCESS_TOKEN;
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const paymentId = req.body?.data?.id || req.query?.['data.id'];
    if (!paymentId || !mpToken) {
      return res.status(200).json({ ignored: true });
    }

    // 1. Validação criptográfica da assinatura x-signature (se configurada)
    if (webhookSecret) {
      const xSig = req.headers['x-signature'] || '';
      const xReqId = req.headers['x-request-id'] || '';
      const parts = Object.fromEntries(xSig.split(',').map((kv) => kv.trim().split('=')));
      const manifest = `id:${paymentId};request-id:${xReqId};ts:${parts.ts};`;
      const expected = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');

      if (!parts.v1 || !crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected))) {
        return res.status(401).json({ error: 'Assinatura de webhook inválida.' });
      }
    }

    // 2. Verificação dupla direto na API do Mercado Pago (Fonte da Verdade)
    const verifyRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${mpToken}` }
    });
    const payment = await verifyRes.json();

    if (verifyRes.ok && payment.status === 'approved' && sbUrl && sbKey) {
      const albumId = payment.metadata?.album_id;
      const selectedIds = payment.metadata?.selected_ids || [];

      if (albumId) {
        await fetch(`${sbUrl}/rest/v1/client_albums?id=eq.${encodeURIComponent(albumId)}`, {
          method: 'PATCH',
          headers: {
            apikey: sbKey,
            Authorization: `Bearer ${sbKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'selection_paid',
            selection_locked: true,
            selected_ids: selectedIds,
            payment_order: {
              id: String(payment.id),
              method: payment.payment_method_id,
              status: 'approved',
              extraCount: payment.metadata?.extra_count || 0,
              totalAmount: payment.transaction_amount,
              paidAt: new Date().toISOString()
            }
          })
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

