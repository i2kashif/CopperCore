/**
 * Factories API service
 * Handles all API calls related to factory management
 */

import { apiClient, ApiError } from './client'
import type { ApiFactory, FactoryStats, ListQuery } from './types'
import type { Factory, FactoryFormData } from '../../features/manage-company/types'

/**
 * Factories API service class
 */
export class FactoriesApi {
  private readonly endpoint = '/api/factories'

  /**
   * Get all factories with optional filtering
   */
  async getFactories(query: ListQuery = {}): Promise<Factory[]> {
    try {
      const queryString = apiClient.buildListQuery(query)
      const response = await apiClient.get<ApiFactory[]>(`${this.endpoint}${queryString}`)

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error?.message || 'Failed to fetch factories',
          response.error?.code || 'FETCH_ERROR',
          0
        )
      }

      // Map API factories to frontend factories
      const { mapApiFactoryToFrontend } = await import('./types')
      return response.data.map(mapApiFactoryToFrontend)
    } catch (error) {
      console.error('Failed to fetch factories:', error)
      throw error instanceof ApiError ? error : new ApiError(
        'Unable to load factories. Please try again.',
        'FETCH_ERROR',
        0
      )
    }
  }

  /**
   * Get a single factory by ID
   */
  async getFactory(id: string): Promise<Factory> {
    try {
      const response = await apiClient.get<ApiFactory>(`${this.endpoint}/${id}`)

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error?.message || 'Factory not found',
          response.error?.code || 'NOT_FOUND',
          404
        )
      }

      const { mapApiFactoryToFrontend } = await import('./types')
      return mapApiFactoryToFrontend(response.data)
    } catch (error) {
      console.error(`Failed to fetch factory ${id}:`, error)
      throw error instanceof ApiError ? error : new ApiError(
        'Unable to load factory details. Please try again.',
        'FETCH_ERROR',
        0
      )
    }
  }

  /**
   * Create a new factory
   */
  async createFactory(factoryData: FactoryFormData): Promise<Factory> {
    try {
      const { mapFrontendFactoryToApi, mapApiFactoryToFrontend } = await import('./types')
      const apiInput = mapFrontendFactoryToApi(factoryData)
      
      const response = await apiClient.post<ApiFactory>(this.endpoint, apiInput)

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error?.message || 'Failed to create factory',
          response.error?.code || 'CREATE_ERROR',
          0
        )
      }

      return mapApiFactoryToFrontend(response.data)
    } catch (error) {
      console.error('Failed to create factory:', error)
      
      if (error instanceof ApiError) {
        // Handle specific error cases
        if (error.isValidationError()) {
          throw new ApiError(
            'Please check your input and try again.',
            'VALIDATION_ERROR',
            400,
            error.details
          )
        }
        if (error.isCode('DUPLICATE_ENTRY')) {
          throw new ApiError(
            'A factory with this code already exists.',
            'DUPLICATE_ENTRY',
            409
          )
        }
        throw error
      }

      throw new ApiError(
        'Unable to create factory. Please try again.',
        'CREATE_ERROR',
        0
      )
    }
  }

  /**
   * Update an existing factory
   */
  async updateFactory(id: string, factoryData: Partial<FactoryFormData>, currentVersion?: number): Promise<Factory> {
    try {
      const { mapFrontendFactoryToApi, mapApiFactoryToFrontend } = await import('./types')
      
      // Prepare update payload
      const updateData = mapFrontendFactoryToApi(factoryData as FactoryFormData)
      const payload = currentVersion ? { ...updateData, version: currentVersion } : updateData
      
      const response = await apiClient.put<ApiFactory>(`${this.endpoint}/${id}`, payload)

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error?.message || 'Failed to update factory',
          response.error?.code || 'UPDATE_ERROR',
          0
        )
      }

      return mapApiFactoryToFrontend(response.data)
    } catch (error) {
      console.error(`Failed to update factory ${id}:`, error)
      
      if (error instanceof ApiError) {
        // Handle specific error cases
        if (error.isOptimisticLockError()) {
          throw new ApiError(
            'This factory was modified by someone else. Please refresh and try again.',
            'OPTIMISTIC_LOCK_ERROR',
            409
          )
        }
        if (error.isValidationError()) {
          throw new ApiError(
            'Please check your input and try again.',
            'VALIDATION_ERROR',
            400,
            error.details
          )
        }
        throw error
      }

      throw new ApiError(
        'Unable to update factory. Please try again.',
        'UPDATE_ERROR',
        0
      )
    }
  }

  /**
   * Delete a factory (soft delete)
   */
  async deleteFactory(id: string): Promise<void> {
    try {
      const response = await apiClient.delete<{ success: boolean }>(`${this.endpoint}/${id}`)

      if (!response.success) {
        throw new ApiError(
          response.error?.message || 'Failed to delete factory',
          response.error?.code || 'DELETE_ERROR',
          0
        )
      }
    } catch (error) {
      console.error(`Failed to delete factory ${id}:`, error)
      
      if (error instanceof ApiError) {
        // Handle specific error cases
        if (error.isCode('FACTORY_SCOPE_VIOLATION')) {
          throw new ApiError(
            'You do not have permission to delete this factory.',
            'FACTORY_SCOPE_VIOLATION',
            403
          )
        }
        throw error
      }

      throw new ApiError(
        'Unable to delete factory. Please try again.',
        'DELETE_ERROR',
        0
      )
    }
  }

  /**
   * Toggle factory status (active/inactive)
   */
  async toggleFactoryStatus(id: string, currentVersion?: number): Promise<Factory> {
    try {
      // First get current factory to determine new status
      const currentFactory = await this.getFactory(id)
      
      return await this.updateFactory(
        id, 
        { isActive: !currentFactory.isActive },
        currentVersion
      )
    } catch (error) {
      console.error(`Failed to toggle factory status ${id}:`, error)
      throw error instanceof ApiError ? error : new ApiError(
        'Unable to update factory status. Please try again.',
        'UPDATE_ERROR',
        0
      )
    }
  }

  /**
   * Get factory statistics
   */
  async getFactoryStats(): Promise<FactoryStats> {
    try {
      const response = await apiClient.get<FactoryStats>(`${this.endpoint}/stats`)

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error?.message || 'Failed to fetch factory statistics',
          response.error?.code || 'FETCH_ERROR',
          0
        )
      }

      return response.data
    } catch (error) {
      console.error('Failed to fetch factory stats:', error)
      throw error instanceof ApiError ? error : new ApiError(
        'Unable to load factory statistics. Please try again.',
        'FETCH_ERROR',
        0
      )
    }
  }

  /**
   * Validate factory code uniqueness
   */
  async validateFactoryCode(code: string, excludeId?: string): Promise<boolean> {
    try {
      const factories = await this.getFactories({ search: code })
      
      // Check if any factory has this exact code (excluding the current one being edited)
      const duplicates = factories.filter(f => 
        f.code.toLowerCase() === code.toLowerCase() && f.id !== excludeId
      )
      
      return duplicates.length === 0
    } catch (error) {
      console.error('Failed to validate factory code:', error)
      // In case of error, assume it's not valid to be safe
      return false
    }
  }
}

/**
 * Singleton factories API instance
 */
export const factoriesApi = new FactoriesApi()

/**
 * Export default instance
 */
export default factoriesApi
