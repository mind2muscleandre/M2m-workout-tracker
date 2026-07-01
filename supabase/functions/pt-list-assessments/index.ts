import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-bridge-secret, x-bridge-pt-id',
}

type ReqBody = {
  client_user_id?: string | null
  tracker_client_id?: string | null
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
    const trackerClientId = body.tracker_client_id ? String(body.tracker_client_id).trim() : ''
    const clientEmail = body.client_email ? String(body.client_email).trim().toLowerCase() : ''
    const limit = Number.isFinite(body.limit) ? Math.max(1, Math.min(50, Number(body.limit))) : 20

    if (!clientUserId && !trackerClientId && !clientEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'client_user_id, tracker_client_id, or client_email required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let dbQuery = admin
      .from('movement_assessment_results')
      .select(
        'id, created_at, assessment_date, client_name, client_email, user_id, tracker_client_id, resultat_hallning, resultat_rorlighet, resultat_karna, resultat_stabilitet, resultat_totalt, resultat_band, raw_assessment, export_payload'
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (clientUserId && trackerClientId) {
      dbQuery = dbQuery.or(
        `user_id.eq.${clientUserId},tracker_client_id.eq.${trackerClientId}`
      )
    } else if (clientUserId) {
      dbQuery = dbQuery.eq('user_id', clientUserId)
    } else if (trackerClientId) {
      dbQuery = dbQuery.eq('tracker_client_id', trackerClientId)
    } else if (clientEmail) {
      dbQuery = dbQuery.eq('client_email', clientEmail)
    }

    const { data, error } = await dbQuery
    if (error) throw error

    const assessments = (data ?? []).map((row) => ({
      id: String(row.id),
      created_at: String(row.created_at ?? ''),
      assessment_date: String(row.assessment_date ?? ''),
      client_name: String(row.client_name ?? ''),
      client_email: String(row.client_email ?? ''),
      user_id: String(row.user_id ?? ''),
      tracker_client_id: row.tracker_client_id != null ? String(row.tracker_client_id) : null,
      resultat_hallning: row.resultat_hallning,
      resultat_rorlighet: row.resultat_rorlighet,
      resultat_karna: row.resultat_karna,
      resultat_stabilitet: row.resultat_stabilitet,
      resultat_totalt: row.resultat_totalt,
      resultat_band: row.resultat_band != null ? String(row.resultat_band) : null,
      raw_assessment: row.raw_assessment ?? null,
      export_payload: row.export_payload ?? null,
    }))

    return new Response(JSON.stringify({ success: true, assessments }), {
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
