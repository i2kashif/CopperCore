# Acceptance Test Specifications - CopperCore ERP

> **Purpose:** Map PRD §12 acceptance tests to Given/When/Then specifications  
> **Authority:** QA role with Architect review  
> **PRD Reference:** Section 12 (Acceptance Tests), Section 2.1 (Roles), Section 10 (Security)

## Test Framework Setup

```typescript
// Example test structure using Playwright + Vitest
describe('CopperCore Acceptance Tests', () => {
  beforeEach(async ({ page }) => {
    // Factory-scoped test setup
    await setupTestFactory(page);
    await authenticateUser(page, 'factory_manager');
  });
});
```

---

## AT-1: WO Materials Integrity

**PRD Requirement:** Cannot return > issued per lot; attempts return 422 with hint.

### Scenario 1.1: Valid Material Return
```gherkin
Given a Work Order "WO-001" with RM Lot "LOT-RM-123" issued quantity 1000 kg
And the lot has previous returns totaling 200 kg  
When Factory Manager attempts to return 500 kg from "LOT-RM-123"
Then the return is accepted
And remaining available return quantity becomes 300 kg
And the transaction is logged in audit trail
```

### Scenario 1.2: Excess Return Attempt
```gherkin
Given a Work Order "WO-001" with RM Lot "LOT-RM-123" issued quantity 1000 kg
And the lot has previous returns totaling 800 kg
When Factory Manager attempts to return 300 kg from "LOT-RM-123"
Then the system returns HTTP 422 Unprocessable Entity
And the error message states "Cannot return 300 kg. Maximum returnable: 200 kg from lot LOT-RM-123"
And no transaction is recorded
And the WO materials remain unchanged
```

### Test Implementation
```typescript
test('AT-1.2: Excess return attempt blocked with helpful error', async ({ page }) => {
  // Given: WO with specific lot issuance
  const woId = await createWorkOrder(page, { 
    materials: [{ lotId: 'LOT-RM-123', issuedQty: 1000, previousReturns: 800 }]
  });
  
  // When: Attempt excess return
  const response = await page.request.post(`/api/work-orders/${woId}/return-materials`, {
    data: { lotId: 'LOT-RM-123', returnQty: 300 }
  });
  
  // Then: Verify 422 with specific error message
  expect(response.status()).toBe(422);
  const error = await response.json();
  expect(error.message).toContain('Cannot return 300 kg. Maximum returnable: 200 kg');
  expect(error.lotId).toBe('LOT-RM-123');
});
```

---

## AT-2: On-the-Fly SKU Creation

**PRD Requirement:** FM finalizes new attribute → Pending SKU; packing allowed (policy=ON); invoice blocked; after CEO approve → invoice posts.

### Scenario 2.1: FM Creates Pending SKU
```gherkin
Given Factory Manager is finalizing a Work Order with TBD attributes
And the resulting attribute combination does not match any existing SKU
When FM submits attributes: {diameter: "2.5mm", insulation: "PVC", color: "Red"}
Then a Pending SKU is created with status "PENDING_APPROVAL" 
And the SKU is assigned temporary ID "SKU-PENDING-001"
And CEO receives notification of pending SKU approval
And the lot can proceed to packing operations
```

### Scenario 2.2: Packing Allowed with Pending SKU
```gherkin
Given a lot with Pending SKU "SKU-PENDING-001" 
And system policy is "ALLOW_PENDING_SKU_PACKING=ON"
When Factory Worker creates Packing Units from this lot
Then PU creation succeeds
And PUs are marked with "PENDING_SKU" flag
And PUs can be added to Packing Lists
But PUs cannot be invoiced until SKU approval
```

### Scenario 2.3: Invoice Blocked Until Approval
```gherkin
Given Packing Units with Pending SKU "SKU-PENDING-001"
And PUs have been dispatched via DN
When Office attempts to create invoice from completed dispatch
Then invoice creation is blocked
And error message states "Cannot invoice items with pending SKU approval"
And invoice remains in "BLOCKED" status
```

### Scenario 2.4: CEO Approval Enables Invoicing
```gherkin
Given Pending SKU "SKU-PENDING-001" 
When CEO approves the SKU request
Then SKU status changes to "ACTIVE"
And SKU receives permanent ID "SKU-WIR-2.5-PVC-RED"
And all associated PUs/PLs/DNs are updated with new SKU ID
And blocked invoices become available for processing
And approval is logged in audit trail with CEO signature
```

---

## AT-3: Lost Barcode Recovery

**PRD Requirement:** Operator reprints PU label; old barcode invalid; new scans resolve to same PU; audit records reprint.

### Scenario 3.1: Barcode Reprint Process
```gherkin
Given a Packing Unit "PU-12345" with barcode "PU:12345:V1"
And the original label is damaged/lost
When Factory Worker initiates barcode reprint for "PU-12345"
Then the system generates new barcode "PU:12345:V2"
And the old barcode "PU:12345:V1" is marked INVALID
And new label is printed with updated barcode
And reprint event is logged in audit trail with reason
```

### Scenario 3.2: Old Barcode Scan Rejection
```gherkin
Given a reprinted PU "PU-12345" with old barcode "PU:12345:V1" marked invalid
When Factory Worker scans old barcode "PU:12345:V1"  
Then the scan is rejected
And system displays "Barcode invalid. PU reprinted. Use new barcode: PU:12345:V2"
And no inventory transaction occurs
```

### Scenario 3.3: New Barcode Resolves Correctly
```gherkin
Given a reprinted PU "PU-12345" with new barcode "PU:12345:V2"
When Factory Worker scans new barcode "PU:12345:V2"
Then the scan resolves to original PU "PU-12345"
And all PU attributes and history remain intact
And scan operation proceeds normally (packing, dispatch, etc.)
```

---

## AT-4: DN Rejection Flow

**PRD Requirement:** DN rejected → returns to Draft; PUs become available; reason logged; realtime update reaches packing screen.

### Scenario 4.1: DN Rejection Process
```gherkin
Given a Dispatch Note "DN-2024-001" in "PENDING_APPROVAL" status
And DN contains PU "PU-12345" currently allocated to this dispatch
When Factory Manager rejects DN with reason "Incorrect customer address"
Then DN status changes to "DRAFT" 
And PU "PU-12345" status changes from "ALLOCATED" to "AVAILABLE"
And rejection reason is logged with timestamp and user ID
And realtime event is broadcasted to factory scope
```

### Scenario 4.2: Realtime Updates Reach UI
```gherkin
Given Factory Worker has Packing List screen open
And PU "PU-12345" is currently showing as "ALLOCATED"
When DN containing this PU is rejected (from different session)
Then the packing screen receives realtime update
And PU "PU-12345" changes from "ALLOCATED" to "AVAILABLE" without page refresh
And PU becomes selectable for new packing operations
And notification shows "DN-2024-001 rejected - PUs now available"
```

---

## AT-5: GRN Discrepancy Management

**PRD Requirement:** Short receipt creates Discrepancy Record; stock reflects received qty; resolution adjusts source/destination.

### Scenario 5.1: Short Receipt Processing
```gherkin
Given a Dispatch Note "DN-2024-001" with PU "PU-12345" quantity 1000 units
And GRN is being processed at receiving factory
When receiving Factory Manager logs actual received quantity as 950 units
Then a Discrepancy Record "DISC-001" is created
And stock adjustment reflects 950 units (received quantity)
And discrepancy shows 50 units short
And both sending and receiving factory are notified
```

### Scenario 5.2: Discrepancy Resolution
```gherkin
Given Discrepancy Record "DISC-001" showing 50 units short
When source factory confirms 50 units were damaged in transit
And resolution action is "WRITE_OFF_TRANSPORT_DAMAGE" 
Then source factory stock is adjusted down by 50 units
And destination factory stock remains at received 950 units
And discrepancy record status changes to "RESOLVED"
And resolution is logged with approving manager signature
```

---

## AT-6: QC Block Enforcement

**PRD Requirement:** Lot with FAIL cannot be added to PL; attempt shows error; override by CEO logs event and requires rationale.

### Scenario 6.1: QC Block Prevents Packing
```gherkin
Given Inventory Lot "LOT-FG-456" with QC status "FAIL"
And QC failure reason is "Insulation thickness below specification"
When Factory Worker attempts to add lot to Packing List "PL-001"
Then the addition is blocked
And error message displays "Cannot pack lot LOT-FG-456: QC Status FAIL (Insulation thickness below specification)"
And lot is not added to packing list
```

### Scenario 6.2: CEO Override Process
```gherkin
Given blocked lot "LOT-FG-456" with QC status "FAIL"
When CEO initiates QC override for lot "LOT-FG-456"
And provides rationale "Customer accepted with discount - email approval attached"
Then lot status changes to "FAIL_OVERRIDE"
And lot becomes available for packing operations
And override event is logged with CEO ID, timestamp, and rationale
And notification is sent to QC manager
```

---

## AT-7: Realtime Cache Invalidation

**PRD Requirement:** CEO edits price list → only price list views update; no full app reload; list heads revalidated.

### Scenario 7.1: Scoped Realtime Updates
```gherkin
Given multiple users with different screens open:
  - CEO editing Price List "PL-COPPER-2024"
  - FM viewing Work Order list  
  - Office viewing Customer list
  - FM viewing Price List "PL-COPPER-2024"
When CEO updates copper base price from $8000 to $8200
Then only Price List views receive realtime updates
And Work Order list does NOT refresh
And Customer list does NOT refresh  
And only affected price list subscribers get cache invalidation
```

### Scenario 7.2: Granular Cache Invalidation
```gherkin
Given Price List "PL-COPPER-2024" is cached on client
And SKU "SKU-WIR-2.5-COPPER" has cached price data
When CEO updates base price affecting this SKU
Then client receives targeted cache invalidation for:
  - Price list "PL-COPPER-2024"
  - SKU "SKU-WIR-2.5-COPPER" pricing data
And client does NOT invalidate:
  - Other price lists
  - Non-pricing SKU attributes
  - Unrelated entities (WOs, customers, etc.)
```

---

## Cross-Cutting Test Scenarios

### Factory Scoping Tests
```gherkin
Given user "FM-Factory-A" logged into Factory A
And user "FM-Factory-B" logged into Factory B  
When FM-Factory-A creates Work Order "WO-A-001"
Then WO-A-001 is visible to Factory A users only
And FM-Factory-B cannot see WO-A-001 in any list or search
And direct API access to WO-A-001 from Factory B returns 404
But CEO (global role) can see WO-A-001 from any context
```

### Audit Trail Verification
```gherkin
Given any significant system action (QC override, SKU approval, etc.)
When the action is completed
Then audit record includes:
  - User ID and role at time of action
  - Timestamp (UTC) with microsecond precision
  - Factory context (if applicable)
  - Action type and entity affected
  - Before/after state (for modifications)
  - Rationale/reason (if required)
And audit records are append-only (no updates/deletes)
And audit chain maintains hash-linked integrity
```

## Test Data Requirements

### Factory Setup
- Factory A: Main production facility
- Factory B: Secondary/satellite facility  
- Test users with appropriate roles and factory assignments

### Sample Data
- Product families: Wire, Cable with configurable attributes
- SKUs: Mix of active and pending approval status
- Work Orders: Various stages (draft, active, completed)
- Inventory lots: Mix of QC statuses (PASS, FAIL, PENDING)
- Customers: With appropriate tax registrations

## Test Environment

- **Database:** Isolated test instance with RLS enabled
- **Authentication:** Test users with proper role assignments
- **Realtime:** WebSocket connections for each test session
- **File Storage:** Temporary bucket for label/document generation
- **API:** Full stack deployment for integration tests

---

**✅ Test Implementation Status:**
- [ ] AT-1: WO Materials Integrity
- [ ] AT-2: On-the-Fly SKU Creation  
- [ ] AT-3: Lost Barcode Recovery
- [ ] AT-4: DN Rejection Flow
- [ ] AT-5: GRN Discrepancy Management
- [ ] AT-6: QC Block Enforcement
- [ ] AT-7: Realtime Cache Invalidation