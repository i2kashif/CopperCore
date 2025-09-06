# Playbook: TestSprite Acceptance Suite Seeding (PRD §12)

> **Goal**  
Turn the 7 PRD §12 acceptance tests into **runnable specs** with coverage tags: **RLS**, **QC**, **Realtime**, **PricingBlock**.  
Use **plan mode** with Claude Code + **TestSprite MCP** to generate test files, fixtures, and CI wiring. **Do not commit** until approvals are met.

---

## Context (PRD-v1.5.md refs)
- Concurrency & realtime (§3.7), factory scoping via RLS (§2.2, §10), DN→GRN flows (§5.6–§5.7), QC gating (§5.10), invoice posting blocks (§5.8), audit & “no silent data loss” (§7–§8).

## Preconditions
- TestSprite MCP available in Claude Code.
- Playwright E2E + integration test frameworks bootstrapped.
- Preview/ephemeral DB for seeding (never prod).
- RLS helpers/migrations applied (see `rls_policy.md` playbook).
- “Stable” test IDs in UI (e.g., `data-testid` attributes) for critical flows.

## Conventions (apply uniformly)
- **Spec location:** `tests/acceptance/*.spec.ts`
- **Helpers/builders:** `tests/helpers/{db.ts, builders.ts, realtime.ts, rls.ts}`
- **Naming:** one spec per acceptance test; filenames match bullets below.
- **Tags in test titles:** `[RLS]`, `[QC]`, `[Realtime]`, `[PricingBlock]` to aid filtering.
- **Runners:** Playwright for UI/E2E; direct DB client or app API for integration checks.
- **RLS matrix:** Assert visibility and permissions for roles **CEO, Director, FM, FW**.
- **Determinism:** Use seeded UUIDs and fixed timestamps; clean up via transaction rollbacks.

---

## Steps (Plan Mode)

### 1) Map PRD §12 to Specs (Given/When/Then + tags)

1) **WO Materials Integrity** — _[RLS]_  
   - **Given:** Issued lot qty = **X**; returnable = **X**.  
   - **When:** Attempt to return **> X** for the same lot.  
   - **Then:** API responds **422** with hint; ledger unchanged; audit row added (no destructive change).  
   - **RLS:** FM of factory **A** can issue/return within A; FW limited; CEO/Director can view all.

2) **On-the-Fly SKU (Pending → Approve)** — _[PricingBlock]_  
   - **Given:** FG receipt finalizes a **new SKU identity**; family/customer policy allows packing; Pending SKU created.  
   - **When:** Try to **post invoice** before CEO/Director approval.  
   - **Then:** Posting **blocked** with reason = `PENDING_SKU`; after approval → invoice posts and includes attributes flagged `showIn: invoice`.

3) **Lost Barcode Reprint** — _[QC]_  
   - **Given:** PU label reprinted with reason (lost/damaged).  
   - **When:** Scan the **old** barcode or SSCC alias.  
   - **Then:** Old mapping is **invalid**; scan resolves to **same PU via new code**; audit log includes reason; duplicates guarded.

4) **DN Reject → Draft** — _[Realtime]_  
   - **Given:** DN submitted for verification.  
   - **When:** FM/CEO **rejects** (reason mandatory).  
   - **Then:** DN returns to **Draft**; linked PUs revert to **available**; packing screen receives realtime update; reason captured.

5) **GRN Discrepancy: Short** — _[Realtime]_  
   - **Given:** **DN-first** preload for internal transfer; 1 PU short.  
   - **When:** Post GRN.  
   - **Then:** Discrepancy record = **OPEN**; destination stock reflects **9/10**; in-transit ledger reconciles; realtime fired on `doc:grn:<id>` and `list:grn:<factoryId>` with debounce.

6) **QC Block** — _[QC]_  
   - **Given:** Lot status **FAIL** or **HOLD** per QCP.  
   - **When:** Attempt to add to PL.  
   - **Then:** **Blocked**; CEO/Director override requires audit rationale; subsequent packing allowed only after override.

7) **Realtime Scope: Price List** — _[Realtime, PricingBlock]_  
   - **Given:** CEO edits price list entry.  
   - **When:** Other views are open.  
   - **Then:** Only **price list** views update; list heads revalidated; **no full app reload**; invoice posting rules remain enforced.

---

### 2) Generate Files (TestSprite → code)
In **plan mode**, instruct TestSprite to emit the following with placeholders and builders:

- `tests/acceptance/wo_materials_integrity.spec.ts`  
- `tests/acceptance/pending_sku_invoice_block.spec.ts`  
- `tests/acceptance/label_reprint_invalidation.spec.ts`  
- `tests/acceptance/dn_reject_to_draft.spec.ts`  
- `tests/acceptance/grn_discrepancy_short.spec.ts`  
- `tests/acceptance/qc_block_override.spec.ts`  
- `tests/acceptance/realtime_price_list_scope.spec.ts`  
- `tests/helpers/db.ts` — DB client (preview URL), transaction helpers, role switching (`set_config('request.jwt.claims', …)`).
- `tests/helpers/builders.ts` — seeds: factories/users/roles, WO, DN, PL, PUs, lots, QCP/QC, price list rows.  
- `tests/helpers/realtime.ts` — subscribe to Supabase channels, capture debounced events.  
- `tests/helpers/rls.ts` — role matrix assertions.

> **Important:** Builders must **respect RLS** and factory scoping. Use CEO context to seed cross-factory fixtures if needed.

---

### 3) CI Artifacts
- Upload Playwright traces, HTML reports, and coverage.  
- Matrix jobs for UI (Playwright) and integration (DB/RLS).  
- ENV: `TEST_DB_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` (preview), **never** prod.

**GitHub Actions snippet (add to your main CI):**
```yaml
# .github/workflows/acceptance.yml
name: acceptance
on:
  pull_request:
    paths:
      - "tests/**"
      - "apps/**"
      - "infra/**"
jobs:
  acceptance:
    runs-on: ubuntu-latest
    env:
      TEST_DB_URL: ${{ secrets.TEST_DB_URL_PREVIEW }}
      SUPABASE_URL: ${{ secrets.SUPABASE_URL_PREVIEW }}
      SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY_PREVIEW }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm i --frozen-lockfile
      - name: DB migrate (preview)
        run: pnpm -w db:migrate:preview
      - name: Acceptance (integration + e2e)
        run: |
          pnpm -w test:integration -- --reporter=junit
          pnpm -w e2e -- --reporter=line
      - name: Upload Playwright traces
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-traces
          path: apps/web/playwright-report/


---

### 4) Open PR
	•	Include a summary table (test → status → tags → artifacts).
	•	Link failing traces and DB diffs.
	•	Label QA and Requires Approval if specs reveal policy gaps (e.g., missing RLS on a new table).

---

## Deliverables (expected outputs)
	•	Specs listed in Step 2 under tests/acceptance/…
	•	Helper modules under tests/helpers/…
	•	CI job(s) to run and publish artifacts
	•	Short README in tests/acceptance/ explaining how to run locally

---

## Example Skeletons (two illustrative tests)

A) WO Materials Integrity — integration focus [RLS]

import { asRole, begin, rollback } from '../helpers/db';
import { seedFactoryWithWO, issueRM, tryReturnRM, getLotLedger } from '../helpers/builders';

describe('[RLS] Acceptance: WO Materials Integrity', () => {
  beforeEach(begin);
  afterEach(rollback);

  it('prevents return > issued per lot with 422 and stable ledger', async () => {
    const { factoryA, fmA, lot } = await seedFactoryWithWO();
    await asRole(fmA, async () => {
      await issueRM({ lotId: lot.id, qty: 100 });
      await expect(tryReturnRM({ lotId: lot.id, qty: 150 })).rejects.toMatchObject({ status: 422 });
      const ledger = await getLotLedger(lot.id);
      expect(ledger.delta).toBe(0); // unchanged by failed op
    });
  });
});

B) GRN Discrepancy: Short — E2E + realtime [Realtime]

import { test, expect } from '@playwright/test';
import { seedDNWithPUs, observeRealtime } from '../helpers/builders';

test('[Realtime] Acceptance: GRN Discrepancy (short)', async ({ page }) => {
  const { dnId, factoryId, puIds } = await seedDNWithPUs({ count: 10 });
  await page.goto(`/grn?dn=${dnId}`);
  await page.getByTestId(`pu-${puIds[0]}-short`).click();
  await page.getByTestId('post-grn').click();

  await expect(page.getByTestId('discrepancy-status')).toHaveText('OPEN');
  await expect(page.getByTestId('received-count')).toHaveText('9/10');

  const events = await observeRealtime({ factoryId, docType: 'grn', docId: dnId, debounceMs: 300 });
  expect(events.doc.action).toBe('update');
  expect(events.list).toBeTruthy();
});


---

## Role Matrix Assertions (reference for specs)
	•	CEO / Director: Read/write per module by policy; bypass factory RLS where specified; overrides audited.
	•	FM (scoped): Full WO/packing/GRN within own factory; cannot see other factories.
	•	FW (scoped): Operate scanners, draft docs; limited writes; cannot verify/approve or bypass QC.

Include at least one assertion per role in each spec where relevant.

---

## Stop for Review
	•	QA + Architect sign-off required before merge.
	•	If any spec demands weaker RLS or policy changes, open an ADR and mark PR Requires Approval.
	•	Confirm no test seeds touch pricing or numbering domains unless explicitly approved per PRD “red lines”.

