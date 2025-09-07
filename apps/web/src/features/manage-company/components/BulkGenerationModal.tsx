import { useState, useEffect } from 'react'
import { Button } from '../../../components/ui/Button'
import { useSKUs } from '../hooks/useSKUs'
import type { ProductFamily, ProductFamilyAttribute } from '../types/productFamily'
import type { BulkSKUGenerationData } from '../types/sku'

interface BulkGenerationModalProps {
  onClose: () => void
  families: ProductFamily[]
}

interface AttributeGrid {
  key: string
  label: string
  type: string
  values: string[]
  inputValue: string
}

export function BulkGenerationModal({ onClose, families }: BulkGenerationModalProps) {
  const { bulkGenerateSKUs } = useSKUs()
  const [selectedFamily, setSelectedFamily] = useState<ProductFamily | null>(null)
  const [attributeGrids, setAttributeGrids] = useState<AttributeGrid[]>([])
  const [skipExisting, setSkipExisting] = useState(true)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string[]>([])

  // Initialize grids when family is selected
  useEffect(() => {
    if (selectedFamily) {
      const skuAttributes = selectedFamily.attributes.filter(attr => attr.level === 'sku')
      setAttributeGrids(
        skuAttributes.map(attr => ({
          key: attr.key,
          label: attr.label,
          type: attr.type,
          values: [],
          inputValue: '',
        }))
      )
    }
  }, [selectedFamily])

  // Generate preview of SKU codes
  useEffect(() => {
    if (!selectedFamily || attributeGrids.length === 0) {
      setPreview([])
      return
    }

    const gridValues = attributeGrids.map(grid => grid.values).filter(v => v.length > 0)
    if (gridValues.length === 0) {
      setPreview([])
      return
    }

    // Generate combinations
    const generateCombinations = (arrays: string[][]): string[][] => {
      if (arrays.length === 0) return [[]]
      const [first, ...rest] = arrays
      const restCombinations = generateCombinations(rest)
      const result: string[][] = []
      for (const value of first) {
        for (const combination of restCombinations) {
          result.push([value, ...combination])
        }
      }
      return result
    }

    const combinations = generateCombinations(gridValues)
    const previewCodes = combinations.slice(0, 5).map(combination => {
      let code = selectedFamily.skuNamingRule.pattern
      combination.forEach((value, index) => {
        const grid = attributeGrids.find(g => g.values.length > 0)
        if (grid) {
          const key = attributeGrids[attributeGrids.indexOf(grid) + index]?.key
          if (key) {
            code = code.replace(`{${key}}`, value)
          }
        }
      })

      // Apply case transform
      if (selectedFamily.skuNamingRule.caseTransform === 'upper') {
        code = code.toUpperCase()
      } else if (selectedFamily.skuNamingRule.caseTransform === 'lower') {
        code = code.toLowerCase()
      }

      return code
    })

    setPreview(previewCodes)
  }, [selectedFamily, attributeGrids])

  const handleAddValue = (gridIndex: number) => {
    const grid = attributeGrids[gridIndex]
    if (!grid.inputValue.trim()) return

    const values = grid.inputValue.split(',').map(v => v.trim()).filter(v => v)
    
    setAttributeGrids(prev => prev.map((g, i) => 
      i === gridIndex 
        ? { ...g, values: [...new Set([...g.values, ...values])], inputValue: '' }
        : g
    ))
  }

  const handleRemoveValue = (gridIndex: number, valueIndex: number) => {
    setAttributeGrids(prev => prev.map((g, i) => 
      i === gridIndex 
        ? { ...g, values: g.values.filter((_, vi) => vi !== valueIndex) }
        : g
    ))
  }

  const handleGenerate = async () => {
    if (!selectedFamily) return

    setLoading(true)
    try {
      const data: BulkSKUGenerationData = {
        familyId: selectedFamily.id,
        attributeGrids: attributeGrids
          .filter(grid => grid.values.length > 0)
          .map(grid => ({
            key: grid.key,
            values: grid.type === 'number' 
              ? grid.values.map(v => parseFloat(v))
              : grid.values,
          })),
        skipExisting,
      }

      const newSKUs = await bulkGenerateSKUs(data, selectedFamily)
      alert(`Successfully generated ${newSKUs.length} SKUs!`)
      onClose()
    } catch (error) {
      console.error('Failed to generate SKUs:', error)
      alert('Failed to generate SKUs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const totalCombinations = attributeGrids.reduce((acc, grid) => 
    acc * (grid.values.length || 1), 1
  )

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Bulk Generate SKUs</h3>
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedFamily ? (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Select a Product Family</h4>
              <div className="grid grid-cols-2 gap-4">
                {families.filter(f => f.isActive).map(family => (
                  <button
                    key={family.id}
                    onClick={() => setSelectedFamily(family)}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-copper-500 hover:bg-copper-50 transition-colors text-left"
                  >
                    <div className="font-medium text-gray-900">{family.name}</div>
                    <div className="text-sm text-gray-500 mt-1">{family.code}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {family.attributes.filter(a => a.level === 'sku').length} SKU attributes
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">
                  Configure Attribute Values for {selectedFamily.name}
                </h4>
                <button
                  onClick={() => setSelectedFamily(null)}
                  className="text-sm text-copper-600 hover:text-copper-700"
                >
                  Change Family
                </button>
              </div>

              <div className="space-y-4">
                {attributeGrids.map((grid, gridIndex) => (
                  <div key={grid.key} className="border border-gray-200 rounded-lg p-4">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        {grid.label}
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Enter values separated by commas (e.g., value1, value2, value3)
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 mb-3">
                      <input
                        type="text"
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
                        placeholder={grid.type === 'number' ? '1.5, 2.0, 2.5' : 'RED, BLUE, GREEN'}
                        value={grid.inputValue}
                        onChange={(e) => setAttributeGrids(prev => prev.map((g, i) => 
                          i === gridIndex ? { ...g, inputValue: e.target.value } : g
                        ))}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddValue(gridIndex)
                          }
                        }}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddValue(gridIndex)}
                      >
                        Add
                      </Button>
                    </div>

                    {grid.values.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {grid.values.map((value, valueIndex) => (
                          <span
                            key={valueIndex}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-copper-100 text-copper-800"
                          >
                            {value}
                            <button
                              onClick={() => handleRemoveValue(gridIndex, valueIndex)}
                              className="ml-1 text-copper-600 hover:text-copper-900"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Options */}
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-copper-600 focus:ring-copper-500"
                    checked={skipExisting}
                    onChange={(e) => setSkipExisting(e.target.checked)}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Skip existing SKUs (prevent duplicates)
                  </span>
                </label>
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div className="bg-copper-50 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-copper-900 mb-2">
                    Preview (showing first 5 of {totalCombinations} combinations)
                  </h5>
                  <div className="space-y-1">
                    {preview.map((code, i) => (
                      <div key={i} className="font-mono text-sm text-copper-700">
                        {code}
                      </div>
                    ))}
                    {totalCombinations > 5 && (
                      <div className="text-sm text-copper-600">
                        ... and {totalCombinations - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Warning for large generations */}
              {totalCombinations > 100 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        You're about to generate {totalCombinations} SKUs. This may take a moment.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {selectedFamily && totalCombinations > 0 && (
              <span>Will generate {totalCombinations} SKUs</span>
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
            {selectedFamily && (
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={loading || totalCombinations === 0}
              >
                {loading ? 'Generating...' : `Generate ${totalCombinations} SKUs`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}