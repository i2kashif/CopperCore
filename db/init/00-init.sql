-- Initial database setup script
-- This runs automatically when PostgreSQL container starts for the first time

-- Ensure database is created (already done by POSTGRES_DB env var)
-- CREATE DATABASE coppercore;

-- Create extensions that we'll need
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set default search path
ALTER DATABASE coppercore SET search_path TO public;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE coppercore TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Set timezone
SET timezone = 'UTC';

-- Create updated_at trigger function (will be used by migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'CopperCore database initialized successfully';
    RAISE NOTICE 'Extensions: uuid-ossp, citext, pg_trgm';
    RAISE NOTICE 'Ready for migrations';
END $$;