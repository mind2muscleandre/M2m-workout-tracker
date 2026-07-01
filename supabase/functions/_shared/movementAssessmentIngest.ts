import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type MovementAssessmentIngestInput = {
  target_email: string
  target_name: string
  team?: string
  tracker_client_id?: string | null
  assessment: Record<string, unknown>
  export_payload: Record<string, unknown>
  flat_assessment_columns?: Record<string, unknown>
  uploaded_by_pt_id?: string | null
}

export type MovementAssessmentIngestResult = {
  success: true
  assessment_id: string
  target_user_id: string
  target_email: string
  invite_sent: boolean
  perform_sync_status: string
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

export function sanitizeFlatColumns(
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

const findAuthUserIdByEmail = async (
  supabaseAdmin: SupabaseClient,
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

export async function ingestMovementAssessment(
  supabaseAdmin: SupabaseClient,
  input: MovementAssessmentIngestInput
): Promise<MovementAssessmentIngestResult> {
  const targetEmail = String(input.target_email ?? '').trim().toLowerCase()
  const targetName = String(input.target_name ?? '').trim()
  const team = String(input.team ?? '').trim()
  const trackerClientId = input.tracker_client_id ? String(input.tracker_client_id).trim() : null
  const assessment = input.assessment
  const exportPayload = input.export_payload
  const flatFromClient = sanitizeFlatColumns(input.flat_assessment_columns)
  const authInviteRedirectUrl = (Deno.env.get('AUTH_INVITE_REDIRECT_URL') ?? '').trim()
  const performBase = (Deno.env.get('M2M_PERFORM_BASE_URL') ?? '').trim().replace(/\/$/, '')
  const performSecret = (Deno.env.get('M2M_PERFORM_SCREENINGS_SECRET') ?? '').trim()

  if (!targetEmail || !targetName) {
    throw new Error('target_email and target_name are required')
  }
  if (!assessment || typeof assessment !== 'object' || !exportPayload || typeof exportPayload !== 'object') {
    throw new Error('assessment and export_payload are required')
  }

  let uploadedByPtId = input.uploaded_by_pt_id ? String(input.uploaded_by_pt_id).trim() : null
  if (uploadedByPtId) {
    const { data: uploaderData, error: uploaderError } =
      await supabaseAdmin.auth.admin.getUserById(uploadedByPtId)
    if (uploaderError || !uploaderData?.user) {
      uploadedByPtId = null
    }
  }

  let targetUserId: string | null = null
  let inviteSent = false

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

    if (inviteError || !invitedAuthUser?.user) {
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
    } else if (!targetUserId) {
      targetUserId = invitedAuthUser.user.id
      inviteSent = true
    }
  }

  if (!targetUserId) {
    throw new Error('Unable to resolve target user ID')
  }

  const { error: profileUpsertError } = await supabaseAdmin.from('user_profiles').upsert(
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
  type AssessmentScores = {
    postural?: number
    mobility?: number
    core?: number
    stability?: number
    total?: number
    band?: string
  }
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
  const resultat_band = typeof fromAssessment?.band === 'string' ? fromAssessment.band : null

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

  return {
    success: true,
    assessment_id: inserted.id,
    target_user_id: targetUserId,
    target_email: targetEmail,
    invite_sent: inviteSent,
    perform_sync_status: performSyncStatus,
  }
}
