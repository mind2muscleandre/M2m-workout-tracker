-- ============================================
-- Migration: Add tracking_type and duration_seconds
-- ============================================
-- This migration adds:
-- 1. exercise_tracking_type enum (weight, time, other)
-- 2. tracking_type column to exercises table
-- 3. duration_seconds column to sets table
-- ============================================

-- Create tracking_type enum
DO $$ BEGIN
  CREATE TYPE exercise_tracking_type AS ENUM (
    'weight',
    'time',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add tracking_type to exercises table
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS tracking_type exercise_tracking_type NOT NULL DEFAULT 'weight';

-- Add duration_seconds to sets table
ALTER TABLE sets 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Update existing exercises to have default tracking_type
UPDATE exercises 
SET tracking_type = 'weight' 
WHERE tracking_type IS NULL;
