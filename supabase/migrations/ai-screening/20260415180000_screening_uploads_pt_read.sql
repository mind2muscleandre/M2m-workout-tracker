-- Unified M2M project (cqpiejeiwtcopjnhccgn); also in pt_workout_tracker_unified migration.
-- PT can read screening uploads they submitted. Assessment listing uses bridge service role.

alter table public.screening_uploads enable row level security;

drop policy if exists "screening_uploads_select_uploader" on public.screening_uploads;
create policy "screening_uploads_select_uploader"
  on public.screening_uploads
  for select
  to authenticated
  using (
    uploaded_by_pt_id is not null
    and auth.uid() = uploaded_by_pt_id
  );
