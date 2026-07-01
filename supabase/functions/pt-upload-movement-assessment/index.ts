/**
 * Movement assessment JSON ingest (AI screening / unified Supabase project).
 * Provisions target users the same way as pt-upload-screening.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ingestMovementAssessment } from '../_shared/movementAssessmentIngest.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-bridge-secret, x-bridge-pt-id',
}

const ALLOWED_PT_ROLES = new Set(['pt', 'admin'])

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const sharedBridgeSecret = Deno.env.get('M2M_BRIDGE_SHARED_SECRET') ?? ''

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

      const [{ data: ptProfile }, { data: platformProfile }] = await Promise.all([
        supabaseAdmin.from('pt_users').select('role').eq('id', ptUser.id).maybeSingle(),
        supabaseAdmin.from('user_profiles').select('role').eq('user_id', ptUser.id).maybeSingle(),
      ])

      const role = String(platformProfile?.role ?? ptProfile?.role ?? '')
      if (!ALLOWED_PT_ROLES.has(role)) {
        return new Response(JSON.stringify({ success: false, error: 'PT/admin role required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }

      uploadedByPtId = ptUser.id
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json()) as Record<string, unknown>

    const result = await ingestMovementAssessment(supabaseAdmin, {
      target_email: String(body.target_email ?? ''),
      target_name: String(body.target_name ?? ''),
      team: String(body.team ?? ''),
      tracker_client_id: body.tracker_client_id ? String(body.tracker_client_id) : null,
      assessment: body.assessment as Record<string, unknown>,
      export_payload: body.export_payload as Record<string, unknown>,
      flat_assessment_columns: body.flat_assessment_columns as Record<string, unknown> | undefined,
      uploaded_by_pt_id: uploadedByPtId,
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
