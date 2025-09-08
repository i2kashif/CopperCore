-- Migration: Create factories table
-- Purpose: Define factory entities for multi-site ERP system
-- Fields: id (UUID), code (unique identifier), name (display name), active (status)
-- Date: 2025-09-08

-- Create factories table to represent manufacturing sites
-- Each factory is a distinct operational unit with its own data scope
CREATE TABLE factories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE CHECK (length(code) >= 2 AND length(code) <= 10),
    name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE factories IS 'Factory entities representing manufacturing sites in the ERP system';
COMMENT ON COLUMN factories.id IS 'Primary key UUID for factory identification';
COMMENT ON COLUMN factories.code IS 'Unique factory code (2-10 chars) used in business documents';
COMMENT ON COLUMN factories.name IS 'Human-readable factory name for display';
COMMENT ON COLUMN factories.active IS 'Factory operational status - inactive factories are hidden from operations';
COMMENT ON COLUMN factories.created_at IS 'Factory creation timestamp';
COMMENT ON COLUMN factories.updated_at IS 'Last modification timestamp';

-- Create index on factory code for lookups
CREATE INDEX idx_factories_code ON factories (code);

-- Create index on active status for filtering
CREATE INDEX idx_factories_active ON factories (active);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_factories_updated_at
    BEFORE UPDATE ON factories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();