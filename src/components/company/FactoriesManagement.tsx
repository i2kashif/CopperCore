/**
 * Factories Management Component
 * Provides full CRUD operations for factory management
 */

import React, { useState, useMemo } from 'react'
import {
  useFactories,
  useCreateFactory,
  useUpdateFactory,
  useDeleteFactory,
  useFactoryCodeAvailability
} from '../../hooks/useCompany'
import type { ManagedFactory, FactoryFormData, FactoryFilters } from '../../modules/company/types'
import { companyService } from '../../modules/company/service'

// Factory Form Modal Component
interface FactoryFormModalProps {
  isOpen: boolean
  onClose: () => void
  factory?: ManagedFactory
  onSuccess: () => void
}

function FactoryFormModal({ isOpen, onClose, factory, onSuccess }: FactoryFormModalProps) {
  const [formData, setFormData] = useState<FactoryFormData>({
    name: factory?.name || '',
    code: factory?.code || '',
    active: factory?.active ?? true
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValidating, setIsValidating] = useState(false)

  const createFactory = useCreateFactory()
  const updateFactory = useUpdateFactory()
  
  // Check code availability for new factories or when code changes
  const { data: codeAvailable, isLoading: checkingCode } = useFactoryCodeAvailability(
    formData.code,
    factory?.id,
    formData.code !== factory?.code && formData.code.length >= 2
  )

  const isEditing = !!factory

  // Reset form when modal opens/closes or factory changes
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: factory?.name || '',
        code: factory?.code || '',
        active: factory?.active ?? true
      })
      setErrors({})
    }
  }, [isOpen, factory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsValidating(true)

    // Validate form
    const validation = companyService.validateFactoryForm(formData)
    if (!validation.valid) {
      setErrors(validation.errors)
      setIsValidating(false)
      return
    }

    // Check code availability
    if (!isEditing || formData.code !== factory.code) {
      if (checkingCode || codeAvailable === false) {
        setErrors({ code: 'Factory code is already in use' })
        setIsValidating(false)
        return
      }
    }

    try {
      if (isEditing) {
        await updateFactory.mutateAsync({ factoryId: factory.id, data: formData })
      } else {
        await createFactory.mutateAsync(formData)
      }
      onSuccess()
      onClose()
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Operation failed' })
    }
    
    setIsValidating(false)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="modal-panel large" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h3 className="modal-title">
                {isEditing ? 'Edit Factory' : 'Create Factory'}
              </h3>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                {/* Factory Name */}
                <div className="form-field full-width">
                  <label className="form-label">Factory Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="Enter factory name"
                    data-testid="factory-name-input"
                  />
                  {errors.name && (
                    <div className="text-red-600 text-sm mt-1">{errors.name}</div>
                  )}
                </div>

                {/* Factory Code */}
                <div className="form-field">
                  <label className="form-label">Factory Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className={`form-input ${errors.code ? 'error' : ''}`}
                    placeholder="e.g., FAC001"
                    style={{ textTransform: 'uppercase' }}
                    data-testid="factory-code-input"
                  />
                  {errors.code && (
                    <div className="text-red-600 text-sm mt-1">{errors.code}</div>
                  )}
                  {checkingCode && (
                    <div className="text-blue-600 text-sm mt-1">Checking availability...</div>
                  )}
                  {!checkingCode && codeAvailable === false && formData.code !== factory?.code && (
                    <div className="text-red-600 text-sm mt-1">Code is already in use</div>
                  )}
                  {!checkingCode && codeAvailable === true && formData.code.length >= 2 && (
                    <div className="text-green-600 text-sm mt-1">Code is available</div>
                  )}
                </div>

                {/* Active Status */}
                <div className="form-field">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                      className="checkbox mr-2"
                      data-testid="factory-active-checkbox"
                    />
                    <span className="form-label mb-0">Active Factory</span>
                  </label>
                  <div className="text-sm text-gray-500 mt-1">
                    Only active factories can be used for operations
                  </div>
                </div>
              </div>

              {errors.submit && (
                <div className="alert alert-error mt-4">{errors.submit}</div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isValidating || createFactory.isPending || updateFactory.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={
                  isValidating || 
                  createFactory.isPending || 
                  updateFactory.isPending ||
                  checkingCode ||
                  (!isEditing && codeAvailable === false)
                }
                data-testid="factory-submit-button"
              >
                {isValidating || createFactory.isPending || updateFactory.isPending ? (
                  <span className="loading-spinner"></span>
                ) : (
                  isEditing ? 'Update Factory' : 'Create Factory'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Delete Confirmation Modal
interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  factory: ManagedFactory | null
  onConfirm: () => void
  isDeleting: boolean
}

function DeleteConfirmModal({ isOpen, onClose, factory, onConfirm, isDeleting }: DeleteConfirmModalProps) {
  if (!isOpen || !factory) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title text-red-600">Delete Factory</h3>
          </div>

          <div className="modal-body">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <p className="text-gray-900 font-medium mb-2">
                Are you sure you want to delete "{factory.name}"?
              </p>
              <p className="text-gray-600 text-sm">
                This action cannot be undone. All data associated with this factory will be permanently removed.
              </p>
              {factory.user_count && factory.user_count > 0 && (
                <div className="alert alert-warning mt-4">
                  <strong>Warning:</strong> This factory has {factory.user_count} assigned user(s). 
                  They will lose access to this factory.
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="btn-primary bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
              data-testid="delete-factory-confirm"
            >
              {isDeleting ? (
                <span className="loading-spinner"></span>
              ) : (
                'Delete Factory'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Factories Management Component
export function FactoriesManagement() {
  const [filters, setFilters] = useState<FactoryFilters>({
    search: '',
    active: undefined,
    sort_by: 'name',
    sort_order: 'asc'
  })
  const [selectedFactories, setSelectedFactories] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingFactory, setEditingFactory] = useState<ManagedFactory | null>(null)
  const [deletingFactory, setDeletingFactory] = useState<ManagedFactory | null>(null)

  // Data fetching
  const { data: factories = [], isLoading, error, refetch } = useFactories(filters)
  const deleteFactory = useDeleteFactory()

  // Filtered and sorted data
  const filteredFactories = useMemo(() => {
    return factories.filter(factory => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase()
        const matchesSearch = 
          factory.name.toLowerCase().includes(search) ||
          factory.code.toLowerCase().includes(search)
        if (!matchesSearch) return false
      }

      // Active filter
      if (filters.active !== undefined) {
        if (factory.active !== filters.active) return false
      }

      return true
    })
  }, [factories, filters])

  const handleDeleteFactory = async () => {
    if (!deletingFactory) return

    try {
      await deleteFactory.mutateAsync(deletingFactory.id)
      setDeletingFactory(null)
      setSelectedFactories(prev => prev.filter(id => id !== deletingFactory.id))
    } catch (error) {
      console.error('Failed to delete factory:', error)
    }
  }

  const handleBulkAction = async (action: 'activate' | 'deactivate') => {
    // Implementation for bulk actions would go here
    console.log(`Bulk ${action} for factories:`, selectedFactories)
  }

  const handleSelectFactory = (factoryId: string, selected: boolean) => {
    setSelectedFactories(prev => 
      selected 
        ? [...prev, factoryId]
        : prev.filter(id => id !== factoryId)
    )
  }

  const handleSelectAll = (selected: boolean) => {
    setSelectedFactories(selected ? filteredFactories.map(f => f.id) : [])
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-4xl mb-4">❌</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Factories</h3>
        <p className="text-gray-600 mb-4">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <button onClick={() => refetch()} className="btn-primary">
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Factories</h2>
          <p className="text-sm text-gray-600">
            {filteredFactories.length} of {factories.length} factories
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
          data-testid="create-factory-button"
        >
          <span className="mr-2">+</span>
          Create Factory
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-row">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="search-input"
              placeholder="Search factories..."
              data-testid="factories-search"
            />
          </div>

          {/* Active Filter */}
          <select
            value={filters.active === undefined ? '' : filters.active.toString()}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              active: e.target.value === '' ? undefined : e.target.value === 'true'
            }))}
            className="select-input"
            data-testid="factories-active-filter"
          >
            <option value="">All Status</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>

          {/* Sort */}
          <select
            value={`${filters.sort_by}-${filters.sort_order}`}
            onChange={(e) => {
              const [sort_by, sort_order] = e.target.value.split('-')
              setFilters(prev => ({ 
                ...prev, 
                sort_by: sort_by as any,
                sort_order: sort_order as any
              }))
            }}
            className="select-input"
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="code-asc">Code (A-Z)</option>
            <option value="code-desc">Code (Z-A)</option>
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedFactories.length > 0 && (
        <div className="bulk-actions">
          <div className="bulk-actions-info">
            {selectedFactories.length} factory(ies) selected
          </div>
          <div className="bulk-actions-buttons">
            <button
              onClick={() => handleBulkAction('activate')}
              className="btn-sm btn-secondary"
            >
              Activate
            </button>
            <button
              onClick={() => handleBulkAction('deactivate')}
              className="btn-sm btn-secondary"
            >
              Deactivate
            </button>
          </div>
        </div>
      )}

      {/* Factories Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-gray-600">Loading factories...</p>
          </div>
        ) : filteredFactories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏭</div>
            <div className="empty-state-title">No factories found</div>
            <div className="empty-state-description">
              {filters.search || filters.active !== undefined
                ? 'No factories match your current filters'
                : 'Get started by creating your first factory'
              }
            </div>
            {!filters.search && filters.active === undefined && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary mt-4"
              >
                Create Factory
              </button>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedFactories.length === filteredFactories.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="checkbox"
                  />
                </th>
                <th>Factory</th>
                <th>Status</th>
                <th>Users</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFactories.map((factory) => (
                <tr key={factory.id} data-testid={`factory-row-${factory.code}`}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedFactories.includes(factory.id)}
                      onChange={(e) => handleSelectFactory(factory.id, e.target.checked)}
                      className="checkbox"
                    />
                  </td>
                  <td>
                    <div>
                      <div className="font-medium text-gray-900">{factory.name}</div>
                      <div className="text-sm text-gray-500">{factory.code}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${factory.active ? 'badge-active' : 'badge-inactive'}`}>
                      {factory.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <span className="text-gray-900">{factory.user_count || 0}</span>
                  </td>
                  <td>
                    <span className="text-sm text-gray-600">
                      {new Date(factory.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingFactory(factory)}
                        className="btn-sm btn-secondary"
                        data-testid={`edit-factory-${factory.code}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingFactory(factory)}
                        className="btn-sm btn-outline text-red-600 border-red-600"
                        data-testid={`delete-factory-${factory.code}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <FactoryFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetch()}
      />

      <FactoryFormModal
        isOpen={!!editingFactory}
        onClose={() => setEditingFactory(null)}
        factory={editingFactory || undefined}
        onSuccess={() => refetch()}
      />

      <DeleteConfirmModal
        isOpen={!!deletingFactory}
        onClose={() => setDeletingFactory(null)}
        factory={deletingFactory}
        onConfirm={handleDeleteFactory}
        isDeleting={deleteFactory.isPending}
      />
    </div>
  )
}

export default FactoriesManagement