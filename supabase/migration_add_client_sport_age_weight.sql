-- ============================================
-- Migration: Add sport, age and weight_kg to clients
-- ============================================
-- This migration adds:
-- 1. sport column (TEXT, nullable) - for storing client's sport
-- 2. age column (INTEGER, nullable) - for storing client's age
-- 3. weight_kg column (DECIMAL(5,2), nullable) - for storing client's weight in kg
-- ============================================

-- Add sport column to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS sport TEXT;

-- Add age column to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Add weight_kg column to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2);
