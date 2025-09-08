-- Migration: Create users table
-- Purpose: Create users table with case-insensitive username and role enum
-- Features: citext username, role enum, unique constraint on LOWER(username)
-- Date: 2025-09-08

-- Create users table for authentication and authorization
-- This table syncs with auth.users and contains business-level user data
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE, -- References auth.users.id when using Supabase Auth
    username CITEXT NOT NULL UNIQUE,
    email TEXT, -- Optional, may come from auth.users
    role user_role NOT NULL,
    full_name TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure username constraints
    CONSTRAINT chk_username_length CHECK (length(username) >= 2 AND length(username) <= 50),
    CONSTRAINT chk_username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$')
);

-- Add comments for documentation
COMMENT ON TABLE users IS 'Business user accounts with roles and factory access control';
COMMENT ON COLUMN users.id IS 'Primary key UUID for user identification';
COMMENT ON COLUMN users.auth_id IS 'Reference to auth.users.id for Supabase Auth integration';
COMMENT ON COLUMN users.username IS 'Case-insensitive unique username for login (citext)';
COMMENT ON COLUMN users.email IS 'User email address, may be synced from auth.users';
COMMENT ON COLUMN users.role IS 'User role enum determining access permissions';
COMMENT ON COLUMN users.full_name IS 'User display name';
COMMENT ON COLUMN users.active IS 'User account status - inactive users cannot login';

-- Create additional unique constraint on LOWER(username) for safety
-- (citext should handle this, but explicit constraint provides clarity)
CREATE UNIQUE INDEX idx_users_username_lower ON users (LOWER(username));

-- Create index on auth_id for sync operations
CREATE UNIQUE INDEX idx_users_auth_id ON users (auth_id) WHERE auth_id IS NOT NULL;

-- Create index on role for filtering
CREATE INDEX idx_users_role ON users (role);

-- Create index on active status
CREATE INDEX idx_users_active ON users (active);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();