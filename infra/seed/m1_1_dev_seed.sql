-- CopperCore ERP M1.1 Development Seed Data
-- Creates test factories, users, product families for development
-- Follows PRD-v1.5.md roles and factory scoping

-- Insert test factories
INSERT INTO factories (id, name, code, address) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Main Factory', 'MAIN', 'Lahore, Pakistan'),
  ('22222222-2222-2222-2222-222222222222', 'Branch Factory', 'BRCH', 'Karachi, Pakistan'),
  ('33333333-3333-3333-3333-333333333333', 'Test Factory', 'TEST', 'Faisalabad, Pakistan')
ON CONFLICT (id) DO NOTHING;

-- Insert test users with different roles (PRD §2.1)
INSERT INTO users (id, email, role, is_active) VALUES 
  -- Global users
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ceo@coppercore.com', 'CEO', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'director@coppercore.com', 'DIRECTOR', true),
  
  -- Factory-scoped users  
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'fm.main@coppercore.com', 'FACTORY_MANAGER', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'fw.main@coppercore.com', 'FACTORY_WORKER', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'fm.branch@coppercore.com', 'FACTORY_MANAGER', true),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'fw.branch@coppercore.com', 'FACTORY_WORKER', true)
ON CONFLICT (email) DO NOTHING;

-- Assign users to factories
INSERT INTO user_factory_assignments (user_id, factory_id) VALUES 
  -- Main factory assignments
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111'),
  
  -- Branch factory assignments  
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222'),
  
  -- Test factory (CEO and Director have global access automatically)
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (user_id, factory_id) DO NOTHING;

-- Insert sample product families with configurable attributes (PRD §3.1)
INSERT INTO product_families (id, factory_id, name, code, description, sku_naming_rule, default_unit) VALUES 
  ('f1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Enamel Wire', 'EW', 'Copper enamel winding wire', 'EW-{metal}-{rod_diameter_mm}mm-{enamel_thickness_um}um', 'meters'),
  ('f2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'PVC Cable', 'PVC', 'PVC insulated copper cable', 'PVC-{metal}-{conductor_area_mm2}mm2-{cores}C', 'meters'),
  ('f3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Flexible Cable', 'FLEX', 'Flexible copper cable', 'FLEX-{conductor_area_mm2}mm2-{cores}C', 'meters')
ON CONFLICT (id) DO NOTHING;

-- Product family attributes for Enamel Wire (PRD §3.1 example)
INSERT INTO product_family_attributes (product_family_id, key, label, attr_type, unit, level, decide_when, show_in, validation, is_required, sort_order) VALUES 
  -- SKU-level attributes (decided at WO creation)
  ('f1111111-1111-1111-1111-111111111111', 'metal', 'Metal Type', 'enum', null, 'sku', 'wo', '["wo", "inventory", "packing", "invoice"]', '{"options": ["copper", "aluminum"]}', true, 1),
  ('f1111111-1111-1111-1111-111111111111', 'rod_diameter_mm', 'Rod Diameter', 'number', 'mm', 'sku', 'wo', '["wo", "inventory", "packing", "invoice"]', '{"min": 0.1, "max": 10.0, "step": 0.1}', true, 2),
  ('f1111111-1111-1111-1111-111111111111', 'enamel_thickness_um', 'Enamel Thickness', 'number', 'μm', 'sku', 'wo', '["wo", "inventory", "packing", "invoice"]', '{"min": 5, "max": 100, "step": 5}', true, 3),
  
  -- Lot-level attributes (decided at production)  
  ('f1111111-1111-1111-1111-111111111111', 'enamel_type', 'Enamel Type', 'enum', null, 'lot', 'production', '["inventory", "packing", "invoice"]', '{"options": ["PEI", "PAI", "PIB"]}', true, 4),
  ('f1111111-1111-1111-1111-111111111111', 'nominal_resistance_ohm_km', 'Nominal Resistance', 'number', 'Ω/km', 'lot', 'production', '["inventory", "invoice"]', '{"min": 0.1, "max": 1000}', false, 5)
ON CONFLICT (product_family_id, key) DO NOTHING;

-- Product family attributes for PVC Cable
INSERT INTO product_family_attributes (product_family_id, key, label, attr_type, unit, level, decide_when, show_in, validation, is_required, sort_order) VALUES 
  ('f2222222-2222-2222-2222-222222222222', 'metal', 'Metal Type', 'enum', null, 'sku', 'wo', '["wo", "inventory", "packing", "invoice"]', '{"options": ["copper", "aluminum"]}', true, 1),
  ('f2222222-2222-2222-2222-222222222222', 'conductor_area_mm2', 'Conductor Area', 'number', 'mm²', 'sku', 'wo', '["wo", "inventory", "packing", "invoice"]', '{"min": 0.5, "max": 400}', true, 2),
  ('f2222222-2222-2222-2222-222222222222', 'cores', 'Number of Cores', 'number', null, 'sku', 'wo', '["wo", "inventory", "packing", "invoice"]', '{"min": 1, "max": 61}', true, 3),
  ('f2222222-2222-2222-2222-222222222222', 'insulation_thickness_mm', 'Insulation Thickness', 'number', 'mm', 'sku', 'wo', '["wo", "inventory", "packing", "invoice"]', '{"min": 0.5, "max": 5.0, "step": 0.1}', true, 4),
  
  ('f2222222-2222-2222-2222-222222222222', 'pvc_type', 'PVC Type', 'enum', null, 'lot', 'production', '["inventory", "packing"]', '{"options": ["PVC-ST1", "PVC-ST2", "PVC-FR"]}', true, 5),
  ('f2222222-2222-2222-2222-222222222222', 'spark_test_kv', 'Spark Test Result', 'number', 'kV', 'lot', 'production', '["inventory"]', '{"min": 1, "max": 10}', false, 6)
ON CONFLICT (product_family_id, key) DO NOTHING;

-- Sample SKUs with attributes
INSERT INTO skus (id, factory_id, product_family_id, sku_code, name, sku_attributes, unit, status, created_by) VALUES 
  ('s1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 
   'EW-copper-1.5mm-25um', 'Enamel Wire Copper 1.5mm 25μm', 
   '{"metal": "copper", "rod_diameter_mm": 1.5, "enamel_thickness_um": 25}', 'meters', 'ACTIVE', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
   
  ('s2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'f2222222-2222-2222-2222-222222222222',
   'PVC-copper-2.5mm2-3C', 'PVC Cable Copper 2.5mm² 3-Core',
   '{"metal": "copper", "conductor_area_mm2": 2.5, "cores": 3, "insulation_thickness_mm": 0.8}', 'meters', 'ACTIVE', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
   
  ('s3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'f3333333-3333-3333-3333-333333333333',
   'FLEX-1.5mm2-2C', 'Flexible Cable 1.5mm² 2-Core',  
   '{"conductor_area_mm2": 1.5, "cores": 2}', 'meters', 'PENDING_APPROVAL', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')
ON CONFLICT (id) DO NOTHING;

-- Sample Work Orders
INSERT INTO work_orders (id, factory_id, wo_number, product_family_id, sku_id, target_quantity, assigned_manager, status, priority, due_date) VALUES 
  ('w1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'MAIN-25-000001', 'f1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 5000.0, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'PENDING', 'NORMAL', CURRENT_DATE + 14),
  ('w2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'MAIN-25-000002', 'f2222222-2222-2222-2222-222222222222', 's2222222-2222-2222-2222-222222222222', 1000.0, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'IN_PROGRESS', 'HIGH', CURRENT_DATE + 7),
  ('w3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'BRCH-25-000001', 'f3333333-3333-3333-3333-333333333333', 's3333333-3333-3333-3333-333333333333', 2000.0, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'PENDING', 'LOW', CURRENT_DATE + 21)
ON CONFLICT (id) DO NOTHING;

-- Sample inventory lots
INSERT INTO inventory_lots (id, factory_id, lot_number, sku_id, work_order_id, quantity, unit) VALUES 
  ('l1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'MAIN-25-L001', 's1111111-1111-1111-1111-111111111111', 'w1111111-1111-1111-1111-111111111111', 2500.0, 'meters'),
  ('l2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'MAIN-25-L002', 's2222222-2222-2222-2222-222222222222', 'w2222222-2222-2222-2222-222222222222', 500.0, 'meters'),
  ('l3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'BRCH-25-L001', 's3333333-3333-3333-3333-333333333333', 'w3333333-3333-3333-3333-333333333333', 1000.0, 'meters')
ON CONFLICT (id) DO NOTHING;

-- Sample material issues for testing PRD §12.1 acceptance test
INSERT INTO wo_material_issues (id, factory_id, work_order_id, inventory_lot_id, issue_number, issued_quantity, unit, issued_by) VALUES 
  ('i1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'w1111111-1111-1111-1111-111111111111', 'l1111111-1111-1111-1111-111111111111', 'MAIN-25-I001', 100.0, 'kg', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('i2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'w2222222-2222-2222-2222-222222222222', 'l2222222-2222-2222-2222-222222222222', 'MAIN-25-I002', 50.0, 'kg', 'cccccccc-cccc-cccc-cccc-cccccccccccc')
ON CONFLICT (id) DO NOTHING;

-- Initialize numbering series for development
INSERT INTO numbering_series (factory_id, doc_type, fiscal_year, prefix, current_sequence) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'WO', 2025, 'MAIN-25-', 2),
  ('11111111-1111-1111-1111-111111111111', 'DN', 2025, 'MAIN-25-DN-', 0),
  ('11111111-1111-1111-1111-111111111111', 'GRN', 2025, 'MAIN-25-GRN-', 0),
  ('22222222-2222-2222-2222-222222222222', 'WO', 2025, 'BRCH-25-', 1),
  ('22222222-2222-2222-2222-222222222222', 'DN', 2025, 'BRCH-25-DN-', 0),
  ('22222222-2222-2222-2222-222222222222', 'GRN', 2025, 'BRCH-25-GRN-', 0)
ON CONFLICT (factory_id, doc_type, fiscal_year) DO NOTHING;

-- Create first checkpoint
SELECT cc_audit_make_checkpoint();

COMMENT ON SCHEMA public IS 'M1.1 Enhanced schema - development seed data loaded';