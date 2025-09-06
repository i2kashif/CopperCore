-- Factory-scoped RLS policies for core tables
-- CEO/Director have global access, others are factory-scoped
-- Follows PRD-v1.5.md security requirements

-- Product Families RLS
CREATE POLICY "Product Families: CEO/Director see all" ON product_families
  FOR ALL USING (is_global_user());

CREATE POLICY "Product Families: Factory users see own factory" ON product_families  
  FOR ALL USING (factory_id = get_user_factory_id())
  WITH CHECK (factory_id = get_user_factory_id());

-- SKUs RLS
CREATE POLICY "SKUs: CEO/Director see all" ON skus
  FOR ALL USING (is_global_user());

CREATE POLICY "SKUs: Factory users see own factory" ON skus
  FOR ALL USING (factory_id = get_user_factory_id())
  WITH CHECK (factory_id = get_user_factory_id());

-- Work Orders RLS  
CREATE POLICY "Work Orders: CEO/Director see all" ON work_orders
  FOR ALL USING (is_global_user());

CREATE POLICY "Work Orders: Factory users see own factory" ON work_orders
  FOR ALL USING (factory_id = get_user_factory_id())
  WITH CHECK (factory_id = get_user_factory_id());

-- Inventory Lots RLS
CREATE POLICY "Inventory Lots: CEO/Director see all" ON inventory_lots
  FOR ALL USING (is_global_user());

CREATE POLICY "Inventory Lots: Factory users see own factory" ON inventory_lots
  FOR ALL USING (factory_id = get_user_factory_id())
  WITH CHECK (factory_id = get_user_factory_id());

-- Packing Units RLS (special case - globally unique PU codes but factory scoped access)
CREATE POLICY "Packing Units: CEO/Director see all" ON packing_units
  FOR ALL USING (is_global_user());

CREATE POLICY "Packing Units: Factory users see own factory" ON packing_units
  FOR ALL USING (factory_id = get_user_factory_id())
  WITH CHECK (factory_id = get_user_factory_id());

-- Special policy for PU scanning (workers can read PUs being transferred to their factory)
CREATE POLICY "Packing Units: Read incoming transfers" ON packing_units
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM dispatch_notes dn
      WHERE dn.id IN (
        SELECT dn_inner.id FROM dispatch_notes dn_inner
        JOIN dispatch_note_items dni ON dn_inner.id = dni.dispatch_note_id  
        WHERE dni.packing_unit_id = packing_units.id
        AND dn_inner.destination_factory_id = get_user_factory_id()
      )
    )
  );

-- Dispatch Notes RLS
CREATE POLICY "Dispatch Notes: CEO/Director see all" ON dispatch_notes
  FOR ALL USING (is_global_user());

CREATE POLICY "Dispatch Notes: Factory users see own factory dispatches" ON dispatch_notes
  FOR ALL USING (factory_id = get_user_factory_id())
  WITH CHECK (factory_id = get_user_factory_id());

-- Special policy for dispatch notes - destination factory can read incoming dispatches
CREATE POLICY "Dispatch Notes: Read incoming dispatches" ON dispatch_notes
  FOR SELECT USING (destination_factory_id = get_user_factory_id());

-- GRNs RLS
CREATE POLICY "GRNs: CEO/Director see all" ON grns
  FOR ALL USING (is_global_user());

CREATE POLICY "GRNs: Factory users see own factory GRNs" ON grns
  FOR ALL USING (factory_id = get_user_factory_id())
  WITH CHECK (factory_id = get_user_factory_id());

-- Comments for documentation
COMMENT ON POLICY "Product Families: CEO/Director see all" ON product_families 
  IS 'RLS Policy: Global access for CEO/Director roles';

COMMENT ON POLICY "Work Orders: Factory users see own factory" ON work_orders
  IS 'RLS Policy: Factory scoping with WITH CHECK constraint';

COMMENT ON POLICY "Packing Units: Read incoming transfers" ON packing_units  
  IS 'RLS Policy: Special case for inter-factory PU visibility during transfers';