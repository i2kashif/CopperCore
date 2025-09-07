-- 027_skus_enhanced.sql
-- Enhanced SKUs table to match PRD requirements for comprehensive product catalog
-- Adds missing fields and indexes for attribute handling, approval workflow, and audit support

-- Add missing columns to existing skus table
ALTER TABLE skus ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS attribute_values JSONB NOT NULL DEFAULT '{}';
ALTER TABLE skus ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50);
ALTER TABLE skus ADD COLUMN IF NOT EXISTS routing JSONB;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS packing_rules JSONB;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' 
  CHECK (status IN ('ACTIVE', 'PENDING_APPROVAL', 'REJECTED', 'DISABLED'));
ALTER TABLE skus ADD COLUMN IF NOT EXISTS sku_attributes JSONB;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE skus ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
ALTER TABLE skus ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE skus ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Update the unit column to use unit_of_measure
UPDATE skus SET unit_of_measure = unit WHERE unit_of_measure IS NULL;
ALTER TABLE skus DROP COLUMN IF EXISTS unit;

-- Update specifications to use attribute_values for consistency
UPDATE skus SET attribute_values = specifications WHERE attribute_values = '{}';
ALTER TABLE skus DROP COLUMN IF EXISTS specifications;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_skus_factory_status ON skus(factory_id, status);
CREATE INDEX IF NOT EXISTS idx_skus_product_family ON skus(product_family_id);
CREATE INDEX IF NOT EXISTS idx_skus_status ON skus(status) WHERE status != 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_skus_created_by ON skus(created_by);
CREATE INDEX IF NOT EXISTS idx_skus_updated_by ON skus(updated_by);
CREATE INDEX IF NOT EXISTS idx_skus_approved_by ON skus(approved_by);
CREATE INDEX IF NOT EXISTS idx_skus_sku_code ON skus(sku_code);
CREATE INDEX IF NOT EXISTS idx_skus_name_text ON skus USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_skus_attribute_values_gin ON skus USING gin(attribute_values);

-- Updated at trigger for skus
CREATE OR REPLACE FUNCTION update_skus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_skus_updated_at_trigger ON skus;
CREATE TRIGGER update_skus_updated_at_trigger
  BEFORE UPDATE ON skus
  FOR EACH ROW
  EXECUTE FUNCTION update_skus_updated_at();

-- Create function to validate attribute values against product family attributes
CREATE OR REPLACE FUNCTION cc_validate_sku_attributes(
  p_product_family_id UUID,
  p_attribute_values JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  pf_record RECORD;
  attr_def JSONB;
  attr_key TEXT;
  attr_value TEXT;
  expected_level TEXT;
BEGIN
  -- Get product family attributes
  SELECT attributes INTO pf_record FROM product_families WHERE id = p_product_family_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product family not found: %', p_product_family_id;
  END IF;

  -- Loop through each attribute definition
  FOR attr_def IN SELECT * FROM jsonb_array_elements(pf_record.attributes)
  LOOP
    attr_key := attr_def->>'key';
    expected_level := attr_def->>'level';
    
    -- Only check sku-level attributes for SKU creation
    IF expected_level = 'sku' THEN
      -- Check if required attribute is present
      IF NOT p_attribute_values ? attr_key THEN
        RAISE EXCEPTION 'Missing required sku-level attribute: %', attr_key;
      END IF;
      
      attr_value := p_attribute_values->>attr_key;
      
      -- Validate based on type
      CASE attr_def->>'type'
        WHEN 'number' THEN
          -- Validate numeric value and ranges
          IF NOT attr_value ~ '^\d+\.?\d*$' THEN
            RAISE EXCEPTION 'Attribute % must be a number, got: %', attr_key, attr_value;
          END IF;
          
          -- Check min/max if defined
          IF attr_def->'validation'->'min' IS NOT NULL 
             AND attr_value::NUMERIC < (attr_def->'validation'->>'min')::NUMERIC THEN
            RAISE EXCEPTION 'Attribute % value % below minimum %', 
              attr_key, attr_value, attr_def->'validation'->>'min';
          END IF;
          
          IF attr_def->'validation'->'max' IS NOT NULL 
             AND attr_value::NUMERIC > (attr_def->'validation'->>'max')::NUMERIC THEN
            RAISE EXCEPTION 'Attribute % value % above maximum %', 
              attr_key, attr_value, attr_def->'validation'->>'max';
          END IF;
              
        WHEN 'enum' THEN
          -- Validate enum value
          IF NOT (attr_def->'validation'->'enumOptions' @> to_jsonb(attr_value)) THEN
            RAISE EXCEPTION 'Attribute % value % not in allowed options %', 
              attr_key, attr_value, attr_def->'validation'->'enumOptions';
          END IF;
          
        WHEN 'text' THEN
          -- Text validation (could add length checks here)
          NULL;
      END CASE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate SKU code from naming rule
CREATE OR REPLACE FUNCTION cc_generate_sku_code(
  p_product_family_id UUID,
  p_attribute_values JSONB
)
RETURNS TEXT AS $$
DECLARE
  naming_rule TEXT;
  result_code TEXT;
  attr_key TEXT;
  attr_value TEXT;
BEGIN
  -- Get naming rule from product family
  SELECT sku_naming_rule INTO naming_rule 
  FROM product_families 
  WHERE id = p_product_family_id;
  
  IF naming_rule IS NULL OR naming_rule = '' THEN
    -- Generate simple code from family code + hash if no naming rule
    SELECT pf.code || '_' || substring(md5(p_attribute_values::text), 1, 8) INTO result_code
    FROM product_families pf WHERE id = p_product_family_id;
    RETURN result_code;
  END IF;
  
  result_code := naming_rule;
  
  -- Replace attribute placeholders in naming rule
  FOR attr_key, attr_value IN SELECT * FROM jsonb_each_text(p_attribute_values)
  LOOP
    result_code := replace(result_code, '{' || attr_key || '}', attr_value);
  END LOOP;
  
  -- Check if any placeholders remain unreplaced
  IF result_code ~ '\{[^}]+\}' THEN
    RAISE EXCEPTION 'SKU naming rule contains unresolved attributes: %', result_code;
  END IF;
  
  RETURN result_code;
END;
$$ LANGUAGE plpgsql;

-- Create function for safe SKU creation with validation
CREATE OR REPLACE FUNCTION cc_create_sku(
  p_factory_id UUID,
  p_product_family_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_attribute_values JSONB DEFAULT '{}',
  p_unit_of_measure TEXT DEFAULT 'meters',
  p_routing JSONB DEFAULT NULL,
  p_packing_rules JSONB DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  sku_id UUID;
  generated_code TEXT;
BEGIN
  -- Validate factory exists and user has access
  IF NOT EXISTS (SELECT 1 FROM factories WHERE id = p_factory_id) THEN
    RAISE EXCEPTION 'Factory not found: %', p_factory_id;
  END IF;

  -- Validate product family exists and belongs to factory
  IF NOT EXISTS (SELECT 1 FROM product_families WHERE id = p_product_family_id AND factory_id = p_factory_id) THEN
    RAISE EXCEPTION 'Product family not found or does not belong to factory: %', p_product_family_id;
  END IF;

  -- Validate attributes
  PERFORM cc_validate_sku_attributes(p_product_family_id, p_attribute_values);
  
  -- Generate SKU code
  generated_code := cc_generate_sku_code(p_product_family_id, p_attribute_values);
  
  -- Check for duplicate SKU code in factory
  IF EXISTS (SELECT 1 FROM skus WHERE factory_id = p_factory_id AND sku_code = generated_code) THEN
    RAISE EXCEPTION 'SKU code already exists in factory: %', generated_code;
  END IF;
  
  -- Create the SKU
  INSERT INTO skus (
    factory_id,
    product_family_id,
    sku_code,
    name,
    description,
    attribute_values,
    unit_of_measure,
    routing,
    packing_rules,
    status,
    is_active,
    created_by
  ) VALUES (
    p_factory_id,
    p_product_family_id,
    generated_code,
    p_name,
    p_description,
    p_attribute_values,
    p_unit_of_measure,
    p_routing,
    p_packing_rules,
    'ACTIVE',
    true,
    p_created_by
  )
  RETURNING id INTO sku_id;
  
  RETURN sku_id;
END;
$$ LANGUAGE plpgsql;

-- Create function for SKU approval workflow
CREATE OR REPLACE FUNCTION cc_approve_pending_sku(
  p_sku_id UUID,
  p_approved_by UUID,
  p_approve BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $$
DECLARE
  sku_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO sku_status FROM skus WHERE id = p_sku_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SKU not found: %', p_sku_id;
  END IF;
  
  IF sku_status != 'PENDING_APPROVAL' THEN
    RAISE EXCEPTION 'SKU is not pending approval: %', sku_status;
  END IF;
  
  -- Update status
  UPDATE skus SET 
    status = CASE WHEN p_approve THEN 'ACTIVE' ELSE 'REJECTED' END,
    approved_by = p_approved_by,
    approved_at = NOW(),
    updated_by = p_approved_by
  WHERE id = p_sku_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create view for SKU statistics
CREATE OR REPLACE VIEW sku_stats_by_factory AS
SELECT 
  s.factory_id,
  f.name as factory_name,
  f.code as factory_code,
  COUNT(*) as total_skus,
  COUNT(*) FILTER (WHERE s.status = 'ACTIVE' AND s.is_active) as active_skus,
  COUNT(*) FILTER (WHERE s.status = 'PENDING_APPROVAL') as pending_approval,
  COUNT(*) FILTER (WHERE s.status = 'REJECTED') as rejected_skus,
  COUNT(*) FILTER (WHERE s.status = 'DISABLED' OR NOT s.is_active) as disabled_skus,
  COUNT(DISTINCT s.product_family_id) as product_families_used
FROM skus s
JOIN factories f ON s.factory_id = f.id
GROUP BY s.factory_id, f.name, f.code;

-- Create RLS policies for skus table to enforce factory scoping
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;

-- Policy for global users (CEO, Director)
CREATE POLICY skus_global_access ON skus
  FOR ALL USING (cc_is_global());

-- Policy for factory-scoped users  
CREATE POLICY skus_factory_access ON skus
  FOR ALL USING (factory_id = ANY(cc_assigned_factories()));

-- Allow SELECT for users to see SKUs in their assigned factories
CREATE POLICY skus_select_factory ON skus
  FOR SELECT USING (factory_id = ANY(cc_assigned_factories()));

-- Allow INSERT/UPDATE for users in their assigned factories
CREATE POLICY skus_modify_factory ON skus
  FOR INSERT WITH CHECK (factory_id = ANY(cc_assigned_factories()));

CREATE POLICY skus_update_factory ON skus
  FOR UPDATE USING (factory_id = ANY(cc_assigned_factories()));

-- Restrict DELETE - only global users can delete (soft delete via is_active preferred)
CREATE POLICY skus_delete_global ON skus
  FOR DELETE USING (cc_is_global());

COMMENT ON TABLE skus IS 'Product variants/SKUs with factory scoping and approval workflow per PRD §3.2, §5.2';
COMMENT ON COLUMN skus.attribute_values IS 'JSONB containing sku-level attribute values as defined in product family';
COMMENT ON COLUMN skus.status IS 'Approval status: ACTIVE (normal), PENDING_APPROVAL (on-the-fly creation), REJECTED, DISABLED';
COMMENT ON COLUMN skus.routing IS 'Manufacturing routing steps (optional, can inherit from product family)';
COMMENT ON COLUMN skus.packing_rules IS 'Packaging requirements (optional, can inherit from product family)';