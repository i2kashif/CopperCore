-- CopperCore ERP Enhanced Product Families Migration  
-- Implements configurable attributes per PRD §3.1, §5.1
-- Follows CLAUDE.md modularity caps (< 500 lines)

-- Product family attributes configuration (PRD §3.1)
CREATE TABLE IF NOT EXISTS product_family_attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_family_id UUID NOT NULL REFERENCES product_families(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  label VARCHAR(255) NOT NULL,
  attr_type VARCHAR(20) NOT NULL CHECK (attr_type IN ('number', 'text', 'enum')),
  unit VARCHAR(50),
  level VARCHAR(20) NOT NULL CHECK (level IN ('sku', 'lot', 'unit')),
  decide_when VARCHAR(20) NOT NULL CHECK (decide_when IN ('wo', 'production')),
  show_in JSONB NOT NULL DEFAULT '[]', -- array of contexts: wo, inventory, packing, invoice
  validation JSONB NOT NULL DEFAULT '{}', -- {min, max, step} for number or {options: []} for enum
  allow_append_options BOOLEAN DEFAULT FALSE,
  is_required BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(product_family_id, key)
);

-- Enable RLS and add triggers
ALTER TABLE product_family_attributes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_product_family_attributes_updated_at
  BEFORE UPDATE ON product_family_attributes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enhanced product families table to support SKU naming rules
ALTER TABLE product_families 
ADD COLUMN IF NOT EXISTS sku_naming_rule TEXT DEFAULT '{family_code}-{sku_attributes}',
ADD COLUMN IF NOT EXISTS default_unit VARCHAR(50) DEFAULT 'meters',
ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 1;

-- Add RLS policies for product_family_attributes
CREATE POLICY "cc_product_family_attributes_select" ON product_family_attributes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM product_families pf
      WHERE pf.id = product_family_attributes.product_family_id
      AND (cc_is_global() OR pf.factory_id = ANY (cc_assigned_factories()))
    )
  );

CREATE POLICY "cc_product_family_attributes_insert" ON product_family_attributes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_families pf
      WHERE pf.id = product_family_attributes.product_family_id
      AND (cc_is_global() OR pf.factory_id = ANY (cc_assigned_factories()))
    )
  );

CREATE POLICY "cc_product_family_attributes_update" ON product_family_attributes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM product_families pf
      WHERE pf.id = product_family_attributes.product_family_id
      AND (cc_is_global() OR pf.factory_id = ANY (cc_assigned_factories()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_families pf
      WHERE pf.id = product_family_attributes.product_family_id
      AND (cc_is_global() OR pf.factory_id = ANY (cc_assigned_factories()))
    )
  );

-- Deny DELETE by default
CREATE POLICY "cc_product_family_attributes_delete" ON product_family_attributes
  FOR DELETE
  USING (FALSE);

-- Update RLS policies for product_families using new helper functions
DROP POLICY IF EXISTS "Factories: CEO/Director see all" ON product_families;
DROP POLICY IF EXISTS "Factories: Users see own factory" ON product_families;

CREATE POLICY "cc_product_families_select" ON product_families
  FOR SELECT
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_product_families_insert" ON product_families
  FOR INSERT
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

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

-- Deny DELETE by default
CREATE POLICY "cc_product_families_delete" ON product_families
  FOR DELETE
  USING (FALSE);

-- Enhanced SKUs table to support pending approval workflow (PRD §5.2)
ALTER TABLE skus 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING_APPROVAL', 'REJECTED', 'DISABLED')),
ADD COLUMN IF NOT EXISTS sku_attributes JSONB DEFAULT '{}', -- stores sku-level attribute values
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Update RLS policies for SKUs using new helper functions
CREATE POLICY "cc_skus_select" ON skus
  FOR SELECT
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_skus_insert" ON skus
  FOR INSERT
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_skus_update" ON skus
  FOR UPDATE
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  )
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

-- Deny DELETE by default
CREATE POLICY "cc_skus_delete" ON skus
  FOR DELETE
  USING (FALSE);

-- Function to generate SKU code based on family naming rules
CREATE OR REPLACE FUNCTION cc_generate_sku_code(
  p_product_family_id UUID,
  p_sku_attributes JSONB
) RETURNS VARCHAR(100)
LANGUAGE PLPGSQL AS $$
DECLARE
  v_family_record RECORD;
  v_attr_record RECORD;
  v_code TEXT;
  v_attr_value TEXT;
BEGIN
  -- Get family details
  SELECT * INTO v_family_record 
  FROM product_families 
  WHERE id = p_product_family_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product family not found: %', p_product_family_id;
  END IF;
  
  -- Start with family code
  v_code := v_family_record.code;
  
  -- Append SKU-level attributes in sorted order
  FOR v_attr_record IN 
    SELECT key, label, attr_type, unit, validation
    FROM product_family_attributes 
    WHERE product_family_id = p_product_family_id 
      AND level = 'sku'
    ORDER BY sort_order, key
  LOOP
    v_attr_value := p_sku_attributes ->> v_attr_record.key;
    
    IF v_attr_value IS NOT NULL THEN
      v_code := v_code || '-' || v_attr_value;
    END IF;
  END LOOP;
  
  RETURN v_code;
END;
$$;

-- Function to validate SKU attributes against family configuration
CREATE OR REPLACE FUNCTION cc_validate_sku_attributes(
  p_product_family_id UUID,
  p_sku_attributes JSONB
) RETURNS BOOLEAN
LANGUAGE PLPGSQL AS $$
DECLARE
  v_attr_record RECORD;
  v_attr_value TEXT;
  v_validation JSONB;
  v_min NUMERIC;
  v_max NUMERIC;
  v_options JSONB;
BEGIN
  -- Check all required SKU-level attributes
  FOR v_attr_record IN 
    SELECT key, label, attr_type, is_required, validation
    FROM product_family_attributes 
    WHERE product_family_id = p_product_family_id 
      AND level = 'sku'
  LOOP
    v_attr_value := p_sku_attributes ->> v_attr_record.key;
    
    -- Check if required attribute is missing
    IF v_attr_record.is_required AND v_attr_value IS NULL THEN
      RAISE EXCEPTION 'Required attribute missing: %', v_attr_record.label;
    END IF;
    
    -- Validate attribute value if present
    IF v_attr_value IS NOT NULL THEN
      v_validation := v_attr_record.validation;
      
      CASE v_attr_record.attr_type
        WHEN 'number' THEN
          -- Validate numeric range
          v_min := (v_validation ->> 'min')::NUMERIC;
          v_max := (v_validation ->> 'max')::NUMERIC;
          
          IF v_min IS NOT NULL AND v_attr_value::NUMERIC < v_min THEN
            RAISE EXCEPTION 'Attribute % value % below minimum %', v_attr_record.label, v_attr_value, v_min;
          END IF;
          
          IF v_max IS NOT NULL AND v_attr_value::NUMERIC > v_max THEN
            RAISE EXCEPTION 'Attribute % value % above maximum %', v_attr_record.label, v_attr_value, v_max;
          END IF;
          
        WHEN 'enum' THEN
          -- Validate enum options
          v_options := v_validation -> 'options';
          
          IF v_options IS NOT NULL AND NOT (v_options @> to_jsonb(v_attr_value)) THEN
            RAISE EXCEPTION 'Invalid option for %: %. Valid options: %', 
              v_attr_record.label, v_attr_value, v_options;
          END IF;
          
        -- 'text' type has no specific validation
      END CASE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_family_attributes_family_id ON product_family_attributes(product_family_id);
CREATE INDEX IF NOT EXISTS idx_product_family_attributes_level ON product_family_attributes(level);
CREATE INDEX IF NOT EXISTS idx_skus_status ON skus(status);
CREATE INDEX IF NOT EXISTS idx_skus_created_by ON skus(created_by);
CREATE INDEX IF NOT EXISTS idx_skus_sku_attributes ON skus USING gin(sku_attributes);

-- Commit migration
COMMENT ON TABLE product_family_attributes IS 'M1.1 Enhanced schema - configurable attributes per PRD §3.1';
COMMENT ON FUNCTION cc_generate_sku_code IS 'M1.1 Enhanced schema - SKU code generation from attributes';
COMMENT ON FUNCTION cc_validate_sku_attributes IS 'M1.1 Enhanced schema - attribute validation';