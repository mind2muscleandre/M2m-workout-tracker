/**
 * Batch / PT screening upload. New target users are provisioned via
 * `auth.admin.inviteUserByEmail` so Supabase sends the invite email (set password link).
 *
 * Dashboard (AI screening Supabase project): Auth → URL Configuration — set Site URL and
 * add `AUTH_INVITE_REDIRECT_URL` (if used) to Redirect URLs. Customize the "Invite user"
 * email template if needed. Set Edge secret `AUTH_INVITE_REDIRECT_URL` for a custom post-invite redirect.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-bridge-secret, x-bridge-pt-id',
}

const ALLOWED_PT_ROLES = new Set(['pt', 'admin'])

const inferFileExtension = (fileName: string, contentType: string): string => {
  const byName = fileName.split('.').pop()?.toLowerCase()
  if (byName && byName.length <= 5) return byName

  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  return 'jpg'
}

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
        return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
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
        return new Response(JSON.stringify({ error: 'Unauthorized request' }), {
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
        return new Response(JSON.stringify({ error: 'PT/admin role required' }), {
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

    const formData = await req.formData()
    const targetEmail = String(formData.get('target_email') ?? '').trim().toLowerCase()
    const targetName = String(formData.get('target_name') ?? '').trim()
    const team = String(formData.get('team') ?? '').trim()
    const injuryHistory = String(formData.get('injury_history') ?? '').trim()
    const analysisTypesRaw = String(formData.get('analysis_types') ?? '[]')
    const files = formData.getAll('files').filter((f) => f instanceof File) as File[]

    if (!targetEmail || !targetName) {
      return new Response(JSON.stringify({ error: 'target_email and target_name are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: 'At least one file is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    let analysisTypes: string[] = []
    try {
      analysisTypes = JSON.parse(analysisTypesRaw)
    } catch {
      analysisTypes = []
    }

    if (analysisTypes.length !== files.length) {
      analysisTypes = files.map(() => String(formData.get('analysis_type') ?? 'mobility'))
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

    const screeningId = crypto.randomUUID()
    const insertedIds: string[] = []

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      const analysisType = analysisTypes[index] || 'mobility'
      const fileExt = inferFileExtension(file.name, file.type || '')
      const fileName = `${screeningId}/${analysisType}/image-${index + 1}.${fileExt}`

      const fileBuffer = await file.arrayBuffer()
      const { error: uploadError } = await supabaseAdmin.storage
        .from('screening-uploads')
        .upload(fileName, fileBuffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'image/jpeg',
        })

      if (uploadError) {
        throw new Error(`Upload failed for ${fileName}: ${uploadError.message}`)
      }

      const { data: publicData } = supabaseAdmin.storage
        .from('screening-uploads')
        .getPublicUrl(fileName)

      const { data: insertedRow, error: insertError } = await supabaseAdmin
        .from('screening_uploads')
        .insert({
          screening_id: screeningId,
          user_id: targetUserId,
          name: targetName,
          email: targetEmail,
          injury_history: injuryHistory || null,
          video_url: publicData.publicUrl,
          uploaded_at: new Date().toISOString(),
          analysis_type: analysisType,
          uploaded_by_pt_id: uploadedByPtId,
        })
        .select('id')
        .single()

      if (insertError) {
        throw new Error(`Database insert failed: ${insertError.message}`)
      }

      insertedIds.push(insertedRow.id)
    }

    const hasMobility = analysisTypes.some((t) => t.includes('mobility'))
    const testomrade = hasMobility ? 'mobility' : 'overhead_squat'
    const { error: queueInsertError } = await supabaseAdmin
      .from('screening_queue')
      .insert({
        screening_id: screeningId,
        status: 'pending',
        testområde: testomrade,
        user_id: targetUserId,
      })

    if (queueInsertError) {
      throw new Error(`Queue insert failed: ${queueInsertError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        screening_id: screeningId,
        upload_count: insertedIds.length,
        upload_ids: insertedIds,
        target_user_id: targetUserId,
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
