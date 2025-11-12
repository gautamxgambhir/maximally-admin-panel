// Supabase Edge Function: send-custom-email
// Sends custom emails using Resend with template support and placeholder replacement

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailPayload {
  recipients: string[]
  subject: string
  body: string
  templateId?: string
  templateName?: string
  placeholders?: Record<string, string>
}

function replacePlaceholders(text: string, placeholders: Record<string, string>): string {
  let result = text
  for (const [key, value] of Object.entries(placeholders)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value || '')
  }
  return result
}

function emailHtml(body: string): string {
  // Convert plain text to HTML with basic formatting
  const htmlBody = body
    .split('\n\n')
    .map(para => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
    .join('')
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          p {
            margin: 16px 0;
          }
          a {
            color: #0066cc;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        ${htmlBody}
        <div class="footer">
          <p>This email was sent by Maximally. If you have any questions, please contact us.</p>
        </div>
      </body>
    </html>
  `
}

async function sendViaResend(
  recipient: string,
  subject: string,
  body: string,
  apiKey: string,
  fromEmail: string
): Promise<{ ok: boolean; error?: string }> {
  const payload = {
    from: fromEmail,
    to: [recipient],
    subject: subject,
    html: emailHtml(body),
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'no-reply@maximally.in'
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ 
      error: 'Email service not configured',
      sent: 0,
      failed: 0
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Get user from auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: EmailPayload = await req.json()
    const { recipients, subject, body: emailBody, templateId, templateName, placeholders = {} } = body

    if (!recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No recipients provided',
        sent: 0,
        failed: 0
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!subject || !emailBody) {
      return new Response(JSON.stringify({ 
        error: 'Subject and body are required',
        sent: 0,
        failed: 0
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Replace placeholders in subject and body
    const finalSubject = replacePlaceholders(subject, placeholders)
    const finalBody = replacePlaceholders(emailBody, placeholders)

    let sent = 0
    const errors: string[] = []
    const successfulRecipients: string[] = []
    const failedRecipients: string[] = []

    // Send emails to all recipients
    for (const recipient of recipients) {
      const res = await sendViaResend(recipient, finalSubject, finalBody, RESEND_API_KEY, RESEND_FROM)
      if (res.ok) {
        sent++
        successfulRecipients.push(recipient)
      } else {
        errors.push(`${recipient}: ${res.error}`)
        failedRecipients.push(recipient)
      }
    }

    // Log successful sends
    if (successfulRecipients.length > 0) {
      await supabase.from('email_logs').insert({
        template_id: templateId || null,
        template_name: templateName || 'Custom Email',
        recipients: successfulRecipients,
        subject: finalSubject,
        body: finalBody,
        status: 'sent',
        sent_by: user.id,
        metadata: { placeholders }
      })
    }

    // Log failed sends
    if (failedRecipients.length > 0) {
      await supabase.from('email_logs').insert({
        template_id: templateId || null,
        template_name: templateName || 'Custom Email',
        recipients: failedRecipients,
        subject: finalSubject,
        body: finalBody,
        status: 'failed',
        error_message: errors.join('; '),
        sent_by: user.id,
        metadata: { placeholders }
      })
    }

    return new Response(JSON.stringify({ 
      sent, 
      failed: recipients.length - sent, 
      errors: errors.length > 0 ? errors : undefined 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('Error sending email:', e)
    return new Response(JSON.stringify({ 
      error: e?.message || 'Unexpected error',
      sent: 0,
      failed: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
