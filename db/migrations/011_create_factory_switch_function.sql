-- Migration: Create transactional factory switch function with event emission
-- Purpose: Provide atomic factory switching with validation and event emission
-- Features: Transaction safety, access validation, event emission for realtime updates
-- Date: 2025-09-08

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

-- Add comments for factory switch events table
COMMENT ON TABLE factory_switch_events IS 'Audit log for factory switching operations';
COMMENT ON COLUMN factory_switch_events.user_id IS 'User who attempted the factory switch';
COMMENT ON COLUMN factory_switch_events.from_factory_id IS 'Previous selected factory (NULL if none)';
COMMENT ON COLUMN factory_switch_events.to_factory_id IS 'Target factory for switch (NULL for global context)';
COMMENT ON COLUMN factory_switch_events.event_type IS 'Type of factory switch event';
COMMENT ON COLUMN factory_switch_events.success IS 'Whether the switch operation succeeded';
COMMENT ON COLUMN factory_switch_events.error_message IS 'Error message if switch failed';
COMMENT ON COLUMN factory_switch_events.ip_address IS 'Client IP address (if available)';
COMMENT ON COLUMN factory_switch_events.user_agent IS 'Client user agent (if available)';

-- Create indexes for factory switch events
CREATE INDEX idx_factory_switch_events_user_id ON factory_switch_events (user_id);
CREATE INDEX idx_factory_switch_events_created_at ON factory_switch_events (created_at);
CREATE INDEX idx_factory_switch_events_success ON factory_switch_events (success, event_type);

-- Main function for switching factories
-- Returns success status and error message if any
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
        event_type := 'factory_switch_failed';
        
        -- Cannot log event without user_id
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
    
    -- Check if user exists
    IF current_user_role IS NULL THEN
        error_msg := 'User not found';
        event_type := 'factory_switch_failed';
        
        RETURN QUERY SELECT 
            false as success,
            error_msg,
            NULL::UUID as previous_factory_id,
            NULL::UUID as new_factory_id,
            NULL::user_role as user_role;
        RETURN;
    END IF;
    
    -- Validate target factory access
    IF target_factory_id IS NOT NULL THEN
        -- Check if factory exists and is active
        SELECT active INTO factory_active
        FROM factories
        WHERE id = target_factory_id;
        
        IF factory_active IS NULL THEN
            error_msg := 'Factory not found';
            event_type := 'factory_switch_failed';
        ELSIF NOT factory_active THEN
            error_msg := 'Factory is not active';
            event_type := 'factory_switch_failed';
        ELSE
            -- Check if user has access to target factory
            IF current_user_role IN ('CEO', 'Director') THEN
                has_access := true; -- Global users can access any active factory
            ELSE
                -- Check explicit factory link for scoped users
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
                event_type := 'factory_access_denied';
            END IF;
        END IF;
    ELSE
        -- Switching to global context (NULL factory)
        -- Only global users can switch to NULL factory
        IF current_user_role NOT IN ('CEO', 'Director') THEN
            error_msg := 'Only CEO and Director can switch to global context';
            event_type := 'factory_access_denied';
        ELSE
            has_access := true;
        END IF;
    END IF;
    
    -- If validation failed, log event and return error
    IF error_msg IS NOT NULL THEN
        -- Log failed switch attempt
        INSERT INTO factory_switch_events (
            user_id, from_factory_id, to_factory_id, event_type, 
            success, error_message, ip_address, user_agent
        ) VALUES (
            (SELECT id FROM users WHERE auth_id = current_user_id OR id = current_user_id),
            previous_factory, target_factory_id, event_type,
            false, error_msg, p_ip_address, p_user_agent
        );
        
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
        
        -- Log successful switch
        INSERT INTO factory_switch_events (
            user_id, from_factory_id, to_factory_id, event_type, 
            success, ip_address, user_agent
        ) VALUES (
            (SELECT id FROM users WHERE auth_id = current_user_id OR id = current_user_id),
            previous_factory, target_factory_id, 'factory_switched',
            true, p_ip_address, p_user_agent
        );
        
        -- Emit realtime event (if using Supabase Realtime)
        -- This would trigger UI updates for factory switching
        PERFORM pg_notify(
            'factory_switch',
            json_build_object(
                'user_id', (SELECT id FROM users WHERE auth_id = current_user_id OR id = current_user_id),
                'from_factory_id', previous_factory,
                'to_factory_id', target_factory_id,
                'timestamp', now()
            )::text
        );
        
        -- Return success
        RETURN QUERY SELECT 
            true as success,
            NULL::TEXT as error_message,
            previous_factory as previous_factory_id,
            target_factory_id as new_factory_id,
            current_user_role as user_role;
        
    EXCEPTION WHEN others THEN
        -- Log failed switch due to database error
        INSERT INTO factory_switch_events (
            user_id, from_factory_id, to_factory_id, event_type, 
            success, error_message, ip_address, user_agent
        ) VALUES (
            (SELECT id FROM users WHERE auth_id = current_user_id OR id = current_user_id),
            previous_factory, target_factory_id, 'factory_switch_failed',
            false, SQLERRM, p_ip_address, p_user_agent
        );
        
        RETURN QUERY SELECT 
            false as success,
            SQLERRM::TEXT as error_message,
            previous_factory as previous_factory_id,
            target_factory_id as new_factory_id,
            current_user_role as user_role;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Convenience function for simple factory switching (returns boolean)
CREATE OR REPLACE FUNCTION set_current_factory(factory_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    result RECORD;
BEGIN
    SELECT * INTO result FROM switch_user_factory(factory_id);
    RETURN result.success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's available factories for switching
CREATE OR REPLACE FUNCTION get_user_switchable_factories()
RETURNS TABLE (
    factory_id UUID,
    factory_code TEXT,
    factory_name TEXT,
    is_current BOOLEAN,
    can_switch BOOLEAN
) AS $$
DECLARE
    current_user_id UUID;
    current_factory UUID;
    user_role_val user_role;
BEGIN
    current_user_id := jwt_user_id();
    current_factory := current_factory();
    user_role_val := jwt_role();
    
    -- Return empty if no user
    IF current_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Global users can switch to any active factory
    IF user_role_val IN ('CEO', 'Director') THEN
        RETURN QUERY
        SELECT 
            f.id as factory_id,
            f.code as factory_code,
            f.name as factory_name,
            (f.id = current_factory) as is_current,
            true as can_switch
        FROM factories f
        WHERE f.active = true
        ORDER BY f.name;
    ELSE
        -- Scoped users can only switch to their assigned factories
        RETURN QUERY
        SELECT 
            f.id as factory_id,
            f.code as factory_code,
            f.name as factory_name,
            (f.id = current_factory) as is_current,
            true as can_switch
        FROM factories f
        JOIN user_factory_links ufl ON ufl.factory_id = f.id
        WHERE f.active = true
        AND ufl.user_id = (
            SELECT id FROM users 
            WHERE auth_id = current_user_id OR id = current_user_id
        )
        ORDER BY f.name;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION switch_user_factory(UUID, INET, TEXT) IS 'Main factory switching function with validation and event logging';
COMMENT ON FUNCTION set_current_factory(UUID) IS 'Simple factory switching function returning boolean success';
COMMENT ON FUNCTION get_user_switchable_factories() IS 'Get list of factories user can switch to';

COMMENT ON TYPE factory_switch_event_type IS 'Event types for factory switching operations';
COMMENT ON TABLE factory_switch_events IS 'Audit log for factory switching with realtime event emission';