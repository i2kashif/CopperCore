/**
 * Event Emission Utilities
 * Simple event emitter for CopperCore ERP business events
 */

import { EventEmitter } from 'events'

interface CopperCoreEvent {
  type: string
  id: string
  factoryId?: string
  action: string
  changedKeys?: string[]
  version?: number
  timestamp: string
  data?: Record<string, any>
}

class CopperCoreEventEmitter extends EventEmitter {
  /**
   * Emit a business event with standardized structure
   */
  emitBusinessEvent(event: CopperCoreEvent): void {
    const standardizedEvent = {
      ...event,
      timestamp: new Date().toISOString()
    }
    
    console.log(`🔔 Event: ${event.type}`, standardizedEvent)
    this.emit('business-event', standardizedEvent)
    this.emit(event.type, standardizedEvent)
  }

  /**
   * Factory-specific event emission
   */
  emitFactoryEvent(
    action: 'created' | 'updated' | 'deactivated' | 'reactivated',
    factoryId: string,
    changedKeys?: string[],
    data?: Record<string, any>
  ): void {
    this.emitBusinessEvent({
      type: `factory.${action}`,
      id: factoryId,
      factoryId,
      action,
      changedKeys,
      timestamp: new Date().toISOString(),
      data
    })
  }

  /**
   * User-specific event emission
   */
  emitUserEvent(
    action: 'created' | 'updated' | 'deactivated' | 'reactivated' | 'factory_assigned' | 'factory_removed',
    userId: string,
    changedKeys?: string[],
    data?: Record<string, any>,
    factoryId?: string
  ): void {
    this.emitBusinessEvent({
      type: `user.${action}`,
      id: userId,
      factoryId,
      action,
      changedKeys,
      timestamp: new Date().toISOString(),
      data
    })
  }
}

// Global event emitter instance
export const eventEmitter = new CopperCoreEventEmitter()

// Event types
export interface FactoryEventData {
  id: string
  code: string
  name: string
  address?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserEventData {
  id: string
  auth_id?: string
  username: string
  email?: string
  role: string
  full_name?: string
  active: boolean
  created_at: string
  updated_at: string
  factories?: Array<{
    id: string
    code: string
    name: string
  }>
}