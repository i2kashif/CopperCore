-- Development seed data for CopperCore ERP
-- Creates sample factories, users, and basic data for testing

-- Insert sample factories
INSERT INTO factories (id, name, code) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Main Factory Karachi', 'KHI-01'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Branch Factory Lahore', 'LHE-01'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Warehouse Islamabad', 'ISL-WH')
ON CONFLICT (code) DO NOTHING;

-- Insert sample users (in real deployment, these come from auth system)
INSERT INTO users (id, email, factory_id, role) VALUES
  ('550e8400-e29b-41d4-a716-446655440010', 'ceo@coppercore.com', NULL, 'CEO'),
  ('550e8400-e29b-41d4-a716-446655440011', 'director@coppercore.com', NULL, 'DIRECTOR'),
  ('550e8400-e29b-41d4-a716-446655440012', 'manager.khi@coppercore.com', '550e8400-e29b-41d4-a716-446655440001', 'FACTORY_MANAGER'),
  ('550e8400-e29b-41d4-a716-446655440013', 'worker.khi@coppercore.com', '550e8400-e29b-41d4-a716-446655440001', 'FACTORY_WORKER'),
  ('550e8400-e29b-41d4-a716-446655440014', 'manager.lhe@coppercore.com', '550e8400-e29b-41d4-a716-446655440002', 'FACTORY_MANAGER')
ON CONFLICT (email) DO NOTHING;

-- Insert sample product families
INSERT INTO product_families (id, factory_id, name, code, specifications) VALUES
  ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440001', 'Single Core PVC', 'SC-PVC', '{"conductor": "copper", "insulation": "PVC", "voltage": "1100V"}'),
  ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440001', 'Multi Core XLPE', 'MC-XLPE', '{"conductor": "copper", "insulation": "XLPE", "voltage": "11KV"}')
ON CONFLICT (factory_id, code) DO NOTHING;

-- Insert sample SKUs  
INSERT INTO skus (id, factory_id, product_family_id, sku_code, name, specifications) VALUES
  ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440020', 'SC-PVC-2.5', '2.5mm² Single Core PVC', '{"size": "2.5mm²", "color": "red"}'),
  ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440020', 'SC-PVC-4.0', '4.0mm² Single Core PVC', '{"size": "4.0mm²", "color": "black"}'),
  ('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440021', 'MC-XLPE-3x25', '3x25mm² Multi Core XLPE', '{"cores": 3, "size": "25mm²"}')
ON CONFLICT (factory_id, sku_code) DO NOTHING;

-- Insert sample work orders
INSERT INTO work_orders (id, factory_id, wo_number, product_family_id, sku_id, target_quantity, status, priority) VALUES
  ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440001', 'WO-2024-001', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440030', 1000.0, 'IN_PROGRESS', 'HIGH'),
  ('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440001', 'WO-2024-002', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440032', 500.0, 'PENDING', 'NORMAL')
ON CONFLICT (factory_id, wo_number) DO NOTHING;

-- Insert sample inventory lots
INSERT INTO inventory_lots (id, factory_id, lot_number, sku_id, work_order_id, quantity, unit, location) VALUES
  ('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440001', 'LOT-001-2024', '550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440040', 800.0, 'meters', 'A1-01'),
  ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440001', 'LOT-002-2024', '550e8400-e29b-41d4-a716-446655440031', NULL, 1200.0, 'meters', 'A1-02')
ON CONFLICT (factory_id, lot_number) DO NOTHING;

-- Insert sample packing units
INSERT INTO packing_units (id, factory_id, pu_code, inventory_lot_id, work_order_id, quantity, unit, status, qc_status, packed_by) VALUES
  ('550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440001', 'PU240001', '550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440040', 100.0, 'meters', 'CREATED', 'PASS', '550e8400-e29b-41d4-a716-446655440013'),
  ('550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440001', 'PU240002', '550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440040', 100.0, 'meters', 'CREATED', 'PENDING', '550e8400-e29b-41d4-a716-446655440013')
ON CONFLICT (pu_code) DO NOTHING;

-- Insert sample dispatch note
INSERT INTO dispatch_notes (id, factory_id, dn_number, destination_factory_id, status, dispatch_date, driver_name, vehicle_number) VALUES
  ('550e8400-e29b-41d4-a716-446655440070', '550e8400-e29b-41d4-a716-446655440001', 'DN-001-2024', '550e8400-e29b-41d4-a716-446655440002', 'DISPATCHED', CURRENT_DATE, 'Ahmed Ali', 'LXH-1234')
ON CONFLICT (factory_id, dn_number) DO NOTHING;

-- Insert sample GRN
INSERT INTO grns (id, factory_id, grn_number, dispatch_note_id, source_factory_id, receipt_date, status, received_by) VALUES
  ('550e8400-e29b-41d4-a716-446655440080', '550e8400-e29b-41d4-a716-446655440002', 'GRN-001-2024', '550e8400-e29b-41d4-a716-446655440070', '550e8400-e29b-41d4-a716-446655440001', CURRENT_DATE, 'PENDING', '550e8400-e29b-41d4-a716-446655440014')
ON CONFLICT (factory_id, grn_number) DO NOTHING;

-- Insert sample audit events
INSERT INTO audit_events (factory_id, entity_type, entity_id, action, user_id, new_values) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'work_order', '550e8400-e29b-41d4-a716-446655440040', 'CREATE', '550e8400-e29b-41d4-a716-446655440012', '{"wo_number": "WO-2024-001", "status": "IN_PROGRESS"}'),
  ('550e8400-e29b-41d4-a716-446655440001', 'packing_unit', '550e8400-e29b-41d4-a716-446655440060', 'CREATE', '550e8400-e29b-41d4-a716-446655440013', '{"pu_code": "PU240001", "status": "CREATED"}');

COMMENT ON FUNCTION is_global_user IS 'Seed data loaded for development environment';