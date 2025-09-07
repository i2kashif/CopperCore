-- CopperCore ERP Base Schema Migration
-- Establishes RLS, audit trail, and core factory scoping
-- Follows PRD-v1.5.md requirements

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable RLS globally
ALTER DATABASE postgres SET row_security = on;

-- Create factories table (root of factory scoping)
CREATE TABLE factories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Enable RLS on factories (CEO/Director can see all)
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  factory_id UUID REFERENCES factories(id),
  role VARCHAR(50) NOT NULL CHECK (role IN ('CEO', 'DIRECTOR', 'FACTORY_MANAGER', 'FACTORY_WORKER')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create audit_events table for tamper-evident audit chain
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID REFERENCES factories(id),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES users(id),
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  hash_chain VARCHAR(64), -- SHA-256 hash linking to previous event
  CONSTRAINT valid_action CHECK (action IN ('CREATE', 'UPDATE', 'DELETE'))
);

-- Enable RLS on audit_events
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_factories_updated_at
  BEFORE UPDATE ON factories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user is CEO or DIRECTOR (global access)
CREATE OR REPLACE FUNCTION is_global_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') 
      THEN auth.uid()
      ELSE COALESCE(current_setting('app.user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID)
    END
    AND role IN ('CEO', 'DIRECTOR') 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's factory_id
CREATE OR REPLACE FUNCTION get_user_factory_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT factory_id FROM users 
    WHERE id = CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') 
      THEN auth.uid()
      ELSE COALESCE(current_setting('app.user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID)
    END 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Base RLS policies for factories
CREATE POLICY "Factories: CEO/Director see all" ON factories
  FOR ALL USING (is_global_user());

CREATE POLICY "Factories: Users see own factory" ON factories
  FOR SELECT USING (id = get_user_factory_id());

-- Base RLS policies for users  
CREATE POLICY "Users: CEO/Director see all" ON users
  FOR ALL USING (is_global_user());

CREATE POLICY "Users: Factory users see factory colleagues" ON users
  FOR SELECT USING (factory_id = get_user_factory_id());

-- Base RLS policies for audit_events
CREATE POLICY "Audit: CEO/Director see all" ON audit_events
  FOR SELECT USING (is_global_user());

CREATE POLICY "Audit: Factory users see own factory events" ON audit_events
  FOR SELECT USING (factory_id = get_user_factory_id());

-- Insert system factory for global operations
INSERT INTO factories (name, code) VALUES ('System', 'SYS');

-- Commit migration
COMMENT ON TABLE factories IS 'Base migration - factory scoping root with RLS';
COMMENT ON TABLE users IS 'Base migration - users with role-based factory access';  
COMMENT ON TABLE audit_events IS 'Base migration - tamper-evident audit chain';