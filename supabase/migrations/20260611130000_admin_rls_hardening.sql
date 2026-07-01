-- Admin RLS hardening: single read path via coach_can_read_athlete, admin list via RPC only.

-- ---------------------------------------------------------------------------
-- Hardened admin check (STABLE + SET row_security = off — no SET LOCAL)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION coach_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
      AND lower(coalesce(up.role::text, '')) IN ('admin', 'moderator')
  );
$$;

REVOKE ALL ON FUNCTION coach_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION coach_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION coach_is_admin() TO service_role;

-- ---------------------------------------------------------------------------
-- Unified read access: admin OR assigned PT client
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION coach_can_read_athlete(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coach_is_admin()
  OR EXISTS (
    SELECT 1
    FROM clients c
    WHERE c.assigned_pt_id = auth.uid()
      AND c.client_user_id = target_user_id
      AND c.is_active = true
  );
$$;

-- ---------------------------------------------------------------------------
-- Remove fragile separate admin policy on user_profiles
-- (admin list uses coach_list_directory_users RPC; single row reads use policy below)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS user_profiles_admin_select ON user_profiles;

-- Ensure coach policy exists (from 20260610100000)
DROP POLICY IF EXISTS user_profiles_coach_select ON user_profiles;
CREATE POLICY user_profiles_coach_select ON user_profiles
  FOR SELECT USING (coach_can_read_athlete(user_id));

-- ---------------------------------------------------------------------------
-- Confirm RPC for admin directory listing
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION coach_list_directory_users(
  p_query text DEFAULT '',
  p_limit integer DEFAULT 500,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  name text,
  email text,
  sport text,
  last_workout_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NOT coach_is_admin() THEN
    RAISE EXCEPTION 'Not authorized to list all users';
  END IF;

  RETURN QUERY
  SELECT
    up.user_id,
    up.name,
    up.email,
    up.sport,
    up.last_workout_at
  FROM public.user_profiles up
  WHERE (
    coalesce(trim(p_query), '') = ''
    OR up.name ILIKE '%' || trim(p_query) || '%'
    OR up.email ILIKE '%' || trim(p_query) || '%'
  )
  ORDER BY up.name NULLS LAST, up.email NULLS LAST
  LIMIT greatest(1, least(p_limit, 1000))
  OFFSET greatest(0, p_offset);
END;
$$;

REVOKE ALL ON FUNCTION coach_list_directory_users(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION coach_list_directory_users(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION coach_list_directory_users(text, integer, integer) TO service_role;
