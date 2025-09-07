-- CopperCore ERP Product Families Migration
-- Creates product_families table with factory-scoped RLS policies
-- Follows PRD-v1.5.md requirements and existing patterns

-- Create product_families table
CREATE TABLE IF NOT EXISTS product_families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  
  -- Unique constraint: name must be unique per factory
  CONSTRAINT uq_product_families_factory_name UNIQUE (factory_id, name)
);

-- Enable RLS on product_families
ALTER TABLE product_families ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
CREATE TRIGGER update_product_families_updated_at
  BEFORE UPDATE ON product_families 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Factory-scoped RLS policies using helper functions from migration 020

-- SELECT policy: Users can only see product families from their assigned factories
-- CEO/Director roles get global access
CREATE POLICY "cc_product_families_select" ON product_families
  FOR SELECT
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

-- INSERT policy: Users can only create product families in their assigned factories
-- CEO/Director roles can create in any factory
CREATE POLICY "cc_product_families_insert" ON product_families
  FOR INSERT
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

-- UPDATE policy: Users can only update product families in their assigned factories
-- CEO/Director roles can update any factory's product families
CREATE POLICY "cc_product_families_update" ON product_families
  FOR UPDATE
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  )
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

-- DELETE policy: Deny DELETE by default (follows PRD §8 - no silent data loss)
-- Use is_active flag for soft deletes instead
CREATE POLICY "cc_product_families_delete" ON product_families
  FOR DELETE
  USING (FALSE);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_product_families_factory_id ON product_families(factory_id);
CREATE INDEX IF NOT EXISTS idx_product_families_name ON product_families(name);
CREATE INDEX IF NOT EXISTS idx_product_families_category ON product_families(category);
CREATE INDEX IF NOT EXISTS idx_product_families_is_active ON product_families(is_active);
CREATE INDEX IF NOT EXISTS idx_product_families_created_by ON product_families(created_by);
CREATE INDEX IF NOT EXISTS idx_product_families_updated_by ON product_families(updated_by);

-- Add comments for documentation
COMMENT ON TABLE product_families IS 'Product families table with factory-scoped RLS policies';
COMMENT ON CONSTRAINT uq_product_families_factory_name ON product_families IS 'Ensures product family names are unique within each factory';
COMMENT ON COLUMN product_families.version IS 'Used for optimistic locking to prevent concurrent update conflicts';
COMMENT ON COLUMN product_families.is_active IS 'Soft delete flag - use instead of hard deletes per PRD §8';