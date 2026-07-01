import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_PT_ROLES = new Set(['pt', 'admin'])
const ADMIN_EMAIL_BYPASS = 'andre@mind2muscle.se'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const aiScreeningFunctionUrl = Deno.env.get('AI_SCREENING_FUNCTION_URL') ?? ''
    const aiListScreeningsUrl = Deno.env.get('AI_SCREENING_LIST_SCREENINGS_URL') ?? ''
    const bridgeSecret = Deno.env.get('M2M_BRIDGE_SHARED_SECRET') ?? ''
    const aiScreeningAnon = Deno.env.get('AI_SCREENING_ANON_KEY') ?? ''
    const aiScreeningService = Deno.env.get('AI_SCREENING_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseAnon || !serviceKey) {
      throw new Error('Missing required Supabase environment variables')
    }

    const upstreamBearer = aiScreeningService || aiScreeningAnon
    const upstreamApikey = aiScreeningAnon || aiScreeningService

    const requireUploadBridgeConfig = () => {
      if (!aiScreeningFunctionUrl || !bridgeSecret) {
        throw new Error('Missing bridge configuration environment variables')
      }
      if (!upstreamBearer || !upstreamApikey) {
        throw new Error(
          'Missing AI screening auth envs: set AI_SCREENING_ANON_KEY and/or AI_SCREENING_SERVICE_ROLE_KEY'
        )
      }
    }

    const requireForwardAuth = () => {
      if (!bridgeSecret) throw new Error('Missing M2M_BRIDGE_SHARED_SECRET')
      if (!upstreamBearer || !upstreamApikey) {
        throw new Error(
          'Missing AI screening auth envs: set AI_SCREENING_ANON_KEY and/or AI_SCREENING_SERVICE_ROLE_KEY'
        )
      }
    }

    const contentType = req.headers.get('content-type') ?? ''
    type JsonBodyWithToken = {
      action?: 'upload_screening' | 'list_screenings'
      access_token?: string
      client_id?: string
      limit?: number
      target_email?: string
      target_name?: string
      team?: string
      injury_history?: string
      analysis_types?: string[] | string
      files?: Array<{ name: string; type?: string; data_base64: string }>
    }

    let parsedJson: JsonBodyWithToken | null = null
    let incomingMultipart: FormData | null = null
    if (contentType.includes('application/json')) {
      try {
        parsedJson = (await req.json()) as JsonBodyWithToken
      } catch {
        return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
    } else if (contentType.includes('multipart/form-data')) {
      incomingMultipart = await req.formData()
    }

    // Prefer user JWT from JSON or multipart field (web); native sends Authorization only.
    let authHeader: string | null = null
    if (parsedJson?.access_token) {
      const t = String(parsedJson.access_token).trim()
      if (!t) {
        return new Response(JSON.stringify({ success: false, error: 'Missing access_token in JSON body' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
      authHeader = t.startsWith('Bearer ') ? t : `Bearer ${t}`
    } else if (incomingMultipart) {
      const raw = incomingMultipart.get('access_token')
      if (raw && typeof raw === 'string') {
        const t = raw.trim()
        if (t) authHeader = t.startsWith('Bearer ') ? t : `Bearer ${t}`
      }
    }
    if (!authHeader) {
      authHeader = req.headers.get('Authorization')
    }
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
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized request' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const action = parsedJson?.action ?? 'upload_screening'

    if (action === 'list_screenings' && parsedJson) {
      const clientId = String(parsedJson.client_id ?? '').trim()
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

      const limit = Number.isFinite(parsedJson.limit)
        ? Math.max(1, Math.min(50, Number(parsedJson.limit)))
        : 20
      const listBody = {
        client_user_id: clientRow.client_user_id,
        client_email: clientRow.email,
        limit,
      }

      let useHttpForward = false
      if (aiListScreeningsUrl) {
        try {
          const bridgeHost = new URL(supabaseUrl).host
          const upstreamHost = new URL(aiListScreeningsUrl).host
          useHttpForward = upstreamHost.length > 0 && upstreamHost !== bridgeHost
        } catch {
          useHttpForward = false
        }
      }

      if (useHttpForward) {
        requireForwardAuth()
        const upstreamResponse = await fetch(aiListScreeningsUrl, {
          method: 'POST',
          headers: {
            'x-bridge-secret': bridgeSecret,
            'x-bridge-pt-id': user.id,
            Authorization: `Bearer ${upstreamBearer}`,
            apikey: upstreamApikey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(listBody),
        })
        const upstreamBody = await upstreamResponse.text()
        return new Response(upstreamBody, {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-bridge-reached': '1' },
          status: upstreamResponse.status,
        })
      }

      let uploadQuery = supabaseAdmin
        .from('screening_uploads')
        .select(
          'id, screening_id, user_id, name, email, analysis_type, uploaded_at, video_url, uploaded_by_pt_id'
        )
        .order('uploaded_at', { ascending: false })
        .limit(limit)

      if (clientRow.client_user_id) {
        uploadQuery = uploadQuery.eq('user_id', clientRow.client_user_id)
      } else if (clientRow.email) {
        uploadQuery = uploadQuery.eq('email', String(clientRow.email).toLowerCase())
      } else {
        return new Response(JSON.stringify({ success: true, screenings: [] }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: uploads, error: uploadError } = await uploadQuery
      if (uploadError) throw uploadError

      const screeningIds = [
        ...new Set((uploads ?? []).map((u) => String(u.screening_id ?? '')).filter(Boolean)),
      ]
      let queueByScreening: Record<string, { status: string; testomrade: string | null }> = {}
      if (screeningIds.length > 0) {
        const { data: queueRows, error: queueError } = await supabaseAdmin
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
    }

    let formData: FormData

    if (parsedJson) {
      type JsonFile = { name: string; type?: string; data_base64: string }
      type JsonBody = {
        target_email: string
        target_name: string
        team?: string
        injury_history?: string
        analysis_types: string[] | string
        files: JsonFile[]
      }
      const { access_token: _drop, ...rest } = parsedJson
      const json = rest as JsonBody
      const targetEmail = String(json.target_email ?? '').trim().toLowerCase()
      const targetName = String(json.target_name ?? '').trim()
      const filesIn = Array.isArray(json.files) ? json.files : []

      if (!targetEmail || !targetName) {
        return new Response(
          JSON.stringify({ success: false, error: 'target_email and target_name are required' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }
      if (filesIn.length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'At least one file is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      formData = new FormData()
      formData.append('target_email', targetEmail)
      formData.append('target_name', targetName)
      formData.append('team', String(json.team ?? '').trim())
      formData.append('injury_history', String(json.injury_history ?? '').trim())
      const at =
        typeof json.analysis_types === 'string'
          ? json.analysis_types
          : JSON.stringify(json.analysis_types ?? [])
      formData.append('analysis_types', at)

      for (const f of filesIn) {
        const b64 = f.data_base64 ?? ''
        if (!b64) continue
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
        const mime = f.type || 'image/jpeg'
        const blob = new Blob([bytes], { type: mime })
        formData.append('files', blob, f.name || 'photo.jpg')
      }
      const builtFiles = formData.getAll('files').filter((x): x is Blob => x instanceof Blob)
      if (builtFiles.length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'At least one file is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
    } else if (incomingMultipart) {
      formData = new FormData()
      for (const [key, value] of incomingMultipart.entries()) {
        if (key === 'access_token') continue
        formData.append(key, value)
      }
      const targetEmail = String(formData.get('target_email') ?? '').trim().toLowerCase()
      const targetName = String(formData.get('target_name') ?? '').trim()
      const files = formData.getAll('files').filter((f): f is Blob => f instanceof Blob)

      if (!targetEmail || !targetName) {
        return new Response(
          JSON.stringify({ success: false, error: 'target_email and target_name are required' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }

      if (files.length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'At least one file is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
    } else {
      return new Response(JSON.stringify({ success: false, error: 'Expected application/json or multipart/form-data' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 415,
      })
    }

    requireUploadBridgeConfig()
    const upstreamResponse = await fetch(aiScreeningFunctionUrl, {
      method: 'POST',
      headers: {
        'x-bridge-secret': bridgeSecret,
        'x-bridge-pt-id': user.id,
        Authorization: `Bearer ${upstreamBearer}`,
        apikey: upstreamApikey,
      },
      body: formData,
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
