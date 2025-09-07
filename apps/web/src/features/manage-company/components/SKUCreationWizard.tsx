import { useState, useEffect } from 'react'
import { Button } from '../../../components/ui/Button'
import { useSKUs } from '../hooks/useSKUs'
import type { ProductFamily, ProductFamilyAttribute } from '../types/productFamily'
import type { SKUFormData } from '../types/sku'

interface SKUCreationWizardProps {
  onClose: () => void
  families: ProductFamily[]
}

export function SKUCreationWizard({ onClose, families }: SKUCreationWizardProps) {
  const { createSKU } = useSKUs()
  const [step, setStep] = useState(1)
  const [selectedFamily, setSelectedFamily] = useState<ProductFamily | null>(null)
  const [attributeValues, setAttributeValues] = useState<Record<string, string | number>>({})
  const [preview, setPreview] = useState({ code: '', name: '' })
  const [loading, setLoading] = useState(false)

  // Filter SKU-level attributes
  const skuAttributes = selectedFamily?.attributes.filter(attr => attr.level === 'sku') || []

  // Generate preview
  useEffect(() => {
    if (!selectedFamily) return

    let code = selectedFamily.skuNamingRule.pattern
    Object.entries(attributeValues).forEach(([key, value]) => {
      code = code.replace(`{${key}}`, String(value))
    })

    // Apply case transform
    if (selectedFamily.skuNamingRule.caseTransform === 'upper') {
      code = code.toUpperCase()
    } else if (selectedFamily.skuNamingRule.caseTransform === 'lower') {
      code = code.toLowerCase()
    }

    // Build name
    const name = `${selectedFamily.name} ${code}`

    setPreview({ code, name })
  }, [selectedFamily, attributeValues])

  const handleFamilySelect = (family: ProductFamily) => {
    setSelectedFamily(family)
    setAttributeValues({})
    setStep(2)
  }

  const handleAttributeChange = (key: string, value: string | number) => {
    setAttributeValues(prev => ({ ...prev, [key]: value }))
  }

  const handleCreate = async () => {
    if (!selectedFamily) return

    setLoading(true)
    try {
      const formData: SKUFormData = {
        familyId: selectedFamily.id,
        attributes: Object.entries(attributeValues).map(([key, value]) => ({
          key,
          value,
        })),
      }

      await createSKU(formData, selectedFamily)
      onClose()
    } catch (error) {
      console.error('Failed to create SKU:', error)
    } finally {
      setLoading(false)
    }
  }

  const isStepValid = () => {
    if (step === 2) {
      // Check all required attributes have values
      return skuAttributes
        .filter(attr => attr.isRequired)
        .every(attr => attributeValues[attr.key])
    }
    return true
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Create New SKU</h3>
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

          {/* Progress Steps */}
          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${step >= 1 ? 'text-copper-600' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step >= 1 ? 'border-copper-600 bg-copper-50' : 'border-gray-300'
                }`}>
                  1
                </span>
                <span className="ml-2 text-sm font-medium">Select Family</span>
              </div>
              <div className="w-16 h-0.5 bg-gray-300" />
              <div className={`flex items-center ${step >= 2 ? 'text-copper-600' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step >= 2 ? 'border-copper-600 bg-copper-50' : 'border-gray-300'
                }`}>
                  2
                </span>
                <span className="ml-2 text-sm font-medium">Set Attributes</span>
              </div>
              <div className="w-16 h-0.5 bg-gray-300" />
              <div className={`flex items-center ${step >= 3 ? 'text-copper-600' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step >= 3 ? 'border-copper-600 bg-copper-50' : 'border-gray-300'
                }`}>
                  3
                </span>
                <span className="ml-2 text-sm font-medium">Review & Create</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Select a Product Family</h4>
              <div className="grid grid-cols-2 gap-4">
                {families.filter(f => f.isActive).map(family => (
                  <button
                    key={family.id}
                    onClick={() => handleFamilySelect(family)}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-copper-500 hover:bg-copper-50 transition-colors text-left"
                  >
                    <div className="font-medium text-gray-900">{family.name}</div>
                    <div className="text-sm text-gray-500 mt-1">{family.code}</div>
                    {family.description && (
                      <div className="text-xs text-gray-400 mt-2">{family.description}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      {family.attributes.filter(a => a.level === 'sku').length} SKU attributes
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && selectedFamily && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">
                  Set SKU Attributes for {selectedFamily.name}
                </h4>
                <div className="space-y-4">
                  {skuAttributes.map(attr => (
                    <div key={attr.key}>
                      <label className="block text-sm font-medium text-gray-700">
                        {attr.label}
                        {attr.isRequired && <span className="text-red-500 ml-1">*</span>}
                        {attr.unit && <span className="text-gray-400 ml-1">({attr.unit})</span>}
                      </label>
                      {attr.type === 'enum' && attr.validation.enumOptions ? (
                        <select
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
                          value={attributeValues[attr.key] || ''}
                          onChange={(e) => handleAttributeChange(attr.key, e.target.value)}
                          required={attr.isRequired}
                        >
                          <option value="">Select {attr.label}</option>
                          {attr.validation.enumOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : attr.type === 'number' ? (
                        <input
                          type="number"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
                          value={attributeValues[attr.key] || ''}
                          onChange={(e) => handleAttributeChange(attr.key, parseFloat(e.target.value))}
                          min={attr.validation.min}
                          max={attr.validation.max}
                          step={attr.validation.step}
                          required={attr.isRequired}
                        />
                      ) : (
                        <input
                          type="text"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
                          value={attributeValues[attr.key] || ''}
                          onChange={(e) => handleAttributeChange(attr.key, e.target.value)}
                          required={attr.isRequired}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Preview */}
              <div className="bg-copper-50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-copper-900 mb-2">Preview</h5>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-copper-700">Code:</span>
                    <div className="font-mono text-sm text-copper-900">{preview.code || '...'}</div>
                  </div>
                  <div>
                    <span className="text-xs text-copper-700">Name:</span>
                    <div className="text-sm text-copper-900">{preview.name || '...'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && selectedFamily && (
            <div className="space-y-6">
              <h4 className="text-sm font-medium text-gray-900">Review and Confirm</h4>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-700">Product Family</div>
                  <div className="text-sm text-gray-900">{selectedFamily.name}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700">SKU Code</div>
                  <div className="font-mono text-lg text-gray-900">{preview.code}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700">SKU Name</div>
                  <div className="text-sm text-gray-900">{preview.name}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Attributes</div>
                  <div className="space-y-1">
                    {skuAttributes.map(attr => {
                      const value = attributeValues[attr.key]
                      if (!value) return null
                      return (
                        <div key={attr.key} className="text-sm text-gray-600">
                          {attr.label}: <span className="font-medium text-gray-900">{value}{attr.unit || ''}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      This SKU will be created with status <strong>Active</strong> and will be immediately available for use in work orders and inventory management.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div>
            {step > 1 && (
              <Button
                variant="secondary"
                onClick={() => setStep(step - 1)}
                disabled={loading}
              >
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                variant="primary"
                onClick={() => setStep(step + 1)}
                disabled={!isStepValid()}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create SKU'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}