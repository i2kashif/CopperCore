/docs/prompts/realtime_cache_invalidation.md

# Playbook: Realtime Cache Invalidation (TanStack + Supabase)

> **Goal**  
Implement fine-grained, low-cost realtime updates that follow PRD §3.7:
- **Channel keys:** `factory:<id>`, `doc:<type>:<id>`, `list:<type>:<factoryId>`
- **Payload:** `{type, id, factoryId, action: 'create'|'update'|'delete'|'approve'|'reject', changedKeys?: string[], version?: number, ts?: string}`
- **Policy:** Invalidate **only** impacted queries, debounce **250–500ms**, subscribe **only** to visible views.

---

## Preconditions
- TanStack Query (normalized cache) in `apps/web`
- Supabase client initialized with Realtime enabled
- Entity pages identify `type`, `id`, and `factoryId` (from route/loader)
- Backend emits row-change events (Supabase `postgres_changes` or server relay) that can be mapped to the payload above

---

## Steps (Plan Mode)

1) **Keys (central mappers)**
   - Define **one source of truth** for cache keys.
   - Provide helpers for doc + list keys and typed aliases.

2) **Subscriptions (scoped + disposable)**
   - On page mount, subscribe only to the channels the view requires:
     - Detail views → `doc:<type>:<id>` and `factory:<id>`
     - List/index views → `list:<type>:<factoryId>` and `factory:<id>`
   - Unsubscribe on unmount/route change; resubscribe on auth/factory change.

3) **Handler (payload → cache updates)**
   - `doc:*` → invalidate **that record only**
   - `list:*` + `create|delete` → refetch **list heads only** (first page)
   - If `changedKeys` present and cached data exists → **patch** cached doc optimistically via `setQueryData` (avoid full refetch)
   - **Version guard:** drop events where `evt.version` < cached version (stale)

4) **Debounce & Coalescing**
   - Batch events in a 250–500ms window
   - **Deduplicate** by `(type,id,action)` keeping the highest `version`
   - Flush on tab visibility regain and before route change

5) **Resilience**
   - Handle reconnect/backoff from Supabase
   - On reconnect, perform a **single lightweight refetch** of the active doc/list to recover missed deltas

6) **Tests**
   - Unit: key mapping, event → invalidation mapping, dedupe/ordering by version
   - E2E: detail view updates without full page reload; list view refetches heads only; debounce respected under bursts

---

## Deliverables
- `apps/web/src/cache/keys.ts`
- `apps/web/src/realtime/subscribe.ts`
- `apps/web/src/realtime/handler.ts`
- `apps/web/test/realtime_handlers.test.ts` (unit)
- `apps/web/e2e/realtime.spec.ts` (E2E)

---

## Example Snippets

### `cache/keys.ts`
```ts
export type DocType =
  | 'wo' | 'pl' | 'dn' | 'grn' | 'lot' | 'pu' | 'invoice' | 'price_list';

export const keyDoc = (type: DocType, id: string) => ['doc', type, id] as const;
export const keyList = (type: DocType, factoryId: string, page = 1) =>
  ['list', type, factoryId, { page }] as const;

// convenience when only "list heads" are required by policy
export const keyListHeads = (type: DocType, factoryId: string) =>
  keyList(type, factoryId, /* page */ 1);

### realtime/subscribe.ts (scoped subscriptions + mapping)

import { createClient } from '@supabase/supabase-js';
import { handleRealtimeEvent, RealtimeEvent } from './handler';

const DEBOUNCE_MS_DEFAULT = 300;

export function subscribeRealtime(opts: {
  supabase: ReturnType<typeof createClient>;
  factoryId: string;
  views: Array<
    | { kind: 'doc'; type: string; id: string }
    | { kind: 'list'; type: string }
  >;
  debounceMs?: number;
  onError?: (e: unknown) => void;
}) {
  const { supabase, factoryId, views, debounceMs = DEBOUNCE_MS_DEFAULT } = opts;
  const channels: Array<ReturnType<typeof supabase.channel>> = [];

  // Aggregate/debounce
  const queue = new Map<string, RealtimeEvent>();
  let timer: number | undefined;

  function enqueue(evt: RealtimeEvent) {
    const key = `${evt.type}:${evt.id}:${evt.action}`;
    const existing = queue.get(key);
    // Keep the highest version (drop stale)
    if (!existing || (evt.version ?? 0) >= (existing.version ?? 0)) {
      queue.set(key, evt);
    }
    if (timer) return;
    // @ts-ignore Node vs browser timers
    timer = setTimeout(flush, debounceMs);
  }

  function flush() {
    queue.forEach((evt) => handleRealtimeEvent(evt));
    queue.clear();
    // @ts-ignore
    clearTimeout(timer);
    timer = undefined;
  }

  // Flush when window regains focus (avoid long-lingering batches)
  if (typeof window !== 'undefined') {
    const onVis = () => { if (document.visibilityState === 'visible') flush(); };
    document.addEventListener('visibilitychange', onVis);
  }

  // Factory channel (optional broadcast for summary events)
  channels.push(
    supabase
      .channel(`factory:${factoryId}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, (chg) => {
        const evt = mapPostgresChangeToEvent(chg, factoryId);
        if (evt) enqueue(evt);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') return;
        // Reconnect/backoff handled by supabase-js; optional logging here
      })
  );

  // View-scoped channels
  for (const v of views) {
    if (v.kind === 'doc') {
      channels.push(
        supabase
          .channel(`doc:${v.type}:${v.id}`)
          .on('postgres_changes', { event: '*', schema: 'public' }, (chg) => {
            const evt = mapPostgresChangeToEvent(chg, factoryId, v.type, v.id);
            if (evt) enqueue(evt);
          })
          .subscribe()
      );
    } else if (v.kind === 'list') {
      channels.push(
        supabase
          .channel(`list:${v.type}:${factoryId}`)
          .on('postgres_changes', { event: '*', schema: 'public' }, (chg) => {
            const evt = mapPostgresChangeToEvent(chg, factoryId, v.type);
            if (evt) enqueue(evt);
          })
          .subscribe()
      );
    }
  }

  return () => {
    channels.forEach((ch) => supabase.removeChannel(ch));
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', () => {});
    }
  };
}

// Convert Supabase change payload into our contracted RealtimeEvent
function mapPostgresChangeToEvent(
  chg: any,
  factoryId: string,
  forceType?: string,
  forceId?: string
): RealtimeEvent | null {
  const row = chg.new || chg.old || {};
  const type = forceType ?? (row.__type || chg.table); // server can annotate __type
  const id = forceId ?? (row.id ?? row.uuid ?? row.code);
  if (!type || !id) return null;

  const action =
    chg.eventType === 'INSERT' ? 'create' :
    chg.eventType === 'UPDATE' ? 'update' :
    chg.eventType === 'DELETE' ? 'delete' : 'update';

  const changedKeys =
    chg.eventType === 'UPDATE' && chg.old && chg.new
      ? Object.keys(chg.new).filter((k) => chg.new[k] !== chg.old[k])
      : undefined;

  return {
    type,
    id: String(id),
    factoryId,
    action,
    changedKeys,
    version: row.version,
    ts: new Date().toISOString(),
  };
}

### realtime/handler.ts (invalidation + optimistic patching)

import { queryClient } from '../queryClient';
import { keyDoc, keyList, keyListHeads, DocType } from '../cache/keys';

export type RealtimeEvent = {
  type: DocType | string;
  id: string;
  factoryId: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject';
  changedKeys?: string[];
  version?: number;
  ts?: string;
};

// Compare optional row versions; undefined means "no guard"
function isStale<T extends { version?: number }>(incoming?: number, cached?: T) {
  return typeof incoming === 'number' &&
         typeof cached?.version === 'number' &&
         incoming < (cached.version as number);
}

export function handleRealtimeEvent(evt: RealtimeEvent) {
  const docKey = keyDoc(evt.type as DocType, evt.id);
  const listKey = keyListHeads(evt.type as DocType, evt.factoryId);

  if (evt.action === 'update' || evt.action === 'approve' || evt.action === 'reject') {
    // Try optimistic patch if we have the entity and keys
    const cached = queryClient.getQueryData<any>(docKey);
    if (cached && evt.changedKeys?.length && !isStale(evt.version, cached)) {
      const patched = { ...cached };
      // NOTE: server should emit minimal fields or a follow-up fetch; patched fields are best-effort
      for (const k of evt.changedKeys) {
        // @ts-ignore
        if (k in patched && evt.hasOwnProperty(k)) patched[k] = (evt as any)[k];
      }
      queryClient.setQueryData(docKey, { ...patched, version: evt.version ?? patched.version });
    } else {
      queryClient.invalidateQueries({ queryKey: docKey });
    }
  }

  if (evt.action === 'create' || evt.action === 'delete') {
    queryClient.invalidateQueries({ queryKey: listKey, refetchType: 'active' });
  }
}


---

## Testing Guidance

Unit (apps/web/test/realtime_handlers.test.ts)
	•	doc update → only doc:<type>:<id> invalidated or patched
	•	list create/delete → only list:<type>:<factoryId>, page=1 invalidated
	•	debounce: 10 events within 200ms produce ≤ 2 handler calls
	•	version guard: stale version is ignored; newer replaces cached

E2E (apps/web/e2e/realtime.spec.ts)
	•	Open a detail view; perform a server-side update; expect UI to reflect change without page reload
	•	Open a list view; create a record; expect first page to refresh, not the entire dataset
	•	Verify unsubscribe on route change (no events handled post-leave)

---

## Cost Control & Safety Notes
	•	Subscribe only to views the user is actively on; unsubscribe on leave
	•	Use list-head refetch to avoid large list churn
	•	Keep debounce at 250–500ms; prefer summary events for bulk ops
	•	Do not surface cross-factory data; confirm factoryId matches current scope before handling
	•	Never include secrets in payloads; only identifiers and minimal change hints

---

## Stop for Review
	•	Architect review required for any change to key shapes, debounce policy, or subscription scope.
	•	If server payloads change, update the mapping function and tests in the same PR.

