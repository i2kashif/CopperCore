/**
 * BACK-16: Realtime updates hook via Supabase channels
 * Provides realtime subscription to entity changes per PRD §3.7
 * Debounced updates with cache key mapping: doc:<type>:<id> and list:<type>:<factoryId>
 */

import { useEffect, useCallback, useRef, useMemo } from 'react'
import { useCurrentUser } from './useCurrentUser'

// Mock realtime events for development when Supabase is unavailable
interface RealtimeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  schema: string
  table: string
  new: Record<string, unknown>
  old: Record<string, unknown>
  commit_timestamp: string
}

interface RealtimeCallbacks {
  onUserChange?: (event: RealtimeEvent) => void
  onFactoryChange?: (event: RealtimeEvent) => void
  onUserFactoryAssignmentChange?: (event: RealtimeEvent) => void
}

/**
 * Hook for managing realtime subscriptions to backend changes
 * Implements debouncing per PRD §3.7 (250-500ms)
 */
// Helper factories to keep main hook small
function makeSimulateRealtimeEvent(
  callbacks: RealtimeCallbacks,
  debouncedCallback: (key: string, fn: () => void, delay?: number) => void
) {
  return function simulateRealtimeEvent() {
    if (Math.random() < 0.1 && callbacks.onUserChange) {
      const mockEvent: RealtimeEvent = {
        eventType: 'UPDATE',
        schema: 'public',
        table: 'users',
        new: { id: 'mock-user-1', last_login_at: new Date().toISOString() },
        old: { id: 'mock-user-1', last_login_at: '2024-01-01T00:00:00Z' },
        commit_timestamp: new Date().toISOString(),
      }
      debouncedCallback('user-update-mock-user-1', () => {
        callbacks.onUserChange!(mockEvent)
        // eslint-disable-next-line no-console
        console.log('🔄 Realtime: User updated (mock)', mockEvent.new.id as string)
      })
    }

    if (Math.random() < 0.05 && callbacks.onFactoryChange) {
      const mockEvent: RealtimeEvent = {
        eventType: 'UPDATE',
        schema: 'public',
        table: 'factories',
        new: { id: 'fac-001', updated_at: new Date().toISOString() },
        old: { id: 'fac-001', updated_at: '2024-01-01T00:00:00Z' },
        commit_timestamp: new Date().toISOString(),
      }
      debouncedCallback('factory-update-fac-001', () => {
        callbacks.onFactoryChange!(mockEvent)
        // eslint-disable-next-line no-console
        console.log('🔄 Realtime: Factory updated (mock)', mockEvent.new.id as string)
      })
    }
  }
}

function makeTriggerRefresh(
  callbacks: RealtimeCallbacks,
  debouncedCallback: (key: string, fn: () => void, delay?: number) => void
) {
  return function triggerRefresh(entityType: 'users' | 'factories', entityId?: string) {
    // eslint-disable-next-line no-console
    console.log(`🔄 Realtime: Manual refresh triggered for ${entityType}`, entityId)

    const mockEvent: RealtimeEvent = {
      eventType: 'UPDATE',
      schema: 'public',
      table: entityType,
      new: { id: entityId || 'manual-refresh', updated_at: new Date().toISOString() },
      old: {},
      commit_timestamp: new Date().toISOString(),
    }

    if (entityType === 'users' && callbacks.onUserChange) {
      debouncedCallback(`manual-user-${entityId}`, () => {
        callbacks.onUserChange!(mockEvent)
      })
    } else if (entityType === 'factories' && callbacks.onFactoryChange) {
      debouncedCallback(`manual-factory-${entityId}`, () => {
        callbacks.onFactoryChange!(mockEvent)
      })
    }
  }
}

// eslint-disable-next-line max-lines-per-function
export function useRealtimeUpdates(callbacks: RealtimeCallbacks) {
  const { currentUser } = useCurrentUser()
  const debounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const mockIntervalRef = useRef<NodeJS.Timeout>()

  // Debounced callback wrapper per PRD §3.7
  const debouncedCallback = useCallback((key: string, fn: () => void, delay = 350) => {
    const existingTimer = debounceTimersRef.current.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => {
      fn()
      debounceTimersRef.current.delete(key)
    }, delay)

    debounceTimersRef.current.set(key, timer)
  }, [])

  // Mock realtime events for development
  const simulateRealtimeEvent = useMemo(
    () => makeSimulateRealtimeEvent(callbacks, debouncedCallback),
    [callbacks, debouncedCallback]
  )

  // Set up realtime subscriptions
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('🔌 Realtime: Setting up subscriptions for user', currentUser.id)
    const timers = debounceTimersRef.current
    let intervalId: NodeJS.Timeout | undefined
    
    // In a real implementation with Supabase, this would be:
    // const client = createClient(...)
    // const channel = client
    //   .channel(`user-${currentUser.id}`)
    //   .on('postgres_changes', {
    //     event: '*',
    //     schema: 'public',
    //     table: 'users',
    //     filter: `id=eq.${currentUser.id}` // Or factory filter for non-global roles
    //   }, (payload) => {
    //     debouncedCallback(`user-${payload.eventType}-${payload.new.id}`, () => {
    //       callbacks.onUserChange?.(payload)
    //     })
    //   })
    //   .subscribe()

    // For development: mock realtime events every 5 seconds
    if (process.env.NODE_ENV === 'development') {
      intervalId = setInterval(simulateRealtimeEvent, 5000)
      mockIntervalRef.current = intervalId
    }

    return () => {
      // eslint-disable-next-line no-console
      console.log('🔌 Realtime: Cleaning up subscriptions')
      
      // Clear all debounce timers
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
      
      // Clear mock interval
      if (intervalId) {
        clearInterval(intervalId)
      }
      
      // In real implementation: channel.unsubscribe()
    }
  }, [currentUser.id, simulateRealtimeEvent])

  // Manual refresh trigger for cache invalidation
  const triggerRefresh = useMemo(
    () => makeTriggerRefresh(callbacks, debouncedCallback),
    [callbacks, debouncedCallback]
  )

  return {
    triggerRefresh,
    isConnected: true, // In real implementation, this would track connection status
  }
}
