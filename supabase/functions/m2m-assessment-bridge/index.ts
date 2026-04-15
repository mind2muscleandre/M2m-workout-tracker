import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_PT_ROLES = new Set(['pt', 'admin'])
const ADMIN_EMAIL_BYPASS = 'andre@mind2muscle.se'

type JsonBody = {
  access_token?: string
  target_email?: string
  target_name?: string
  team?: string
  tracker_client_id?: string
  assessment?: Record<string, unknown>
  export_payload?: Record<string, unknown>
  /** Flat kolumner per test (whitelistas i pt-upload-movement-assessment). */
  flat_assessment_columns?: Record<string, unknown>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const aiAssessmentUrl = Deno.env.get('AI_SCREENING_ASSESSMENT_FUNCTION_URL') ?? ''
    const bridgeSecret = Deno.env.get('M2M_BRIDGE_SHARED_SECRET') ?? ''
    const aiScreeningAnon = Deno.env.get('AI_SCREENING_ANON_KEY') ?? ''
    const aiScreeningService = Deno.env.get('AI_SCREENING_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseAnon || !serviceKey) {
      throw new Error('Missing required Supabase environment variables')
    }
    if (!aiAssessmentUrl || !bridgeSecret) {
      throw new Error('Missing AI_SCREENING_ASSESSMENT_FUNCTION_URL or M2M_BRIDGE_SHARED_SECRET')
    }
    const upstreamBearer = aiScreeningService || aiScreeningAnon
    const upstreamApikey = aiScreeningAnon || aiScreeningService
    if (!upstreamBearer || !upstreamApikey) {
      throw new Error(
        'Missing AI screening auth: set AI_SCREENING_ANON_KEY and/or AI_SCREENING_SERVICE_ROLE_KEY'
      )
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let parsed: JsonBody
    try {
      parsed = (await req.json()) as JsonBody
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let authHeader: string | null = null
    const rawToken = String(parsed.access_token ?? '').trim()
    if (rawToken) {
      authHeader = rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`
    }
    if (!authHeader) {
      authHeader = req.headers.get('Authorization')
    }
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized request' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    const isAllowedRole = !profileError && !!profile && ALLOWED_PT_ROLES.has(profile.role ?? '')
    const isAdminEmailBypass = (user.email ?? '').toLowerCase() === ADMIN_EMAIL_BYPASS

    if (!isAllowedRole && !isAdminEmailBypass) {
      return new Response(JSON.stringify({ success: false, error: 'PT/admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const targetEmail = String(parsed.target_email ?? '').trim().toLowerCase()
    const targetName = String(parsed.target_name ?? '').trim()
    const team = String(parsed.team ?? '').trim()
    const trackerClientId = String(parsed.tracker_client_id ?? '').trim()
    const assessment = parsed.assessment
    const exportPayload = parsed.export_payload

    if (!targetEmail || !targetName) {
      return new Response(
        JSON.stringify({ success: false, error: 'target_email and target_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!assessment || typeof assessment !== 'object' || !exportPayload || typeof exportPayload !== 'object') {
      return new Response(
        JSON.stringify({ success: false, error: 'assessment and export_payload are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const forwardBody = JSON.stringify({
      target_email: targetEmail,
      target_name: targetName,
      team,
      tracker_client_id: trackerClientId || null,
      assessment,
      export_payload: exportPayload,
      flat_assessment_columns: parsed.flat_assessment_columns ?? undefined,
    })

    const upstreamResponse = await fetch(aiAssessmentUrl, {
      method: 'POST',
      headers: {
        'x-bridge-secret': bridgeSecret,
        'x-bridge-pt-id': user.id,
        Authorization: `Bearer ${upstreamBearer}`,
        apikey: upstreamApikey,
        'Content-Type': 'application/json',
      },
      body: forwardBody,
    })

    const upstreamBody = await upstreamResponse.text()
    return new Response(upstreamBody, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-bridge-reached': '1' },
      status: upstreamResponse.status,
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
