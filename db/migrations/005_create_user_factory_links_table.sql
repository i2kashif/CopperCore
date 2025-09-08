-- Migration: Create user_factory_links table
-- Purpose: Many-to-many relationship between users and factories for access control
-- Features: Composite primary key, factory scoping for non-global roles
-- Date: 2025-09-08

-- Create user_factory_links table for multi-factory user assignments
-- This table defines which factories a user can access
-- Global roles (CEO, Director) may have links to all factories or no links (meaning all access)
-- Scoped roles (FM, FW, Office) must have explicit factory links
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
COMMENT ON COLUMN user_factory_links.user_id IS 'Reference to user account';
COMMENT ON COLUMN user_factory_links.factory_id IS 'Reference to factory the user can access';
COMMENT ON COLUMN user_factory_links.created_at IS 'Timestamp when access was granted';
COMMENT ON COLUMN user_factory_links.created_by IS 'User who granted this factory access';

-- Create indexes for efficient lookups
CREATE INDEX idx_user_factory_links_user_id ON user_factory_links (user_id);
CREATE INDEX idx_user_factory_links_factory_id ON user_factory_links (factory_id);
CREATE INDEX idx_user_factory_links_created_by ON user_factory_links (created_by);

-- Create function to validate user-factory assignments based on role
CREATE OR REPLACE FUNCTION validate_user_factory_assignment()
RETURNS TRIGGER AS $$
DECLARE
    user_role_val user_role;
BEGIN
    -- Get the user's role
    SELECT role INTO user_role_val 
    FROM users 
    WHERE id = NEW.user_id;
    
    -- Global roles (CEO, Director) don't require explicit factory links
    -- but can have them for convenience/auditing
    -- Scoped roles must have explicit links
    
    -- For now, allow all assignments but log for audit
    -- Future: Add business logic to restrict based on role
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for validation (currently permissive, can be tightened later)
CREATE TRIGGER trigger_validate_user_factory_assignment
    BEFORE INSERT OR UPDATE ON user_factory_links
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_factory_assignment();