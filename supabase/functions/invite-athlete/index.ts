import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ReqBody = {
  client_id: string;
  email: string;
  name: string;
  sport?: string | null;
  age?: number | null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase env');
    }

    // Verify the caller is an authenticated coach
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = (await req.json()) as ReqBody;
    const { client_id, email, name, sport, age } = body;

    if (!client_id || !email || !name) {
      return new Response(JSON.stringify({ error: 'client_id, email och name krävs' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the caller owns this client
    const { data: clientRow, error: clientErr } = await admin
      .from('clients')
      .select('id, assigned_pt_id, client_user_id')
      .eq('id', client_id)
      .single();

    if (clientErr || !clientRow) {
      return new Response(JSON.stringify({ error: 'Klienten hittades inte' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (clientRow.assigned_pt_id !== caller.id) {
      // Allow admins to bypass — check role
      const { data: callerProfile } = await admin
        .from('pt_users')
        .select('role')
        .eq('id', caller.id)
        .maybeSingle();
      if (!callerProfile || !['admin', 'moderator'].includes(callerProfile.role)) {
        return new Response(JSON.stringify({ error: 'Du har inte behörighet för denna klient' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // If already linked, return existing user_id
    if (clientRow.client_user_id) {
      return new Response(JSON.stringify({ user_id: clientRow.client_user_id, already_linked: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if auth user with this email already exists
    const { data: existingList } = await admin.auth.admin.listUsers();
    const existing = existingList?.users?.find(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    let userId: string;

    if (existing) {
      userId = existing.id;
    } else {
      // Create auth user and send invite email
      const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
        email.trim(),
        {
          data: { full_name: name, role: 'athlete' },
          redirectTo: `${supabaseUrl.replace('.supabase.co', '')}.supabase.co`,
        }
      );
      if (inviteErr || !inviteData?.user) {
        throw new Error(inviteErr?.message ?? 'Kunde inte skapa auth-användare');
      }
      userId = inviteData.user.id;
    }

    // Upsert user_profiles row
    await admin.from('user_profiles').upsert({
      user_id: userId,
      name,
      email: email.trim(),
      sport: sport ?? null,
      age: age ?? null,
    }, { onConflict: 'user_id' });

    // Link client → user
    await admin
      .from('clients')
      .update({ client_user_id: userId, email: email.trim() })
      .eq('id', client_id);

    return new Response(
      JSON.stringify({ user_id: userId, invited: !existing }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
