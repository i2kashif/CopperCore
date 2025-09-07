import { useState } from 'react'
import { useAuth } from '../../auth'
import { useProductFamilies } from '../hooks/useProductFamilies'
import { ProductFamilyList } from './product-families/ProductFamilyList'
import { ProductFamilyForm } from './product-families/ProductFamilyForm'
import { ProductFamilyFilters } from './product-families/ProductFamilyFilters'
import type { ProductFamily, ProductFamilyFilters as FilterType, ProductFamilySort } from '../types/productFamily'

export function ProductFamiliesTab() {
  const { user } = useAuth()
  const {
    productFamilies,
    loading,
    error,
    getFilteredAndSortedFamilies,
    createProductFamily,
    updateProductFamily,
    deleteProductFamily,
    toggleProductFamilyStatus,
    templates
  } = useProductFamilies()

  const [showForm, setShowForm] = useState(false)
  const [editingFamily, setEditingFamily] = useState<ProductFamily | null>(null)
  const [filters, setFilters] = useState<FilterType>({
    search: '',
    isActive: undefined,
    hasAttributes: undefined
  })
  const [sort, setSort] = useState<ProductFamilySort>({
    field: 'name',
    direction: 'asc'
  })

  // Only CEO has full access, Director can view
  const canEdit = user?.role === 'CEO'
  const canView = user?.role === 'CEO' || user?.role === 'Director'

  if (!canView) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-red-900">Access Denied</h3>
        <p className="mt-2 text-sm text-red-700">
          Only CEO and Director roles can access Product Families configuration.
        </p>
      </div>
    )
  }

  const filteredFamilies = getFilteredAndSortedFamilies(filters, sort)

  const handleCreate = () => {
    setEditingFamily(null)
    setShowForm(true)
  }

  const handleEdit = (family: ProductFamily) => {
    if (!canEdit) return
    setEditingFamily(family)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingFamily(null)
  }

  const handleSave = async (data: any) => {
    try {
      if (editingFamily) {
        await updateProductFamily(editingFamily.id, data)
      } else {
        await createProductFamily(data)
      }
      handleCloseForm()
    } catch (err) {
      // Error handling is managed in the hook
      console.error('Save failed:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!canEdit) return
    if (window.confirm('Are you sure you want to delete this product family? This action cannot be undone.')) {
      try {
        await deleteProductFamily(id)
      } catch (err) {
        console.error('Delete failed:', err)
      }
    }
  }

  const handleToggleStatus = async (id: string) => {
    if (!canEdit) return
    try {
      await toggleProductFamilyStatus(id)
    } catch (err) {
      console.error('Status toggle failed:', err)
    }
  }

  if (showForm) {
    return (
      <ProductFamilyForm
        initialData={editingFamily}
        templates={templates}
        onSave={handleSave}
        onCancel={handleCloseForm}
        loading={loading}
        canEdit={canEdit}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Product Families</h3>
          <p className="mt-1 text-sm text-gray-500">
            Configure product families with attributes, SKU naming rules, and default routing.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-copper-600 hover:bg-copper-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-copper-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Product Family
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <ProductFamilyFilters
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={productFamilies.length}
        filteredCount={filteredFamilies.length}
      />

      {/* Product Families List */}
      <ProductFamilyList
        families={filteredFamilies}
        loading={loading}
        sort={sort}
        onSortChange={setSort}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        canEdit={canEdit}
      />

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Product Family Configuration</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Attributes:</strong> Define product characteristics at SKU, Lot, or Unit level</li>
                <li><strong>SKU Naming:</strong> Automatic SKU generation using level=sku attributes</li>
                <li><strong>Templates:</strong> Use Enamel Wire or PVC Cable presets for quick setup</li>
                <li><strong>Routing Rules:</strong> Define default production sequences</li>
                <li><strong>CEO Only:</strong> Can create/edit families and append enum options</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}