import { useState } from 'react'
import { useFactories } from '../hooks/useFactories'
import type { Factory, FactoryFormData } from '../types'

function FactoryForm({ 
  onSubmit, 
  onCancel, 
  initialData 
}: { 
  onSubmit: (data: FactoryFormData) => void
  onCancel: () => void
  initialData?: Factory 
}) {
  const [formData, setFormData] = useState<FactoryFormData>({
    name: initialData?.name || '',
    code: initialData?.code || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    country: initialData?.country || 'Pakistan',
    phone: '',  // Removed phone field
    email: '',  // Removed email field
    isActive: initialData?.isActive ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Factory Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Factory Code *
          </label>
          <input
            type="text"
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Address *
        </label>
        <textarea
          required
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          rows={2}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            City *
          </label>
          <input
            type="text"
            required
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Country *
          </label>
          <input
            type="text"
            required
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          />
        </div>
      </div>


      <div className="flex items-center">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="h-4 w-4 text-copper-600 focus:ring-copper-500 border-gray-300 rounded"
        />
        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
          Active
        </label>
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
          {initialData ? 'Update' : 'Create'} Factory
        </button>
      </div>
    </form>
  )
}

export function FactoriesTab() {
  const { factories, loading, createFactory, updateFactory, deleteFactory } = useFactories()
  const [showForm, setShowForm] = useState(false)
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null)

  const handleSubmit = async (data: FactoryFormData) => {
    if (editingFactory) {
      await updateFactory(editingFactory.id, data)
    } else {
      await createFactory(data)
    }
    setShowForm(false)
    setEditingFactory(null)
  }

  const handleEdit = (factory: Factory) => {
    setEditingFactory(factory)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this factory?')) {
      await deleteFactory(id)
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Factories</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-copper-600 hover:bg-copper-700"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Factory
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {editingFactory ? 'Edit Factory' : 'New Factory'}
          </h4>
          <FactoryForm
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false)
              setEditingFactory(null)
            }}
            initialData={editingFactory || undefined}
          />
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="p-4 text-center">Loading...</div>
          ) : factories.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No factories yet</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {factories.map((factory) => (
                <li key={factory.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {factory.name}
                          </p>
                          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            {factory.code}
                          </span>
                          {factory.isActive ? (
                            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          {factory.address}, {factory.city}, {factory.country}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(factory)}
                          className="text-copper-600 hover:text-copper-900"
                          title="Edit"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(factory.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}