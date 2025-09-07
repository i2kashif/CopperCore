-- CopperCore ERP Enhanced Factory/User Schema Migration
-- Completes M1.1 Database Schema Foundation per PRD-v1.5.md
-- Follows CLAUDE.md modularity caps (< 500 lines)

-- User-Factory assignments for many-to-many relationships (PRD §2.2)
CREATE TABLE IF NOT EXISTS user_factory_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, factory_id)
);

-- Enable RLS on user_factory_assignments 
ALTER TABLE user_factory_assignments ENABLE ROW LEVEL SECURITY;

-- Enhanced user table to make factory_id nullable (users can be assigned to multiple factories)
ALTER TABLE users ALTER COLUMN factory_id DROP NOT NULL;

-- Add fiscal year and numbering series tracking per PRD §4
CREATE TABLE IF NOT EXISTS numbering_series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  doc_type VARCHAR(50) NOT NULL, -- 'WO', 'DN', 'GRN', 'PL', 'INV'
  fiscal_year INTEGER NOT NULL, -- YYYY format
  prefix VARCHAR(20) NOT NULL,
  current_sequence INTEGER DEFAULT 0,
  reset_annually BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(factory_id, doc_type, fiscal_year)
);

ALTER TABLE numbering_series ENABLE ROW LEVEL SECURITY;

-- Enhanced RLS helper functions following rls_policy.md playbook
-- Compatible with both Supabase (auth schema) and plain PostgreSQL (CI/testing)
CREATE OR REPLACE FUNCTION cc_is_global() RETURNS BOOLEAN
LANGUAGE plpgsql STABLE AS $$
BEGIN
  -- Check if auth schema exists (Supabase environment)
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    RETURN (auth.jwt() ->> 'role') IN ('CEO','DIRECTOR');
  ELSE
    -- Fallback for CI/testing: allow global access (or check session variable)
    RETURN COALESCE(current_setting('app.user_role', true), 'FACTORY_WORKER') IN ('CEO','DIRECTOR');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION cc_assigned_factories() RETURNS UUID[]
LANGUAGE plpgsql STABLE AS $$
BEGIN
  -- Check if auth schema exists (Supabase environment)
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    RETURN COALESCE(
      ARRAY(
        SELECT (jsonb_array_elements_text(COALESCE(auth.jwt() -> 'assigned_factories', '[]'::jsonb)))::uuid
      ),
      ARRAY[]::UUID[]
    );
  ELSE
    -- Fallback for CI/testing: return empty array (or parse session variable)
    RETURN COALESCE(
      string_to_array(current_setting('app.assigned_factories', true), ',')::UUID[],
      ARRAY[]::UUID[]
    );
  END IF;
END;
$$;

-- Legacy fallback function for existing simple assignments
CREATE OR REPLACE FUNCTION cc_user_factories() RETURNS UUID[]
LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(
    CASE 
      WHEN cc_is_global() THEN 
        ARRAY(SELECT id FROM factories)
      ELSE 
        ARRAY(
          SELECT uf.factory_id 
          FROM user_factory_assignments uf
          WHERE uf.user_id = CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') 
            THEN auth.uid()
            ELSE COALESCE(current_setting('app.user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID)
          END
        )
    END,
    ARRAY[]::UUID[]
  )
$$;

-- Add RLS policies for user_factory_assignments
CREATE POLICY "cc_user_factory_assignments_select" ON user_factory_assignments
  FOR SELECT
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_user_factory_assignments_insert" ON user_factory_assignments
  FOR INSERT
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_user_factory_assignments_update" ON user_factory_assignments
  FOR UPDATE
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  )
  WITH CHECK (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

-- Deny DELETE by default (PRD §8 - no silent data loss)
CREATE POLICY "cc_user_factory_assignments_delete" ON user_factory_assignments
  FOR DELETE
  USING (FALSE);

-- Add RLS policies for numbering_series (requires approval for changes)
CREATE POLICY "cc_numbering_series_select" ON numbering_series
  FOR SELECT
  USING (
    cc_is_global()
    OR factory_id = ANY (cc_assigned_factories())
  );

CREATE POLICY "cc_numbering_series_insert" ON numbering_series
  FOR INSERT
  WITH CHECK (
    cc_is_global() -- Only CEO/Director can create numbering series
  );

CREATE POLICY "cc_numbering_series_update" ON numbering_series
  FOR UPDATE
  USING (
    cc_is_global() -- Only CEO/Director can modify numbering series
  )
  WITH CHECK (
    cc_is_global()
  );

-- Deny DELETE for numbering series
CREATE POLICY "cc_numbering_series_delete" ON numbering_series
  FOR DELETE
  USING (FALSE);

-- Add updated_at trigger for numbering_series
CREATE TRIGGER update_numbering_series_updated_at
  BEFORE UPDATE ON numbering_series 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_factory_assignments_user_id ON user_factory_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_factory_assignments_factory_id ON user_factory_assignments(factory_id);
CREATE INDEX IF NOT EXISTS idx_numbering_series_factory_doc ON numbering_series(factory_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_numbering_series_fiscal ON numbering_series(fiscal_year);

-- Function to get next sequence number (atomic)
CREATE OR REPLACE FUNCTION cc_get_next_sequence(
  p_factory_id UUID,
  p_doc_type VARCHAR(50),
  p_fiscal_year INTEGER DEFAULT NULL
) RETURNS VARCHAR(100)
LANGUAGE PLPGSQL SECURITY DEFINER AS $$
DECLARE
  v_fiscal_year INTEGER;
  v_sequence INTEGER;
  v_prefix VARCHAR(20);
  v_series_record RECORD;
BEGIN
  -- Default to current fiscal year (Jul 1 - Jun 30)
  v_fiscal_year := COALESCE(p_fiscal_year, 
    CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 7 
         THEN EXTRACT(YEAR FROM CURRENT_DATE)
         ELSE EXTRACT(YEAR FROM CURRENT_DATE) - 1
    END
  );
  
  -- Get or create numbering series record
  SELECT * INTO v_series_record
  FROM numbering_series
  WHERE factory_id = p_factory_id 
    AND doc_type = p_doc_type 
    AND fiscal_year = v_fiscal_year
  FOR UPDATE;
  
  IF NOT FOUND THEN
    -- Create new series with factory code prefix
    SELECT code INTO v_prefix FROM factories WHERE id = p_factory_id;
    v_prefix := COALESCE(v_prefix, 'UNK') || '-' || RIGHT(v_fiscal_year::TEXT, 2) || '-';
    
    INSERT INTO numbering_series (factory_id, doc_type, fiscal_year, prefix, current_sequence)
    VALUES (p_factory_id, p_doc_type, v_fiscal_year, v_prefix, 1)
    RETURNING current_sequence, prefix INTO v_sequence, v_prefix;
  ELSE
    -- Increment existing sequence
    UPDATE numbering_series 
    SET current_sequence = current_sequence + 1
    WHERE id = v_series_record.id
    RETURNING current_sequence, prefix INTO v_sequence, v_prefix;
  END IF;
  
  -- Return formatted number
  RETURN v_prefix || LPAD(v_sequence::TEXT, 6, '0');
END;
$$;

-- Commit migration
COMMENT ON TABLE user_factory_assignments IS 'M1.1 Enhanced schema - user-factory many-to-many relationships';
COMMENT ON TABLE numbering_series IS 'M1.1 Enhanced schema - document numbering per PRD §4';
COMMENT ON FUNCTION cc_get_next_sequence IS 'M1.1 Enhanced schema - atomic sequence number generation';