-- Ensure email column exists on clients (safe to run multiple times)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;
