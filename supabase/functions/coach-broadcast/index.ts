import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ReqBody = {
  broadcast_id?: string;
  user_ids?: string[];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase env');
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = (await req.json().catch(() => ({}))) as ReqBody;
    const broadcastId = String(body.broadcast_id ?? '').trim();
    const userIds = Array.isArray(body.user_ids) ? body.user_ids.map(String) : [];

    if (!broadcastId) {
      return new Response(JSON.stringify({ success: false, error: 'broadcast_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: broadcast, error: bErr } = await admin
      .from('coach_broadcasts')
      .select('id, title, body')
      .eq('id', broadcastId)
      .single();
    if (bErr) throw bErr;

    const { data: profiles } = await admin
      .from('user_profiles')
      .select('user_id, email, name')
      .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);

    let emailsSent = 0;

    if (resendKey && profiles?.length) {
      for (const p of profiles) {
        const email = (p as { email?: string }).email;
        if (!email) continue;

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'M2M Coach <coach@mind2muscle.se>',
            to: [email],
            subject: (broadcast as { title: string }).title,
            text: (broadcast as { body: string }).body,
          }),
        });

        if (res.ok) {
          emailsSent += 1;
          await admin
            .from('coach_broadcast_recipients')
            .update({ email_sent_at: new Date().toISOString() })
            .eq('broadcast_id', broadcastId)
            .eq('user_id', (p as { user_id: string }).user_id);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, emails_sent: emailsSent, resend_configured: Boolean(resendKey) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
