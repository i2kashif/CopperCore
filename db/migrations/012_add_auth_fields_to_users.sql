-- Migration: Add Authentication Fields to Users Table
-- Adds password_hash, full_name, and email columns for custom auth

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add constraints
ALTER TABLE public.users 
ADD CONSTRAINT users_email_check CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Update existing users with placeholder data if needed
UPDATE public.users 
SET 
  full_name = COALESCE(full_name, 'User Name'),
  email = COALESCE(email, username || '@coppercore.com')
WHERE full_name IS NULL OR email IS NULL;