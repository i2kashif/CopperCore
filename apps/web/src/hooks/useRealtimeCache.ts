import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { cacheKeys } from '@coppercore/shared/cache/keys'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
)

interface RealtimePayload {
  type: string
  id: string
  factoryId: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  changedKeys?: string[]
  version?: number
  ts: string
}

export function useRealtimeCache(factoryId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`factory_${factoryId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public',
          filter: `factory_id=eq.${factoryId}` 
        }, 
        (payload) => {
          const realtimePayload: RealtimePayload = {
            type: payload.table || 'unknown',
            id: payload.new?.id || payload.old?.id || '',
            factoryId: factoryId,
            action: payload.eventType as any,
            version: payload.new?.version,
            ts: new Date().toISOString()
          }

          handleRealtimeUpdate(realtimePayload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [factoryId, queryClient])

  const handleRealtimeUpdate = (payload: RealtimePayload) => {
    switch (payload.type) {
      case 'work_orders':
        queryClient.invalidateQueries({ 
          queryKey: cacheKeys.workOrders.list(payload.factoryId) 
        })
        queryClient.invalidateQueries({ 
          queryKey: cacheKeys.workOrders.detail(payload.id) 
        })
        break

      case 'dispatch_notes':
        queryClient.invalidateQueries({ 
          queryKey: cacheKeys.dispatchNotes.list(payload.factoryId) 
        })
        queryClient.invalidateQueries({ 
          queryKey: cacheKeys.dispatchNotes.detail(payload.id) 
        })
        break

      case 'inventory_lots':
        queryClient.invalidateQueries({ 
          queryKey: cacheKeys.inventory.lots(payload.factoryId) 
        })
        break

      default:
        // Generic invalidation for unknown types
        queryClient.invalidateQueries({ 
          queryKey: [payload.type, payload.factoryId] 
        })
    }
  }

  return { supabase }
}