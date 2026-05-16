-- Migration: backfill invite_code for profiles that predate the trigger.
-- Only applies to "main" profiles (owner_id IS NULL) without a code.
UPDATE profiles
SET invite_code = upper(substr(md5(id::text || random()::text), 1, 8))
WHERE owner_id IS NULL
  AND (invite_code IS NULL OR invite_code = '');
