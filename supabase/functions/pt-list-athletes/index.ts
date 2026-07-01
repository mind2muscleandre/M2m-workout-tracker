import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-bridge-secret, x-bridge-pt-id',
}

type ReqBody = {
  query?: string
  limit?: number
  exclude_user_ids?: string[]
}

const STAFF_ROLES = new Set(['pt', 'admin'])

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const sharedBridgeSecret = Deno.env.get('M2M_BRIDGE_SHARED_SECRET') ?? ''
    const ptId = (req.headers.get('x-bridge-pt-id') ?? '').trim()

    if (!supabaseUrl || !serviceKey || !sharedBridgeSecret || !ptId) {
      throw new Error('Missing required environment variables or x-bridge-pt-id')
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
    const query = String(body.query ?? '').trim().toLowerCase()
    const limit = Number.isFinite(body.limit) ? Math.max(1, Math.min(200, Number(body.limit))) : 80
    const exclude = new Set(
      (Array.isArray(body.exclude_user_ids) ? body.exclude_user_ids : [])
        .map((id) => String(id).trim())
        .filter(Boolean)
    )

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: profiles, error: profileError } = await admin
      .from('user_profiles')
      .select('user_id, name, email, team, role')
      .order('name', { ascending: true })
      .limit(500)

    if (profileError) throw profileError

    const athletes = (profiles ?? [])
      .filter((p) => {
        const role = String(p.role ?? 'user').toLowerCase()
        if (STAFF_ROLES.has(role)) return false
        const uid = String(p.user_id ?? '')
        if (!uid || exclude.has(uid)) return false
        if (!query) return true
        const name = String(p.name ?? '').toLowerCase()
        const email = String(p.email ?? '').toLowerCase()
        const team = String(p.team ?? '').toLowerCase()
        return name.includes(query) || email.includes(query) || team.includes(query)
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
