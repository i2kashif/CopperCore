-- CopperCore ERP Enhanced Work Orders Migration
-- Completes WO schema per PRD §5.3 with material tracking
-- Follows CLAUDE.md modularity caps (< 500 lines)

-- Enhanced work orders with additional PRD requirements
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS assigned_manager UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255), -- For MTO orders
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES users(id);

-- Work Order Material Issues (PRD §5.3 - issue/return tracking)
CREATE TABLE IF NOT EXISTS wo_material_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  work_order_id UUID NOT NULL REFERENCES work_orders(id),
  inventory_lot_id UUID NOT NULL REFERENCES inventory_lots(id),
  issue_number VARCHAR(100) NOT NULL,
  issued_quantity DECIMAL(12,3) NOT NULL CHECK (issued_quantity > 0),
  returned_quantity DECIMAL(12,3) DEFAULT 0 CHECK (returned_quantity >= 0),
  unit VARCHAR(20) NOT NULL,
  issued_by UUID NOT NULL REFERENCES users(id),
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(factory_id, issue_number)
);

-- Work Order Material Returns (PRD §5.3 - return tracking)
CREATE TABLE IF NOT EXISTS wo_material_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  wo_material_issue_id UUID NOT NULL REFERENCES wo_material_issues(id),
  return_number VARCHAR(100) NOT NULL,
  returned_quantity DECIMAL(12,3) NOT NULL CHECK (returned_quantity > 0),
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('UNUSED', 'EXCESS', 'QUALITY')),
  returned_by UUID NOT NULL REFERENCES users(id),
  returned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(factory_id, return_number)
);

-- Work Order Production Logs (PRD §5.3 - production tracking)
CREATE TABLE IF NOT EXISTS wo_production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  work_order_id UUID NOT NULL REFERENCES work_orders(id),
  log_number VARCHAR(100) NOT NULL,
  produced_quantity DECIMAL(12,3) NOT NULL CHECK (produced_quantity > 0),
  scrap_quantity DECIMAL(12,3) DEFAULT 0 CHECK (scrap_quantity >= 0),
  rework_quantity DECIMAL(12,3) DEFAULT 0 CHECK (rework_quantity >= 0),
  machine_name VARCHAR(255) NOT NULL, -- Required per PRD
  shift VARCHAR(50),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  operator_id UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(factory_id, log_number)
);

-- Enable RLS on all new tables
ALTER TABLE wo_material_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE wo_material_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE wo_production_logs ENABLE ROW LEVEL SECURITY;

-- Add updated_at triggers
CREATE TRIGGER update_wo_material_issues_updated_at
  BEFORE UPDATE ON wo_material_issues 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wo_material_returns_updated_at
  BEFORE UPDATE ON wo_material_returns 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wo_production_logs_updated_at
  BEFORE UPDATE ON wo_production_logs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies for wo_material_issues
CREATE POLICY "cc_wo_material_issues_select" ON wo_material_issues
  FOR SELECT
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_wo_material_issues_insert" ON wo_material_issues
  FOR INSERT
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_wo_material_issues_update" ON wo_material_issues
  FOR UPDATE
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  )
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_wo_material_issues_delete" ON wo_material_issues
  FOR DELETE
  USING (FALSE); -- No deletes allowed

-- RLS policies for wo_material_returns
CREATE POLICY "cc_wo_material_returns_select" ON wo_material_returns
  FOR SELECT
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_wo_material_returns_insert" ON wo_material_returns
  FOR INSERT
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_wo_material_returns_update" ON wo_material_returns
  FOR UPDATE
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  )
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_wo_material_returns_delete" ON wo_material_returns
  FOR DELETE
  USING (FALSE); -- No deletes allowed

-- RLS policies for wo_production_logs
CREATE POLICY "cc_wo_production_logs_select" ON wo_production_logs
  FOR SELECT
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_wo_production_logs_insert" ON wo_production_logs
  FOR INSERT
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_wo_production_logs_update" ON wo_production_logs
  FOR UPDATE
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  )
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_wo_production_logs_delete" ON wo_production_logs
  FOR DELETE
  USING (FALSE); -- No deletes allowed

-- Enhanced work_orders RLS policies
CREATE POLICY "cc_work_orders_select" ON work_orders
  FOR SELECT
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_work_orders_insert" ON work_orders
  FOR INSERT
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_work_orders_update" ON work_orders
  FOR UPDATE
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  )
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_work_orders_delete" ON work_orders
  FOR DELETE
  USING (FALSE); -- No deletes allowed

-- Business logic functions for material tracking (PRD §5.3 acceptance test)
CREATE OR REPLACE FUNCTION cc_validate_material_return(
  p_wo_material_issue_id UUID,
  p_return_quantity DECIMAL(12,3)
) RETURNS BOOLEAN
LANGUAGE PLPGSQL AS $$
DECLARE
  v_issued_quantity DECIMAL(12,3);
  v_already_returned DECIMAL(12,3);
  v_available_to_return DECIMAL(12,3);
BEGIN
  -- Get issued quantity and already returned quantity
  SELECT 
    issued_quantity,
    COALESCE(SUM(r.returned_quantity), 0)
  INTO v_issued_quantity, v_already_returned
  FROM wo_material_issues i
  LEFT JOIN wo_material_returns r ON r.wo_material_issue_id = i.id
  WHERE i.id = p_wo_material_issue_id
  GROUP BY i.issued_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Material issue not found: %', p_wo_material_issue_id;
  END IF;

  v_available_to_return := v_issued_quantity - v_already_returned;

  -- Validate return quantity (PRD §12.1 acceptance test)
  IF p_return_quantity > v_available_to_return THEN
    RAISE EXCEPTION 'Cannot return % units. Only % units available (issued: %, already returned: %)', 
      p_return_quantity, v_available_to_return, v_issued_quantity, v_already_returned;
  END IF;

  RETURN TRUE;
END;
$$;

-- Trigger to validate material returns
CREATE OR REPLACE FUNCTION cc_validate_return_trigger() RETURNS TRIGGER
LANGUAGE PLPGSQL AS $$
BEGIN
  PERFORM cc_validate_material_return(NEW.wo_material_issue_id, NEW.returned_quantity);
  
  -- Update the running total in the issue record
  UPDATE wo_material_issues 
  SET returned_quantity = (
    SELECT COALESCE(SUM(returned_quantity), 0) 
    FROM wo_material_returns 
    WHERE wo_material_issue_id = NEW.wo_material_issue_id
  ) + NEW.returned_quantity
  WHERE id = NEW.wo_material_issue_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER cc_validate_wo_material_returns
  BEFORE INSERT ON wo_material_returns
  FOR EACH ROW
  EXECUTE FUNCTION cc_validate_return_trigger();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wo_material_issues_work_order_id ON wo_material_issues(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_material_issues_inventory_lot_id ON wo_material_issues(inventory_lot_id);
CREATE INDEX IF NOT EXISTS idx_wo_material_issues_factory_id ON wo_material_issues(factory_id);
CREATE INDEX IF NOT EXISTS idx_wo_material_returns_issue_id ON wo_material_returns(wo_material_issue_id);
CREATE INDEX IF NOT EXISTS idx_wo_material_returns_factory_id ON wo_material_returns(factory_id);
CREATE INDEX IF NOT EXISTS idx_wo_production_logs_work_order_id ON wo_production_logs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_production_logs_factory_id ON wo_production_logs(factory_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_manager ON work_orders(assigned_manager);
CREATE INDEX IF NOT EXISTS idx_work_orders_due_date ON work_orders(due_date);

-- Attach audit triggers to new tables
SELECT cc_attach_audit('public', 'wo_material_issues');
SELECT cc_attach_audit('public', 'wo_material_returns');  
SELECT cc_attach_audit('public', 'wo_production_logs');

-- Commit migration
COMMENT ON TABLE wo_material_issues IS 'M1.1 Enhanced schema - WO material issue tracking per PRD §5.3';
COMMENT ON TABLE wo_material_returns IS 'M1.1 Enhanced schema - WO material return tracking per PRD §5.3';
COMMENT ON TABLE wo_production_logs IS 'M1.1 Enhanced schema - WO production logging per PRD §5.3';
COMMENT ON FUNCTION cc_validate_material_return IS 'M1.1 Enhanced schema - validates PRD §12.1 acceptance test';