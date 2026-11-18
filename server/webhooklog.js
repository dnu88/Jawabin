import { db } from './db.js'

// A delivery Meta sends is otherwise invisible: the endpoint answers 200/401/500
// and the runtime log that would show it is gone within the hour on the Hobby
// plan. Keep one best-effort outcome row, separate from the runtime receipt.
const MAX_PAYLOAD = 4096
const MAX_DETAIL = 500
const KEEP_DAYS = 14

const clip = (value, max) => (typeof value === 'string' && value ? value.slice(0, max) : null)

// Recording must never change what Meta is told: a failure here is swallowed so
// the webhook still answers the same status it would have without the audit.
export async function recordDelivery({ request, raw, outcome, status, mode, object, entries, detail }) {
  let client
  try {
    client = db()
    const { error } = await client.from('webhook_deliveries').insert({
      object: clip(object, 40),
      entries: entries == null ? null : Number(entries),
      outcome,
      http_status: Number(status),
      auth_mode: clip(mode, 40),
      signature_present: Boolean(request.headers.get('x-hub-signature-256')),
      content_type: clip(request.headers.get('content-type'), 120),
      user_agent: clip(request.headers.get('user-agent'), 200),
      detail: clip(detail, MAX_DETAIL),
      // Only refusals need the body to be diagnosable; a delivery we handled is
      // already visible in the comments/messages tables.
      payload: outcome == 'rejected' || outcome == 'storage_failed' ? clip(raw, MAX_PAYLOAD) : null,
    })
    if (error) throw error
  } catch {
    // Database errors can include row contents; never log the error itself.
    console.error('webhook delivery not recorded')
    return
  }
  // A cleanup failure does not invalidate the outcome row just recorded.
  if (Math.random() < 0.02) {
    try {
      const cutoff = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString()
      const { error } = await client.from('webhook_deliveries').delete().lt('received_at', cutoff)
      if (error) throw error
    } catch {
      console.error('webhook delivery cleanup failed')
    }
  }
}
