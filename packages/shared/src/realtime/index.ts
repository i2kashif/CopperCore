import { z } from 'zod'

// Realtime Payload Specification for CopperCore ERP
// Follows PRD-v1.5.md §3.7 Realtime requirements

// Base realtime payload schema
export const realtimePayloadSchema = z.object({
  type: z.string(), // Entity type (work_order, packing_unit, etc.)
  id: z.string().uuid(), // Entity ID
  factoryId: z.string().uuid(), // Factory scope
  action: z.enum(['INSERT', 'UPDATE', 'DELETE']), // Database action
  changedKeys: z.array(z.string()).optional(), // Which fields changed
  version: z.number().int().min(1).optional(), // Optimistic locking version
  timestamp: z.string().datetime(), // ISO timestamp
  userId: z.string().uuid().optional(), // Who made the change
  metadata: z.record(z.any()).default({}), // Additional context
})

export type RealtimePayload = z.infer<typeof realtimePayloadSchema>

// Specific payload types for different entities
export const workOrderRealtimeSchema = realtimePayloadSchema.extend({
  type: z.literal('work_order'),
  data: z.object({
    wo_number: z.string(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
    target_quantity: z.number(),
    current_quantity: z.number(),
  }).partial().optional(),
})

export const packingUnitRealtimeSchema = realtimePayloadSchema.extend({
  type: z.literal('packing_unit'),
  data: z.object({
    pu_code: z.string(),
    status: z.enum(['CREATED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED']),
    qc_status: z.enum(['PENDING', 'PASS', 'HOLD', 'FAIL']),
    quantity: z.number(),
  }).partial().optional(),
})

export const dispatchNoteRealtimeSchema = realtimePayloadSchema.extend({
  type: z.literal('dispatch_note'),
  data: z.object({
    dn_number: z.string(),
    status: z.enum(['DRAFT', 'DISPATCHED', 'DELIVERED', 'CANCELLED']),
    destination_factory_id: z.string().uuid().optional(),
  }).partial().optional(),
})

export const grnRealtimeSchema = realtimePayloadSchema.extend({
  type: z.literal('grn'),
  data: z.object({
    grn_number: z.string(),
    status: z.enum(['PENDING', 'RECEIVED', 'DISCREPANCY']),
    source_factory_id: z.string().uuid().optional(),
  }).partial().optional(),
})

// Union type for all realtime payloads
export const anyRealtimePayloadSchema = z.union([
  workOrderRealtimeSchema,
  packingUnitRealtimeSchema,
  dispatchNoteRealtimeSchema,
  grnRealtimeSchema,
  realtimePayloadSchema, // fallback for unknown types
])

export type AnyRealtimePayload = z.infer<typeof anyRealtimePayloadSchema>

// Cache invalidation mapping
// Maps realtime events to cache keys that should be invalidated
export const cacheInvalidationMap = {
  work_order: (payload: RealtimePayload) => [
    ['work_orders', 'list', payload.factoryId],
    ['work_orders', 'detail', payload.id],
    ['work_orders', 'by_status', payload.factoryId],
  ],
  
  packing_unit: (payload: RealtimePayload) => [
    ['packing_units', 'list', payload.factoryId],
    ['packing_units', 'detail', payload.id],
    ['packing_units', 'by_code', payload.factoryId],
    ['inventory', 'lots', payload.factoryId],
  ],
  
  dispatch_note: (payload: RealtimePayload) => [
    ['dispatch_notes', 'list', payload.factoryId],
    ['dispatch_notes', 'detail', payload.id],
    ['inventory', 'movements', payload.factoryId],
    // Invalidate destination factory if inter-factory transfer
    ...(payload.metadata?.destination_factory_id 
      ? [['dispatch_notes', 'incoming', payload.metadata.destination_factory_id]]
      : []
    ),
  ],
  
  grn: (payload: RealtimePayload) => [
    ['grns', 'list', payload.factoryId],
    ['grns', 'detail', payload.id],
    ['inventory', 'lots', payload.factoryId],
    ['inventory', 'movements', payload.factoryId],
    // Invalidate DN if linked
    ...(payload.metadata?.dispatch_note_id
      ? [['dispatch_notes', 'detail', payload.metadata.dispatch_note_id]]
      : []
    ),
  ],
  
  inventory_lot: (payload: RealtimePayload) => [
    ['inventory', 'lots', payload.factoryId],
    ['inventory', 'lot', payload.id, payload.factoryId],
    ['inventory', 'movements', payload.factoryId],
  ],
  
  audit_event: (payload: RealtimePayload) => [
    ['audit', 'events', payload.factoryId],
    ['audit', 'entity', payload.metadata?.entity_type, payload.metadata?.entity_id],
  ],
} as const

// Helper function to get cache keys for invalidation
export function getCacheKeysForInvalidation(payload: RealtimePayload): string[][] {
  const invalidator = cacheInvalidationMap[payload.type as keyof typeof cacheInvalidationMap]
  return invalidator ? invalidator(payload) : []
}

// Realtime channel naming convention
export function getRealtimeChannel(factoryId: string): string {
  return `factory_${factoryId}`
}

export function getGlobalRealtimeChannel(): string {
  return 'global_changes'
}

// Filter functions for client-side realtime handling
export function shouldInvalidateCache(
  payload: RealtimePayload, 
  currentFactoryId: string,
  userRole: 'CEO' | 'DIRECTOR' | 'FACTORY_MANAGER' | 'FACTORY_WORKER'
): boolean {
  // CEO/Director see all changes
  if (userRole === 'CEO' || userRole === 'DIRECTOR') {
    return true
  }
  
  // Factory users see own factory changes
  if (payload.factoryId === currentFactoryId) {
    return true
  }
  
  // Factory Manager can see incoming transfers
  if (userRole === 'FACTORY_MANAGER' && payload.type === 'dispatch_note') {
    return payload.metadata?.destination_factory_id === currentFactoryId
  }
  
  return false
}

// Database trigger payload transformer
// Transforms Supabase realtime payload to our standard format
// Minimal type for Supabase realtime payload we consume
type SupabaseRealtimePayload = {
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  schema?: string
  commit_timestamp?: string
  record?: Record<string, unknown> & { id?: string; version?: number; updated_by?: string }
  old_record?: Record<string, unknown> & { id?: string }
}

export function transformSupabasePayload(
  supabasePayload: SupabaseRealtimePayload,
  factoryId: string
): RealtimePayload {
  // Ensure we always provide a string id for type compatibility
  const id = (supabasePayload.record?.id ?? supabasePayload.old_record?.id) as string
  
  return {
    type: supabasePayload.table,
    id,
    factoryId: factoryId,
    action: supabasePayload.eventType,
    changedKeys: supabasePayload.record ? Object.keys(supabasePayload.record) : undefined,
    version: supabasePayload.record?.version,
    timestamp: new Date().toISOString(),
    userId: supabasePayload.record?.updated_by,
    metadata: {
      schema: supabasePayload.schema,
      commit_timestamp: supabasePayload.commit_timestamp,
      ...extractMetadata(supabasePayload.table, supabasePayload.record),
    },
  }
}

// Extract relevant metadata based on entity type
function extractMetadata(table: string, record: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!record) return {}
  
  switch (table) {
    case 'dispatch_note':
      return {
        destination_factory_id: (record as { destination_factory_id?: string }).destination_factory_id,
        status: (record as { status?: string }).status,
      }
    case 'grn':
      return {
        dispatch_note_id: (record as { dispatch_note_id?: string }).dispatch_note_id,
        source_factory_id: (record as { source_factory_id?: string }).source_factory_id,
        status: (record as { status?: string }).status,
      }
    case 'audit_chain':
      return {
        entity_type: (record as { entity_type?: string }).entity_type,
        entity_id: (record as { entity_id?: string }).entity_id,
        action: (record as { action?: string }).action,
      }
    default:
      return {}
  }
}
