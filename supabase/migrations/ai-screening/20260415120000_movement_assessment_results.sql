-- Apply on the AI screening Supabase project (not the PT workout tracker DB).
-- Stores structured movement assessment submissions from the client tracker.

create table if not exists public.movement_assessment_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  uploaded_by_pt_id uuid references auth.users (id) on delete set null,
  tracker_client_id text,
  client_email text not null,
  client_name text not null,
  team text,
  assessment_date date not null,
  raw_assessment jsonb not null,
  export_payload jsonb not null,
  perform_sync_status text not null default 'skipped',
  perform_last_error text,
  resultat_hallning numeric(5, 2),
  resultat_rorlighet numeric(5, 2),
  resultat_karna numeric(5, 2),
  resultat_stabilitet numeric(5, 2),
  resultat_totalt numeric(5, 2),
  resultat_band text
);

create index if not exists movement_assessment_results_user_id_idx
  on public.movement_assessment_results (user_id);

create index if not exists movement_assessment_results_created_at_idx
  on public.movement_assessment_results (created_at desc);

alter table public.movement_assessment_results enable row level security;

-- Athletes can read their own rows
create policy "movement_assessment_results_select_own"
  on public.movement_assessment_results
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Optional: PT who uploaded can read (if you use uploaded_by_pt_id for dashboard queries)
create policy "movement_assessment_results_select_uploader"
  on public.movement_assessment_results
  for select
  to authenticated
  using (
    uploaded_by_pt_id is not null
    and auth.uid() = uploaded_by_pt_id
  );

-- Inserts are performed with service role from Edge Functions (bypasses RLS).
-- No insert policy for anon/authenticated clients.

comment on table public.movement_assessment_results is
  'Movement assessment JSON + export payload from PT client tracker (bridge).';
