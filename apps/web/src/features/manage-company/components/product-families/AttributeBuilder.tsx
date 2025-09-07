import { useState } from 'react'
import { useAuth } from '../../../auth'
import type { ProductFamilyAttribute, AttributeType, AttributeLevel, DecideWhen, ShowInLocation } from '../../types/productFamily'

interface Props {
  attributes: Omit<ProductFamilyAttribute, 'id' | 'order'>[]
  onChange: (attributes: Omit<ProductFamilyAttribute, 'id' | 'order'>[]) => void
}

const attributeTypeOptions: { value: AttributeType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'enum', label: 'Dropdown (Enum)' }
]

const levelOptions: { value: AttributeLevel; label: string; description: string }[] = [
  { value: 'sku', label: 'SKU Level', description: 'Defines unique products (used in SKU naming)' },
  { value: 'lot', label: 'Lot Level', description: 'Varies per production lot/batch' },
  { value: 'unit', label: 'Unit Level', description: 'Varies per individual unit/piece' }
]

const decideWhenOptions: { value: DecideWhen; label: string }[] = [
  { value: 'wo', label: 'Work Order' },
  { value: 'production', label: 'During Production' }
]

const showInOptions: { value: ShowInLocation; label: string }[] = [
  { value: 'wo', label: 'Work Order' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'packing', label: 'Packing' },
  { value: 'invoice', label: 'Invoice' }
]

export function AttributeBuilder({ attributes, onChange }: Props) {
  const { user } = useAuth()
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [newAttribute, setNewAttribute] = useState<Omit<ProductFamilyAttribute, 'id' | 'order'> | null>(null)

  const canAppendEnumOptions = user?.role === 'CEO'

  const createDefaultAttribute = (): Omit<ProductFamilyAttribute, 'id' | 'order'> => ({
    key: '',
    label: '',
    type: 'text',
    level: 'sku',
    decideWhen: 'wo',
    showIn: ['wo', 'inventory'],
    validation: {},
    allowAppendOptions: false,
    isRequired: true
  })

  const handleAddAttribute = () => {
    setNewAttribute(createDefaultAttribute())
    setEditingIndex(null)
  }

  const handleEditAttribute = (index: number) => {
    setEditingIndex(index)
    setNewAttribute(null)
  }

  const handleDeleteAttribute = (index: number) => {
    const updated = attributes.filter((_, i) => i !== index)
    onChange(updated)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...attributes]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    onChange(updated)
  }

  const handleMoveDown = (index: number) => {
    if (index === attributes.length - 1) return
    const updated = [...attributes]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    onChange(updated)
  }

  const handleSaveAttribute = (attr: Omit<ProductFamilyAttribute, 'id' | 'order'>) => {
    if (editingIndex !== null) {
      // Editing existing attribute
      const updated = [...attributes]
      updated[editingIndex] = attr
      onChange(updated)
    } else {
      // Adding new attribute
      onChange([...attributes, attr])
    }
    setNewAttribute(null)
    setEditingIndex(null)
  }

  const handleCancel = () => {
    setNewAttribute(null)
    setEditingIndex(null)
  }

  const getAttributeToEdit = () => {
    if (newAttribute) return newAttribute
    if (editingIndex !== null) return attributes[editingIndex]
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-medium text-gray-900">Product Attributes</h4>
          <p className="text-sm text-gray-500">Define the characteristics that describe your products</p>
        </div>
        <button
          type="button"
          onClick={handleAddAttribute}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-copper-600 hover:bg-copper-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-copper-500"
        >
          <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Attribute
        </button>
      </div>

      {/* Attribute List */}
      <div className="space-y-3">
        {attributes.map((attr, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <h5 className="text-sm font-medium text-gray-900 truncate">{attr.label || 'Untitled Attribute'}</h5>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {attr.type}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    attr.level === 'sku' ? 'bg-blue-100 text-blue-800' :
                    attr.level === 'lot' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {attr.level.toUpperCase()}
                  </span>
                  {attr.isRequired && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Required
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                  <span>Key: {attr.key || 'Not set'}</span>
                  {attr.unit && <span>Unit: {attr.unit}</span>}
                  <span>Decide: {attr.decideWhen}</span>
                  <span>Show in: {attr.showIn.join(', ')}</span>
                </div>
                {attr.type === 'enum' && attr.validation.enumOptions && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {attr.validation.enumOptions.slice(0, 3).map((option, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-copper-100 text-copper-800">
                          {option}
                        </span>
                      ))}
                      {attr.validation.enumOptions.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{attr.validation.enumOptions.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === attributes.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleEditAttribute(index)}
                  className="p-1 text-copper-600 hover:text-copper-800"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAttribute(index)}
                  className="p-1 text-red-600 hover:text-red-800"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {attributes.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m-16-5c9.667 0 16-3.582 16-8" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No attributes defined</h3>
          <p className="mt-1 text-sm text-gray-500">Start by adding your first product attribute.</p>
        </div>
      )}

      {/* Attribute Form */}
      {getAttributeToEdit() && (
        <AttributeForm
          attribute={getAttributeToEdit()!}
          onSave={handleSaveAttribute}
          onCancel={handleCancel}
          canAppendEnumOptions={canAppendEnumOptions}
          isEditing={editingIndex !== null}
        />
      )}
    </div>
  )
}

// Individual Attribute Form Component
interface AttributeFormProps {
  attribute: Omit<ProductFamilyAttribute, 'id' | 'order'>
  onSave: (attribute: Omit<ProductFamilyAttribute, 'id' | 'order'>) => void
  onCancel: () => void
  canAppendEnumOptions: boolean
  isEditing: boolean
}

function AttributeForm({ attribute, onSave, onCancel, canAppendEnumOptions, isEditing }: AttributeFormProps) {
  const [formData, setFormData] = useState<Omit<ProductFamilyAttribute, 'id' | 'order'>>(attribute)
  const [newEnumOption, setNewEnumOption] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.key.trim() || !formData.label.trim()) {
      alert('Key and Label are required')
      return
    }

    // Validate key format (alphanumeric + underscore)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(formData.key)) {
      alert('Key must start with a letter and contain only letters, numbers, and underscores')
      return
    }

    onSave(formData)
  }

  const handleShowInChange = (location: ShowInLocation, checked: boolean) => {
    const updated = checked
      ? [...formData.showIn, location]
      : formData.showIn.filter(l => l !== location)
    
    setFormData({ ...formData, showIn: updated })
  }

  const handleAddEnumOption = () => {
    if (newEnumOption.trim()) {
      const currentOptions = formData.validation.enumOptions || []
      if (!currentOptions.includes(newEnumOption.trim())) {
        setFormData({
          ...formData,
          validation: {
            ...formData.validation,
            enumOptions: [...currentOptions, newEnumOption.trim()]
          }
        })
        setNewEnumOption('')
      }
    }
  }

  const handleRemoveEnumOption = (index: number) => {
    const currentOptions = formData.validation.enumOptions || []
    const updated = currentOptions.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      validation: {
        ...formData.validation,
        enumOptions: updated
      }
    })
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-medium text-gray-900">
          {isEditing ? 'Edit Attribute' : 'Add New Attribute'}
        </h4>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key (Unique Identifier) *
            </label>
            <input
              type="text"
              required
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              placeholder="e.g., rod_diameter_mm"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Label *
            </label>
            <input
              type="text"
              required
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="e.g., Rod Diameter"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as AttributeType })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500"
            >
              {attributeTypeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit (Optional)</label>
            <input
              type="text"
              value={formData.unit || ''}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value || undefined })}
              placeholder="e.g., mm, kg, μm"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500"
            />
          </div>
          <div className="flex items-center space-x-4 pt-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isRequired}
                onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                className="rounded border-gray-300 text-copper-600 focus:ring-copper-500"
              />
              <span className="ml-2 text-sm text-gray-700">Required</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attribute Level</label>
            <div className="space-y-2">
              {levelOptions.map(option => (
                <label key={option.value} className="flex items-start space-x-2">
                  <input
                    type="radio"
                    name="level"
                    value={option.value}
                    checked={formData.level === option.value}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as AttributeLevel })}
                    className="mt-1 text-copper-600 focus:ring-copper-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Decide When</label>
            <div className="space-y-2">
              {decideWhenOptions.map(option => (
                <label key={option.value} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="decideWhen"
                    value={option.value}
                    checked={formData.decideWhen === option.value}
                    onChange={(e) => setFormData({ ...formData, decideWhen: e.target.value as DecideWhen })}
                    className="text-copper-600 focus:ring-copper-500"
                  />
                  <span className="text-sm text-gray-900">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Show In</label>
          <div className="grid grid-cols-2 gap-2">
            {showInOptions.map(option => (
              <label key={option.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.showIn.includes(option.value)}
                  onChange={(e) => handleShowInChange(option.value, e.target.checked)}
                  className="rounded border-gray-300 text-copper-600 focus:ring-copper-500"
                />
                <span className="text-sm text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Type-specific validation */}
        {formData.type === 'number' && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Value</label>
              <input
                type="number"
                step="any"
                value={formData.validation.min || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  validation: { ...formData.validation, min: parseFloat(e.target.value) || undefined }
                })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Value</label>
              <input
                type="number"
                step="any"
                value={formData.validation.max || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  validation: { ...formData.validation, max: parseFloat(e.target.value) || undefined }
                })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Step</label>
              <input
                type="number"
                step="any"
                value={formData.validation.step || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  validation: { ...formData.validation, step: parseFloat(e.target.value) || undefined }
                })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500"
              />
            </div>
          </div>
        )}

        {formData.type === 'enum' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Dropdown Options</label>
              {canAppendEnumOptions && (
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.allowAppendOptions}
                    onChange={(e) => setFormData({ ...formData, allowAppendOptions: e.target.checked })}
                    className="rounded border-gray-300 text-copper-600 focus:ring-copper-500"
                  />
                  <span className="text-sm text-gray-700">Allow adding new options</span>
                </label>
              )}
            </div>
            
            <div className="space-y-2">
              {formData.validation.enumOptions?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm">{option}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEnumOption(index)}
                    className="p-1 text-red-600 hover:text-red-800"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={newEnumOption}
                onChange={(e) => setNewEnumOption(e.target.value)}
                placeholder="Add new option..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEnumOption())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500"
              />
              <button
                type="button"
                onClick={handleAddEnumOption}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Add
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-copper-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-copper-600 hover:bg-copper-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-copper-500"
          >
            {isEditing ? 'Update Attribute' : 'Add Attribute'}
          </button>
        </div>
      </form>
    </div>
  )
}