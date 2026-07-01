-- Unified project (cqpiejeiwtcopjnhccgn): applied via 20260608120000_pt_workout_tracker_unified.sql

drop policy if exists "movement_assessment_results_select_assigned_pt" on public.movement_assessment_results;
create policy "movement_assessment_results_select_assigned_pt"
  on public.movement_assessment_results
  for select
  to authenticated
  using (
    tracker_client_id is not null
    and exists (
      select 1
      from public.clients c
      where c.id::text = movement_assessment_results.tracker_client_id
        and c.assigned_pt_id = auth.uid()
    )
  );

drop policy if exists "movement_assessment_results_select_linked_athlete" on public.movement_assessment_results;
create policy "movement_assessment_results_select_linked_athlete"
  on public.movement_assessment_results
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where c.client_user_id = movement_assessment_results.user_id
        and c.assigned_pt_id = auth.uid()
    )
  );
