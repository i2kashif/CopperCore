-- Migration: Create SQL helper functions for JWT and user context
-- Purpose: Provide stable functions for RLS policies and business logic
-- Functions: current_factory(), user_is_global(), jwt_user_id(), jwt_role()
-- Date: 2025-09-08

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

-- Function for debugging: get current user context
-- Useful for troubleshooting RLS policies
CREATE OR REPLACE FUNCTION debug_user_context()
RETURNS TABLE (
    user_id UUID,
    role user_role,
    is_global BOOLEAN,
    current_factory_id UUID,
    accessible_factories UUID[]
) AS $$
BEGIN
    RETURN QUERY SELECT
        jwt_user_id() as user_id,
        jwt_role() as role,
        user_is_global() as is_global,
        current_factory() as current_factory_id,
        user_accessible_factories() as accessible_factories;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION jwt_user_id() IS 'Extract user ID from JWT token (stable within transaction)';
COMMENT ON FUNCTION jwt_role() IS 'Get current user role from users table (stable within transaction)';
COMMENT ON FUNCTION user_is_global() IS 'Check if current user has global access (CEO/Director)';
COMMENT ON FUNCTION current_factory() IS 'Get current user selected factory from user_settings';
COMMENT ON FUNCTION user_has_factory_access(UUID) IS 'Check if user has access to specific factory';
COMMENT ON FUNCTION user_accessible_factories() IS 'Get array of factory IDs user can access';
COMMENT ON FUNCTION debug_user_context() IS 'Debug function to inspect current user context';