import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-bridge-secret, x-bridge-pt-id',
}

type ReqBody = {
  client_user_id?: string | null
  client_email?: string | null
  limit?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const sharedBridgeSecret = Deno.env.get('M2M_BRIDGE_SHARED_SECRET') ?? ''

    if (!supabaseUrl || !serviceKey || !sharedBridgeSecret) {
      throw new Error('Missing required environment variables')
    }

    const incomingBridgeSecret = req.headers.get('x-bridge-secret') ?? ''
    if (!incomingBridgeSecret || incomingBridgeSecret !== sharedBridgeSecret) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized bridge request' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json().catch(() => ({}))) as ReqBody
    const clientUserId = body.client_user_id ? String(body.client_user_id).trim() : ''
    const clientEmail = body.client_email ? String(body.client_email).trim().toLowerCase() : ''
    const limit = Number.isFinite(body.limit) ? Math.max(1, Math.min(50, Number(body.limit))) : 20

    if (!clientUserId && !clientEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'client_user_id or client_email required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let uploadQuery = admin
      .from('screening_uploads')
      .select(
        'id, screening_id, user_id, name, email, analysis_type, uploaded_at, video_url, uploaded_by_pt_id'
      )
      .order('uploaded_at', { ascending: false })
      .limit(limit)

    if (clientUserId) {
      uploadQuery = uploadQuery.eq('user_id', clientUserId)
    } else {
      uploadQuery = uploadQuery.eq('email', clientEmail)
    }

    const { data: uploads, error: uploadError } = await uploadQuery
    if (uploadError) throw uploadError

    const screeningIds = [
      ...new Set((uploads ?? []).map((u) => String(u.screening_id ?? '')).filter(Boolean)),
    ]

    let queueByScreening: Record<string, { status: string; testomrade: string | null }> = {}
    if (screeningIds.length > 0) {
      const { data: queueRows, error: queueError } = await admin
        .from('screening_queue')
        .select('screening_id, status, testområde')
        .in('screening_id', screeningIds)

      if (queueError) throw queueError
      for (const q of queueRows ?? []) {
        const sid = String(q.screening_id ?? '')
        if (!sid) continue
        queueByScreening[sid] = {
          status: String(q.status ?? 'unknown'),
          testomrade: q.testområde != null ? String(q.testområde) : null,
        }
      }
    }

    const screenings = (uploads ?? []).map((row) => {
      const sid = String(row.screening_id ?? '')
      const queue = queueByScreening[sid]
      return {
        id: String(row.id),
        screening_id: sid,
        user_id: String(row.user_id ?? ''),
        name: String(row.name ?? ''),
        email: String(row.email ?? ''),
        analysis_type: String(row.analysis_type ?? ''),
        uploaded_at: String(row.uploaded_at ?? ''),
        video_url: row.video_url != null ? String(row.video_url) : null,
        queue_status: queue?.status ?? null,
        testomrade: queue?.testomrade ?? null,
      }
    })

    return new Response(JSON.stringify({ success: true, screenings }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
