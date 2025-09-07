-- CopperCore ERP Enhanced Audit Chain Migration
-- Implements tamper-evident audit chain per audit_chain.md playbook
-- Follows CLAUDE.md modularity caps (< 500 lines)

-- Enhanced audit_log table following playbook pattern
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target TEXT NOT NULL,          -- e.g., TG_TABLE_NAME  
  target_id TEXT NOT NULL,       -- cast of the entity's primary key
  action TEXT NOT NULL,          -- 'insert'|'update'|'delete'
  before JSONB,
  after JSONB NOT NULL,          -- tombstone on delete
  actor UUID,                    -- auth.uid() where available
  ip TEXT,
  ua TEXT,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  previous_hash BYTEA,
  current_hash BYTEA NOT NULL
);

-- Helpful indexes for audit_log
CREATE INDEX IF NOT EXISTS idx_audit_target_id_ts ON audit_log(target, target_id, ts);
CREATE INDEX IF NOT EXISTS idx_audit_current_hash ON audit_log(current_hash);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);

-- Canonicalization function (deterministic, recursive; sorts object keys)
CREATE OR REPLACE FUNCTION cc_jsonb_canon(j JSONB) RETURNS JSONB
LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE jsonb_typeof(j)
    WHEN 'object' THEN (
      SELECT jsonb_object_agg(key, cc_jsonb_canon(value))
      FROM (
        SELECT key, value FROM jsonb_each(j) ORDER BY key
      ) s
    )
    WHEN 'array' THEN (
      SELECT jsonb_agg(cc_jsonb_canon(value))
      FROM jsonb_array_elements(j)
    )
    ELSE j
  END
$$;

-- Canonical text for hashing
CREATE OR REPLACE FUNCTION cc_jsonb_canon_text(j JSONB) RETURNS TEXT
LANGUAGE SQL IMMUTABLE AS $$
  SELECT cc_jsonb_canon(j)::TEXT
$$;

-- Hash composer: sha256(previous_hash || canonical(after))
CREATE OR REPLACE FUNCTION cc_audit_next_hash(prev BYTEA, after JSONB) RETURNS BYTEA
LANGUAGE SQL IMMUTABLE AS $$
  SELECT digest(
    COALESCE(prev, '\x'::BYTEA) || convert_to(cc_jsonb_canon_text(after), 'utf8'),
    'sha256'
  )
$$;

-- Main trigger to append audit rows
CREATE OR REPLACE FUNCTION cc_audit_trigger() RETURNS TRIGGER
LANGUAGE PLPGSQL AS $$
DECLARE
  prev BYTEA;
  _actor UUID;
  _ip TEXT;
  _ua TEXT;
  _target_id TEXT;
  _after JSONB;
BEGIN
  -- Resolve actor/ip/ua
  BEGIN
    -- Check if auth schema exists (Supabase environment)
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
      _actor := NULLIF(auth.uid()::TEXT, '')::UUID;  -- Supabase; null if not available
    ELSE
      -- Fallback for CI/testing: use session variable
      _actor := COALESCE(current_setting('app.user_id', true)::UUID, NULL);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    _actor := NULL;
  END;

  _ip := COALESCE(current_setting('cc.ip', true), inet_client_addr()::TEXT);
  _ua := current_setting('cc.ua', true);

  -- Define target id (string cast of PK; adapt if your PK isn't "id")
  _target_id := COALESCE(NEW.id::TEXT, OLD.id::TEXT);

  -- Define "after" image (tombstone on DELETE)
  _after := COALESCE(to_jsonb(NEW), jsonb_build_object('_deleted', true));

  -- Get previous hash in chain
  SELECT current_hash INTO prev
  FROM audit_log
  WHERE target = TG_TABLE_NAME AND target_id = _target_id
  ORDER BY ts DESC, id DESC
  LIMIT 1;

  INSERT INTO audit_log(target, target_id, action, before, after, actor, ip, ua, previous_hash, current_hash)
  VALUES (
    TG_TABLE_NAME,
    _target_id,
    LOWER(TG_OP),
    to_jsonb(OLD),
    _after,
    _actor,
    _ip,
    _ua,
    prev,
    cc_audit_next_hash(prev, _after)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Helper to attach trigger to a table
CREATE OR REPLACE FUNCTION cc_attach_audit(sch TEXT, tbl TEXT) RETURNS VOID
LANGUAGE PLPGSQL AS $$
DECLARE
  trg_name TEXT := format('cc_audit_%s', tbl);
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = trg_name AND n.nspname = sch AND c.relname = tbl
  ) THEN
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I.%I
         FOR EACH ROW EXECUTE FUNCTION cc_audit_trigger()',
      trg_name, sch, tbl
    );
  END IF;
END;
$$;

-- Verification: detect broken chains for a specific entity
CREATE OR REPLACE FUNCTION cc_audit_verify_entity(p_target TEXT, p_target_id TEXT)
RETURNS TABLE(idx INT, ok BOOLEAN, expected_prev BYTEA, actual_prev BYTEA, row_id UUID) 
LANGUAGE SQL STABLE AS $$
  WITH seq AS (
    SELECT row_number() OVER (ORDER BY ts, id) AS rn, *
    FROM audit_log
    WHERE target = p_target AND target_id = p_target_id
    ORDER BY ts, id
  ),
  chk AS (
    SELECT
      rn AS idx,
      lag(current_hash) OVER (ORDER BY rn) AS expected_prev,
      previous_hash AS actual_prev,
      (lag(current_hash) OVER (ORDER BY rn) IS NOT DISTINCT FROM previous_hash) AS ok,
      id AS row_id
    FROM seq
  )
  SELECT idx, ok, expected_prev, actual_prev, row_id FROM chk;
$$;

-- Daily checkpoints to speed detection windows
CREATE TABLE IF NOT EXISTS audit_checkpoint (
  day DATE PRIMARY KEY,
  snapshot_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  head_hash BYTEA NOT NULL,     -- digest over concatenation of all chain heads
  meta JSONB
);

CREATE OR REPLACE FUNCTION cc_audit_make_checkpoint() RETURNS VOID
LANGUAGE SQL AS $$
  WITH heads AS (
    SELECT target, target_id,
           (SELECT current_hash
              FROM audit_log a2
             WHERE a2.target = a1.target AND a2.target_id = a1.target_id
             ORDER BY ts DESC, id DESC
             LIMIT 1) AS head
    FROM (SELECT DISTINCT target, target_id FROM audit_log) a1
  ),
  concat AS (
    SELECT string_agg(encode(head, 'hex') || ':' || target || ':' || target_id, ',' ORDER BY target, target_id) AS s
    FROM heads
  )
  INSERT INTO audit_checkpoint(day, head_hash, meta)
  SELECT current_date,
         digest(convert_to(COALESCE(s, ''), 'utf8'), 'sha256'),
         jsonb_build_object('count', (SELECT count(*) FROM heads))
  FROM concat
  ON CONFLICT (day) DO NOTHING;
$$;

-- Attach audit triggers to core tables (requires approval per playbook)
-- Note: audit_log itself is not audited to prevent infinite recursion
SELECT cc_attach_audit('public', 'factories');
SELECT cc_attach_audit('public', 'users');
SELECT cc_attach_audit('public', 'user_factory_assignments');
SELECT cc_attach_audit('public', 'product_families'); 
SELECT cc_attach_audit('public', 'product_family_attributes');
SELECT cc_attach_audit('public', 'skus');
SELECT cc_attach_audit('public', 'work_orders');
SELECT cc_attach_audit('public', 'inventory_lots');
SELECT cc_attach_audit('public', 'packing_units');
SELECT cc_attach_audit('public', 'dispatch_notes');
SELECT cc_attach_audit('public', 'grns');

-- Note: numbering_series excluded as it's operational metadata, not business data

-- RLS on audit_log: read-only access based on factory scoping
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Global users can see all audit logs
CREATE POLICY "cc_audit_log_select_global" ON audit_log
  FOR SELECT
  USING (cc_is_global());

-- Factory users can see audit logs for their factories only
-- This requires checking the target table's factory_id
CREATE POLICY "cc_audit_log_select_factory" ON audit_log
  FOR SELECT
  USING (
    NOT cc_is_global() AND (
      -- Check if the target entity belongs to user's factories
      CASE target
        WHEN 'factories' THEN 
          target_id::UUID = ANY (cc_assigned_factories())
        WHEN 'users' THEN 
          EXISTS (SELECT 1 FROM users u WHERE u.id::TEXT = target_id AND u.factory_id = ANY (cc_assigned_factories()))
        WHEN 'product_families' THEN 
          EXISTS (SELECT 1 FROM product_families pf WHERE pf.id::TEXT = target_id AND pf.factory_id = ANY (cc_assigned_factories()))
        WHEN 'skus' THEN 
          EXISTS (SELECT 1 FROM skus s WHERE s.id::TEXT = target_id AND s.factory_id = ANY (cc_assigned_factories()))
        WHEN 'work_orders' THEN 
          EXISTS (SELECT 1 FROM work_orders wo WHERE wo.id::TEXT = target_id AND wo.factory_id = ANY (cc_assigned_factories()))
        WHEN 'inventory_lots' THEN 
          EXISTS (SELECT 1 FROM inventory_lots il WHERE il.id::TEXT = target_id AND il.factory_id = ANY (cc_assigned_factories()))
        WHEN 'packing_units' THEN 
          EXISTS (SELECT 1 FROM packing_units pu WHERE pu.id::TEXT = target_id AND pu.factory_id = ANY (cc_assigned_factories()))
        WHEN 'dispatch_notes' THEN 
          EXISTS (SELECT 1 FROM dispatch_notes dn WHERE dn.id::TEXT = target_id AND dn.factory_id = ANY (cc_assigned_factories()))
        WHEN 'grns' THEN 
          EXISTS (SELECT 1 FROM grns g WHERE g.id::TEXT = target_id AND g.factory_id = ANY (cc_assigned_factories()))
        ELSE FALSE
      END
    )
  );

-- No INSERT/UPDATE/DELETE on audit_log - triggers only
CREATE POLICY "cc_audit_log_no_writes" ON audit_log
  FOR ALL
  USING (FALSE);

-- Legacy audit_events table is superseded but keep for compatibility
-- Add note for future cleanup
COMMENT ON TABLE audit_events IS 'DEPRECATED: Use audit_log table with tamper-evident chain instead';

-- Commit migration  
COMMENT ON TABLE audit_log IS 'M1.1 Enhanced schema - tamper-evident audit chain per playbook';
COMMENT ON FUNCTION cc_audit_trigger IS 'M1.1 Enhanced schema - audit trigger with hash chaining';
COMMENT ON FUNCTION cc_audit_verify_entity IS 'M1.1 Enhanced schema - chain integrity verification';