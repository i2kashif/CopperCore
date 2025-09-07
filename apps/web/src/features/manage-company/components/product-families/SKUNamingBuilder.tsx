import { useState, useEffect } from 'react'
import type { SKUNamingRule, ProductFamilyAttribute } from '../../types/productFamily'

interface Props {
  namingRule: SKUNamingRule
  onChange: (rule: SKUNamingRule) => void
  attributes: Omit<ProductFamilyAttribute, 'id' | 'order'>[]
}

export function SKUNamingBuilder({ namingRule, onChange, attributes }: Props) {
  const [pattern, setPattern] = useState(namingRule.pattern)
  const [separator, setSeparator] = useState(namingRule.separator)
  const [caseTransform, setCaseTransform] = useState(namingRule.caseTransform)

  // Get SKU-level attributes that can be used in naming
  const skuAttributes = attributes.filter(attr => attr.level === 'sku')

  // Live preview generation
  const generatePreview = () => {
    let preview = pattern

    // Replace attribute placeholders with sample values
    skuAttributes.forEach(attr => {
      const placeholder = `{${attr.key}}`
      if (preview.includes(placeholder)) {
        let sampleValue = ''
        switch (attr.type) {
          case 'enum':
            sampleValue = attr.validation.enumOptions?.[0] || 'Option1'
            break
          case 'number':
            sampleValue = (attr.validation.min || 1).toString()
            if (attr.unit) sampleValue += attr.unit
            break
          case 'text':
            sampleValue = 'Sample'
            break
          default:
            sampleValue = 'Value'
        }
        preview = preview.replace(new RegExp(`\\{${attr.key}\\}`, 'g'), sampleValue)
      }
    })

    // Apply case transformation
    switch (caseTransform) {
      case 'upper':
        preview = preview.toUpperCase()
        break
      case 'lower':
        preview = preview.toLowerCase()
        break
    }

    return preview
  }

  // Update the parent when any field changes
  useEffect(() => {
    onChange({
      pattern,
      separator,
      caseTransform
    })
  }, [pattern, separator, caseTransform, onChange])

  const insertAttribute = (attributeKey: string) => {
    const placeholder = `{${attributeKey}}`
    setPattern(prev => prev + (prev ? separator : '') + placeholder)
  }

  const clearPattern = () => {
    setPattern('')
  }

  const applyTemplatePattern = (template: string) => {
    setPattern(template)
  }

  // Common template patterns
  const templatePatterns = [
    {
      name: 'All SKU Attributes',
      pattern: skuAttributes.map(attr => `{${attr.key}}`).join(separator),
      description: 'Uses all SKU-level attributes in order'
    },
    {
      name: 'Material-Size Format',
      pattern: '{metal}{separator}{conductor_area_mm2}mm2',
      description: 'Common format: Material-Size'
    },
    {
      name: 'Detailed Format',
      pattern: '{metal}{separator}{rod_diameter_mm}mm{separator}{enamel_thickness_um}um',
      description: 'Detailed with units'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">SKU Naming Rule</h4>
        <p className="text-sm text-gray-500">
          Define how SKUs are automatically generated from product attributes. Only SKU-level attributes can be used.
        </p>
      </div>

      {/* Template Patterns */}
      {skuAttributes.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-gray-900 mb-3">Quick Templates</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {templatePatterns.map((template, index) => (
              <button
                key={index}
                type="button"
                onClick={() => applyTemplatePattern(template.pattern.replace('{separator}', separator))}
                className="p-3 text-left border border-gray-200 rounded-lg hover:bg-white hover:border-copper-300 focus:outline-none focus:ring-2 focus:ring-copper-500"
              >
                <div className="text-sm font-medium text-gray-900">{template.name}</div>
                <div className="text-xs text-gray-500 mt-1">{template.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pattern Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Naming Pattern
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="e.g., {metal}-{rod_diameter_mm}mm-{enamel_thickness_um}um"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500 font-mono text-sm"
              />
              <button
                type="button"
                onClick={clearPattern}
                className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Use {'{attribute_key}'} placeholders for dynamic values
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Separator
              </label>
              <select
                value={separator}
                onChange={(e) => setSeparator(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500"
              >
                <option value="-">Hyphen (-)</option>
                <option value="_">Underscore (_)</option>
                <option value=".">Period (.)</option>
                <option value="">None</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Case Transform
              </label>
              <select
                value={caseTransform}
                onChange={(e) => setCaseTransform(e.target.value as SKUNamingRule['caseTransform'])}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500"
              >
                <option value="none">Keep Original</option>
                <option value="upper">UPPERCASE</option>
                <option value="lower">lowercase</option>
              </select>
            </div>
          </div>

          {/* Available Attributes */}
          {skuAttributes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available SKU Attributes
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {skuAttributes.map((attr, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => insertAttribute(attr.key)}
                    className="w-full flex items-center justify-between p-2 text-left border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-copper-500"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{attr.label}</div>
                      <div className="text-xs text-gray-500">
                        Key: {attr.key} {attr.unit && `(${attr.unit})`}
                      </div>
                    </div>
                    <div className="ml-2 flex items-center space-x-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {attr.type}
                      </span>
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {skuAttributes.length === 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">No SKU Attributes</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    Add attributes with level=SKU to enable automatic SKU generation.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Preview */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Live Preview
            </label>
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <div className="text-center">
                <div className="text-lg font-mono text-gray-900 bg-gray-50 rounded px-3 py-2 border">
                  {pattern ? generatePreview() : 'Enter a pattern to see preview'}
                </div>
                {pattern && (
                  <div className="mt-2 text-xs text-gray-500">
                    Sample SKU based on current pattern and attributes
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pattern Analysis */}
          {pattern && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h6 className="text-sm font-medium text-blue-900 mb-2">Pattern Analysis</h6>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex justify-between">
                  <span>Placeholders found:</span>
                  <span className="font-mono">
                    {(pattern.match(/\{[^}]+\}/g) || []).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Valid placeholders:</span>
                  <span className="font-mono">
                    {(pattern.match(/\{[^}]+\}/g) || []).filter(p => 
                      skuAttributes.some(attr => p === `{${attr.key}}`)
                    ).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Separator count:</span>
                  <span className="font-mono">
                    {separator ? (pattern.split(separator).length - 1) : 0}
                  </span>
                </div>
              </div>
              
              {/* Invalid placeholders warning */}
              {(() => {
                const placeholders = pattern.match(/\{[^}]+\}/g) || []
                const invalidPlaceholders = placeholders.filter(p => 
                  !skuAttributes.some(attr => p === `{${attr.key}}`)
                )
                
                if (invalidPlaceholders.length > 0) {
                  return (
                    <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded">
                      <div className="text-sm font-medium text-red-800">Invalid placeholders:</div>
                      <div className="text-sm text-red-700 font-mono">
                        {invalidPlaceholders.join(', ')}
                      </div>
                    </div>
                  )
                }
              })()}
            </div>
          )}

          {/* Pattern Examples */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h6 className="text-sm font-medium text-gray-900 mb-2">Pattern Examples</h6>
            <div className="space-y-2 text-sm">
              <div>
                <code className="text-xs bg-gray-200 px-1 rounded">{'{metal}-{diameter}mm'}</code>
                <span className="ml-2 text-gray-600">→ COPPER-2.5mm</span>
              </div>
              <div>
                <code className="text-xs bg-gray-200 px-1 rounded">{'{type}_{size}_{grade}'}</code>
                <span className="ml-2 text-gray-600">→ WIRE_10_A</span>
              </div>
              <div>
                <code className="text-xs bg-gray-200 px-1 rounded">{'{material}{cores}C{area}MM2'}</code>
                <span className="ml-2 text-gray-600">→ CU3C2.5MM2</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
