-- Migration: Create comprehensive RLS policies
-- Purpose: Implement Row-Level Security for factory scoping and role-based access
-- Features: Factory isolation, role-based permissions, WITH CHECK clauses
-- Date: 2025-09-08

-- Enable Row Level Security on all tables
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_factory_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- FACTORIES TABLE POLICIES
-- ==========================================

-- Policy: Factories - Read access
-- Global users can read all factories, scoped users can read their assigned factories
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

-- ==========================================
-- USERS TABLE POLICIES
-- ==========================================

-- Policy: Users - Read access
-- Global users can read all users, scoped users can read users in their factories
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
-- Global users can update any user, users can update their own profile (limited fields)
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
            -- Users can only update their own non-critical fields
            role = (SELECT role FROM users WHERE auth_id = jwt_user_id() OR id = jwt_user_id()) AND
            active = (SELECT active FROM users WHERE auth_id = jwt_user_id() OR id = jwt_user_id())
        )
    );

-- Policy: Users - Delete access (CEO only)
CREATE POLICY policy_users_delete ON users
    FOR DELETE
    USING (
        jwt_role() = 'CEO'
    );

-- ==========================================
-- USER_FACTORY_LINKS TABLE POLICIES
-- ==========================================

-- Policy: User Factory Links - Read access
-- Global users can read all links, scoped users can read their own links
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

-- Policy: User Factory Links - Update access (CEO/Director only)
CREATE POLICY policy_user_factory_links_update ON user_factory_links
    FOR UPDATE
    USING (
        jwt_role() IN ('CEO', 'Director')
    )
    WITH CHECK (
        jwt_role() IN ('CEO', 'Director') AND
        user_has_factory_access(factory_id)
    );

-- Policy: User Factory Links - Delete access (CEO/Director only)
CREATE POLICY policy_user_factory_links_delete ON user_factory_links
    FOR DELETE
    USING (
        jwt_role() IN ('CEO', 'Director')
    );

-- ==========================================
-- USER_SETTINGS TABLE POLICIES
-- ==========================================

-- Policy: User Settings - Read access
-- Global users can read all settings, users can read their own settings
CREATE POLICY policy_user_settings_select ON user_settings
    FOR SELECT
    USING (
        user_is_global() OR
        user_id = (SELECT id FROM users WHERE auth_id = jwt_user_id() OR id = jwt_user_id())
    );

-- Policy: User Settings - Insert access
-- Users can create their own settings, global users can create for any user
CREATE POLICY policy_user_settings_insert ON user_settings
    FOR INSERT
    WITH CHECK (
        user_is_global() OR
        user_id = (SELECT id FROM users WHERE auth_id = jwt_user_id() OR id = jwt_user_id())
    );

-- Policy: User Settings - Update access
-- Users can update their own settings, global users can update any settings
-- Factory selection is validated by trigger
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

-- Policy: User Settings - Delete access (CEO only)
CREATE POLICY policy_user_settings_delete ON user_settings
    FOR DELETE
    USING (
        jwt_role() = 'CEO'
    );

-- ==========================================
-- EXAMPLE INVENTORY TABLE POLICIES (for future use)
-- ==========================================

-- These are example policies for future inventory tables
-- They demonstrate the factory scoping pattern

/*
-- Example: Inventory table policy
CREATE POLICY policy_inventory_select ON inventory
    FOR SELECT
    USING (
        user_is_global() OR
        factory_id = current_factory() OR
        factory_id = ANY(user_accessible_factories())
    );

CREATE POLICY policy_inventory_insert ON inventory
    FOR INSERT
    WITH CHECK (
        user_has_factory_access(factory_id) AND
        (user_is_global() OR factory_id = current_factory())
    );

CREATE POLICY policy_inventory_update ON inventory
    FOR UPDATE
    USING (
        user_is_global() OR
        factory_id = current_factory() OR
        factory_id = ANY(user_accessible_factories())
    )
    WITH CHECK (
        user_has_factory_access(factory_id) AND
        (user_is_global() OR factory_id = current_factory())
    );

CREATE POLICY policy_inventory_delete ON inventory
    FOR DELETE
    USING (
        jwt_role() IN ('CEO', 'Director', 'FM') AND
        (user_is_global() OR factory_id = current_factory())
    );
*/

-- Add comments for documentation
COMMENT ON POLICY policy_factories_select ON factories IS 'Read access: global users see all, scoped users see assigned factories';
COMMENT ON POLICY policy_factories_insert ON factories IS 'Insert access: CEO/Director only';
COMMENT ON POLICY policy_factories_update ON factories IS 'Update access: CEO/Director only';
COMMENT ON POLICY policy_factories_delete ON factories IS 'Delete access: CEO only';

COMMENT ON POLICY policy_users_select ON users IS 'Read access: global users see all, scoped users see factory colleagues';
COMMENT ON POLICY policy_users_insert ON users IS 'Insert access: CEO/Director only';
COMMENT ON POLICY policy_users_update ON users IS 'Update access: global users update any, users update own profile (limited)';
COMMENT ON POLICY policy_users_delete ON users IS 'Delete access: CEO only';

COMMENT ON POLICY policy_user_factory_links_select ON user_factory_links IS 'Read access: global users see all, scoped users see own links';
COMMENT ON POLICY policy_user_factory_links_insert ON user_factory_links IS 'Insert access: CEO/Director only';
COMMENT ON POLICY policy_user_factory_links_update ON user_factory_links IS 'Update access: CEO/Director only';
COMMENT ON POLICY policy_user_factory_links_delete ON user_factory_links IS 'Delete access: CEO/Director only';

COMMENT ON POLICY policy_user_settings_select ON user_settings IS 'Read access: global users see all, users see own settings';
COMMENT ON POLICY policy_user_settings_insert ON user_settings IS 'Insert access: users create own, global users create for any';
COMMENT ON POLICY policy_user_settings_update ON user_settings IS 'Update access: users update own, global users update any';
COMMENT ON POLICY policy_user_settings_delete ON user_settings IS 'Delete access: CEO only';