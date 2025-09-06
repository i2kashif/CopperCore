/docs/prompts/playwright_grn_discrepancy.md

# Playbook: Playwright Spec — GRN Discrepancy (Short Receipt)

> **Goal**  
Author an end-to-end test for **DN-first GRN** where one PU is **short** on receipt. The flow must create a **Discrepancy Record**, keep inventory **accurate** (no double-count), and emit **scoped realtime** events per PRD §3.7. Finalization/close actions are **blocked** until discrepancy resolution is recorded per PRD §5.7.

---

## Context (PRD-v1.5.md)
- **DN-first GRN** (§5.7): Scan DN to preload GRN; confirm PUs/qty.  
- **Discrepancy Management** (§5.7): Over/Short/Damaged → Discrepancy Record (Open → Under Review → Resolved); resolution adjusts source/destination or triggers return/replacement.  
- **Posting guard** (§5.7): GRN can be drafted/posted with discrepancies, but **completion/close** (and period close) **requires a pending action/resolution** to be recorded.  
- **Realtime** (§3.7): Fire events on `doc:grn:<id>` and `list:grn:<factoryId>`; debounce **250–500 ms**; list views refetch **heads only**.

---

## Preconditions
- **Preview/ephemeral DB** seeded: factories **A** (source) and **B** (destination).  
- A **DN** exists with **10 PUs** from A→B (internal transfer).  
- UI has stable `data-testid` hooks for GRN pages and discrepancy UI.  
- Supabase Realtime enabled for the test environment.  
- Helpers available (or to be added) under `apps/web/e2e/fixtures/grn.ts`.

---

## Steps (Plan Mode)
1. **Data builder**  
   Seed or create a DN (10 PUs) for A→B. Ensure PUs are traceable by ID/alias. Provide factory IDs for subscription scoping.

2. **Spec actions**  
   - Navigate to `/grn?dn=<DN_ID>` (DN-first preload).  
   - Mark **one PU** as **Short** with reason (e.g., `"Damaged wrap"`).  
   - Post GRN to persist draft with discrepancy OPEN **(do not finalize/close yet)**.

3. **Assertions (state + UI + realtime)**  
   - UI shows **Discrepancy = OPEN**.  
   - Destination stock reflects **9/10** received (no double-count).  
   - **In-Transit** ledger decrements appropriately (A→In-Transit → B), reconciling for 9 received.  
   - **Realtime**: receive `doc:grn:<id>` and `list:grn:<factoryId>` events (debounced within 250–500 ms).  
   - **Completion guard**: “Finalize/Close GRN” action is disabled or errors with guidance until a **resolution action** is recorded for the discrepancy.

4. **(Optional) Resolution path**  
   - Record a resolution (e.g., **adjust source** and **short accept** at destination).  
   - Assert GRN can now **Finalize/Close**; events fire; ledgers reflect final outcome.

5. **Artifacts**  
   - Save Playwright trace/screenshot/video on failure.  
   - Log captured realtime events for debugging.

---

## Deliverables
- `apps/web/e2e/grn_discrepancy.spec.ts` — main spec  
- `apps/web/e2e/fixtures/grn.ts` — builders: `seedDNWithPUs`, `markShortOnReceipt`, `observeRealtime`, `finalizeIfResolved`  
- CI step to upload Playwright traces on failure

---

## Example Spec Skeleton
```ts
import { test, expect } from '@playwright/test';
import {
  seedDNWithPUs,
  markShortOnReceipt,
  observeRealtime,
  tryFinalizeGRN,
  resolveDiscrepancy
} from './fixtures/grn';

test('GRN Discrepancy: short receipt blocks finalization until resolved', async ({ page }) => {
  const { dnId, grnId, factoryId, puIds } = await seedDNWithPUs({ count: 10 });
  await page.goto(`/grn?dn=${dnId}`);

  // Short one PU with reason
  await markShortOnReceipt(page, puIds[0], 'Damaged wrap');

  // Persist GRN in "posted/draft-with-discrepancy" state (per app semantics)
  await page.getByTestId('post-grn').click();

  // UI assertions
  await expect(page.getByTestId('discrepancy-status')).toHaveText(/OPEN/i);
  await expect(page.getByTestId('grn-received-count')).toHaveText('9/10');

  // Completion guard: cannot finalize while discrepancy unresolved
  await expect(
    tryFinalizeGRN(page)
  ).rejects.toThrow(); // or button disabled; adjust per implementation

  // Realtime assertions (debounced)
  const events = await observeRealtime({ page, factoryId, docId: grnId ?? dnId, debounceMs: 300 });
  expect(events.doc).toMatchObject({ action: 'update' });
  expect(events.list).toBeTruthy();

  // Optional: resolve discrepancy and finalize
  await resolveDiscrepancy(page, { action: 'adjust_source', note: 'Accept short at destination' });
  await expect(tryFinalizeGRN(page)).resolves.not.toThrow();
});


---

## Suggested data-testid Contract (stable hooks)
	•	grn-status — overall status
	•	discrepancy-status — per-GRN discrepancy status (OPEN/UNDER_REVIEW/RESOLVED)
	•	grn-received-count — 9/10 format
	•	pu-<PU_ID>-short — toggle short flag for a PU
	•	short-reason-input — text area/input for reason
	•	post-grn — persist GRN with current markings
	•	finalize-grn — attempt to finalize/close GRN (should be blocked while OPEN)
	•	resolve-discrepancy — CTA to open resolution dialog/action

---

## Fixture Hints (apps/web/e2e/fixtures/grn.ts)

import { expect, Page } from '@playwright/test';

export async function seedDNWithPUs({ count = 10 } = {}) {
  // Create or fetch a DN for A→B with `count` PUs via API or direct DB helper
  // Return IDs for DN, GRN (if created on load), factoryId (destination), and PU IDs
  return { dnId: 'DN123', grnId: 'GRN456', factoryId: 'FACT_B', puIds: Array.from({length: count}, (_, i) => `PU${i}`) };
}

export async function markShortOnReceipt(page: Page, puId: string, reason: string) {
  await page.getByTestId(`pu-${puId}-short`).click();
  await page.getByTestId('short-reason-input').fill(reason);
}

export async function tryFinalizeGRN(page: Page) {
  const btn = page.getByTestId('finalize-grn');
  if (await btn.isDisabled()) throw new Error('Finalize blocked (disabled)');
  await btn.click();
  // Depending on app, a toast or modal may show an error; assert if needed
}

export async function resolveDiscrepancy(page: Page, opts: { action: 'adjust_source'|'return'|'replace'; note: string }) {
  await page.getByTestId('resolve-discrepancy').click();
  await page.getByRole('combobox', { name: /resolution action/i }).selectOption(opts.action);
  await page.getByRole('textbox', { name: /note/i }).fill(opts.note);
  await page.getByRole('button', { name: /confirm/i }).click();
}

export async function observeRealtime({ page, factoryId, docId, debounceMs = 300 }:{
  page: Page; factoryId: string; docId: string; debounceMs?: number;
}) {
  // Implementation detail depends on your test harness; minimal placeholder:
  await page.waitForTimeout(debounceMs + 50);
  return {
    doc: { action: 'update', id: docId },
    list: { type: 'grn', factoryId }
  };
}


---

## CI Artifacts (snippet)

# .github/workflows/e2e-grn.yml
name: e2e-grn
on:
  pull_request:
    paths:
      - "apps/web/e2e/**"
      - "apps/web/src/**"
      - "infra/**"
jobs:
  e2e-grn:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm i --frozen-lockfile
      - name: DB migrate (preview)
        run: pnpm -w db:migrate:preview
      - name: Run Playwright (GRN discrepancy)
        run: pnpm -w e2e -- tests/e2e/grn_discrepancy.spec.ts --reporter=line
      - name: Upload Playwright traces
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-traces
          path: apps/web/playwright-report/


---

## Stop for Review
	•	Validate that stock and in-transit numbers match expectations after short receipt.
	•	Confirm finalization is blocked until a resolution action is recorded.
	•	Ensure realtime scope: only factory B (destination) views update; other factories remain unaffected.
	•	Obtain QA + Architect approval before merge.

