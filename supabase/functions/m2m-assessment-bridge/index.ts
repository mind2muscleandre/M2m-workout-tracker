import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ingestMovementAssessment } from '../_shared/movementAssessmentIngest.ts'
import { listScreeningExercises } from '../_shared/listScreeningExercises.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_PT_ROLES = new Set(['pt', 'admin'])
const ADMIN_EMAIL_BYPASS = 'andre@mind2muscle.se'

type JsonBody = {
  action?: 'upload_assessment' | 'list_exercises' | 'list_athletes' | 'list_assessments'
  access_token?: string
  target_email?: string
  target_name?: string
  team?: string
  tracker_client_id?: string
  client_id?: string
  assessment?: Record<string, unknown>
  export_payload?: Record<string, unknown>
  /** Flat kolumner per test (whitelistas i pt-upload-movement-assessment). */
  flat_assessment_columns?: Record<string, unknown>
  category?: string
  query?: string
  limit?: number
}

const STAFF_ROLES = new Set(['pt', 'admin'])

async function forwardToUpstream(
  url: string,
  bridgeSecret: string,
  ptId: string,
  upstreamBearer: string,
  upstreamApikey: string,
  body: Record<string, unknown>
): Promise<Response> {
  const upstreamResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'x-bridge-secret': bridgeSecret,
      'x-bridge-pt-id': ptId,
      Authorization: `Bearer ${upstreamBearer}`,
      apikey: upstreamApikey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const upstreamBody = await upstreamResponse.text()
  return new Response(upstreamBody, {
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-bridge-reached': '1' },
    status: upstreamResponse.status,
  })
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
    const aiExercisesUrl = Deno.env.get('AI_SCREENING_EXERCISES_FUNCTION_URL') ?? ''
    const aiAthletesUrl = Deno.env.get('AI_SCREENING_LIST_ATHLETES_URL') ?? ''
    const aiListAssessmentsUrl = Deno.env.get('AI_SCREENING_LIST_ASSESSMENTS_URL') ?? ''
    const bridgeSecret = Deno.env.get('M2M_BRIDGE_SHARED_SECRET') ?? ''
    const aiScreeningAnon = Deno.env.get('AI_SCREENING_ANON_KEY') ?? ''
    const aiScreeningService = Deno.env.get('AI_SCREENING_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseAnon || !serviceKey) {
      throw new Error('Missing required Supabase environment variables')
    }

    const upstreamBearer = aiScreeningService || aiScreeningAnon
    const upstreamApikey = aiScreeningAnon || aiScreeningService

    const requireUpstreamAuth = () => {
      if (!bridgeSecret) throw new Error('Missing M2M_BRIDGE_SHARED_SECRET')
      if (!upstreamBearer || !upstreamApikey) {
        throw new Error(
          'Missing AI screening auth: set AI_SCREENING_ANON_KEY and/or AI_SCREENING_SERVICE_ROLE_KEY'
        )
      }
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

    const [{ data: profile, error: profileError }, { data: ptUser }] = await Promise.all([
      supabaseAdmin.from('user_profiles').select('role').eq('user_id', user.id).maybeSingle(),
      supabaseAdmin.from('pt_users').select('role').eq('id', user.id).maybeSingle(),
    ])

    const role = String(profile?.role ?? ptUser?.role ?? '')
    const isAllowedRole = !profileError && ALLOWED_PT_ROLES.has(role)
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
    const action = parsed.action ?? 'upload_assessment'

    if (action === 'list_exercises') {
      const query = String(parsed.query ?? '').trim().toLowerCase()
      const category = String(parsed.category ?? '').trim()
      const limit = Number.isFinite(parsed.limit) ? Math.max(1, Math.min(200, Number(parsed.limit))) : 100

      let useHttpForward = false
      if (aiExercisesUrl) {
        try {
          const bridgeHost = new URL(supabaseUrl).host
          const upstreamHost = new URL(aiExercisesUrl).host
          useHttpForward = upstreamHost.length > 0 && upstreamHost !== bridgeHost
        } catch {
          useHttpForward = false
        }
      }

      if (useHttpForward) {
        requireUpstreamAuth()
        return await forwardToUpstream(aiExercisesUrl, bridgeSecret, user.id, upstreamBearer, upstreamApikey, {
          query,
          category: category || null,
          limit,
        })
      }

      const exercises = await listScreeningExercises(supabaseAdmin, {
        query,
        category: category || null,
        limit,
      })

      return new Response(JSON.stringify({ success: true, exercises }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'list_athletes') {
      const query = String(parsed.query ?? '').trim()
      const limit = Number.isFinite(parsed.limit) ? Math.max(1, Math.min(200, Number(parsed.limit))) : 80

      const { data: assignedClients, error: clientsError } = await supabaseAdmin
        .from('clients')
        .select('client_user_id')
        .eq('assigned_pt_id', user.id)
        .not('client_user_id', 'is', null)

      if (clientsError) throw clientsError

      const excludeUserIds = (assignedClients ?? [])
        .map((c) => String(c.client_user_id ?? '').trim())
        .filter(Boolean)

      if (aiAthletesUrl) {
        requireUpstreamAuth()
        return await forwardToUpstream(aiAthletesUrl, bridgeSecret, user.id, upstreamBearer, upstreamApikey, {
          query,
          limit,
          exclude_user_ids: excludeUserIds,
        })
      }

      const { data: profiles, error: profileListError } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id, name, email, team, role')
        .order('name', { ascending: true })
        .limit(500)

      if (profileListError) throw profileListError

      const exclude = new Set(excludeUserIds)
      const q = query.toLowerCase()
      const athletes = (profiles ?? [])
        .filter((p) => {
          const role = String(p.role ?? 'user').toLowerCase()
          if (STAFF_ROLES.has(role)) return false
          const uid = String(p.user_id ?? '')
          if (!uid || exclude.has(uid)) return false
          if (!q) return true
          const name = String(p.name ?? '').toLowerCase()
          const email = String(p.email ?? '').toLowerCase()
          const team = String(p.team ?? '').toLowerCase()
          return name.includes(q) || email.includes(q) || team.includes(q)
        })
        .slice(0, limit)
        .map((p) => ({
          user_id: String(p.user_id),
          name: String(p.name ?? 'Okänd'),
          email: String(p.email ?? ''),
          team: p.team != null ? String(p.team) : null,
        }))

      return new Response(JSON.stringify({ success: true, athletes }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'list_assessments') {
      const clientId = String(parsed.client_id ?? '').trim()
      if (!clientId) {
        return new Response(JSON.stringify({ success: false, error: 'client_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: clientRow, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('id, client_user_id, email, assigned_pt_id')
        .eq('id', clientId)
        .maybeSingle()

      if (clientError) throw clientError
      if (!clientRow || clientRow.assigned_pt_id !== user.id) {
        return new Response(JSON.stringify({ success: false, error: 'Client not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const limit = Number.isFinite(parsed.limit) ? Math.max(1, Math.min(50, Number(parsed.limit))) : 20
      const listBody = {
        client_user_id: clientRow.client_user_id,
        tracker_client_id: clientRow.id,
        client_email: clientRow.email,
        limit,
      }

      if (aiListAssessmentsUrl) {
        requireUpstreamAuth()
        return await forwardToUpstream(
          aiListAssessmentsUrl,
          bridgeSecret,
          user.id,
          upstreamBearer,
          upstreamApikey,
          listBody
        )
      }

      let dbQuery = supabaseAdmin
        .from('movement_assessment_results')
        .select(
          'id, created_at, assessment_date, client_name, client_email, user_id, tracker_client_id, resultat_hallning, resultat_rorlighet, resultat_karna, resultat_stabilitet, resultat_totalt, resultat_band, raw_assessment, export_payload'
        )
        .order('created_at', { ascending: false })
        .limit(limit)

      const uid = clientRow.client_user_id ? String(clientRow.client_user_id) : ''
      if (uid) {
        dbQuery = dbQuery.or(`user_id.eq.${uid},tracker_client_id.eq.${clientRow.id}`)
      } else {
        dbQuery = dbQuery.eq('tracker_client_id', clientRow.id)
      }

      const { data: rows, error: listError } = await dbQuery
      if (listError) throw listError

      const assessments = (rows ?? []).map((row) => ({
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
    }

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

    let useHttpForward = false
    if (aiAssessmentUrl) {
      try {
        const bridgeHost = new URL(supabaseUrl).host
        const upstreamHost = new URL(aiAssessmentUrl).host
        useHttpForward = upstreamHost.length > 0 && upstreamHost !== bridgeHost
      } catch {
        useHttpForward = false
      }
    }

    if (useHttpForward) {
      requireUpstreamAuth()
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
    }

    const result = await ingestMovementAssessment(supabaseAdmin, {
      target_email: targetEmail,
      target_name: targetName,
      team,
      tracker_client_id: trackerClientId || null,
      assessment,
      export_payload: exportPayload,
      flat_assessment_columns: parsed.flat_assessment_columns,
      uploaded_by_pt_id: user.id,
    })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
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
