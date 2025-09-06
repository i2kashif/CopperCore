-- Optimistic Locking Templates for CopperCore ERP
-- Implements version-based concurrency control with updated_at timestamps
-- Returns 409 Conflict when version mismatch occurs

-- Template Function: Update with Optimistic Locking
-- Use this pattern for all update operations on versioned tables
CREATE OR REPLACE FUNCTION update_with_version_check(
  p_table_name TEXT,
  p_id UUID,
  p_expected_version INTEGER,
  p_update_data JSONB
) RETURNS JSONB AS $$
DECLARE
  v_current_version INTEGER;
  v_result JSONB;
  v_sql TEXT;
BEGIN
  -- Get current version
  EXECUTE format('SELECT version FROM %I WHERE id = $1', p_table_name) 
  INTO v_current_version 
  USING p_id;
  
  -- Check if record exists
  IF v_current_version IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'RECORD_NOT_FOUND',
      'message', 'Record not found',
      'http_status', 404
    );
  END IF;
  
  -- Check version mismatch
  IF v_current_version != p_expected_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VERSION_CONFLICT',
      'message', format('Expected version %s, found %s', p_expected_version, v_current_version),
      'current_version', v_current_version,
      'expected_version', p_expected_version,
      'http_status', 409
    );
  END IF;
  
  -- Build dynamic update SQL with version increment
  v_sql := format('
    UPDATE %I SET 
    %s,
    version = version + 1,
    updated_at = NOW()
    WHERE id = $1 AND version = $2
    RETURNING *', 
    p_table_name,
    (SELECT string_agg(
      format('%I = ($3->>%L)::%s', 
        key, 
        key,
        CASE 
          WHEN value::text ~ '^\d+$' THEN 'INTEGER'
          WHEN value::text ~ '^\d+\.\d+$' THEN 'DECIMAL'
          WHEN value::text IN ('true', 'false') THEN 'BOOLEAN'
          ELSE 'TEXT'
        END
      ), 
      ', '
    ) FROM jsonb_each(p_update_data))
  );
  
  -- Execute update
  EXECUTE v_sql INTO v_result USING p_id, p_expected_version, p_update_data;
  
  RETURN jsonb_build_object(
    'success', true,
    'data', row_to_json(v_result),
    'http_status', 200
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UPDATE_FAILED',
      'message', SQLERRM,
      'http_status', 500
    );
END;
$$ LANGUAGE plpgsql;

-- Example: Work Order Update with Optimistic Locking
CREATE OR REPLACE FUNCTION update_work_order_safe(
  p_id UUID,
  p_expected_version INTEGER,
  p_target_quantity DECIMAL DEFAULT NULL,
  p_current_quantity DECIMAL DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_current_version INTEGER;
  v_updated_record work_orders%ROWTYPE;
BEGIN
  -- Check current version
  SELECT version INTO v_current_version FROM work_orders WHERE id = p_id;
  
  IF v_current_version IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'RECORD_NOT_FOUND',
      'http_status', 404
    );
  END IF;
  
  IF v_current_version != p_expected_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VERSION_CONFLICT',
      'current_version', v_current_version,
      'expected_version', p_expected_version,
      'http_status', 409
    );
  END IF;
  
  -- Update with version increment
  UPDATE work_orders SET
    target_quantity = COALESCE(p_target_quantity, target_quantity),
    current_quantity = COALESCE(p_current_quantity, current_quantity),
    status = COALESCE(p_status, status),
    priority = COALESCE(p_priority, priority),
    version = version + 1,
    updated_at = NOW()
  WHERE id = p_id AND version = p_expected_version
  RETURNING * INTO v_updated_record;
  
  -- Insert audit event
  INSERT INTO audit_events (factory_id, entity_type, entity_id, action, user_id, new_values)
  VALUES (
    v_updated_record.factory_id,
    'work_order',
    v_updated_record.id,
    'UPDATE',
    auth.uid(),
    jsonb_build_object(
      'version', v_updated_record.version,
      'target_quantity', p_target_quantity,
      'current_quantity', p_current_quantity,
      'status', p_status,
      'priority', p_priority
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'data', row_to_json(v_updated_record),
    'http_status', 200
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UPDATE_FAILED',
      'message', SQLERRM,
      'http_status', 500
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Function: Prevent Direct Version Updates
-- Ensures version can only be incremented through proper channels
CREATE OR REPLACE FUNCTION prevent_version_manipulation()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow version increment by 1 only
  IF OLD.version IS NOT NULL AND NEW.version != OLD.version + 1 THEN
    RAISE EXCEPTION 'Version must be incremented by exactly 1. Expected: %, Got: %', 
      OLD.version + 1, NEW.version;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply version protection to core tables
-- Uncomment and run for each versioned table:
/*
CREATE TRIGGER protect_work_orders_version
  BEFORE UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_version_manipulation();

CREATE TRIGGER protect_packing_units_version  
  BEFORE UPDATE ON packing_units
  FOR EACH ROW
  EXECUTE FUNCTION prevent_version_manipulation();
*/

COMMENT ON FUNCTION update_with_version_check IS 'Generic optimistic locking update with 409 conflict handling';
COMMENT ON FUNCTION update_work_order_safe IS 'Example: Safe work order update with version check and audit';
COMMENT ON FUNCTION prevent_version_manipulation IS 'Trigger: Prevents version field manipulation';