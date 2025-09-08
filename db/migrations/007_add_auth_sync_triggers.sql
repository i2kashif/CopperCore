-- Migration: Add sync triggers between auth.users and public.users
-- Purpose: Keep auth.users and public.users in sync for Supabase Auth integration
-- Features: Automatic creation, updates, and cleanup of user records
-- Date: 2025-09-08

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

-- Create function to sync auth.users updates to public.users
CREATE OR REPLACE FUNCTION handle_auth_user_updated()
RETURNS TRIGGER AS $$
BEGIN
    -- Update corresponding record in public.users
    UPDATE public.users SET
        email = NEW.email,
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        updated_at = now()
    WHERE auth_id = NEW.id;
    
    -- If user was confirmed, ensure they're active
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        UPDATE public.users SET
            active = true,
            updated_at = now()
        WHERE auth_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle auth.users deletion
CREATE OR REPLACE FUNCTION handle_auth_user_deleted()
RETURNS TRIGGER AS $$
BEGIN
    -- Soft delete the user in public.users (preserve audit trail)
    UPDATE public.users SET
        active = false,
        updated_at = now()
    WHERE auth_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on auth.users (if auth schema exists)
-- Note: These will only work if using Supabase Auth
-- For custom auth implementations, these triggers should be adapted

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
        DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
        DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
        
        -- Create new triggers
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION handle_new_auth_user();
            
        CREATE TRIGGER on_auth_user_updated
            AFTER UPDATE ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION handle_auth_user_updated();
            
        CREATE TRIGGER on_auth_user_deleted
            AFTER DELETE ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION handle_auth_user_deleted();
            
        RAISE NOTICE 'Auth sync triggers created for auth.users';
    ELSE
        RAISE NOTICE 'auth.users table not found - sync triggers not created';
        RAISE NOTICE 'If using custom auth, adapt these functions for your auth table';
    END IF;
END
$$;

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

-- Add comments for documentation
COMMENT ON FUNCTION handle_new_auth_user() IS 'Sync new auth.users records to public.users';
COMMENT ON FUNCTION handle_auth_user_updated() IS 'Sync auth.users updates to public.users';
COMMENT ON FUNCTION handle_auth_user_deleted() IS 'Handle auth.users deletion (soft delete in public.users)';
COMMENT ON FUNCTION create_user_without_auth(TEXT, TEXT, user_role, TEXT) IS 'Create user record without Supabase Auth (for custom auth implementations)';