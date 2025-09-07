-- CopperCore Database Schema
-- Development initialization script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS user_factory_assignments CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS factories CASCADE;

-- Create factories table
CREATE TABLE factories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  address VARCHAR(500) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) NOT NULL DEFAULT 'Pakistan',
  phone VARCHAR(50),
  email VARCHAR(100),
  contact_person VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  fiscal_year_start TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  version INTEGER DEFAULT 1
);

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255), -- For production, store hashed passwords
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('CEO', 'DIRECTOR', 'FACTORY_MANAGER', 'FACTORY_WORKER', 'OFFICE')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  version INTEGER DEFAULT 1
);

-- Create user_factory_assignments table (many-to-many)
CREATE TABLE user_factory_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  version INTEGER DEFAULT 1,
  UNIQUE(user_id, factory_id)
);

-- Create indexes for better performance
CREATE INDEX idx_factories_code ON factories(code);
CREATE INDEX idx_factories_is_active ON factories(is_active);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_user_factory_assignments_user_id ON user_factory_assignments(user_id);
CREATE INDEX idx_user_factory_assignments_factory_id ON user_factory_assignments(factory_id);
CREATE INDEX idx_user_factory_assignments_is_active ON user_factory_assignments(is_active);

-- Insert sample data for development
-- Sample factories
INSERT INTO factories (id, code, name, address, city, country, is_active) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'LHR', 'Lahore Manufacturing', '123 Industrial Area', 'Lahore', 'Pakistan', true),
  ('f2000000-0000-0000-0000-000000000002', 'KHI', 'Karachi Plant', '456 Export Zone', 'Karachi', 'Pakistan', true),
  ('f3000000-0000-0000-0000-000000000003', 'FSD', 'Faisalabad Unit', '789 Textile Hub', 'Faisalabad', 'Pakistan', true);

-- Sample users
INSERT INTO users (id, username, email, first_name, last_name, role, is_active) VALUES
  ('u1000000-0000-0000-0000-000000000001', 'ceo', 'ceo@coppercore.pk', 'Ahmed', 'Khan', 'CEO', true),
  ('u2000000-0000-0000-0000-000000000002', 'director', 'director@coppercore.pk', 'Sara', 'Ali', 'DIRECTOR', true),
  ('u3000000-0000-0000-0000-000000000003', 'manager_lhr', 'manager.lhr@coppercore.pk', 'Ali', 'Hassan', 'FACTORY_MANAGER', true),
  ('u4000000-0000-0000-0000-000000000004', 'worker_lhr', 'worker.lhr@coppercore.pk', 'Usman', 'Malik', 'FACTORY_WORKER', true),
  ('u5000000-0000-0000-0000-000000000005', 'office', 'office@coppercore.pk', 'Fatima', 'Sheikh', 'OFFICE', true);

-- Sample user-factory assignments
-- CEO and Director have access to all factories (but we still create assignments for tracking)
INSERT INTO user_factory_assignments (user_id, factory_id, assigned_by, is_active) VALUES
  ('u1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000001', true),
  ('u1000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000002', 'u1000000-0000-0000-0000-000000000001', true),
  ('u1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000003', 'u1000000-0000-0000-0000-000000000001', true),
  ('u2000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000001', true),
  ('u2000000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000002', 'u1000000-0000-0000-0000-000000000001', true),
  ('u3000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000001', true),
  ('u4000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000001', true),
  ('u5000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000001', true),
  ('u5000000-0000-0000-0000-000000000005', 'f2000000-0000-0000-0000-000000000002', 'u1000000-0000-0000-0000-000000000001', true);