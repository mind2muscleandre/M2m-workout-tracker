import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts'
import { SCHEMA_SQL } from './schema.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-migration-secret',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const authHeader = req.headers.get('Authorization') ?? ''
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
    const migrationSecret = Deno.env.get('MIGRATION_SECRET') ?? ''
    const providedSecret = req.headers.get('x-migration-secret') ?? ''
    const authorized =
      (serviceKey && bearer === serviceKey) ||
      (migrationSecret && providedSecret === migrationSecret)
    if (!authorized) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const dbUrl = Deno.env.get('SUPABASE_DB_URL') ?? ''
    if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL')

    const client = new Client(dbUrl)
    await client.connect()
    await client.queryArray(SCHEMA_SQL)
    await client.end()

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
