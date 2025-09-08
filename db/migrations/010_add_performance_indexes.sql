-- Migration: Add performance indexes on foreign keys
-- Purpose: Optimize query performance for foreign key lookups and joins
-- Features: Indexes on user_settings and user_factory_links foreign keys
-- Date: 2025-09-08

-- ==========================================
-- USER_SETTINGS TABLE INDEXES
-- ==========================================

-- Index on selected_factory_id for efficient factory filtering
-- This index is crucial for current_factory() function performance
-- and for queries filtering by selected factory
CREATE INDEX IF NOT EXISTS idx_user_settings_selected_factory_id 
    ON user_settings (selected_factory_id);

-- Composite index on (selected_factory_id, user_id) for complex queries
-- Useful for queries that need both factory and user context
CREATE INDEX IF NOT EXISTS idx_user_settings_factory_user 
    ON user_settings (selected_factory_id, user_id) 
    WHERE selected_factory_id IS NOT NULL;

-- ==========================================
-- USER_FACTORY_LINKS TABLE INDEXES  
-- ==========================================

-- Index on factory_id for efficient factory-based lookups
-- Critical for user_accessible_factories() function and factory filtering
CREATE INDEX IF NOT EXISTS idx_user_factory_links_factory_id 
    ON user_factory_links (factory_id);

-- Index on user_id for efficient user-based lookups
-- Important for checking user permissions and access
CREATE INDEX IF NOT EXISTS idx_user_factory_links_user_id 
    ON user_factory_links (user_id);

-- Composite index on (factory_id, user_id) for permission checks
-- Optimizes queries that check if specific user has access to specific factory
CREATE INDEX IF NOT EXISTS idx_user_factory_links_factory_user 
    ON user_factory_links (factory_id, user_id);

-- Index on created_by for audit queries
CREATE INDEX IF NOT EXISTS idx_user_factory_links_created_by 
    ON user_factory_links (created_by) 
    WHERE created_by IS NOT NULL;

-- ==========================================
-- USERS TABLE ADDITIONAL INDEXES
-- ==========================================

-- Composite index on (role, active) for role-based filtering
-- Optimizes queries that filter users by role and active status
CREATE INDEX IF NOT EXISTS idx_users_role_active 
    ON users (role, active);

-- Partial index on active users only
-- Most queries focus on active users, so this saves space and improves performance
CREATE INDEX IF NOT EXISTS idx_users_active_only 
    ON users (id, role, username) 
    WHERE active = true;

-- Index on auth_id for auth sync operations
-- Critical for JWT-based user lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id_active 
    ON users (auth_id, active) 
    WHERE auth_id IS NOT NULL;

-- ==========================================
-- FACTORIES TABLE ADDITIONAL INDEXES
-- ==========================================

-- Composite index on (active, code) for active factory lookups by code
-- Optimizes queries that search for active factories by code
CREATE INDEX IF NOT EXISTS idx_factories_active_code 
    ON factories (active, code) 
    WHERE active = true;

-- Partial index on active factories only with name for search
CREATE INDEX IF NOT EXISTS idx_factories_active_name 
    ON factories (name) 
    WHERE active = true;

-- ==========================================
-- FUNCTIONAL INDEXES FOR RLS OPTIMIZATION
-- ==========================================

-- Index to optimize jwt_user_id() lookups
-- This helps with RLS policy performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id_lookup 
    ON users (auth_id) 
    WHERE auth_id IS NOT NULL AND active = true;

-- Index to optimize user_accessible_factories() queries
-- Composite index for efficient factory access checks
CREATE INDEX IF NOT EXISTS idx_user_factory_access_optimization 
    ON user_factory_links (user_id, factory_id);

-- ==========================================
-- STATISTICS AND MAINTENANCE
-- ==========================================

-- Update table statistics for better query planning
ANALYZE factories;
ANALYZE users;
ANALYZE user_factory_links;
ANALYZE user_settings;

-- Create function to periodically update statistics
CREATE OR REPLACE FUNCTION update_auth_table_statistics()
RETURNS VOID AS $$
BEGIN
    -- Update statistics on auth-related tables
    ANALYZE factories;
    ANALYZE users;
    ANALYZE user_factory_links;
    ANALYZE user_settings;
    
    -- Log the update
    RAISE NOTICE 'Updated statistics for auth tables at %', now();
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON INDEX idx_user_settings_selected_factory_id IS 'Performance index for factory filtering in user_settings';
COMMENT ON INDEX idx_user_settings_factory_user IS 'Composite index for factory-user queries in user_settings';
COMMENT ON INDEX idx_user_factory_links_factory_id IS 'Performance index for factory-based lookups in user_factory_links';
COMMENT ON INDEX idx_user_factory_links_user_id IS 'Performance index for user-based lookups in user_factory_links';
COMMENT ON INDEX idx_user_factory_links_factory_user IS 'Composite index for permission checks in user_factory_links';
COMMENT ON INDEX idx_users_role_active IS 'Composite index for role-based filtering with active status';
COMMENT ON INDEX idx_users_active_only IS 'Partial index on active users for common queries';
COMMENT ON INDEX idx_factories_active_code IS 'Composite index for active factory lookups by code';

COMMENT ON FUNCTION update_auth_table_statistics() IS 'Maintenance function to update statistics on auth tables';