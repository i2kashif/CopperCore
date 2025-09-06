# Backdating Tests - CEO/Director Only

> **Purpose:** Test backdating controls for CEO/Director roles with full audit requirements  
> **Authority:** QA role with Security review  
> **PRD Reference:** Section 2.3 (Backdating controls), Section 7 (Activity & Audit)

## Backdating Requirements Summary

From PRD Section 2.3:
- **Who:** CEO/Director roles only
- **What:** WO logs, GRNs, Invoice posting dates  
- **Audit Requirements:** Mandatory reason, approver, timestamp, IP/User-Agent
- **Restrictions:** Factory users (FM/FW) cannot backdate any records

---

## Test Data Setup

```sql
-- Setup backdating test data
CREATE OR REPLACE FUNCTION setup_backdating_test_data()
RETURNS void AS $$
BEGIN
  -- Create test users
  INSERT INTO auth.users (id, email, role, factory_id) VALUES
    ('ceo_backdate', 'ceo.backdate@coppercore.com', 'CEO', NULL),
    ('director_backdate', 'director.backdate@coppercore.com', 'DIRECTOR', NULL),
    ('fm_backdate', 'fm.backdate@coppercore.com', 'FACTORY_MANAGER', 'factory_a'),
    ('fw_backdate', 'fw.backdate@coppercore.com', 'FACTORY_WORKER', 'factory_a');
    
  -- Create test work orders for backdating
  INSERT INTO work_orders (id, factory_id, wo_number, status, created_at) VALUES
    ('wo_backdate_1', 'factory_a', 'WO-BD-001', 'ACTIVE', '2024-03-01 10:00:00'),
    ('wo_backdate_2', 'factory_a', 'WO-BD-002', 'ACTIVE', '2024-03-02 10:00:00');
    
  -- Create test GRNs
  INSERT INTO grns (id, factory_id, grn_number, status, created_at) VALUES
    ('grn_backdate_1', 'factory_a', 'GRN-BD-001', 'DRAFT', '2024-03-01 15:00:00');
    
  -- Create test invoices  
  INSERT INTO invoices (id, invoice_number, status, posting_date, created_at) VALUES
    ('invoice_backdate_1', 'INV-BD-001', 'DRAFT', '2024-03-01', '2024-03-01 16:00:00');
END;
$$ LANGUAGE plpgsql;
```

---

## BD-1: CEO Backdating Permissions

### BD-1.1: CEO Can Backdate Work Order Logs
```sql
-- Given: CEO user session
SET SESSION user_id = 'ceo_backdate';
SET SESSION user_role = 'CEO';
SET SESSION request_ip = '192.168.1.100';
SET SESSION user_agent = 'Mozilla/5.0 Test Browser';

-- When: CEO updates WO log with backdated timestamp
UPDATE work_order_logs 
SET 
  logged_at = '2024-02-28 14:30:00', -- Backdated to previous month
  backdate_reason = 'Correcting production log entry missed due to system downtime',
  backdated_by = 'ceo_backdate',
  backdated_at = NOW(),
  original_logged_at = logged_at
WHERE work_order_id = 'wo_backdate_1' AND log_type = 'PRODUCTION';

-- Then: Update should succeed
SELECT assert_true(
  EXISTS(
    SELECT 1 FROM work_order_logs 
    WHERE work_order_id = 'wo_backdate_1' 
    AND logged_at = '2024-02-28 14:30:00'
    AND backdate_reason IS NOT NULL
  ),
  'CEO should be able to backdate work order logs with reason'
);
```

### BD-1.2: CEO Can Backdate GRN Dates  
```sql
SET SESSION user_id = 'ceo_backdate';

-- When: CEO backdates GRN receipt date
UPDATE grns SET
  received_date = '2024-02-29', -- Backdated
  backdate_reason = 'Actual receipt date correction - paperwork delayed',  
  backdated_by = 'ceo_backdate',
  backdated_at = NOW()
WHERE id = 'grn_backdate_1';

-- Then: Backdating should succeed with audit trail
SELECT assert_not_null(
  (SELECT backdate_reason FROM grns WHERE id = 'grn_backdate_1'),
  'CEO backdated GRN should have mandatory reason'
);
```

### BD-1.3: CEO Can Backdate Invoice Posting Dates
```sql
SET SESSION user_id = 'ceo_backdate';

-- When: CEO backdates invoice posting date  
UPDATE invoices SET
  posting_date = '2024-02-25', -- Backdated
  backdate_reason = 'Adjusting posting date for correct fiscal period',
  backdated_by = 'ceo_backdate', 
  backdated_at = NOW()
WHERE id = 'invoice_backdate_1';

-- Then: Should succeed with full audit
SELECT assert_equals(
  (SELECT posting_date FROM invoices WHERE id = 'invoice_backdate_1'),
  '2024-02-25'::date,
  'CEO should be able to backdate invoice posting dates'
);
```

---

## BD-2: Director Backdating Permissions

### BD-2.1: Director Can Backdate GRNs
```sql
SET SESSION user_id = 'director_backdate';
SET SESSION user_role = 'DIRECTOR';

-- When: Director backdates GRN with business justification
UPDATE grns SET
  received_date = '2024-02-28',
  backdate_reason = 'Customer dispute resolution - actual delivery date confirmation',
  backdated_by = 'director_backdate',
  backdated_at = NOW()
WHERE id = 'grn_backdate_1';

-- Then: Should succeed
SELECT assert_not_null(
  (SELECT backdated_by FROM grns WHERE id = 'grn_backdate_1'),
  'Director backdating should be audited with user ID'
);
```

### BD-2.2: Director Can Backdate Invoice Posting
```sql  
SET SESSION user_id = 'director_backdate';

-- When: Director adjusts invoice posting date for compliance
UPDATE invoices SET
  posting_date = '2024-02-26',
  backdate_reason = 'Month-end closing adjustment approved by CFO',
  backdated_by = 'director_backdate',
  backdated_at = NOW()  
WHERE id = 'invoice_backdate_1';

-- Then: Should succeed with audit
SELECT assert_true(
  (SELECT backdated_at FROM invoices WHERE id = 'invoice_backdate_1') IS NOT NULL,
  'Director backdating should record timestamp'
);
```

---

## BD-3: Factory User Backdating Restrictions

### BD-3.1: Factory Manager Cannot Backdate
```sql
SET SESSION user_id = 'fm_backdate';
SET SESSION user_role = 'FACTORY_MANAGER';

-- When: FM attempts to backdate work order log
UPDATE work_order_logs SET
  logged_at = '2024-02-28 10:00:00',
  backdate_reason = 'Correction needed'
WHERE work_order_id = 'wo_backdate_1';

-- Then: Should be blocked by RLS/role policy
SELECT assert_false(
  EXISTS(
    SELECT 1 FROM work_order_logs 
    WHERE work_order_id = 'wo_backdate_1' 
    AND logged_at = '2024-02-28 10:00:00'
  ),
  'Factory Manager should NOT be able to backdate work order logs'
);
```

### BD-3.2: Factory Worker Cannot Backdate  
```sql
SET SESSION user_id = 'fw_backdate';
SET SESSION user_role = 'FACTORY_WORKER';

-- When: FW attempts to backdate GRN
UPDATE grns SET
  received_date = '2024-02-28',
  backdate_reason = 'Wrong date entered'
WHERE id = 'grn_backdate_1';

-- Then: Should fail - no backdating permission
-- This should either fail with permission error or be ignored
SELECT assert_not_equals(
  (SELECT received_date FROM grns WHERE id = 'grn_backdate_1'),
  '2024-02-28'::date,
  'Factory Worker should NOT be able to backdate GRN dates'
);
```

---

## BD-4: Audit Trail Requirements

### BD-4.1: Mandatory Reason Enforcement
```sql
SET SESSION user_id = 'ceo_backdate';

-- When: CEO attempts backdating without reason
UPDATE work_order_logs SET 
  logged_at = '2024-02-27 12:00:00'
  -- Missing backdate_reason
WHERE work_order_id = 'wo_backdate_1';

-- Then: Should fail due to CHECK constraint
SELECT assert_error(
  'UPDATE work_order_logs SET logged_at = ''2024-02-27 12:00:00'' WHERE work_order_id = ''wo_backdate_1''',
  'backdate_reason is mandatory for backdated records'
);
```

### BD-4.2: Complete Audit Information Capture
```sql
SET SESSION user_id = 'ceo_backdate';
SET SESSION request_ip = '10.0.1.50';  
SET SESSION user_agent = 'Chrome/119.0.0.0';

-- When: CEO performs valid backdating
UPDATE invoices SET
  posting_date = '2024-02-20',
  backdate_reason = 'Fiscal compliance - actual transaction date',
  backdated_by = 'ceo_backdate',
  backdated_at = NOW()
WHERE id = 'invoice_backdate_1';

-- Then: Audit trail should capture all required information
SELECT assert_complete_audit(
  'invoice_backdate_1',
  'BACKDATE',
  'Should capture user, timestamp, reason, IP, and user agent'
);
```

### BD-4.3: Audit Trail Immutability
```sql
-- When: Attempt to modify audit trail of backdated record
UPDATE audit_trail 
SET reason = 'Modified reason'
WHERE entity_id = 'invoice_backdate_1' 
AND action_type = 'BACKDATE';

-- Then: Should fail - audit trails are append-only
SELECT assert_error(
  'Audit trail modification should be blocked',
  'audit_trail_immutable_check'
);
```

---

## BD-5: Business Logic Integration Tests

### BD-5.1: Backdated Records Affect Reporting
```sql
SET SESSION user_id = 'ceo_backdate';

-- Given: Invoice backdated to previous month
UPDATE invoices SET 
  posting_date = '2024-01-31', -- Previous month
  backdate_reason = 'Month-end cutoff correction'
WHERE id = 'invoice_backdate_1';

-- When: Generate monthly revenue report
SELECT month, SUM(amount) as revenue
FROM monthly_revenue_report('2024-01-01', '2024-01-31')
GROUP BY month;

-- Then: Backdated invoice should appear in January report
SELECT assert_true(
  EXISTS(
    SELECT 1 FROM monthly_revenue_report('2024-01-01', '2024-01-31')
    WHERE invoice_id = 'invoice_backdate_1'
  ),
  'Backdated invoices should affect historical reports'
);
```

### BD-5.2: Backdated GRN Affects Inventory Positions
```sql
SET SESSION user_id = 'director_backdate';

-- Given: GRN backdated to affect inventory calculation
UPDATE grns SET
  received_date = '2024-02-15', -- Backdated  
  backdate_reason = 'Actual receipt date for inventory reconciliation'
WHERE id = 'grn_backdate_1';

-- When: Calculate inventory position as of February 20
SELECT calculate_inventory_position('2024-02-20', 'factory_a');

-- Then: Backdated GRN should be included in historical inventory
-- This tests that backdating affects business calculations correctly
```

---

## BD-6: API Integration Tests

### BD-6.1: API Backdating Endpoint (CEO)
```typescript
test('CEO can backdate work order via API', async () => {
  const client = createTestClient('ceo_backdate');
  
  const response = await client.patch('/api/work-orders/wo_backdate_1/logs/production_001', {
    logged_at: '2024-02-28T14:30:00Z',
    backdate_reason: 'System outage correction - actual production time'
  });
  
  expect(response.status).toBe(200);
  expect(response.data.logged_at).toBe('2024-02-28T14:30:00Z');
  expect(response.data.backdated_by).toBe('ceo_backdate');
  expect(response.data.backdate_reason).toBeTruthy();
});
```

### BD-6.2: API Backdating Blocked (Factory Manager)  
```typescript
test('Factory Manager backdating blocked by API', async () => {
  const client = createTestClient('fm_backdate');
  
  const response = await client.patch('/api/work-orders/wo_backdate_1/logs/production_001', {
    logged_at: '2024-02-28T14:30:00Z',
    backdate_reason: 'Attempted correction'
  });
  
  expect(response.status).toBe(403);
  expect(response.data.error).toContain('Backdating not permitted for role');
});
```

---

## BD-7: UI Integration Tests (Playwright)

### BD-7.1: CEO Backdating UI Flow
```typescript
test('CEO sees backdating controls in UI', async ({ page }) => {
  await loginAs(page, 'ceo.backdate@coppercore.com');
  await page.goto('/work-orders/wo_backdate_1/logs');
  
  // CEO should see "Edit Date" button
  await expect(page.locator('[data-testid="backdate-button"]')).toBeVisible();
  
  // Click backdate button  
  await page.click('[data-testid="backdate-button"]');
  
  // Should see backdating form
  await expect(page.locator('[data-testid="backdate-form"]')).toBeVisible();
  await expect(page.locator('[data-testid="backdate-reason"]')).toBeVisible();
  
  // Fill and submit backdating
  await page.fill('[data-testid="new-date"]', '2024-02-28');
  await page.fill('[data-testid="backdate-reason"]', 'Production log correction');
  await page.click('[data-testid="confirm-backdate"]');
  
  // Should see success message and updated date
  await expect(page.locator('.success-message')).toBeVisible();
  await expect(page.locator('[data-testid="log-date"]')).toContainText('Feb 28, 2024');
  await expect(page.locator('[data-testid="backdated-indicator"]')).toBeVisible();
});
```

### BD-7.2: Factory Manager UI Restrictions
```typescript
test('Factory Manager does not see backdating controls', async ({ page }) => {
  await loginAs(page, 'fm.backdate@coppercore.com');  
  await page.goto('/work-orders/wo_backdate_1/logs');
  
  // FM should NOT see backdating controls
  await expect(page.locator('[data-testid="backdate-button"]')).not.toBeVisible();
  
  // Date fields should be read-only
  await expect(page.locator('[data-testid="log-date"]')).not.toBeEditable();
});
```

---

## BD-8: Compliance and Regulatory Tests

### BD-8.1: Pakistan Fiscal Compliance
```sql
-- Test: Backdating within fiscal year boundaries
SET SESSION user_id = 'ceo_backdate';

-- When: CEO backdates invoice within same fiscal year
UPDATE invoices SET
  posting_date = '2024-04-15', -- Within FY 2024-25
  backdate_reason = 'Fiscal period correction for tax filing'
WHERE id = 'invoice_backdate_1';

-- Then: Should succeed
-- When: CEO attempts to backdate to previous fiscal year  
UPDATE invoices SET
  posting_date = '2023-03-15', -- Previous fiscal year
  backdate_reason = 'Previous year correction'
WHERE id = 'invoice_backdate_1';

-- Then: Should require additional compliance checks or fail
-- (Based on Pakistan tax regulations)
```

### BD-8.2: Audit Report Generation
```sql
-- Test: Backdated transactions appear in audit reports
SELECT 
  entity_type,
  entity_id,
  backdated_by,
  backdate_reason,
  original_date,
  backdated_to_date,
  backdated_at
FROM backdating_audit_report('2024-02-01', '2024-03-31')
WHERE backdated_by IN ('ceo_backdate', 'director_backdate');

-- Should return all backdating activities with complete audit trail
```

---

## Test Execution Framework

```typescript
describe('Backdating Controls', () => {
  beforeEach(async () => {
    await setupBackdatingTestData();
    await resetAuditTrail();
  });

  describe('CEO Permissions', () => {
    test.each([
      'work_order_logs',
      'grns', 
      'invoices'
    ])('CEO can backdate %s with reason', async (entity) => {
      // Test CEO backdating permissions for each entity type
    });
  });

  describe('Role Restrictions', () => {
    test.each([
      'FACTORY_MANAGER',
      'FACTORY_WORKER',
      'OFFICE'
    ])('%s cannot backdate any records', async (role) => {
      // Test that non-CEO/Director roles are blocked
    });
  });

  describe('Audit Requirements', () => {
    test('backdating requires mandatory reason', async () => {
      // Test CHECK constraints on reason field
    });
    
    test('audit trail captures complete context', async () => {
      // Test IP, user agent, timestamp capture
    });
  });
});
```

---

## Expected Test Results

| Test Case | CEO | Director | Factory Manager | Factory Worker |
|-----------|:---:|:--------:|:---------------:|:--------------:|
| Backdate WO logs | ✅ Pass | ✅ Pass | ❌ Blocked | ❌ Blocked |
| Backdate GRNs | ✅ Pass | ✅ Pass | ❌ Blocked | ❌ Blocked |
| Backdate invoices | ✅ Pass | ✅ Pass | ❌ Blocked | ❌ Blocked |
| Mandatory reason | ✅ Required | ✅ Required | N/A | N/A |
| Audit trail | ✅ Complete | ✅ Complete | N/A | N/A |
| UI controls | ✅ Visible | ✅ Visible | ❌ Hidden | ❌ Hidden |

**Audit Trail Requirements:**
- ✅ User ID and role captured
- ✅ Original and new timestamps  
- ✅ Mandatory business reason
- ✅ IP address and User-Agent
- ✅ Immutable audit records
- ✅ Hash-linked integrity chain