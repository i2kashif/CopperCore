-- CopperCore ERP Product Families Enhanced Migration
-- Updates product_families table to match PRD §5.1 requirements
-- Adds configurable attributes and advanced features

-- Drop existing table if it exists (for clean recreation)
DROP TABLE IF EXISTS product_families CASCADE;

-- Create enhanced product_families table matching PRD §5.1
CREATE TABLE product_families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  attributes JSONB NOT NULL DEFAULT '[]'::jsonb,
  sku_naming_rule TEXT,
  default_unit TEXT,
  default_routing JSONB DEFAULT '{}'::jsonb,
  default_packing_rules JSONB DEFAULT '{}'::jsonb,
  schema_version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  
  -- Unique constraint: code must be unique per factory
  CONSTRAINT uq_product_families_factory_code UNIQUE (factory_id, code),
  
  -- Name should also be unique per factory for clarity
  CONSTRAINT uq_product_families_factory_name UNIQUE (factory_id, name),
  
  -- Check constraints
  CONSTRAINT chk_product_families_code_format CHECK (code ~ '^[A-Z0-9_-]{2,20}$'),
  CONSTRAINT chk_product_families_schema_version CHECK (schema_version >= 1),
  CONSTRAINT chk_product_families_version CHECK (version >= 1)
);

-- Enable RLS on product_families
ALTER TABLE product_families ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
CREATE TRIGGER update_product_families_updated_at
  BEFORE UPDATE ON product_families 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Version increment trigger for optimistic locking
CREATE OR REPLACE FUNCTION increment_product_family_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_product_family_version_trigger
  BEFORE UPDATE ON product_families
  FOR EACH ROW
  EXECUTE FUNCTION increment_product_family_version();

-- Factory-scoped RLS policies using helper functions

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
CREATE INDEX idx_product_families_factory_id ON product_families(factory_id);
CREATE INDEX idx_product_families_name ON product_families(name);
CREATE INDEX idx_product_families_code ON product_families(code);
CREATE INDEX idx_product_families_is_active ON product_families(is_active);
CREATE INDEX idx_product_families_created_by ON product_families(created_by);
CREATE INDEX idx_product_families_updated_by ON product_families(updated_by);
CREATE INDEX idx_product_families_created_at ON product_families(created_at);
CREATE INDEX idx_product_families_updated_at ON product_families(updated_at);

-- JSONB indexes for attributes searching
CREATE INDEX idx_product_families_attributes ON product_families USING gin(attributes);
CREATE INDEX idx_product_families_default_routing ON product_families USING gin(default_routing);

-- Function to validate product family attributes
CREATE OR REPLACE FUNCTION validate_product_family_attributes(attributes_json JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  attr JSONB;
  attr_keys TEXT[] := ARRAY[]::TEXT[];
  attr_key TEXT;
BEGIN
  -- Check if attributes is an array
  IF jsonb_typeof(attributes_json) != 'array' THEN
    RAISE EXCEPTION 'Attributes must be an array';
  END IF;
  
  -- Validate each attribute
  FOR attr IN SELECT * FROM jsonb_array_elements(attributes_json)
  LOOP
    -- Check required fields
    IF NOT (attr ? 'key' AND attr ? 'label' AND attr ? 'type' AND attr ? 'level' AND attr ? 'decideWhen' AND attr ? 'showIn') THEN
      RAISE EXCEPTION 'Attribute missing required fields: key, label, type, level, decideWhen, showIn';
    END IF;
    
    -- Check key format
    attr_key := attr->>'key';
    IF NOT (attr_key ~ '^[a-z_][a-z0-9_]*$') THEN
      RAISE EXCEPTION 'Attribute key must be snake_case: %', attr_key;
    END IF;
    
    -- Check for duplicate keys
    IF attr_key = ANY(attr_keys) THEN
      RAISE EXCEPTION 'Duplicate attribute key: %', attr_key;
    END IF;
    attr_keys := attr_keys || attr_key;
    
    -- Check type values
    IF NOT (attr->>'type' = ANY(ARRAY['number', 'text', 'enum'])) THEN
      RAISE EXCEPTION 'Invalid attribute type: %', attr->>'type';
    END IF;
    
    -- Check level values  
    IF NOT (attr->>'level' = ANY(ARRAY['sku', 'lot', 'unit'])) THEN
      RAISE EXCEPTION 'Invalid attribute level: %', attr->>'level';
    END IF;
    
    -- Check decideWhen values
    IF NOT (attr->>'decideWhen' = ANY(ARRAY['wo', 'production'])) THEN
      RAISE EXCEPTION 'Invalid attribute decideWhen: %', attr->>'decideWhen';
    END IF;
    
    -- Validate enum type has options
    IF attr->>'type' = 'enum' AND NOT (attr->'validation' ? 'enumOptions') THEN
      RAISE EXCEPTION 'Enum attribute % must have enumOptions', attr_key;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add check constraint for attributes validation
ALTER TABLE product_families 
ADD CONSTRAINT chk_product_families_attributes_valid 
CHECK (validate_product_family_attributes(attributes));

-- Function to validate SKU naming rule
CREATE OR REPLACE FUNCTION validate_sku_naming_rule(naming_rule TEXT, attributes_json JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  sku_attributes TEXT[] := ARRAY[]::TEXT[];
  rule_variables TEXT[];
  variable TEXT;
  attr JSONB;
BEGIN
  -- If no naming rule, it's valid
  IF naming_rule IS NULL OR naming_rule = '' THEN
    RETURN TRUE;
  END IF;
  
  -- Extract sku-level attributes
  FOR attr IN SELECT * FROM jsonb_array_elements(attributes_json)
  LOOP
    IF attr->>'level' = 'sku' THEN
      sku_attributes := sku_attributes || (attr->>'key');
    END IF;
  END LOOP;
  
  -- Extract variables from naming rule
  rule_variables := regexp_split_to_array(
    regexp_replace(naming_rule, '\{(\w+)\}', '\1', 'g'),
    '[^a-zA-Z0-9_]+'
  );
  
  -- Check if all variables are sku-level attributes
  FOREACH variable IN ARRAY rule_variables
  LOOP
    IF variable != '' AND NOT (variable = ANY(sku_attributes)) THEN
      RAISE EXCEPTION 'SKU naming rule variable % is not a sku-level attribute', variable;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE product_families IS 'Product families with configurable attributes per PRD §5.1';
COMMENT ON COLUMN product_families.code IS 'Factory-unique product family code (e.g., EW for Enamel Wire)';
COMMENT ON COLUMN product_families.attributes IS 'JSONB array of attribute definitions for SKU generation and tracking';
COMMENT ON COLUMN product_families.sku_naming_rule IS 'Template for generating SKU codes using sku-level attributes';
COMMENT ON COLUMN product_families.default_routing IS 'Default production routing configuration';
COMMENT ON COLUMN product_families.default_packing_rules IS 'Default packing configuration';
COMMENT ON COLUMN product_families.schema_version IS 'Schema version for attribute evolution compatibility';
COMMENT ON COLUMN product_families.version IS 'Version for optimistic locking to prevent concurrent updates';
COMMENT ON CONSTRAINT uq_product_families_factory_code ON product_families IS 'Ensures product family codes are unique within each factory';
COMMENT ON CONSTRAINT uq_product_families_factory_name ON product_families IS 'Ensures product family names are unique within each factory';

-- Sample data for development (optional)
-- This will be populated by seeds or during development