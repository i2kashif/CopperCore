-- CopperCore ERP Opening Stock Enhancement Migration
-- Implements Opening Stock functionality per PRD §5.12
-- Follows CLAUDE.md modularity caps (< 500 lines)

-- Enhance inventory_lots table for opening stock functionality
ALTER TABLE inventory_lots 
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS movement_type VARCHAR(50) DEFAULT 'OPENING_STOCK' 
  CHECK (movement_type IN ('OPENING_STOCK', 'PRODUCTION', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'CONSUMPTION'));

-- Create inventory_movements table for complete audit trail
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  inventory_lot_id UUID NOT NULL REFERENCES inventory_lots(id),
  movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN (
    'OPENING_STOCK', 'PRODUCTION', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'CONSUMPTION', 'RETURN'
  )),
  reference_type VARCHAR(50), -- 'WORK_ORDER', 'DISPATCH_NOTE', 'GRN', 'MANUAL_ADJUSTMENT'
  reference_id UUID, -- Reference to WO, DN, GRN, etc.
  quantity_before DECIMAL(12,3) NOT NULL CHECK (quantity_before >= 0),
  quantity_change DECIMAL(12,3) NOT NULL, -- Can be positive or negative
  quantity_after DECIMAL(12,3) NOT NULL CHECK (quantity_after >= 0),
  unit VARCHAR(20) NOT NULL,
  reason TEXT,
  notes TEXT,
  movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  
  -- Ensure quantity consistency
  CONSTRAINT check_quantity_math CHECK (quantity_before + quantity_change = quantity_after)
);

-- Enable RLS on inventory_movements
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Update the existing updated_at trigger for inventory_lots to include updated_by
CREATE OR REPLACE FUNCTION update_updated_at_with_user_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  
  -- Set updated_by from current user context
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    NEW.updated_by = auth.uid();
  ELSE
    NEW.updated_by = COALESCE(current_setting('app.user_id', true)::UUID, NEW.updated_by);
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Replace the existing trigger with the new one
DROP TRIGGER IF EXISTS update_inventory_lots_updated_at ON inventory_lots;
CREATE TRIGGER update_inventory_lots_updated_at_with_user
  BEFORE UPDATE ON inventory_lots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_with_user_column();

-- Function to create inventory movement record (called by triggers and API)
CREATE OR REPLACE FUNCTION cc_create_inventory_movement(
  p_factory_id UUID,
  p_inventory_lot_id UUID,
  p_movement_type VARCHAR(50),
  p_reference_type VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_quantity_before DECIMAL(12,3),
  p_quantity_change DECIMAL(12,3),
  p_quantity_after DECIMAL(12,3),
  p_unit VARCHAR(20),
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE PLPGSQL SECURITY DEFINER AS $$
DECLARE
  v_movement_id UUID;
  v_created_by UUID;
BEGIN
  -- Determine created_by user
  IF p_created_by IS NOT NULL THEN
    v_created_by := p_created_by;
  ELSIF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    v_created_by := auth.uid();
  ELSE
    v_created_by := COALESCE(current_setting('app.user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID);
  END IF;
  
  -- Create movement record
  INSERT INTO inventory_movements (
    factory_id, inventory_lot_id, movement_type, reference_type, reference_id,
    quantity_before, quantity_change, quantity_after, unit, reason, notes, created_by
  ) VALUES (
    p_factory_id, p_inventory_lot_id, p_movement_type, p_reference_type, p_reference_id,
    p_quantity_before, p_quantity_change, p_quantity_after, p_unit, p_reason, p_notes, v_created_by
  ) RETURNING id INTO v_movement_id;
  
  RETURN v_movement_id;
END;
$$;

-- Trigger to automatically create movement record when inventory_lots quantity changes
CREATE OR REPLACE FUNCTION inventory_lots_movement_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_movement_type VARCHAR(50);
  v_reason TEXT;
BEGIN
  -- Skip if this is an INSERT (handled separately)
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Only create movement if quantity changed
  IF OLD.quantity != NEW.quantity THEN
    -- Determine movement type based on context
    v_movement_type := COALESCE(NEW.movement_type, 'ADJUSTMENT');
    
    -- Create default reason if not provided
    IF NEW.notes IS NOT NULL AND NEW.notes != OLD.notes THEN
      v_reason := NEW.notes;
    ELSE
      v_reason := 'Quantity adjustment from ' || OLD.quantity || ' to ' || NEW.quantity;
    END IF;
    
    -- Create movement record
    PERFORM cc_create_inventory_movement(
      NEW.factory_id,
      NEW.id,
      v_movement_type,
      NULL, -- reference_type
      NULL, -- reference_id
      OLD.quantity,
      NEW.quantity - OLD.quantity,
      NEW.quantity,
      NEW.unit,
      v_reason,
      NEW.notes,
      NEW.updated_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory movements
CREATE TRIGGER inventory_lots_create_movement
  AFTER UPDATE ON inventory_lots
  FOR EACH ROW
  EXECUTE FUNCTION inventory_lots_movement_trigger();

-- Update RLS policies for inventory_lots using enhanced helper functions
DROP POLICY IF EXISTS "cc_inventory_lots_select" ON inventory_lots;
DROP POLICY IF EXISTS "cc_inventory_lots_insert" ON inventory_lots;
DROP POLICY IF EXISTS "cc_inventory_lots_update" ON inventory_lots;
DROP POLICY IF EXISTS "cc_inventory_lots_delete" ON inventory_lots;

CREATE POLICY "cc_inventory_lots_select" ON inventory_lots
  FOR SELECT
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_inventory_lots_insert" ON inventory_lots
  FOR INSERT
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_inventory_lots_update" ON inventory_lots
  FOR UPDATE
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  )
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

-- Allow DELETE only for global users (CEO/Director) and only for opening stock
CREATE POLICY "cc_inventory_lots_delete" ON inventory_lots
  FOR DELETE
  USING (
    cc_is_global()
    AND movement_type = 'OPENING_STOCK'
  );

-- RLS policies for inventory_movements
CREATE POLICY "cc_inventory_movements_select" ON inventory_movements
  FOR SELECT
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_inventory_movements_insert" ON inventory_movements
  FOR INSERT
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

-- Movement records are immutable (no UPDATE/DELETE)
CREATE POLICY "cc_inventory_movements_update" ON inventory_movements
  FOR UPDATE
  USING (FALSE);

CREATE POLICY "cc_inventory_movements_delete" ON inventory_movements
  FOR DELETE
  USING (FALSE);

-- Function to create opening stock entry with automatic movement logging
CREATE OR REPLACE FUNCTION cc_create_opening_stock(
  p_factory_id UUID,
  p_sku_id UUID,
  p_lot_number VARCHAR(100),
  p_quantity DECIMAL(12,3),
  p_unit VARCHAR(20),
  p_location VARCHAR(255) DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE PLPGSQL SECURITY DEFINER AS $$
DECLARE
  v_lot_id UUID;
  v_created_by UUID;
BEGIN
  -- Get current user
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    v_created_by := auth.uid();
  ELSE
    v_created_by := COALESCE(current_setting('app.user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID);
  END IF;
  
  -- Validate inputs
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Opening stock quantity must be positive';
  END IF;
  
  -- Check if lot_number already exists for this factory
  IF EXISTS (
    SELECT 1 FROM inventory_lots 
    WHERE factory_id = p_factory_id AND lot_number = p_lot_number
  ) THEN
    RAISE EXCEPTION 'Lot number % already exists in factory', p_lot_number;
  END IF;
  
  -- Create inventory lot
  INSERT INTO inventory_lots (
    factory_id, lot_number, sku_id, quantity, reserved_quantity, unit, location,
    expiry_date, notes, movement_type, created_by, updated_by
  ) VALUES (
    p_factory_id, p_lot_number, p_sku_id, p_quantity, 0, p_unit, p_location,
    p_expiry_date, p_notes, 'OPENING_STOCK', v_created_by, v_created_by
  ) RETURNING id INTO v_lot_id;
  
  -- Create initial movement record
  PERFORM cc_create_inventory_movement(
    p_factory_id,
    v_lot_id,
    'OPENING_STOCK',
    'MANUAL_ADJUSTMENT',
    NULL, -- no reference_id for opening stock
    0, -- quantity_before (starting from 0)
    p_quantity, -- quantity_change (adding opening stock)
    p_quantity, -- quantity_after
    p_unit,
    'Opening stock entry',
    p_notes,
    v_created_by
  );
  
  RETURN v_lot_id;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_lots_movement_type ON inventory_lots(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_lots_created_by ON inventory_lots(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_lots_expiry_date ON inventory_lots(expiry_date);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_factory_id ON inventory_movements(factory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_lot_id ON inventory_movements(inventory_lot_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id);

-- View for opening stock items (factory-scoped)
CREATE OR REPLACE VIEW opening_stock_view AS
SELECT 
  il.id,
  il.factory_id,
  f.name as factory_name,
  f.code as factory_code,
  il.sku_id,
  s.sku_code,
  s.name as sku_name,
  il.lot_number,
  il.quantity,
  il.reserved_quantity,
  il.unit,
  il.location,
  il.expiry_date,
  il.notes,
  il.created_at,
  il.updated_at,
  u1.email as created_by_email,
  u2.email as updated_by_email,
  il.version
FROM inventory_lots il
JOIN factories f ON il.factory_id = f.id
JOIN skus s ON il.sku_id = s.id
LEFT JOIN users u1 ON il.created_by = u1.id
LEFT JOIN users u2 ON il.updated_by = u2.id
WHERE il.movement_type = 'OPENING_STOCK'
ORDER BY il.created_at DESC;

-- Enable RLS on the view
ALTER VIEW opening_stock_view SET (security_barrier = true);

-- RLS policy for the view
CREATE POLICY "cc_opening_stock_view_select" ON opening_stock_view
  FOR SELECT
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

-- Commit migration
COMMENT ON TABLE inventory_movements IS 'M1.1 Opening Stock - Complete audit trail of all inventory changes';
COMMENT ON FUNCTION cc_create_opening_stock IS 'M1.1 Opening Stock - Create opening stock with automatic movement logging';
COMMENT ON VIEW opening_stock_view IS 'M1.1 Opening Stock - Factory-scoped view of opening stock entries';