-- RPC: assign athlete to coach (self or admin → any PT)

CREATE OR REPLACE FUNCTION coach_assign_athlete(
  p_athlete_user_id uuid,
  p_coach_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_team text DEFAULT NULL
)
RETURNS clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_coach_id uuid;
  v_existing clients;
  v_result clients;
  v_name text;
  v_email text;
BEGIN
  v_coach_id := coalesce(p_coach_id, auth.uid());

  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_coach_id <> auth.uid() AND NOT coach_is_admin() THEN
    RAISE EXCEPTION 'Only admins can assign athletes to other coaches';
  END IF;

  SELECT
    coalesce(nullif(trim(p_name), ''), up.name, up.email, 'Atlet'),
    nullif(trim(coalesce(p_email, up.email)), '')
  INTO v_name, v_email
  FROM user_profiles up
  WHERE up.user_id = p_athlete_user_id;

  IF v_name IS NULL THEN
    v_name := coalesce(nullif(trim(p_name), ''), 'Atlet');
  END IF;

  SELECT * INTO v_existing
  FROM clients c
  WHERE c.assigned_pt_id = v_coach_id
    AND c.client_user_id = p_athlete_user_id
  LIMIT 1;

  IF FOUND THEN
    UPDATE clients
    SET
      name = v_name,
      email = coalesce(v_email, email),
      is_active = true,
      notes = CASE
        WHEN p_team IS NOT NULL AND trim(p_team) <> '' THEN 'Lag: ' || trim(p_team)
        ELSE notes
      END
    WHERE id = v_existing.id
    RETURNING * INTO v_result;
    RETURN v_result;
  END IF;

  IF v_email IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM clients c
    WHERE c.assigned_pt_id = v_coach_id
      AND c.email ILIKE v_email
      AND c.client_user_id IS NULL
    LIMIT 1;

    IF FOUND THEN
      UPDATE clients
      SET
        client_user_id = p_athlete_user_id,
        name = v_name,
        is_active = true
      WHERE id = v_existing.id
      RETURNING * INTO v_result;
      RETURN v_result;
    END IF;
  END IF;

  INSERT INTO clients (
    assigned_pt_id,
    client_user_id,
    name,
    email,
    phone,
    notes,
    sport,
    age,
    weight_kg,
    is_active
  )
  VALUES (
    v_coach_id,
    p_athlete_user_id,
    v_name,
    v_email,
    NULL,
    CASE
      WHEN p_team IS NOT NULL AND trim(p_team) <> '' THEN 'Lag: ' || trim(p_team)
      ELSE NULL
    END,
    NULL,
    NULL,
    NULL,
    true
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION coach_assign_athlete(uuid, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION coach_assign_athlete(uuid, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION coach_assign_athlete(uuid, uuid, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION coach_list_trainers(p_query text DEFAULT '')
RETURNS TABLE (
  user_id uuid,
  name text,
  email text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NOT coach_is_admin() THEN
    RAISE EXCEPTION 'Not authorized to list trainers';
  END IF;

  RETURN QUERY
  SELECT
    up.user_id,
    coalesce(up.name, up.email, 'Tränare')::text AS name,
    up.email::text
  FROM public.user_profiles up
  WHERE lower(coalesce(up.role::text, '')) IN ('pt', 'admin', 'moderator')
    AND (
      coalesce(trim(p_query), '') = ''
      OR up.name ILIKE '%' || trim(p_query) || '%'
      OR up.email ILIKE '%' || trim(p_query) || '%'
    )
  ORDER BY up.name NULLS LAST, up.email NULLS LAST
  LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION coach_list_trainers(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION coach_list_trainers(text) TO authenticated;
GRANT EXECUTE ON FUNCTION coach_list_trainers(text) TO service_role;
