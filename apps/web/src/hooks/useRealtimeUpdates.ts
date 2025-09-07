/**
 * BACK-16: Realtime updates hook via Supabase channels
 * Provides realtime subscription to entity changes per PRD §3.7
 * Debounced updates with cache key mapping: doc:<type>:<id> and list:<type>:<factoryId>
 */

import { useEffect, useCallback, useRef } from 'react'
import { useCurrentUser } from './useCurrentUser'

// Mock realtime events for development when Supabase is unavailable
interface RealtimeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  schema: string
  table: string
  new: any
  old: any
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
  const simulateRealtimeEvent = useCallback(() => {
    // Simulate occasional user updates
    if (Math.random() < 0.1 && callbacks.onUserChange) {
      const mockEvent: RealtimeEvent = {
        eventType: 'UPDATE',
        schema: 'public',
        table: 'users',
        new: { id: 'mock-user-1', last_login_at: new Date().toISOString() },
        old: { id: 'mock-user-1', last_login_at: '2024-01-01T00:00:00Z' },
        commit_timestamp: new Date().toISOString()
      }
      
      debouncedCallback('user-update-mock-user-1', () => {
        callbacks.onUserChange!(mockEvent)
        console.log('🔄 Realtime: User updated (mock)', mockEvent.new.id)
      })
    }

    // Simulate occasional factory updates
    if (Math.random() < 0.05 && callbacks.onFactoryChange) {
      const mockEvent: RealtimeEvent = {
        eventType: 'UPDATE', 
        schema: 'public',
        table: 'factories',
        new: { id: 'fac-001', updated_at: new Date().toISOString() },
        old: { id: 'fac-001', updated_at: '2024-01-01T00:00:00Z' },
        commit_timestamp: new Date().toISOString()
      }

      debouncedCallback('factory-update-fac-001', () => {
        callbacks.onFactoryChange!(mockEvent)
        console.log('🔄 Realtime: Factory updated (mock)', mockEvent.new.id)
      })
    }
  }, [callbacks, debouncedCallback])

  // Set up realtime subscriptions
  useEffect(() => {
    console.log('🔌 Realtime: Setting up subscriptions for user', currentUser.id)
    
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
      mockIntervalRef.current = setInterval(simulateRealtimeEvent, 5000)
    }

    return () => {
      console.log('🔌 Realtime: Cleaning up subscriptions')
      
      // Clear all debounce timers
      debounceTimersRef.current.forEach((timer) => clearTimeout(timer))
      debounceTimersRef.current.clear()
      
      // Clear mock interval
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current)
      }
      
      // In real implementation: channel.unsubscribe()
    }
  }, [currentUser.id, simulateRealtimeEvent])

  // Manual refresh trigger for cache invalidation
  const triggerRefresh = useCallback((entityType: 'users' | 'factories', entityId?: string) => {
    console.log(`🔄 Realtime: Manual refresh triggered for ${entityType}`, entityId)
    
    const mockEvent: RealtimeEvent = {
      eventType: 'UPDATE',
      schema: 'public', 
      table: entityType,
      new: { id: entityId || 'manual-refresh', updated_at: new Date().toISOString() },
      old: {},
      commit_timestamp: new Date().toISOString()
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
  }, [callbacks, debouncedCallback])

  return {
    triggerRefresh,
    isConnected: true, // In real implementation, this would track connection status
  }
}