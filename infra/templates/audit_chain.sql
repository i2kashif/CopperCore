-- Tamper-evident Audit Chain Templates for CopperCore ERP
-- Implements hash-linked audit chain for immutable event tracking
-- Follows PRD-v1.5.md audit requirements

-- Enhanced Audit Events Table with Hash Chain
-- This extends the basic audit_events from the base migration
CREATE TABLE IF NOT EXISTS audit_chain (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  sequence_number BIGSERIAL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'OVERRIDE')),
  user_id UUID REFERENCES users(id),
  user_role TEXT,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Hash chain fields
  current_hash VARCHAR(64) NOT NULL,
  previous_hash VARCHAR(64),
  hash_input TEXT NOT NULL,
  
  -- Integrity check
  is_verified BOOLEAN DEFAULT TRUE,
  
  UNIQUE(factory_id, sequence_number)
);

-- Enable RLS on audit chain
ALTER TABLE audit_chain ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit chain
CREATE POLICY "Audit Chain: CEO/Director see all" ON audit_chain
  FOR SELECT USING (is_global_user());

CREATE POLICY "Audit Chain: Factory users see own factory" ON audit_chain
  FOR SELECT USING (factory_id = get_user_factory_id());

CREATE POLICY "Audit Chain: Users can insert own events" ON audit_chain
  FOR INSERT WITH CHECK (
    factory_id = get_user_factory_id() AND 
    user_id = auth.uid()
  );

-- Function to calculate SHA-256 hash
CREATE OR REPLACE FUNCTION calculate_audit_hash(
  p_sequence_number BIGINT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_user_id UUID,
  p_old_values JSONB,
  p_new_values JSONB,
  p_created_at TIMESTAMP WITH TIME ZONE,
  p_previous_hash TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    digest(
      format('%s|%s|%s|%s|%s|%s|%s|%s|%s',
        p_sequence_number,
        p_entity_type,
        p_entity_id,
        p_action,
        p_user_id,
        COALESCE(p_old_values::text, ''),
        COALESCE(p_new_values::text, ''),
        p_created_at,
        COALESCE(p_previous_hash, '')
      ), 
      'sha256'
    ), 
    'hex'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to add audit event with hash chain
CREATE OR REPLACE FUNCTION add_audit_event(
  p_factory_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_sequence_number BIGINT;
  v_previous_hash TEXT;
  v_current_hash TEXT;
  v_user_id UUID;
  v_user_role TEXT;
  v_created_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current user info
  SELECT id, role INTO v_user_id, v_user_role
  FROM users WHERE id = auth.uid() AND is_active = true;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive user';
  END IF;
  
  -- Get next sequence number for this factory
  SELECT COALESCE(MAX(sequence_number), 0) + 1 
  INTO v_sequence_number
  FROM audit_chain 
  WHERE factory_id = p_factory_id;
  
  -- Get previous hash (last event in this factory)
  SELECT current_hash INTO v_previous_hash
  FROM audit_chain
  WHERE factory_id = p_factory_id
  AND sequence_number = v_sequence_number - 1;
  
  -- Set timestamp
  v_created_at := NOW();
  
  -- Calculate current hash
  v_current_hash := calculate_audit_hash(
    v_sequence_number,
    p_entity_type,
    p_entity_id,
    p_action,
    v_user_id,
    p_old_values,
    p_new_values,
    v_created_at,
    v_previous_hash
  );
  
  -- Insert audit event
  INSERT INTO audit_chain (
    factory_id,
    sequence_number,
    entity_type,
    entity_id,
    action,
    user_id,
    user_role,
    old_values,
    new_values,
    metadata,
    created_at,
    current_hash,
    previous_hash,
    hash_input
  ) VALUES (
    p_factory_id,
    v_sequence_number,
    p_entity_type,
    p_entity_id,
    p_action,
    v_user_id,
    v_user_role,
    p_old_values,
    p_new_values,
    p_metadata,
    v_created_at,
    v_current_hash,
    v_previous_hash,
    format('%s|%s|%s|%s|%s|%s|%s|%s|%s',
      v_sequence_number, p_entity_type, p_entity_id, p_action,
      v_user_id, COALESCE(p_old_values::text, ''), 
      COALESCE(p_new_values::text, ''), v_created_at,
      COALESCE(v_previous_hash, '')
    )
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify audit chain integrity
CREATE OR REPLACE FUNCTION verify_audit_chain(
  p_factory_id UUID,
  p_limit INTEGER DEFAULT 1000
) RETURNS TABLE(
  sequence_number BIGINT,
  is_valid BOOLEAN,
  expected_hash TEXT,
  actual_hash TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_record RECORD;
  v_expected_hash TEXT;
  v_previous_hash TEXT := NULL;
BEGIN
  FOR v_record IN 
    SELECT ac.sequence_number, ac.entity_type, ac.entity_id, ac.action,
           ac.user_id, ac.old_values, ac.new_values, ac.created_at,
           ac.current_hash, ac.previous_hash
    FROM audit_chain ac
    WHERE ac.factory_id = p_factory_id
    ORDER BY ac.sequence_number
    LIMIT p_limit
  LOOP
    -- Calculate expected hash
    v_expected_hash := calculate_audit_hash(
      v_record.sequence_number,
      v_record.entity_type,
      v_record.entity_id,
      v_record.action,
      v_record.user_id,
      v_record.old_values,
      v_record.new_values,
      v_record.created_at,
      v_previous_hash
    );
    
    -- Check if hash matches
    IF v_expected_hash = v_record.current_hash THEN
      -- Check if previous hash matches
      IF (v_previous_hash IS NULL AND v_record.previous_hash IS NULL) OR 
         (v_previous_hash = v_record.previous_hash) THEN
        sequence_number := v_record.sequence_number;
        is_valid := TRUE;
        expected_hash := v_expected_hash;
        actual_hash := v_record.current_hash;
        error_message := NULL;
      ELSE
        sequence_number := v_record.sequence_number;
        is_valid := FALSE;
        expected_hash := v_previous_hash;
        actual_hash := v_record.previous_hash;
        error_message := 'Previous hash mismatch';
      END IF;
    ELSE
      sequence_number := v_record.sequence_number;
      is_valid := FALSE;
      expected_hash := v_expected_hash;
      actual_hash := v_record.current_hash;
      error_message := 'Hash calculation mismatch';
    END IF;
    
    RETURN NEXT;
    v_previous_hash := v_record.current_hash;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to automatically create audit events
CREATE OR REPLACE FUNCTION trigger_audit_chain()
RETURNS TRIGGER AS $$
DECLARE
  v_old_values JSONB;
  v_new_values JSONB;
  v_action TEXT;
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_old_values := NULL;
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
  END IF;
  
  -- Add audit event (for tables with factory_id)
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.factory_id IS NOT NULL THEN
    PERFORM add_audit_event(
      NEW.factory_id,
      TG_TABLE_NAME,
      NEW.id,
      v_action,
      v_old_values,
      v_new_values,
      jsonb_build_object('trigger', true, 'table', TG_TABLE_NAME)
    );
  ELSIF TG_OP = 'DELETE' AND OLD.factory_id IS NOT NULL THEN
    PERFORM add_audit_event(
      OLD.factory_id,
      TG_TABLE_NAME,
      OLD.id,
      v_action,
      v_old_values,
      v_new_values,
      jsonb_build_object('trigger', true, 'table', TG_TABLE_NAME)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example: Apply audit chain trigger to work orders
-- CREATE TRIGGER work_orders_audit_trigger
--   AFTER INSERT OR UPDATE OR DELETE ON work_orders
--   FOR EACH ROW EXECUTE FUNCTION trigger_audit_chain();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_chain_factory_sequence 
ON audit_chain(factory_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_audit_chain_entity 
ON audit_chain(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_chain_created_at 
ON audit_chain(created_at);

COMMENT ON TABLE audit_chain IS 'Tamper-evident audit chain with SHA-256 hash linking';
COMMENT ON FUNCTION add_audit_event IS 'Add audit event with hash chain integrity';
COMMENT ON FUNCTION verify_audit_chain IS 'Verify audit chain integrity for a factory';
COMMENT ON FUNCTION trigger_audit_chain IS 'Trigger function for automatic audit event creation';