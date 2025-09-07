import { useState } from 'react'
import { useOpeningStock } from '../hooks/useOpeningStock'
import { useFactories } from '../hooks/useFactories'
import type { OpeningStockItem, OpeningStockFormData } from '../types'

function OpeningStockForm({ 
  onSubmit, 
  onCancel, 
  initialData 
}: { 
  onSubmit: (data: OpeningStockFormData) => void
  onCancel: () => void
  initialData?: OpeningStockItem 
}) {
  const { factories } = useFactories()
  const [formData, setFormData] = useState<OpeningStockFormData>({
    factoryId: initialData?.factoryId || '',
    skuId: initialData?.skuId || '',
    lotNumber: initialData?.lotNumber || '',
    quantity: initialData?.quantity || 0,
    unit: initialData?.unit || 'kg',
    location: initialData?.location || '',
    expiryDate: initialData?.expiryDate || '',
    notes: initialData?.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Factory *</label>
          <select
            required
            value={formData.factoryId}
            onChange={(e) => setFormData({ ...formData, factoryId: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          >
            <option value="">Select Factory</option>
            {factories.map(factory => (
              <option key={factory.id} value={factory.id}>{factory.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">SKU ID *</label>
          <input
            type="text"
            required
            value={formData.skuId}
            onChange={(e) => setFormData({ ...formData, skuId: e.target.value })}
            placeholder="Enter SKU ID"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Lot Number *</label>
          <input
            type="text"
            required
            value={formData.lotNumber}
            onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Warehouse A, Rack 1"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Quantity *</label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Unit *</label>
          <select
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          >
            <option value="kg">Kilograms (kg)</option>
            <option value="mt">Metric Tons (mt)</option>
            <option value="pcs">Pieces (pcs)</option>
            <option value="m">Meters (m)</option>
            <option value="rolls">Rolls</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
          <input
            type="date"
            value={formData.expiryDate}
            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-copper-600 hover:bg-copper-700"
        >
          {initialData ? 'Update' : 'Add'} Opening Stock
        </button>
      </div>
    </form>
  )
}

export function OpeningStockTab() {
  const { openingStock, loading, addOpeningStock, updateOpeningStock, deleteOpeningStock } = useOpeningStock()
  const { factories } = useFactories()
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<OpeningStockItem | null>(null)
  const [selectedFactory, setSelectedFactory] = useState<string>('')

  const handleSubmit = async (data: OpeningStockFormData) => {
    if (editingItem) {
      await updateOpeningStock(editingItem.id, data)
    } else {
      await addOpeningStock(data)
    }
    setShowForm(false)
    setEditingItem(null)
  }

  const handleEdit = (item: OpeningStockItem) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this opening stock entry?')) {
      await deleteOpeningStock(id)
    }
  }

  const getFactoryName = (factoryId: string) => {
    return factories.find(f => f.id === factoryId)?.name || factoryId
  }

  const filteredStock = selectedFactory 
    ? openingStock.filter(item => item.factoryId === selectedFactory)
    : openingStock

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-gray-900">Opening Stock</h3>
          <select
            value={selectedFactory}
            onChange={(e) => setSelectedFactory(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          >
            <option value="">All Factories</option>
            {factories.map(factory => (
              <option key={factory.id} value={factory.id}>{factory.name}</option>
            ))}
          </select>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-copper-600 hover:bg-copper-700"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Opening Stock
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {editingItem ? 'Edit Opening Stock' : 'New Opening Stock'}
          </h4>
          <OpeningStockForm
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false)
              setEditingItem(null)
            }}
            initialData={editingItem || undefined}
          />
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="p-4 text-center">Loading...</div>
          ) : filteredStock.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {selectedFactory ? 'No opening stock for selected factory' : 'No opening stock entries yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Factory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lot Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expiry
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStock.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.skuName}</div>
                          <div className="text-sm text-gray-500">{item.skuCode}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getFactoryName(item.factoryId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.lotNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.location || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.expiryDate || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-copper-600 hover:text-copper-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}