// Supabase Edge Function: send-certificate-email
// Securely sends certificate emails using Resend without exposing secrets to the client.
// Deploy with: supabase functions deploy send-certificate-email
// Set secrets: supabase secrets set RESEND_API_KEY=... RESEND_FROM=...

// deno-lint-ignore-file no-explicit-any

import { serve } from "https://deno.land/std@0.223.0/http/server.ts"
import { encode as base64Encode } from "https://deno.land/std@0.223.0/encoding/base64.ts"

interface PayloadItem {
  to: string
  participant_name: string
  certificate_id: string
  hackathon_name: string
  type: string
  position?: string
  pdf_url?: string
  jpg_url?: string
  verification_url: string
}

function corsHeaders(req: Request) {
  // Echo requested headers to satisfy preflight, fall back to common headers
  const requested = req.headers.get('access-control-request-headers')
  return {
    'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': requested || 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  }
}

async function fetchAsBase64(url?: string): Promise<{ base64?: string; filename?: string; mime?: string }> {
  if (!url) return {}
  try {
    const res = await fetch(url)
    if (!res.ok) return {}
    const mime = res.headers.get('content-type') ?? 'application/octet-stream'
    const buf = new Uint8Array(await res.arrayBuffer())
    const base64 = base64Encode(buf)
    const filename = url.split('/').pop() || 'attachment'
    return { base64, filename, mime }
  } catch {
    return {}
  }
}

function emailHtml(p: PayloadItem) {
  const title = 'Your Maximally Certificate'
  return `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111">
      <h2>${title}</h2>
      <p>Hi ${p.participant_name},</p>
      <p>Congratulations! Your certificate for <strong>${p.hackathon_name}</strong>${p.position ? ` (Achievement: <strong>${p.position}</strong>)` : ''} has been generated.</p>
      <p>
        Certificate ID: <code>${p.certificate_id}</code><br/>
        Type: <strong>${p.type}</strong>
      </p>
      <p>
        You can download and verify your certificate here:<br/>
        <a href="${p.verification_url}" target="_blank">${p.verification_url}</a>
      </p>
      <p>If attachments are included, you can also find your certificate directly attached to this email.</p>
      <p>Regards,<br/>Maximally Team</p>
    </div>
  `
}

async function sendViaResend(item: PayloadItem, apiKey: string, fromEmail: string): Promise<{ ok: boolean; error?: string }> {
  // Attempt to attach JPG (smaller) and include links; attach PDF if reasonable
  const attachments: Array<{ filename: string; content: string }> = []

  // Fetch JPG and name it predictably (avoid signed URL query in filename)
  const jpg = await fetchAsBase64(item.jpg_url)
  if (jpg.base64) {
    const jpgExt = (jpg.mime || '').includes('png') ? 'png' : ((jpg.mime || '').includes('jpeg') ? 'jpg' : 'jpg')
    const jpgName = `${item.certificate_id}.${jpgExt}`
    attachments.push({ filename: jpgName, content: jpg.base64 })
  }

  // Try PDF as well but skip if too large (> 4MB base64 roughly increases by ~33%)
  const pdf = await fetchAsBase64(item.pdf_url)
  if (pdf.base64) {
    // Rough size check
    const approxBytes = Math.ceil((pdf.base64.length * 3) / 4)
    if (approxBytes <= 4 * 1024 * 1024) {
      const pdfName = `${item.certificate_id}.pdf`
      attachments.push({ filename: pdfName, content: pdf.base64 })
    }
  }

  const payload = {
    from: fromEmail,
    to: [item.to],
    subject: `Your Certificate | ${item.hackathon_name} | ${item.certificate_id}`,
    html: emailHtml(item),
    attachments: attachments.length > 0 ? attachments : undefined,
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': item.certificate_id,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { ok: false, error: `${res.status} ${res.statusText} ${text}`.trim() }
  }
  return { ok: true }
}

serve(async (req) => {
  const cors = corsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...cors },
    })
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'certificates@maximally.in'
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing RESEND_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...cors },
    })
  }

  try {
    const body = await req.json().catch(() => ({})) as { certificates?: PayloadItem[]; certificate?: PayloadItem }
    const items: PayloadItem[] = Array.isArray(body.certificates)
      ? body.certificates
      : body.certificate
        ? [body.certificate]
        : []

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: 'No certificates provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...cors },
      })
    }

    let sent = 0
    const errors: string[] = []

    for (const item of items) {
      if (!item.to) {
        errors.push(`${item.certificate_id}: missing recipient`)
        continue
      }
      const res = await sendViaResend(item, RESEND_API_KEY, RESEND_FROM)
      if (res.ok) sent++
      else errors.push(`${item.certificate_id}: ${res.error}`)
    }

    return new Response(JSON.stringify({ sent, failed: items.length - sent, errors }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...cors },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...cors },
    })
  }
})
