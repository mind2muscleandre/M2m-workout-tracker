-- ============================================
-- Drop All Tables and Related Objects
-- ============================================
-- WARNING: This will delete ALL data and structure!
-- Run this script with caution in Supabase SQL Editor
-- ============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS check_set_pr ON sets;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS check_pr();
DROP FUNCTION IF EXISTS handle_new_user();

-- Drop tables (in reverse dependency order due to foreign keys)
DROP TABLE IF EXISTS sets CASCADE;
DROP TABLE IF EXISTS workout_exercises CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom types/enums
DROP TYPE IF EXISTS workout_status CASCADE;
DROP TYPE IF EXISTS exercise_category CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Note: The uuid-ossp extension is kept as it's a standard PostgreSQL extension
-- If you want to remove it too, uncomment the line below:
-- DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
