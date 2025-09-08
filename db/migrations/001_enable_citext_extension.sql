-- Migration: Enable citext extension for case-insensitive text
-- Purpose: Enable citext extension for case-insensitive username handling
-- Required for: case-insensitive username storage and comparison
-- Date: 2025-09-08

-- Enable citext extension for case-insensitive text handling
-- This allows usernames to be stored and compared case-insensitively
CREATE EXTENSION IF NOT EXISTS citext;

-- Verify extension is available
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'citext'
    ) THEN
        RAISE EXCEPTION 'Failed to enable citext extension';
    END IF;
END
$$;