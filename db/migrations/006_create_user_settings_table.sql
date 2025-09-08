-- Migration: Create user_settings table
-- Purpose: Store user preferences and current factory selection
-- Features: One record per user, selected_factory_id for dynamic factory context
-- Date: 2025-09-08

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
COMMENT ON COLUMN user_settings.id IS 'Primary key UUID for settings record';
COMMENT ON COLUMN user_settings.user_id IS 'Reference to user account (one-to-one relationship)';
COMMENT ON COLUMN user_settings.selected_factory_id IS 'Currently selected factory for scoped operations (NULL for global users)';
COMMENT ON COLUMN user_settings.language IS 'User interface language preference';
COMMENT ON COLUMN user_settings.timezone IS 'User timezone for date/time display';
COMMENT ON COLUMN user_settings.date_format IS 'Preferred date format for display';

-- Create indexes for efficient lookups
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

-- Create function to validate factory selection based on user access
CREATE OR REPLACE FUNCTION validate_factory_selection()
RETURNS TRIGGER AS $$
DECLARE
    user_role_val user_role;
    has_access BOOLEAN := false;
BEGIN
    -- Allow NULL factory selection (global context)
    IF NEW.selected_factory_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get user role
    SELECT role INTO user_role_val
    FROM users
    WHERE id = NEW.user_id;
    
    -- Global roles can select any active factory
    IF user_role_val IN ('CEO', 'Director') THEN
        -- Verify factory is active
        SELECT EXISTS(
            SELECT 1 FROM factories 
            WHERE id = NEW.selected_factory_id AND active = true
        ) INTO has_access;
    ELSE
        -- Scoped roles must have explicit factory link
        SELECT EXISTS(
            SELECT 1 FROM user_factory_links ufl
            JOIN factories f ON f.id = ufl.factory_id
            WHERE ufl.user_id = NEW.user_id 
            AND ufl.factory_id = NEW.selected_factory_id
            AND f.active = true
        ) INTO has_access;
    END IF;
    
    -- Raise error if user doesn't have access to selected factory
    IF NOT has_access THEN
        RAISE EXCEPTION 'User does not have access to factory or factory is inactive';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate factory selection
CREATE TRIGGER trigger_validate_factory_selection
    BEFORE INSERT OR UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION validate_factory_selection();