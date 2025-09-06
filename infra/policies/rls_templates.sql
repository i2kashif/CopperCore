-- Enhanced RLS Policy Templates for CopperCore ERP
-- Provides reusable patterns for factory-scoped RLS with CEO/Director bypass
-- Follows PRD-v1.5.md security requirements

-- Template 1: Standard Factory-Scoped Table
-- Use for tables with factory_id column and standard CRUD operations
/*
-- Example usage for 'your_table':
CREATE POLICY "your_table: CEO/Director see all" ON your_table
  FOR ALL USING (is_global_user());

CREATE POLICY "your_table: Factory users see own factory" ON your_table
  FOR ALL USING (factory_id = get_user_factory_id())
  WITH CHECK (factory_id = get_user_factory_id());
*/

-- Template 2: Read-Only Access for Inter-Factory Visibility
-- Use when factory workers need to read records from other factories (e.g., incoming dispatches)
/*
-- Example for dispatch notes visible to destination factory:
CREATE POLICY "dispatch_notes: Read incoming dispatches" ON dispatch_notes
  FOR SELECT USING (destination_factory_id = get_user_factory_id());
*/

-- Template 3: Manager-Only Operations
-- Use for sensitive operations that only Factory Manager+ can perform
/*
-- Example for sensitive operations:
CREATE POLICY "sensitive_table: Manager+ operations" ON sensitive_table
  FOR ALL USING (
    is_global_user() OR 
    (factory_id = get_user_factory_id() AND is_manager_or_above())
  )
  WITH CHECK (
    is_global_user() OR 
    (factory_id = get_user_factory_id() AND is_manager_or_above())
  );
*/

-- Template 4: Audit Trail Protection
-- Use for audit tables that should be append-only for workers
/*
-- Example for audit events:
CREATE POLICY "audit_events: Workers can insert only" ON audit_events
  FOR INSERT WITH CHECK (
    factory_id = get_user_factory_id() AND user_id = auth.uid()
  );

CREATE POLICY "audit_events: Read own factory events" ON audit_events
  FOR SELECT USING (factory_id = get_user_factory_id());

CREATE POLICY "audit_events: Global users see all" ON audit_events
  FOR SELECT USING (is_global_user());
*/

-- Template 5: Time-based Access Control
-- Use for records that become read-only after a certain period
/*
-- Example for time-locked records:
CREATE POLICY "time_locked_table: Recent edits only" ON time_locked_table
  FOR UPDATE USING (
    (is_global_user() OR factory_id = get_user_factory_id()) AND
    created_at > NOW() - INTERVAL '24 hours'
  );
*/

-- Helper Functions for Enhanced RLS
-- These extend the basic is_global_user() and get_user_factory_id()

-- Check if user is Factory Manager or above
CREATE OR REPLACE FUNCTION is_manager_or_above()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('CEO', 'DIRECTOR', 'FACTORY_MANAGER') 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can perform QC override operations
CREATE OR REPLACE FUNCTION can_override_qc()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('CEO', 'DIRECTOR') 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's role for conditional logic
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM users 
    WHERE id = auth.uid() 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can access cross-factory data (for transfers)
CREATE OR REPLACE FUNCTION can_access_cross_factory()
RETURNS BOOLEAN AS $$
BEGIN
  -- CEO/Director always can, Factory Manager only during transfers
  RETURN is_global_user() OR (
    get_user_role() = 'FACTORY_MANAGER' AND
    -- Add business logic here for when cross-factory access is allowed
    TRUE  -- Placeholder - implement based on transfer status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_manager_or_above IS 'RLS helper: Check if user is Factory Manager or higher role';
COMMENT ON FUNCTION can_override_qc IS 'RLS helper: Check if user can override QC holds (CEO/Director only)';
COMMENT ON FUNCTION get_user_role IS 'RLS helper: Get current user role for conditional policies';
COMMENT ON FUNCTION can_access_cross_factory IS 'RLS helper: Check if user can access other factories data';