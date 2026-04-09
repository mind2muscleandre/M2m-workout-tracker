import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const aiScreeningFunctionUrl = Deno.env.get('AI_SCREENING_FUNCTION_URL') ?? ''
    const bridgeSecret = Deno.env.get('M2M_BRIDGE_SHARED_SECRET') ?? ''

    if (!supabaseUrl || !supabaseAnon || !serviceKey) {
      throw new Error('Missing required Supabase environment variables')
    }
    if (!aiScreeningFunctionUrl || !bridgeSecret) {
      throw new Error('Missing bridge configuration environment variables')
    }

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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError || !profile || !ALLOWED_PT_ROLES.has(profile.role ?? '')) {
      return new Response(JSON.stringify({ success: false, error: 'PT/admin role required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const formData = await req.formData()
    const targetEmail = String(formData.get('target_email') ?? '').trim().toLowerCase()
    const targetName = String(formData.get('target_name') ?? '').trim()
    const files = formData.getAll('files').filter((f) => f instanceof File)

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

    const upstreamResponse = await fetch(aiScreeningFunctionUrl, {
      method: 'POST',
      headers: {
        'x-bridge-secret': bridgeSecret,
        'x-bridge-pt-id': user.id,
      },
      body: formData,
    })

    const upstreamBody = await upstreamResponse.text()

    return new Response(upstreamBody, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
