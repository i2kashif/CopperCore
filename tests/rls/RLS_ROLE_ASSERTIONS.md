# RLS Role Assertions - CopperCore

> **Purpose:** Test Row Level Security policies for CEO/Director/FM/FW roles  
> **Authority:** QA role with Security review  
> **PRD Reference:** Section 2.1 (Roles), Section 10 (Security), RLS policies in `/infra/policies/`

## Test Framework Setup

```sql
-- Test data setup for RLS assertions
CREATE OR REPLACE FUNCTION setup_rls_test_data()
RETURNS void AS $$
BEGIN
  -- Create test factories
  INSERT INTO factories (id, name, code) VALUES 
    ('factory_a', 'Factory A - Main', 'FA'),
    ('factory_b', 'Factory B - Secondary', 'FB');
    
  -- Create test users with different roles
  INSERT INTO auth.users (id, email, role, factory_id) VALUES
    ('ceo_user', 'ceo@coppercore.com', 'CEO', NULL),
    ('director_user', 'director@coppercore.com', 'DIRECTOR', NULL),
    ('fm_a_user', 'fm.a@coppercore.com', 'FACTORY_MANAGER', 'factory_a'),
    ('fw_a_user', 'fw.a@coppercore.com', 'FACTORY_WORKER', 'factory_a'),
    ('fm_b_user', 'fm.b@coppercore.com', 'FACTORY_MANAGER', 'factory_b'),
    ('fw_b_user', 'fw.b@coppercore.com', 'FACTORY_WORKER', 'factory_b');
    
  -- Create test data across factories
  INSERT INTO work_orders (id, factory_id, wo_number, status) VALUES
    ('wo_a_1', 'factory_a', 'WO-FA-001', 'ACTIVE'),
    ('wo_a_2', 'factory_a', 'WO-FA-002', 'DRAFT'),
    ('wo_b_1', 'factory_b', 'WO-FB-001', 'ACTIVE'),
    ('wo_b_2', 'factory_b', 'WO-FB-002', 'COMPLETED');
    
  -- Add PUs, DNs, GRNs etc. for comprehensive testing
END;
$$ LANGUAGE plpgsql;
```

---

## CEO Role Assertions

**Expected Access:** Global access to ALL factories and data

### CEO-1: Global Work Orders Access
```sql
-- Test: CEO sees work orders from all factories
SET SESSION user_id = 'ceo_user';
SET SESSION user_role = 'CEO';

SELECT * FROM work_orders; -- Should return ALL work orders (A and B factories)

-- Assert: Count should equal total WOs across all factories
SELECT assert_equals(
  (SELECT COUNT(*) FROM work_orders),
  4, -- All WOs from setup
  'CEO should see all work orders across factories'
);
```

### CEO-2: Global Inventory Lots Access
```sql
SET SESSION user_id = 'ceo_user';

-- Test: CEO can read/write inventory lots in any factory
SELECT * FROM inventory_lots; -- Should see all lots

-- Test: CEO can create lots in any factory
INSERT INTO inventory_lots (factory_id, lot_number, sku_id, quantity)
VALUES ('factory_a', 'LOT-CEO-TEST-A', 'test_sku', 1000);

INSERT INTO inventory_lots (factory_id, lot_number, sku_id, quantity) 
VALUES ('factory_b', 'LOT-CEO-TEST-B', 'test_sku', 2000);

-- Both inserts should succeed
```

### CEO-3: Cross-Factory PU Visibility  
```sql
SET SESSION user_id = 'ceo_user';

-- CEO should see PUs from all factories
SELECT pu.*, f.name as factory_name 
FROM packing_units pu 
JOIN factories f ON pu.factory_id = f.id;

-- Assert: Should see PUs from both factories
SELECT assert_greater_than(
  (SELECT COUNT(DISTINCT factory_id) FROM packing_units),
  1,
  'CEO should see PUs from multiple factories'
);
```

### CEO-4: QC Override Capabilities
```sql
SET SESSION user_id = 'ceo_user';

-- Test: CEO can override QC failures
UPDATE inventory_lots 
SET qc_status = 'FAIL_OVERRIDE',
    override_reason = 'Customer acceptance with discount',
    override_by = 'ceo_user',
    override_at = NOW()
WHERE id = 'test_lot_failed';

-- Should succeed without RLS blocking
```

---

## Director Role Assertions

**Expected Access:** Global access similar to CEO but with some operational restrictions

### DIR-1: Global Access Verification
```sql
SET SESSION user_id = 'director_user';
SET SESSION user_role = 'DIRECTOR';

-- Director should see work orders from all factories
SELECT COUNT(*) FROM work_orders; -- Should equal CEO count

-- Director should see all factories' data
SELECT DISTINCT factory_id FROM inventory_lots ORDER BY factory_id;
-- Should return both factory_a and factory_b
```

### DIR-2: Work Order Creation Rights
```sql
SET SESSION user_id = 'director_user';

-- Director can create WOs in any factory
INSERT INTO work_orders (factory_id, wo_number, status, created_by)
VALUES ('factory_a', 'WO-DIR-TEST', 'DRAFT', 'director_user');

-- Should succeed
SELECT assert_true(
  EXISTS(SELECT 1 FROM work_orders WHERE wo_number = 'WO-DIR-TEST'),
  'Director should be able to create work orders'
);
```

### DIR-3: Invoice Management Access
```sql  
SET SESSION user_id = 'director_user';

-- Director should be able to view/manage invoices globally
SELECT * FROM invoices; -- Should see all invoices

-- Director should be able to finalize invoices
UPDATE invoices 
SET status = 'FINALIZED', finalized_by = 'director_user'
WHERE id = 'test_invoice_draft';

-- Should succeed
```

---

## Factory Manager Role Assertions

**Expected Access:** Scoped to assigned factory only

### FM-1: Factory Scoping Enforcement
```sql
SET SESSION user_id = 'fm_a_user';
SET SESSION user_role = 'FACTORY_MANAGER';
SET SESSION user_factory_id = 'factory_a';

-- FM-A should only see Factory A work orders
SELECT * FROM work_orders;

-- Assert: Should only see factory_a WOs
SELECT assert_equals(
  (SELECT COUNT(DISTINCT factory_id) FROM work_orders),
  1,
  'Factory Manager should only see own factory data'
);

SELECT assert_equals(
  (SELECT DISTINCT factory_id FROM work_orders LIMIT 1),
  'factory_a',
  'Factory Manager should only see assigned factory'
);
```

### FM-2: Cross-Factory Data Isolation
```sql
SET SESSION user_id = 'fm_a_user';

-- Attempt to read Factory B data should return empty
SELECT COUNT(*) FROM work_orders WHERE factory_id = 'factory_b';
-- Should return 0 due to RLS

-- Attempt to directly access Factory B WO should fail
SELECT * FROM work_orders WHERE id = 'wo_b_1';
-- Should return no rows
```

### FM-3: Write Restrictions to Own Factory Only
```sql
SET SESSION user_id = 'fm_a_user';

-- FM can create WO in own factory
INSERT INTO work_orders (factory_id, wo_number, status)
VALUES ('factory_a', 'WO-FM-TEST', 'DRAFT');
-- Should succeed

-- FM cannot create WO in other factory
INSERT INTO work_orders (factory_id, wo_number, status)  
VALUES ('factory_b', 'WO-FM-INVALID', 'DRAFT');
-- Should fail due to RLS WITH CHECK constraint
```

### FM-4: Incoming Transfer Visibility
```sql
SET SESSION user_id = 'fm_a_user';

-- FM should see dispatch notes targeted to their factory
-- Even if originating from another factory
SELECT * FROM dispatch_notes 
WHERE destination_factory_id = 'factory_a';
-- Should see incoming dispatches regardless of origin

-- But should NOT see dispatches between other factories
SELECT COUNT(*) FROM dispatch_notes 
WHERE factory_id != 'factory_a' 
AND destination_factory_id != 'factory_a';
-- Should return 0
```

### FM-5: GRN Processing for Incoming Transfers
```sql
SET SESSION user_id = 'fm_a_user';

-- FM should be able to create GRN for incoming dispatch
INSERT INTO grns (factory_id, dispatch_note_id, received_by)
VALUES ('factory_a', 'incoming_dn_to_a', 'fm_a_user');
-- Should succeed

-- But cannot create GRN for other factory's receipts
INSERT INTO grns (factory_id, dispatch_note_id, received_by)
VALUES ('factory_b', 'some_dn_to_b', 'fm_a_user');
-- Should fail
```

---

## Factory Worker Role Assertions

**Expected Access:** Scoped to factory, limited operational permissions

### FW-1: Read-Only Access to Most Data
```sql
SET SESSION user_id = 'fw_a_user';
SET SESSION user_role = 'FACTORY_WORKER';
SET SESSION user_factory_id = 'factory_a';

-- FW can see work orders in their factory
SELECT * FROM work_orders WHERE factory_id = 'factory_a';
-- Should succeed

-- But cannot see other factory data
SELECT COUNT(*) FROM work_orders WHERE factory_id = 'factory_b';
-- Should return 0
```

### FW-2: Limited Write Permissions
```sql
SET SESSION user_id = 'fw_a_user';

-- FW can create/update packing units
INSERT INTO packing_units (factory_id, pu_code, lot_id, quantity)
VALUES ('factory_a', 'PU-FW-001', 'test_lot_a', 500);
-- Should succeed

-- FW can update PU status (packing operations)
UPDATE packing_units SET status = 'PACKED' 
WHERE pu_code = 'PU-FW-001' AND factory_id = 'factory_a';
-- Should succeed

-- But FW cannot create work orders
INSERT INTO work_orders (factory_id, wo_number, status)
VALUES ('factory_a', 'WO-FW-INVALID', 'DRAFT');
-- Should fail due to role-based restrictions
```

### FW-3: Barcode Scanning Operations
```sql
SET SESSION user_id = 'fw_a_user';

-- FW should be able to scan PUs in their factory
SELECT * FROM packing_units WHERE pu_code = 'PU-12345' 
AND factory_id = 'factory_a';
-- Should succeed if PU exists in their factory

-- FW should see incoming PUs being transferred to their factory
SELECT pu.* FROM packing_units pu
WHERE EXISTS (
  SELECT 1 FROM dispatch_note_items dni
  JOIN dispatch_notes dn ON dni.dispatch_note_id = dn.id
  WHERE dni.packing_unit_id = pu.id 
  AND dn.destination_factory_id = 'factory_a'
);
-- Should see PUs being transferred to factory A
```

### FW-4: Cannot Access Sensitive Operations
```sql
SET SESSION user_id = 'fw_a_user';

-- FW cannot override QC failures
UPDATE inventory_lots SET qc_status = 'FAIL_OVERRIDE'
WHERE id = 'test_lot_failed';
-- Should fail

-- FW cannot finalize work orders  
UPDATE work_orders SET status = 'COMPLETED'
WHERE id = 'wo_a_1';
-- Should fail due to role restrictions
```

---

## Cross-Role Security Tests

### SEC-1: Role Privilege Escalation Prevention
```sql
-- Test: User cannot change their own role
SET SESSION user_id = 'fw_a_user';

UPDATE auth.users SET role = 'CEO' WHERE id = 'fw_a_user';
-- Should fail - users cannot escalate privileges
```

### SEC-2: Factory Assignment Immutability
```sql
-- Test: Users cannot change factory assignment
SET SESSION user_id = 'fm_a_user';

UPDATE auth.users SET factory_id = 'factory_b' WHERE id = 'fm_a_user';
-- Should fail - factory assignment should be admin-only
```

### SEC-3: Audit Trail Access Control
```sql
-- Test: Only global roles can access full audit trail
SET SESSION user_id = 'fm_a_user';

SELECT * FROM audit_trail; 
-- Should only show audit entries for factory_a

SET SESSION user_id = 'ceo_user';
SELECT * FROM audit_trail;
-- Should show all audit entries across all factories
```

---

## Test Implementation Framework

### Vitest + SQL Test Runner
```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { createTestClient } from '../utils/test-client';

describe('RLS Role Assertions', () => {
  beforeEach(async () => {
    await setupRlsTestData();
  });

  test('CEO-1: Global work orders access', async () => {
    const client = createTestClient('ceo_user');
    const workOrders = await client.query('SELECT * FROM work_orders');
    
    expect(workOrders.length).toBe(4); // All WOs across factories
    
    const factories = [...new Set(workOrders.map(wo => wo.factory_id))];
    expect(factories.length).toBeGreaterThan(1); // Multiple factories visible
  });

  test('FM-1: Factory scoping enforcement', async () => {
    const client = createTestClient('fm_a_user', 'factory_a');
    const workOrders = await client.query('SELECT * FROM work_orders');
    
    // Should only see factory A work orders
    expect(workOrders.every(wo => wo.factory_id === 'factory_a')).toBe(true);
    
    // Should not see factory B data
    const factoryBCount = await client.query(
      'SELECT COUNT(*) as count FROM work_orders WHERE factory_id = $1',
      ['factory_b']
    );
    expect(factoryBCount[0].count).toBe(0);
  });
});
```

### Playwright E2E RLS Tests
```typescript
test('RLS enforcement in UI - Factory Manager isolation', async ({ page }) => {
  // Login as Factory A manager
  await page.goto('/login');
  await loginAs(page, 'fm.a@coppercore.com');
  
  // Navigate to work orders list
  await page.goto('/work-orders');
  
  // Should only see Factory A work orders
  const workOrderRows = await page.locator('[data-testid="work-order-row"]').all();
  
  for (const row of workOrderRows) {
    const factoryCell = row.locator('[data-testid="factory-cell"]');
    await expect(factoryCell).toContainText('Factory A');
  }
  
  // Verify Factory B WOs are not visible
  await expect(page.locator('[data-testid="work-order-row"]:has-text("Factory B")')).toHaveCount(0);
});
```

---

## Test Execution Checklist

- [ ] **CEO Role Tests:** Global access to all factories and override capabilities
- [ ] **Director Role Tests:** Global operational access with invoice management  
- [ ] **Factory Manager Tests:** Factory-scoped access with incoming transfer visibility
- [ ] **Factory Worker Tests:** Limited factory-scoped access with operational permissions
- [ ] **Cross-Role Security:** Privilege escalation and audit trail protection
- [ ] **UI/API Consistency:** RLS enforcement matches between database and application layers
- [ ] **Performance Impact:** RLS policies don't significantly degrade query performance

## Expected Test Results

| Role | Own Factory Data | Other Factory Data | Global Operations | QC Override |
|------|:----------------:|:------------------:|:-----------------:|:-----------:|
| CEO | ✅ Full Access | ✅ Full Access | ✅ All Operations | ✅ Yes |
| Director | ✅ Full Access | ✅ Full Access | ✅ Most Operations | ❌ No |
| Factory Manager | ✅ Full Access | ❌ No Access* | ❌ Factory Only | ❌ No |
| Factory Worker | ✅ Limited Access | ❌ No Access | ❌ Operations Only | ❌ No |

*Except incoming transfers and cross-factory dispatch visibility