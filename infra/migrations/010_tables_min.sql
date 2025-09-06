-- CopperCore ERP Core Tables Migration
-- Creates minimal core business tables following PRD-v1.5.md
-- All tables are factory-scoped with RLS

-- Product Families (configuration-first design per PRD §3.1)
CREATE TABLE product_families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  specifications JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(factory_id, code)
);

-- SKUs (variants per PRD §3.2)
CREATE TABLE skus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  product_family_id UUID NOT NULL REFERENCES product_families(id),
  sku_code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  specifications JSONB NOT NULL DEFAULT '{}',
  unit VARCHAR(20) NOT NULL DEFAULT 'meters',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(factory_id, sku_code)
);

-- Work Orders (per PRD §5.3)
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  wo_number VARCHAR(100) NOT NULL,
  product_family_id UUID NOT NULL REFERENCES product_families(id),
  sku_id UUID NOT NULL REFERENCES skus(id),
  target_quantity DECIMAL(12,3) NOT NULL CHECK (target_quantity > 0),
  current_quantity DECIMAL(12,3) DEFAULT 0 CHECK (current_quantity >= 0),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  start_date DATE,
  target_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(factory_id, wo_number)
);

-- Inventory Lots (per PRD §5.4)
CREATE TABLE inventory_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  lot_number VARCHAR(100) NOT NULL,
  sku_id UUID NOT NULL REFERENCES skus(id),
  work_order_id UUID REFERENCES work_orders(id),
  quantity DECIMAL(12,3) NOT NULL CHECK (quantity >= 0),
  reserved_quantity DECIMAL(12,3) DEFAULT 0 CHECK (reserved_quantity >= 0),
  unit VARCHAR(20) NOT NULL,
  location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(factory_id, lot_number)
);

-- Packing Units (per PRD §5.5)
CREATE TABLE packing_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  pu_code VARCHAR(100) NOT NULL,
  inventory_lot_id UUID NOT NULL REFERENCES inventory_lots(id),
  work_order_id UUID NOT NULL REFERENCES work_orders(id),
  quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED')),
  qc_status VARCHAR(20) DEFAULT 'PENDING' CHECK (qc_status IN ('PENDING', 'PASS', 'HOLD', 'FAIL')),
  packed_by UUID REFERENCES users(id),
  packed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(pu_code) -- PU codes are globally unique for scanning
);

-- Dispatch Notes (per PRD §5.6)
CREATE TABLE dispatch_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  dn_number VARCHAR(100) NOT NULL,
  destination_factory_id UUID REFERENCES factories(id),
  customer_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'DISPATCHED', 'DELIVERED', 'CANCELLED')),
  dispatch_date DATE,
  driver_name VARCHAR(255),
  vehicle_number VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(factory_id, dn_number)
);

-- GRNs (per PRD §5.7)
CREATE TABLE grns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  grn_number VARCHAR(100) NOT NULL,
  dispatch_note_id UUID REFERENCES dispatch_notes(id),
  source_factory_id UUID REFERENCES factories(id),
  receipt_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RECEIVED', 'DISCREPANCY')),
  received_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(factory_id, grn_number)
);

-- Enable RLS on all tables
ALTER TABLE product_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE grns ENABLE ROW LEVEL SECURITY;

-- Add updated_at triggers
CREATE TRIGGER update_product_families_updated_at
  BEFORE UPDATE ON product_families FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skus_updated_at
  BEFORE UPDATE ON skus FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at
  BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_lots_updated_at
  BEFORE UPDATE ON inventory_lots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packing_units_updated_at
  BEFORE UPDATE ON packing_units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dispatch_notes_updated_at
  BEFORE UPDATE ON dispatch_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grns_updated_at
  BEFORE UPDATE ON grns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_product_families_factory_id ON product_families(factory_id);
CREATE INDEX idx_skus_factory_id ON skus(factory_id);
CREATE INDEX idx_skus_product_family_id ON skus(product_family_id);
CREATE INDEX idx_work_orders_factory_id ON work_orders(factory_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_inventory_lots_factory_id ON inventory_lots(factory_id);
CREATE INDEX idx_packing_units_factory_id ON packing_units(factory_id);
CREATE INDEX idx_packing_units_pu_code ON packing_units(pu_code);
CREATE INDEX idx_dispatch_notes_factory_id ON dispatch_notes(factory_id);
CREATE INDEX idx_grns_factory_id ON grns(factory_id);

COMMENT ON TABLE work_orders IS 'Core tables migration - WO with optimistic locking';
COMMENT ON TABLE packing_units IS 'Core tables migration - PU with global unique codes';
COMMENT ON TABLE dispatch_notes IS 'Core tables migration - DN for inter-factory logistics';
COMMENT ON TABLE grns IS 'Core tables migration - GRN with DN linkage';