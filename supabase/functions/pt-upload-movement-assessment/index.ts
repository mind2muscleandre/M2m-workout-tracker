/**
 * Movement assessment JSON ingest (AI screening Supabase project).
 * Provisions target users the same way as pt-upload-screening.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-bridge-secret, x-bridge-pt-id',
}

const ALLOWED_PT_ROLES = new Set(['pt', 'admin'])

const findAuthUserIdByEmail = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> => {
  let page = 1
  const perPage = 200
  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) return null
    const users = data?.users ?? []
    const match = users.find((u) => (u.email ?? '').toLowerCase() === email)
    if (match?.id) return match.id
    if (users.length < perPage) break
    page += 1
  }
  return null
}

type RequestBody = {
  target_email: string
  target_name: string
  team?: string
  tracker_client_id?: string | null
  assessment: Record<string, unknown>
  export_payload: Record<string, unknown>
  flat_assessment_columns?: Record<string, unknown>
}

const isAllowedFlatKey = (k: string): boolean => {
  if (k.length > 90) return false
  return (
    k.startsWith('ror_') ||
    k.startsWith('hallning_') ||
    k.startsWith('karna_') ||
    k.startsWith('stab_') ||
    k.startsWith('resultat_')
  )
}

function sanitizeFlatColumns(
  raw: unknown
): Record<string, string | number | boolean | null> {
  if (!raw || typeof raw !== 'object') return {}
  const o: Record<string, string | number | boolean | null> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isAllowedFlatKey(k)) continue
    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      o[k] = v
    }
  }
  return o
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const sharedBridgeSecret = Deno.env.get('M2M_BRIDGE_SHARED_SECRET') ?? ''
    const authInviteRedirectUrl = (Deno.env.get('AUTH_INVITE_REDIRECT_URL') ?? '').trim()
    const performBase = (Deno.env.get('M2M_PERFORM_BASE_URL') ?? '').trim().replace(/\/$/, '')
    const performSecret = (Deno.env.get('M2M_PERFORM_SCREENINGS_SECRET') ?? '').trim()

    if (!supabaseUrl || !supabaseAnon || !serviceKey) {
      throw new Error('Missing required Supabase environment variables')
    }

    const incomingBridgeSecret = req.headers.get('x-bridge-secret') ?? ''
    const bridgePtIdHeader = (req.headers.get('x-bridge-pt-id') ?? '').trim()
    const trustedBridgeRequest =
      sharedBridgeSecret.length > 0 &&
      incomingBridgeSecret.length > 0 &&
      incomingBridgeSecret === sharedBridgeSecret

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let uploadedByPtId: string | null = null

    if (trustedBridgeRequest) {
      if (bridgePtIdHeader.length > 0) {
        uploadedByPtId = bridgePtIdHeader
      }
    } else {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({ success: false, error: 'Missing Authorization header' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }

      const supabaseUser = createClient(supabaseUrl, supabaseAnon, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const {
        data: { user: ptUser },
        error: authError,
      } = await supabaseUser.auth.getUser()

      if (authError || !ptUser) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized request' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }

      const { data: ptProfile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('role')
        .eq('user_id', ptUser.id)
        .maybeSingle()

      if (profileError || !ptProfile || !ALLOWED_PT_ROLES.has(ptProfile.role ?? '')) {
        return new Response(JSON.stringify({ success: false, error: 'PT/admin role required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }

      uploadedByPtId = ptUser.id
    }

    if (uploadedByPtId) {
      const { data: uploaderData, error: uploaderError } =
        await supabaseAdmin.auth.admin.getUserById(uploadedByPtId)
      if (uploaderError || !uploaderData?.user) {
        uploadedByPtId = null
      }
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let body: RequestBody
    try {
      body = (await req.json()) as RequestBody
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const targetEmail = String(body.target_email ?? '').trim().toLowerCase()
    const targetName = String(body.target_name ?? '').trim()
    const team = String(body.team ?? '').trim()
    const trackerClientId = body.tracker_client_id ? String(body.tracker_client_id).trim() : null
    const assessment = body.assessment
    const exportPayload = body.export_payload
    const flatFromClient = sanitizeFlatColumns(body.flat_assessment_columns)

    if (!targetEmail || !targetName) {
      return new Response(JSON.stringify({ success: false, error: 'target_email and target_name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!assessment || typeof assessment !== 'object' || !exportPayload || typeof exportPayload !== 'object') {
      return new Response(
        JSON.stringify({ success: false, error: 'assessment and export_payload are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let targetUserId: string | null = null

    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('email', targetEmail)
      .maybeSingle()

    const existingAuthUserId = await findAuthUserIdByEmail(supabaseAdmin, targetEmail)

    if (existingProfile?.user_id) {
      targetUserId = existingProfile.user_id
    } else if (existingAuthUserId) {
      targetUserId = existingAuthUserId
    } else {
      const invitePayload: { data: Record<string, unknown>; redirectTo?: string } = {
        data: {
          name: targetName,
          ...(team ? { team } : {}),
        },
      }
      if (authInviteRedirectUrl.length > 0) {
        invitePayload.redirectTo = authInviteRedirectUrl
      }

      const { data: invitedAuthUser, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(targetEmail, invitePayload)

      if (inviteError || !invitedAuthUser.user) {
        const message = (inviteError?.message ?? '').toLowerCase()
        const duplicateUser =
          message.includes('already been registered') ||
          message.includes('already registered') ||
          message.includes('user already exists') ||
          message.includes('email address is already')
        if (duplicateUser) {
          const existingAfterConflictId = await findAuthUserIdByEmail(supabaseAdmin, targetEmail)
          if (existingAfterConflictId) {
            targetUserId = existingAfterConflictId
          } else {
            throw new Error(inviteError?.message ?? 'Failed to invite target user')
          }
        } else {
          throw new Error(inviteError?.message ?? 'Failed to invite target user')
        }
      }
      if (!targetUserId) {
        targetUserId = invitedAuthUser.user.id
      }
    }

    if (!targetUserId) {
      throw new Error('Unable to resolve target user ID')
    }

    const { error: profileUpsertError } = await supabaseAdmin
      .from('user_profiles')
      .upsert(
        {
          user_id: targetUserId,
          email: targetEmail,
          name: targetName,
          team: team || null,
        },
        { onConflict: 'email' }
      )

    if (profileUpsertError) {
      throw new Error(`Could not upsert user profile: ${profileUpsertError.message}`)
    }

    const dateRaw = typeof assessment.date === 'string' ? assessment.date : ''
    const assessmentDate =
      dateRaw.length >= 10 ? dateRaw.slice(0, 10) : new Date().toISOString().slice(0, 10)

    type SectionScores = { postural?: number; mobility?: number; core?: number; stability?: number }
    type AssessmentScores = { postural?: number; mobility?: number; core?: number; stability?: number; total?: number; band?: string }
    const exp = exportPayload as Record<string, unknown>
    const fromExport = exp.stacSectionScores as SectionScores | undefined
    const fromAssessment = (assessment as { scores?: AssessmentScores }).scores
    const pick = (k: keyof SectionScores): number | null => {
      const a = fromExport?.[k]
      const b = fromAssessment?.[k]
      const v = typeof a === 'number' ? a : typeof b === 'number' ? b : null
      return v != null && Number.isFinite(v) ? Math.round(v * 100) / 100 : null
    }
    const totalRaw = typeof exp.stacScore === 'number' ? exp.stacScore : fromAssessment?.total
    const resultat_totalt =
      typeof totalRaw === 'number' && Number.isFinite(totalRaw)
        ? Math.round(totalRaw * 100) / 100
        : null
    const resultat_band =
      typeof fromAssessment?.band === 'string' ? fromAssessment.band : null

    let performSyncStatus = 'skipped'
    let performLastError: string | null = null

    if (performBase.length > 0) {
      performSyncStatus = 'pending'
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (performSecret.length > 0) {
          headers['Authorization'] = `Bearer ${performSecret}`
        }
        const pr = await fetch(`${performBase}/api/screenings/external`, {
          method: 'POST',
          headers,
          body: JSON.stringify(exportPayload),
        })
        if (pr.ok) {
          performSyncStatus = 'synced'
        } else {
          performSyncStatus = 'failed'
          performLastError = `HTTP ${pr.status}: ${(await pr.text()).slice(0, 500)}`
        }
      } catch (e) {
        performSyncStatus = 'failed'
        performLastError = e instanceof Error ? e.message : 'Perform request failed'
      }
    }

    const insertRow = {
      user_id: targetUserId,
      uploaded_by_pt_id: uploadedByPtId,
      tracker_client_id: trackerClientId,
      client_email: targetEmail,
      client_name: targetName,
      team: team || null,
      assessment_date: assessmentDate,
      raw_assessment: assessment,
      export_payload: exportPayload,
      perform_sync_status: performSyncStatus,
      perform_last_error: performLastError,
      ...flatFromClient,
      resultat_hallning:
        typeof flatFromClient.resultat_hallning === 'number'
          ? flatFromClient.resultat_hallning
          : pick('postural'),
      resultat_rorlighet:
        typeof flatFromClient.resultat_rorlighet === 'number'
          ? flatFromClient.resultat_rorlighet
          : pick('mobility'),
      resultat_karna:
        typeof flatFromClient.resultat_karna === 'number' ? flatFromClient.resultat_karna : pick('core'),
      resultat_stabilitet:
        typeof flatFromClient.resultat_stabilitet === 'number'
          ? flatFromClient.resultat_stabilitet
          : pick('stability'),
      resultat_totalt:
        typeof flatFromClient.resultat_totalt === 'number' ? flatFromClient.resultat_totalt : resultat_totalt,
      resultat_band:
        typeof flatFromClient.resultat_band === 'string' ? flatFromClient.resultat_band : resultat_band,
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('movement_assessment_results')
      .insert(insertRow)
      .select('id')
      .single()

    if (insertError) {
      throw new Error(`Database insert failed: ${insertError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        assessment_id: inserted.id,
        target_user_id: targetUserId,
        perform_sync_status: performSyncStatus,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
