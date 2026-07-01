-- Link PT clients to athlete auth users (user_profiles.user_id).
create index if not exists idx_clients_client_user_id on public.clients (client_user_id);

create unique index if not exists clients_pt_athlete_unique
  on public.clients (assigned_pt_id, client_user_id)
  where client_user_id is not null;
