-- Migration: Create user_role enum
-- Purpose: Define user role enumeration for access control
-- Roles: CEO (global), Director (global), FM (factory-scoped), FW (factory-scoped), Office (configurable)
-- Date: 2025-09-08

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