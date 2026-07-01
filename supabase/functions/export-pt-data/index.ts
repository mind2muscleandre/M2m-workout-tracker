import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-export-token',
}

const TABLES = [
  'users',
  'clients',
  'exercises',
  'workouts',
  'workout_exercises',
  'sets',
  'conversations',
  'messages',
  'coach_notes',
] as const

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const exportToken = req.headers.get('x-export-token') ?? ''
    const allowedToken = Deno.env.get('PT_EXPORT_TOKEN') ?? 'm2m-pt-export-one-time'
    const authorized = bearer === serviceKey || exportToken === allowedToken
    if (!authorized) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const usersRes = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (usersRes.error) throw usersRes.error

    const tables: Record<string, unknown[]> = {}
    for (const table of TABLES) {
      const { data, error } = await admin.from(table).select('*')
      if (error) {
        if (error.message.includes('Could not find the table')) {
          tables[table] = []
          continue
        }
        throw new Error(`${table}: ${error.message}`)
      }
      tables[table] = data ?? []
    }

    return new Response(
      JSON.stringify({
        ok: true,
        auth_users: usersRes.data.users ?? [],
        tables,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
