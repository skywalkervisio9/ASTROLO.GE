-- Drop unused prompt_version column from users table.
-- Readings track their own prompt_version in natal_readings and synastry tables.
ALTER TABLE public.users DROP COLUMN IF EXISTS prompt_version;
