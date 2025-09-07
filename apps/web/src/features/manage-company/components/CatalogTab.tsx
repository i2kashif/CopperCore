import { useState, useMemo } from 'react'
import { useSKUs } from '../hooks/useSKUs'
import { useProductFamilies } from '../hooks/useProductFamilies'
import { Button } from '../../../components/ui/Button'
import { TextField } from '../../../components/ui/TextField'
import { SKUCreationWizard } from './SKUCreationWizard'
import { BulkGenerationModal } from './BulkGenerationModal'
import type { SKU } from '../types/sku'

export function CatalogTab() {
  const { skus, loading, filters, setFilters, sort, setSort, processApproval, toggleSKUStatus } = useSKUs()
  const { productFamilies: families } = useProductFamilies()
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [showBulkGeneration, setShowBulkGeneration] = useState(false)
  const [selectedSKU, setSelectedSKU] = useState<SKU | null>(null)

  // Statistics
  const stats = useMemo(() => ({
    total: skus.length,
    active: skus.filter(s => s.status === 'active').length,
    pending: skus.filter(s => s.status === 'pending').length,
    disabled: skus.filter(s => s.status === 'disabled').length,
  }), [skus])

  const handleApprove = async (sku: SKU) => {
    await processApproval({
      skuId: sku.id,
      action: 'approve',
    })
  }

  const handleReject = async (sku: SKU, reason: string) => {
    await processApproval({
      skuId: sku.id,
      action: 'reject',
      reason,
    })
  }

  const getStatusBadge = (status: SKU['status']) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      disabled: 'bg-gray-100 text-gray-800',
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total SKUs</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-900">{stats.active}</div>
          <div className="text-sm text-green-700">Active</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
          <div className="text-sm text-yellow-700">Pending Approval</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{stats.disabled}</div>
          <div className="text-sm text-gray-700">Disabled</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <TextField
            placeholder="Search SKUs..."
            value={filters.search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="max-w-md"
          />
          <select
            className="rounded-md border-gray-300 text-sm"
            value={filters.familyId || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(prev => ({ ...prev, familyId: e.target.value || undefined }))}
          >
            <option value="">All Families</option>
            {families.map(family => (
              <option key={family.id} value={family.id}>{family.name}</option>
            ))}
          </select>
          <select
            className="rounded-md border-gray-300 text-sm"
            value={filters.status || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(prev => ({ ...prev, status: e.target.value as any || undefined }))}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            onClick={() => setShowBulkGeneration(true)}
          >
            Bulk Generate
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowCreateWizard(true)}
          >
            Create SKU
          </Button>
        </div>
      </div>

      {/* SKU Table */}
      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  className="group inline-flex"
                  onClick={() => setSort({ field: 'code', direction: sort.field === 'code' && sort.direction === 'asc' ? 'desc' : 'asc' })}
                >
                  SKU Code
                  <span className="ml-2 flex-none rounded text-gray-400 group-hover:visible">
                    {sort.field === 'code' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Family
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attributes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Inventory
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usage
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {skus.map((sku) => (
              <tr key={sku.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{sku.code}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{sku.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{sku.familyName}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-gray-500">
                    {sku.attributes.slice(0, 2).map(attr => (
                      <div key={attr.attributeKey}>
                        {attr.attributeLabel}: {attr.value}{attr.unit || ''}
                      </div>
                    ))}
                    {sku.attributes.length > 2 && (
                      <div className="text-gray-400">+{sku.attributes.length - 2} more</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(sku.status)}
                  {sku.pendingReason === 'on_the_fly' && (
                    <span className="ml-1 text-xs text-gray-500">(On-the-fly)</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {sku.totalInventory ? `${sku.totalInventory.toFixed(1)} kg` : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {sku.usageCount || 0}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {sku.status === 'pending' ? (
                    <div className="space-x-2">
                      <button
                        onClick={() => handleApprove(sku)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(sku, 'Not compliant')}
                        className="text-red-600 hover:text-red-900"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="space-x-2">
                      <button
                        onClick={() => setSelectedSKU(sku)}
                        className="text-copper-600 hover:text-copper-900"
                      >
                        View
                      </button>
                      <button
                        onClick={() => toggleSKUStatus(sku.id, 'Manual toggle')}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        {sku.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {skus.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No SKUs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new SKU or bulk generating from a product family.
            </p>
            <div className="mt-6">
              <Button
                variant="primary"
                onClick={() => setShowCreateWizard(true)}
              >
                Create First SKU
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateWizard && (
        <SKUCreationWizard
          onClose={() => setShowCreateWizard(false)}
          families={families}
        />
      )}

      {showBulkGeneration && (
        <BulkGenerationModal
          onClose={() => setShowBulkGeneration(false)}
          families={families}
        />
      )}

      {selectedSKU && (
        <SKUDetailModal
          sku={selectedSKU}
          onClose={() => setSelectedSKU(null)}
        />
      )}
    </div>
  )
}

// Simple detail modal component
function SKUDetailModal({ sku, onClose }: { sku: SKU; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">SKU Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Code</dt>
              <dd className="mt-1 text-sm text-gray-900">{sku.code}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{sku.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Family</dt>
              <dd className="mt-1 text-sm text-gray-900">{sku.familyName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Attributes</dt>
              <dd className="mt-1 space-y-1">
                {sku.attributes.map(attr => (
                  <div key={attr.attributeKey} className="text-sm text-gray-900">
                    {attr.attributeLabel}: {attr.value}{attr.unit || ''}
                  </div>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(sku.createdAt).toLocaleString()} by {sku.createdBy}
              </dd>
            </div>
            {sku.disabledAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Disabled</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(sku.disabledAt).toLocaleString()} by {sku.disabledBy}
                  {sku.disableReason && <div className="text-sm text-gray-500">Reason: {sku.disableReason}</div>}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-6 flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  )
}