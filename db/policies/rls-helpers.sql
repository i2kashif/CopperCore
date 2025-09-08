-- CopperCore ERP - RLS Helper Functions
-- These functions extract claims from JWT tokens for factory scoping

-- Helper: Check if current user has global role (CEO/Director)
CREATE OR REPLACE FUNCTION user_is_global()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'role' IN ('CEO', 'DIRECTOR'),
    false
  );
$$;

-- Helper: Get current user's factory ID from JWT
CREATE OR REPLACE FUNCTION jwt_factory()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'factory_id')::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID
  );
$$;

-- Helper: Get current user's role from JWT
CREATE OR REPLACE FUNCTION jwt_role()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'role',
    'ANONYMOUS'
  );
$$;

-- Helper: Get current user ID from JWT
CREATE OR REPLACE FUNCTION jwt_user_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'user_id')::UUID,
    auth.uid()
  );
$$;

-- Template RLS Policy Pattern:
-- CREATE POLICY table_read ON table_name
--   FOR SELECT
--   USING (user_is_global() OR factory_id = jwt_factory());
--
-- CREATE POLICY table_write ON table_name  
--   FOR INSERT
--   WITH CHECK (user_is_global() OR factory_id = jwt_factory());