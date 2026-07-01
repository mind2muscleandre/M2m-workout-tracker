-- Unified Supabase project: movement_assessment_results (idempotent bundle from ai-screening migrations).
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.

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
drop policy if exists "movement_assessment_results_select_own" on public.movement_assessment_results;
create policy "movement_assessment_results_select_own"
  on public.movement_assessment_results
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Optional: PT who uploaded can read (if you use uploaded_by_pt_id for dashboard queries)
drop policy if exists "movement_assessment_results_select_uploader" on public.movement_assessment_results;
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
-- Utökar movement_assessment_results med en kolumn per bedömningsområde (querybart som OH-squat_results per slot).
-- Kör mot AI screening-projektet efter bas-migrationen.

alter table public.movement_assessment_results
  add column if not exists resultat_hallning numeric(5, 2),
  add column if not exists resultat_rorlighet numeric(5, 2),
  add column if not exists resultat_karna numeric(5, 2),
  add column if not exists resultat_stabilitet numeric(5, 2),
  add column if not exists resultat_totalt numeric(5, 2),
  add column if not exists resultat_band text;

comment on column public.movement_assessment_results.resultat_hallning is 'Sektion 1: hållning / postural observation (0–100 skala)';
comment on column public.movement_assessment_results.resultat_rorlighet is 'Sektion 2: rörlighet & mobilitet';
comment on column public.movement_assessment_results.resultat_karna is 'Sektion 3: kärna, aktivering & styrka';
comment on column public.movement_assessment_results.resultat_stabilitet is 'Sektion 4: statisk & dynamisk stabilitet';
comment on column public.movement_assessment_results.resultat_totalt is 'Viktad totalsumma 0–100';
comment on column public.movement_assessment_results.resultat_band is 'Klassificering: excellent|good|fair|poor|critical';
-- Per-test och per-flagga kolumner (OH-squat-mönster). Kör mot AI screening DB.
-- Synkad med src/lib/movementAssessment/supabaseFlatRow.ts (FLAT_ASSESSMENT_COLUMN_KEYS).

alter table public.movement_assessment_results
  add column if not exists ror_ankle_v numeric(8, 3),
  add column if not exists ror_ankle_h numeric(8, 3),
  add column if not exists ror_ankle_poang numeric(6, 2),
  add column if not exists ror_slr_v numeric(8, 3),
  add column if not exists ror_slr_h numeric(8, 3),
  add column if not exists ror_slr_poang numeric(6, 2),
  add column if not exists ror_hip_flex_v numeric(8, 3),
  add column if not exists ror_hip_flex_h numeric(8, 3),
  add column if not exists ror_hip_flex_poang numeric(6, 2),
  add column if not exists ror_hip_abd_v numeric(8, 3),
  add column if not exists ror_hip_abd_h numeric(8, 3),
  add column if not exists ror_hip_abd_poang numeric(6, 2),
  add column if not exists ror_hip_med_sup_v numeric(8, 3),
  add column if not exists ror_hip_med_sup_h numeric(8, 3),
  add column if not exists ror_hip_med_sup_poang numeric(6, 2),
  add column if not exists ror_hip_lat_sup_v numeric(8, 3),
  add column if not exists ror_hip_lat_sup_h numeric(8, 3),
  add column if not exists ror_hip_lat_sup_poang numeric(6, 2),
  add column if not exists ror_shoulder_pos_v numeric(8, 3),
  add column if not exists ror_shoulder_pos_h numeric(8, 3),
  add column if not exists ror_shoulder_pos_poang numeric(6, 2),
  add column if not exists ror_sh_med_v numeric(8, 3),
  add column if not exists ror_sh_med_h numeric(8, 3),
  add column if not exists ror_sh_med_poang numeric(6, 2),
  add column if not exists ror_sh_lat_v numeric(8, 3),
  add column if not exists ror_sh_lat_h numeric(8, 3),
  add column if not exists ror_sh_lat_poang numeric(6, 2),
  add column if not exists ror_arm_raise_v numeric(8, 3),
  add column if not exists ror_arm_raise_h numeric(8, 3),
  add column if not exists ror_arm_raise_poang numeric(6, 2),
  add column if not exists ror_side_flex_v numeric(8, 3),
  add column if not exists ror_side_flex_h numeric(8, 3),
  add column if not exists ror_side_flex_poang numeric(6, 2),
  add column if not exists ror_neck_side_v numeric(8, 3),
  add column if not exists ror_neck_side_h numeric(8, 3),
  add column if not exists ror_neck_side_poang numeric(6, 2),
  add column if not exists ror_hip_med_st_v numeric(8, 3),
  add column if not exists ror_hip_med_st_h numeric(8, 3),
  add column if not exists ror_hip_med_st_poang numeric(6, 2),
  add column if not exists ror_hip_lat_st_v numeric(8, 3),
  add column if not exists ror_hip_lat_st_h numeric(8, 3),
  add column if not exists ror_hip_lat_st_poang numeric(6, 2),
  add column if not exists ror_long_hf_v numeric(8, 3),
  add column if not exists ror_long_hf_h numeric(8, 3),
  add column if not exists ror_long_hf_poang numeric(6, 2),
  add column if not exists ror_ub_rot_v numeric(8, 3),
  add column if not exists ror_ub_rot_h numeric(8, 3),
  add column if not exists ror_ub_rot_poang numeric(6, 2),
  add column if not exists ror_neck_rot_v numeric(8, 3),
  add column if not exists ror_neck_rot_h numeric(8, 3),
  add column if not exists ror_neck_rot_poang numeric(6, 2),
  add column if not exists ror_oh_squat_grad numeric(8, 3),
  add column if not exists ror_oh_squat_poang numeric(6, 2),
  add column if not exists ror_oh_reach_kod text,
  add column if not exists ror_oh_reach_poang numeric(6, 2);

alter table public.movement_assessment_results
  add column if not exists hallning_forward_head boolean,
  add column if not exists hallning_thoracic_kyphosis boolean,
  add column if not exists hallning_straightened_thoracic boolean,
  add column if not exists hallning_scoliosis boolean,
  add column if not exists hallning_lumbar_lordosis boolean,
  add column if not exists hallning_flattened_lumbar boolean,
  add column if not exists hallning_anterior_pelvic_tilt boolean,
  add column if not exists hallning_posterior_pelvic_tilt boolean,
  add column if not exists hallning_high_ilium boolean,
  add column if not exists hallning_pelvic_torsion boolean,
  add column if not exists hallning_rounded_shoulders boolean,
  add column if not exists hallning_winging_scapula boolean,
  add column if not exists hallning_bow_legs boolean,
  add column if not exists hallning_knock_knees boolean,
  add column if not exists hallning_excessive_pronation boolean,
  add column if not exists hallning_excessive_supination boolean;

alter table public.movement_assessment_results
  add column if not exists karna_andning_kod text,
  add column if not exists karna_sekvens_kod text,
  add column if not exists karna_lumb_vinkel_kod text,
  add column if not exists karna_lumb_reps integer,
  add column if not exists karna_hals_grad integer,
  add column if not exists karna_poang_andning numeric(6, 2),
  add column if not exists karna_poang_sekvens numeric(6, 2),
  add column if not exists karna_poang_lumb numeric(6, 2),
  add column if not exists karna_poang_hals numeric(6, 2);

alter table public.movement_assessment_results
  add column if not exists stab_pinne_transversal_v boolean,
  add column if not exists stab_pinne_transversal_h boolean,
  add column if not exists stab_pinne_frontal_v boolean,
  add column if not exists stab_pinne_frontal_h boolean,
  add column if not exists stab_pinne_sagittal boolean,
  add column if not exists stab_pinne_axlar_v boolean,
  add column if not exists stab_pinne_axlar_h boolean,
  add column if not exists stab_pinne_becken_hoft boolean,
  add column if not exists stab_pinne_poang numeric(6, 2),
  add column if not exists stab_lunge_fot_v boolean,
  add column if not exists stab_lunge_fot_h boolean,
  add column if not exists stab_lunge_kna_v boolean,
  add column if not exists stab_lunge_kna_h boolean,
  add column if not exists stab_lunge_hoft_v boolean,
  add column if not exists stab_lunge_hoft_h boolean,
  add column if not exists stab_lunge_uk_v boolean,
  add column if not exists stab_lunge_uk_h boolean,
  add column if not exists stab_lunge_hallning_v boolean,
  add column if not exists stab_lunge_hallning_h boolean,
  add column if not exists stab_lunge_poang numeric(6, 2);
-- Per-sida poängkolumner för bilaterala rörlighetstester.
-- Synkad med src/lib/movementAssessment/supabaseFlatRow.ts (`ror_<key>_poang_v/h`).

alter table public.movement_assessment_results
  add column if not exists ror_ankle_poang_v numeric(6, 2),
  add column if not exists ror_ankle_poang_h numeric(6, 2),
  add column if not exists ror_slr_poang_v numeric(6, 2),
  add column if not exists ror_slr_poang_h numeric(6, 2),
  add column if not exists ror_hip_flex_poang_v numeric(6, 2),
  add column if not exists ror_hip_flex_poang_h numeric(6, 2),
  add column if not exists ror_hip_abd_poang_v numeric(6, 2),
  add column if not exists ror_hip_abd_poang_h numeric(6, 2),
  add column if not exists ror_hip_med_sup_poang_v numeric(6, 2),
  add column if not exists ror_hip_med_sup_poang_h numeric(6, 2),
  add column if not exists ror_hip_lat_sup_poang_v numeric(6, 2),
  add column if not exists ror_hip_lat_sup_poang_h numeric(6, 2),
  add column if not exists ror_shoulder_pos_poang_v numeric(6, 2),
  add column if not exists ror_shoulder_pos_poang_h numeric(6, 2),
  add column if not exists ror_sh_med_poang_v numeric(6, 2),
  add column if not exists ror_sh_med_poang_h numeric(6, 2),
  add column if not exists ror_sh_lat_poang_v numeric(6, 2),
  add column if not exists ror_sh_lat_poang_h numeric(6, 2),
  add column if not exists ror_arm_raise_poang_v numeric(6, 2),
  add column if not exists ror_arm_raise_poang_h numeric(6, 2),
  add column if not exists ror_side_flex_poang_v numeric(6, 2),
  add column if not exists ror_side_flex_poang_h numeric(6, 2),
  add column if not exists ror_neck_side_poang_v numeric(6, 2),
  add column if not exists ror_neck_side_poang_h numeric(6, 2),
  add column if not exists ror_hip_med_st_poang_v numeric(6, 2),
  add column if not exists ror_hip_med_st_poang_h numeric(6, 2),
  add column if not exists ror_hip_lat_st_poang_v numeric(6, 2),
  add column if not exists ror_hip_lat_st_poang_h numeric(6, 2),
  add column if not exists ror_long_hf_poang_v numeric(6, 2),
  add column if not exists ror_long_hf_poang_h numeric(6, 2),
  add column if not exists ror_ub_rot_poang_v numeric(6, 2),
  add column if not exists ror_ub_rot_poang_h numeric(6, 2),
  add column if not exists ror_neck_rot_poang_v numeric(6, 2),
  add column if not exists ror_neck_rot_poang_h numeric(6, 2);
