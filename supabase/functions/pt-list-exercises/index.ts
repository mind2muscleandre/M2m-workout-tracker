import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-bridge-secret, x-bridge-pt-id',
}

type ReqBody = {
  query?: string
  category?: string | null
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
    const query = String(body.query ?? '').trim().toLowerCase()
    const category = body.category ? String(body.category).trim() : ''
    const limit = Number.isFinite(body.limit) ? Math.max(1, Math.min(200, Number(body.limit))) : 100

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let dbQuery = admin.from('exercises').select('*').order('name', { ascending: true }).limit(limit)
    if (category) dbQuery = dbQuery.eq('category', category)
    const { data, error } = await dbQuery
    if (error) throw error

    const rows = (data ?? []).filter((r) => {
      if (!query) return true
      const name = String(r.name ?? '').toLowerCase()
      const desc = String(r.description ?? '').toLowerCase()
      return name.includes(query) || desc.includes(query)
    })

    const exercises = rows.map((r) => ({
      id: String(r.id ?? ''),
      name: String(r.name ?? 'Okänd övning'),
      category: String(r.category ?? 'injury_prevention'),
      tracking_type: String(r.tracking_type ?? 'other'),
      muscle_group: Array.isArray(r.muscle_group) ? r.muscle_group : [],
      equipment: r.equipment ?? null,
      description: r.description ?? null,
      video_url: r.video_url ?? null,
    }))

    return new Response(JSON.stringify({ success: true, exercises }), {
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
