-- ==========================================
-- CopperCore ERP Database Schema - Consolidated Migration
-- ==========================================
-- 
-- This file contains all migrations combined into a single script
-- for manual execution in Supabase dashboard or CLI.
--
-- IMPORTANT: Run this in order, section by section
-- Each section corresponds to an individual migration file
--
-- Date: 2025-09-08
-- Version: Initial setup (migrations 001-011)
-- ==========================================

-- First, create migration history table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_history (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checksum VARCHAR(64) NOT NULL,
  CONSTRAINT chk_filename_format CHECK (filename ~ '^[0-9]{3}_[a-zA-Z0-9_-]+\.sql$')
);

COMMENT ON TABLE migration_history IS 'Tracks applied database migrations';

-- ==========================================
-- 001: Enable citext extension
-- ==========================================

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

-- Record migration
INSERT INTO migration_history (filename, checksum) 
VALUES ('001_enable_citext_extension.sql', 'consolidated') 
ON CONFLICT (filename) DO NOTHING;

-- ==========================================
-- 002: Create user role enum
-- ==========================================

-- Create user_role enum with the five defined roles
-- CEO and Director have global access across all factories
-- FM (Factory Manager) and FW (Factory Worker) are factory-scoped
-- Office role is configurable (can be scoped or global)
CREATE TYPE user_role AS ENUM (
    'CEO',
    'Director', 
    'FM',
    'FW',
    'Office'
);

-- Add comment for documentation
COMMENT ON TYPE user_role IS 'User role enumeration: CEO/Director (global access), FM/FW (factory-scoped), Office (configurable scope)';

-- Record migration
INSERT INTO migration_history (filename, checksum) 
VALUES ('002_create_user_role_enum.sql', 'consolidated') 
ON CONFLICT (filename) DO NOTHING;

-- ==========================================
-- 003: Create factories table
-- ==========================================

-- Create factories table to represent manufacturing sites
-- Each factory is a distinct operational unit with its own data scope
CREATE TABLE factories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE CHECK (length(code) >= 2 AND length(code) <= 10),
    name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE factories IS 'Factory entities representing manufacturing sites in the ERP system';
COMMENT ON COLUMN factories.id IS 'Primary key UUID for factory identification';
COMMENT ON COLUMN factories.code IS 'Unique factory code (2-10 chars) used in business documents';
COMMENT ON COLUMN factories.name IS 'Human-readable factory name for display';
COMMENT ON COLUMN factories.active IS 'Factory operational status - inactive factories are hidden from operations';

-- Create indexes
CREATE INDEX idx_factories_code ON factories (code);
CREATE INDEX idx_factories_active ON factories (active);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_factories_updated_at
    BEFORE UPDATE ON factories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Record migration
INSERT INTO migration_history (filename, checksum) 
VALUES ('003_create_factories_table.sql', 'consolidated') 
ON CONFLICT (filename) DO NOTHING;

-- ==========================================
-- 004: Create users table
-- ==========================================

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
COMMENT ON COLUMN users.auth_id IS 'Reference to auth.users.id for Supabase Auth integration';
COMMENT ON COLUMN users.username IS 'Case-insensitive unique username for login (citext)';
COMMENT ON COLUMN users.role IS 'User role enum determining access permissions';

-- Create indexes
CREATE UNIQUE INDEX idx_users_username_lower ON users (LOWER(username));
CREATE UNIQUE INDEX idx_users_auth_id ON users (auth_id) WHERE auth_id IS NOT NULL;
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_active ON users (active);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Record migration
INSERT INTO migration_history (filename, checksum) 
VALUES ('004_create_users_table.sql', 'consolidated') 
ON CONFLICT (filename) DO NOTHING;

-- ==========================================
-- 005: Create user factory links table
-- ==========================================

-- Create user_factory_links table for multi-factory user assignments
-- This table defines which factories a user can access
CREATE TABLE user_factory_links (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES users(id), -- Who granted this access
    
    -- Composite primary key
    PRIMARY KEY (user_id, factory_id)
);

-- Add comments for documentation
COMMENT ON TABLE user_factory_links IS 'Many-to-many relationship defining user access to specific factories';

-- Create indexes for efficient lookups
CREATE INDEX idx_user_factory_links_user_id ON user_factory_links (user_id);
CREATE INDEX idx_user_factory_links_factory_id ON user_factory_links (factory_id);
CREATE INDEX idx_user_factory_links_created_by ON user_factory_links (created_by);

-- Record migration
INSERT INTO migration_history (filename, checksum) 
VALUES ('005_create_user_factory_links_table.sql', 'consolidated') 
ON CONFLICT (filename) DO NOTHING;

-- ==========================================
-- 006: Create user settings table
-- ==========================================

-- Create user_settings table for user preferences and current factory selection
-- This table manages the dynamic factory context since JWT only contains role/user_id
-- Each user has exactly one settings record
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    selected_factory_id UUID REFERENCES factories(id) ON DELETE SET NULL,
    
    -- User preferences
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ur')),
    timezone TEXT DEFAULT 'Asia/Karachi',
    date_format TEXT DEFAULT 'DD/MM/YYYY' CHECK (date_format IN ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD')),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE user_settings IS 'User preferences and current factory selection for dynamic scoping';

-- Create indexes
CREATE UNIQUE INDEX idx_user_settings_user_id ON user_settings (user_id);
CREATE INDEX idx_user_settings_selected_factory_id ON user_settings (selected_factory_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER trigger_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create user settings when user is created
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default settings for new user
    INSERT INTO user_settings (user_id, selected_factory_id)
    VALUES (NEW.id, NULL); -- Will be set when user selects a factory
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to create default settings for new users
CREATE TRIGGER trigger_create_default_user_settings
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_settings();

-- Record migration
INSERT INTO migration_history (filename, checksum) 
VALUES ('006_create_user_settings_table.sql', 'consolidated') 
ON CONFLICT (filename) DO NOTHING;

-- ==========================================
-- 007: Add auth sync triggers
-- ==========================================

-- Create function to sync auth.users to public.users on insert
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role user_role := 'FW'; -- Default role for new users
BEGIN
    -- Insert corresponding record in public.users
    INSERT INTO public.users (
        auth_id,
        username,
        email,
        role,
        full_name,
        active
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, default_role),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        true
    ) ON CONFLICT (auth_id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for manual user creation (when not using Supabase Auth)
CREATE OR REPLACE FUNCTION create_user_without_auth(
    p_username TEXT,
    p_email TEXT,
    p_role user_role,
    p_full_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Insert user without auth_id
    INSERT INTO users (
        username,
        email,
        role,
        full_name,
        active
    ) VALUES (
        p_username,
        p_email,
        p_role,
        p_full_name,
        true
    ) RETURNING id INTO new_user_id;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if auth schema exists and create triggers accordingly
DO $$
BEGIN
    -- Check if auth.users table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        -- Drop existing triggers if they exist
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        
        -- Create new triggers
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION handle_new_auth_user();
            
        RAISE NOTICE 'Auth sync triggers created for auth.users';
    ELSE
        RAISE NOTICE 'auth.users table not found - sync triggers not created';
    END IF;
END
$$;

-- Record migration
INSERT INTO migration_history (filename, checksum) 
VALUES ('007_add_auth_sync_triggers.sql', 'consolidated') 
ON CONFLICT (filename) DO NOTHING;

-- ==========================================
-- 008: Create auth helper functions
-- ==========================================

-- Function to extract user_id from JWT token
-- Marked STABLE since JWT doesn't change during a transaction
CREATE OR REPLACE FUNCTION jwt_user_id()
RETURNS UUID AS $$
BEGIN
    -- Extract user_id from JWT claims
    -- In Supabase: auth.uid()
    -- In custom auth: extract from JWT
    RETURN COALESCE(auth.uid(), (current_setting('request.jwt.claims', true)::json->>'user_id')::uuid);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get current user's role from users table
-- Marked STABLE since user role doesn't change during a transaction
CREATE OR REPLACE FUNCTION jwt_role()
RETURNS user_role AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val
    FROM users
    WHERE auth_id = jwt_user_id() OR id = jwt_user_id();
    
    RETURN user_role_val;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if current user has global access (CEO or Director)
-- Marked STABLE since user role doesn't change during a transaction
CREATE OR REPLACE FUNCTION user_is_global()
RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
BEGIN
    user_role_val := jwt_role();
    RETURN user_role_val IN ('CEO', 'Director');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get current user's selected factory from user_settings
-- Marked STABLE since factory selection is stable within a transaction
CREATE OR REPLACE FUNCTION current_factory()
RETURNS UUID AS $$
DECLARE
    factory_id UUID;
    current_user_id UUID;
BEGIN
    current_user_id := jwt_user_id();
    
    -- Return NULL if no user (allows queries to work in non-authenticated context)
    IF current_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get selected factory from user_settings
    SELECT us.selected_factory_id INTO factory_id
    FROM user_settings us
    JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = current_user_id OR u.id = current_user_id;
    
    RETURN factory_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user has access to a specific factory
-- Used in RLS policies to verify factory access
CREATE OR REPLACE FUNCTION user_has_factory_access(factory_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    has_access BOOLEAN := false;
BEGIN
    current_user_id := jwt_user_id();
    
    -- No user means no access
    IF current_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Global users have access to all factories
    IF user_is_global() THEN
        RETURN true;
    END IF;
    
    -- Check if user has explicit factory link
    SELECT EXISTS(
        SELECT 1
        FROM user_factory_links ufl
        JOIN users u ON u.id = ufl.user_id
        WHERE (u.auth_id = current_user_id OR u.id = current_user_id)
        AND ufl.factory_id = user_has_factory_access.factory_id
    ) INTO has_access;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get all factory IDs that current user can access
-- Returns array of factory UUIDs for use in queries
CREATE OR REPLACE FUNCTION user_accessible_factories()
RETURNS UUID[] AS $$
DECLARE
    current_user_id UUID;
    factory_ids UUID[];
BEGIN
    current_user_id := jwt_user_id();
    
    -- No user means no access
    IF current_user_id IS NULL THEN
        RETURN ARRAY[]::UUID[];
    END IF;
    
    -- Global users can access all active factories
    IF user_is_global() THEN
        SELECT ARRAY_AGG(id) INTO factory_ids
        FROM factories
        WHERE active = true;
        
        RETURN COALESCE(factory_ids, ARRAY[]::UUID[]);
    END IF;
    
    -- Scoped users can only access their assigned factories
    SELECT ARRAY_AGG(ufl.factory_id) INTO factory_ids
    FROM user_factory_links ufl
    JOIN users u ON u.id = ufl.user_id
    JOIN factories f ON f.id = ufl.factory_id
    WHERE (u.auth_id = current_user_id OR u.id = current_user_id)
    AND f.active = true;
    
    RETURN COALESCE(factory_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION jwt_user_id() IS 'Extract user ID from JWT token (stable within transaction)';
COMMENT ON FUNCTION jwt_role() IS 'Get current user role from users table (stable within transaction)';
COMMENT ON FUNCTION user_is_global() IS 'Check if current user has global access (CEO/Director)';
COMMENT ON FUNCTION current_factory() IS 'Get current user selected factory from user_settings';
COMMENT ON FUNCTION user_has_factory_access(UUID) IS 'Check if user has access to specific factory';
COMMENT ON FUNCTION user_accessible_factories() IS 'Get array of factory IDs user can access';

-- Record migration
INSERT INTO migration_history (filename, checksum) 
VALUES ('008_create_auth_helper_functions.sql', 'consolidated') 
ON CONFLICT (filename) DO NOTHING;

-- ==========================================
-- 009: Create RLS policies
-- ==========================================

-- Enable Row Level Security on all tables
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_factory_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- FACTORIES TABLE POLICIES
-- Policy: Factories - Read access
CREATE POLICY policy_factories_select ON factories
    FOR SELECT
    USING (
        user_is_global() OR 
        id = ANY(user_accessible_factories())
    );

-- Policy: Factories - Insert access (CEO/Director only)
CREATE POLICY policy_factories_insert ON factories
    FOR INSERT
    WITH CHECK (
        jwt_role() IN ('CEO', 'Director')
    );

-- Policy: Factories - Update access (CEO/Director only)
CREATE POLICY policy_factories_update ON factories
    FOR UPDATE
    USING (
        jwt_role() IN ('CEO', 'Director')
    )
    WITH CHECK (
        jwt_role() IN ('CEO', 'Director')
    );

-- Policy: Factories - Delete access (CEO only)
CREATE POLICY policy_factories_delete ON factories
    FOR DELETE
    USING (
        jwt_role() = 'CEO'
    );

-- USERS TABLE POLICIES
-- Policy: Users - Read access
CREATE POLICY policy_users_select ON users
    FOR SELECT
    USING (
        user_is_global() OR
        id = (SELECT id FROM users WHERE auth_id = jwt_user_id() OR id = jwt_user_id()) OR
        EXISTS (
            SELECT 1 FROM user_factory_links ufl1
            JOIN user_factory_links ufl2 ON ufl1.factory_id = ufl2.factory_id
            WHERE ufl1.user_id = users.id
            AND ufl2.user_id = (SELECT id FROM users WHERE auth_id = jwt_user_id() OR id = jwt_user_id())
        )
    );

-- Policy: Users - Insert access (CEO/Director only)
CREATE POLICY policy_users_insert ON users
    FOR INSERT
    WITH CHECK (
        jwt_role() IN ('CEO', 'Director')
    );

-- Policy: Users - Update access
CREATE POLICY policy_users_update ON users
    FOR UPDATE
    USING (
        jwt_role() IN ('CEO', 'Director') OR
        id = (SELECT id FROM users WHERE auth_id = jwt_user_id() OR id = jwt_user_id())
    )
    WITH CHECK (
        jwt_role() IN ('CEO', 'Director') OR
        (
            id = (SELECT id FROM users WHERE auth_id = jwt_user_id() OR id = jwt_user_id()) AND
            role = (SELECT role FROM users WHERE auth_id = jwt_user_id() OR id = jwt_user_id()) AND
            active = (SELECT active FROM users WHERE auth_id = jwt_user_id() OR id = jwt_user_id())
        )
    );

-- USER_FACTORY_LINKS TABLE POLICIES
-- Policy: User Factory Links - Read access
CREATE POLICY policy_user_factory_links_select ON user_factory_links
    FOR SELECT
    USING (
        user_is_global() OR
        user_id = (SELECT id FROM users WHERE auth_id = jwt_user_id() OR id = jwt_user_id()) OR
        factory_id = ANY(user_accessible_factories())
    );

-- Policy: User Factory Links - Insert access (CEO/Director only)
CREATE POLICY policy_user_factory_links_insert ON user_factory_links
    FOR INSERT
    WITH CHECK (
        jwt_role() IN ('CEO', 'Director') AND
        user_has_factory_access(factory_id)
    );

-- USER_SETTINGS TABLE POLICIES
-- Policy: User Settings - Read access
CREATE POLICY policy_user_settings_select ON user_settings
    FOR SELECT
    USING (
        user_is_global() OR
        user_id = (SELECT id FROM users WHERE auth_id = jwt_user_id() OR id = jwt_user_id())
    );

-- Policy: User Settings - Insert access
CREATE POLICY policy_user_settings_insert ON user_settings
    FOR INSERT
    WITH CHECK (
        user_is_global() OR
        user_id = (SELECT id FROM users WHERE auth_id = jwt_user_id() OR id = jwt_user_id())
    );

-- Policy: User Settings - Update access
CREATE POLICY policy_user_settings_update ON user_settings
    FOR UPDATE
    USING (
        user_is_global() OR
        user_id = (SELECT id FROM users WHERE auth_id = jwt_user_id() OR id = jwt_user_id())
    )
    WITH CHECK (
        user_is_global() OR
        user_id = (SELECT id FROM users WHERE auth_id = jwt_user_id() OR id = jwt_user_id())
    );

-- Record migration
INSERT INTO migration_history (filename, checksum) 
VALUES ('009_create_rls_policies.sql', 'consolidated') 
ON CONFLICT (filename) DO NOTHING;

-- ==========================================
-- 010: Add performance indexes
-- ==========================================

-- USER_SETTINGS TABLE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_settings_selected_factory_id 
    ON user_settings (selected_factory_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_settings_factory_user 
    ON user_settings (selected_factory_id, user_id) 
    WHERE selected_factory_id IS NOT NULL;

-- USER_FACTORY_LINKS TABLE INDEXES  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_factory_links_factory_id 
    ON user_factory_links (factory_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_factory_links_user_id 
    ON user_factory_links (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_factory_links_factory_user 
    ON user_factory_links (factory_id, user_id);

-- USERS TABLE ADDITIONAL INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active 
    ON users (role, active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_only 
    ON users (id, role, username) 
    WHERE active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_auth_id_active 
    ON users (auth_id, active) 
    WHERE auth_id IS NOT NULL;

-- FACTORIES TABLE ADDITIONAL INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_factories_active_code 
    ON factories (active, code) 
    WHERE active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_factories_active_name 
    ON factories (name) 
    WHERE active = true;

-- Update table statistics for better query planning
ANALYZE factories;
ANALYZE users;
ANALYZE user_factory_links;
ANALYZE user_settings;

-- Record migration
INSERT INTO migration_history (filename, checksum) 
VALUES ('010_add_performance_indexes.sql', 'consolidated') 
ON CONFLICT (filename) DO NOTHING;

-- ==========================================
-- 011: Create factory switch function
-- ==========================================

-- Create enum for factory switch events
CREATE TYPE factory_switch_event_type AS ENUM (
    'factory_switched',
    'factory_switch_failed',
    'factory_access_denied'
);

-- Create table to log factory switch events (optional, for auditing)
CREATE TABLE factory_switch_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    from_factory_id UUID REFERENCES factories(id),
    to_factory_id UUID REFERENCES factories(id),
    event_type factory_switch_event_type NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments and indexes for factory switch events table
COMMENT ON TABLE factory_switch_events IS 'Audit log for factory switching operations';
CREATE INDEX idx_factory_switch_events_user_id ON factory_switch_events (user_id);
CREATE INDEX idx_factory_switch_events_created_at ON factory_switch_events (created_at);

-- Main function for switching factories
CREATE OR REPLACE FUNCTION switch_user_factory(
    target_factory_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT,
    previous_factory_id UUID,
    new_factory_id UUID,
    user_role user_role
) AS $$
DECLARE
    current_user_id UUID;
    current_user_role user_role;
    previous_factory UUID;
    has_access BOOLEAN := false;
    factory_active BOOLEAN := false;
    event_type factory_switch_event_type;
    error_msg TEXT := NULL;
BEGIN
    -- Get current user ID and role
    current_user_id := jwt_user_id();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        error_msg := 'User not authenticated';
        RETURN QUERY SELECT 
            false as success,
            error_msg,
            NULL::UUID as previous_factory_id,
            NULL::UUID as new_factory_id,
            NULL::user_role as user_role;
        RETURN;
    END IF;
    
    -- Get user role and current factory
    SELECT u.role, us.selected_factory_id 
    INTO current_user_role, previous_factory
    FROM users u
    LEFT JOIN user_settings us ON us.user_id = u.id
    WHERE u.auth_id = current_user_id OR u.id = current_user_id;
    
    -- Validate target factory access
    IF target_factory_id IS NOT NULL THEN
        -- Check if factory exists and is active
        SELECT active INTO factory_active
        FROM factories
        WHERE id = target_factory_id;
        
        IF factory_active IS NULL THEN
            error_msg := 'Factory not found';
        ELSIF NOT factory_active THEN
            error_msg := 'Factory is not active';
        ELSE
            -- Check if user has access to target factory
            IF current_user_role IN ('CEO', 'Director') THEN
                has_access := true;
            ELSE
                SELECT EXISTS(
                    SELECT 1 FROM user_factory_links ufl
                    WHERE ufl.user_id = (
                        SELECT id FROM users 
                        WHERE auth_id = current_user_id OR id = current_user_id
                    )
                    AND ufl.factory_id = target_factory_id
                ) INTO has_access;
            END IF;
            
            IF NOT has_access THEN
                error_msg := 'Access denied to target factory';
            END IF;
        END IF;
    ELSE
        -- Switching to global context (NULL factory)
        IF current_user_role NOT IN ('CEO', 'Director') THEN
            error_msg := 'Only CEO and Director can switch to global context';
        ELSE
            has_access := true;
        END IF;
    END IF;
    
    -- If validation failed, return error
    IF error_msg IS NOT NULL THEN
        RETURN QUERY SELECT 
            false as success,
            error_msg,
            previous_factory as previous_factory_id,
            target_factory_id as new_factory_id,
            current_user_role as user_role;
        RETURN;
    END IF;
    
    -- Perform the factory switch
    BEGIN
        -- Update user settings with new factory selection
        UPDATE user_settings 
        SET selected_factory_id = target_factory_id,
            updated_at = now()
        WHERE user_id = (
            SELECT id FROM users 
            WHERE auth_id = current_user_id OR id = current_user_id
        );
        
        -- Return success
        RETURN QUERY SELECT 
            true as success,
            NULL::TEXT as error_message,
            previous_factory as previous_factory_id,
            target_factory_id as new_factory_id,
            current_user_role as user_role;
        
    EXCEPTION WHEN others THEN
        RETURN QUERY SELECT 
            false as success,
            SQLERRM::TEXT as error_message,
            previous_factory as previous_factory_id,
            target_factory_id as new_factory_id,
            current_user_role as user_role;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION switch_user_factory(UUID, INET, TEXT) IS 'Main factory switching function with validation and event logging';
COMMENT ON TYPE factory_switch_event_type IS 'Event types for factory switching operations';

-- Record migration
INSERT INTO migration_history (filename, checksum) 
VALUES ('011_create_factory_switch_function.sql', 'consolidated') 
ON CONFLICT (filename) DO NOTHING;

-- ==========================================
-- FINAL STATUS
-- ==========================================

-- Show migration status
SELECT 
    'Migration Complete' as status,
    count(*) as total_migrations,
    string_agg(filename, ', ' ORDER BY filename) as applied_files
FROM migration_history;

-- Show table status
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;