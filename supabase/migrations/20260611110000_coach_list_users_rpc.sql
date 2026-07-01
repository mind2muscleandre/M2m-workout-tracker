-- Admin directory listing bypasses user_profiles RLS (SECURITY DEFINER + coach_is_admin check).

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
