import { useState } from 'react'
import { AttributeBuilder } from './AttributeBuilder'
import { SKUNamingBuilder } from './SKUNamingBuilder'
import type { 
  ProductFamily, 
  ProductFamilyFormData, 
  ProductFamilyTemplate,
  RoutingRule,
  PackingRule
} from '../../types/productFamily'

interface Props {
  initialData?: ProductFamily | null
  templates: ProductFamilyTemplate[]
  onSave: (data: ProductFamilyFormData) => Promise<void>
  onCancel: () => void
  loading: boolean
  canEdit: boolean
}

export function ProductFamilyForm({ initialData, templates, onSave, onCancel, loading, canEdit }: Props) {
  const [activeTab, setActiveTab] = useState<'basic' | 'attributes' | 'sku-naming' | 'routing' | 'packing'>('basic')
  const [showTemplates, setShowTemplates] = useState(!initialData && templates.length > 0)
  
  const [formData, setFormData] = useState<ProductFamilyFormData>({
    code: initialData?.code || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    attributes: initialData?.attributes.map(attr => ({
      key: attr.key,
      label: attr.label,
      type: attr.type,
      unit: attr.unit,
      level: attr.level,
      decideWhen: attr.decideWhen,
      showIn: attr.showIn,
      validation: attr.validation,
      allowAppendOptions: attr.allowAppendOptions,
      isRequired: attr.isRequired
    })) || [],
    skuNamingRule: initialData?.skuNamingRule || {
      pattern: '',
      separator: '-',
      caseTransform: 'upper'
    },
    defaultRoutingRules: initialData?.defaultRoutingRules.map(rule => ({
      stationName: rule.stationName,
      sequence: rule.sequence,
      isOptional: rule.isOptional,
      defaultDurationHours: rule.defaultDurationHours
    })) || [],
    defaultPackingRules: initialData?.defaultPackingRules || {
      defaultPackingUnit: '',
      defaultQuantityPerUnit: 1,
      labelTemplateId: undefined
    },
    isActive: initialData?.isActive ?? true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const applyTemplate = (template: ProductFamilyTemplate) => {
    setFormData({
      ...formData,
      ...template.template
    })
    setShowTemplates(false)
    setActiveTab('basic')
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.code.trim()) {
      newErrors.code = 'Product family code is required'
    } else if (!/^[A-Z][A-Z0-9_]*$/.test(formData.code)) {
      newErrors.code = 'Code must start with a letter and contain only uppercase letters, numbers, and underscores'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Product family name is required'
    }

    // Validate SKU naming rule has valid placeholders
    const skuAttributes = formData.attributes.filter(attr => attr.level === 'sku')
    const placeholders = formData.skuNamingRule.pattern.match(/\{[^}]+\}/g) || []
    const invalidPlaceholders = placeholders.filter(p => 
      !skuAttributes.some(attr => p === `{${attr.key}}`)
    )
    
    if (formData.skuNamingRule.pattern && invalidPlaceholders.length > 0) {
      newErrors.skuPattern = `Invalid placeholders: ${invalidPlaceholders.join(', ')}`
    }

    // Validate attribute keys are unique
    const attributeKeys = formData.attributes.map(attr => attr.key)
    const duplicateKeys = attributeKeys.filter((key, index) => attributeKeys.indexOf(key) !== index)
    if (duplicateKeys.length > 0) {
      newErrors.attributes = `Duplicate attribute keys: ${[...new Set(duplicateKeys)].join(', ')}`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSave(formData)
    } catch (error) {
      console.error('Save failed:', error)
    }
  }

  const tabs = [
    { key: 'basic' as const, label: 'Basic Info', icon: '📝' },
    { key: 'attributes' as const, label: 'Attributes', icon: '🏷️', count: formData.attributes.length },
    { key: 'sku-naming' as const, label: 'SKU Naming', icon: '🔤' },
    { key: 'routing' as const, label: 'Routing Rules', icon: '🔄', count: formData.defaultRoutingRules.length },
    { key: 'packing' as const, label: 'Packing Rules', icon: '📦' }
  ]

  if (showTemplates) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Choose a Template</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start with a pre-configured template or create from scratch
            </p>
          </div>
          <button
            onClick={() => setShowTemplates(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Blank Template */}
          <button
            onClick={() => setShowTemplates(false)}
            className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-copper-500 text-left"
          >
            <div className="text-center">
              <div className="text-4xl mb-2">➕</div>
              <h4 className="text-lg font-medium text-gray-900">Start from Scratch</h4>
              <p className="mt-2 text-sm text-gray-500">Create a custom product family configuration</p>
            </div>
          </button>

          {/* Template Options */}
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template)}
              className="p-6 border border-gray-200 rounded-lg hover:border-copper-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-copper-500 text-left"
            >
              <div className="text-center">
                <div className="text-4xl mb-2">{template.icon}</div>
                <h4 className="text-lg font-medium text-gray-900">{template.name}</h4>
                <p className="mt-2 text-sm text-gray-500">{template.description}</p>
                <div className="mt-4 text-xs text-gray-400">
                  {template.template.attributes.length} attributes • 
                  {template.template.defaultRoutingRules.length} routing rules
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {initialData ? 'Edit Product Family' : 'New Product Family'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Configure product family attributes, naming rules, and defaults
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {templates.length > 0 && !initialData && (
            <button
              type="button"
              onClick={() => setShowTemplates(true)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Use Template
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !canEdit}
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-copper-600 hover:bg-copper-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-copper-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : initialData ? 'Update' : 'Create'} Product Family
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2
                ${activeTab === tab.key
                  ? 'border-copper-500 text-copper-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`
                  inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${activeTab === tab.key ? 'bg-copper-100 text-copper-800' : 'bg-gray-100 text-gray-800'}
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Error Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {Object.values(errors).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white">
        {activeTab === 'basic' && (
          <BasicInfoTab 
            formData={formData} 
            onChange={setFormData} 
            errors={errors}
            canEdit={canEdit}
          />
        )}
        
        {activeTab === 'attributes' && (
          <AttributeBuilder
            attributes={formData.attributes}
            onChange={(attributes) => setFormData({ ...formData, attributes })}
          />
        )}
        
        {activeTab === 'sku-naming' && (
          <SKUNamingBuilder
            namingRule={formData.skuNamingRule}
            onChange={(skuNamingRule) => setFormData({ ...formData, skuNamingRule })}
            attributes={formData.attributes}
          />
        )}
        
        {activeTab === 'routing' && (
          <RoutingRulesTab
            rules={formData.defaultRoutingRules}
            onChange={(defaultRoutingRules) => setFormData({ ...formData, defaultRoutingRules })}
            canEdit={canEdit}
          />
        )}
        
        {activeTab === 'packing' && (
          <PackingRulesTab
            rules={formData.defaultPackingRules}
            onChange={(defaultPackingRules) => setFormData({ ...formData, defaultPackingRules })}
            canEdit={canEdit}
          />
        )}
      </div>
    </form>
  )
}

// Basic Info Tab Component
interface BasicInfoTabProps {
  formData: ProductFamilyFormData
  onChange: (data: ProductFamilyFormData) => void
  errors: Record<string, string>
  canEdit: boolean
}

function BasicInfoTab({ formData, onChange, errors, canEdit }: BasicInfoTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Family Code *
          </label>
          <input
            type="text"
            required
            disabled={!canEdit}
            value={formData.code}
            onChange={(e) => onChange({ ...formData, code: e.target.value.toUpperCase() })}
            className={`block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500 ${
              errors.code ? 'border-red-300' : 'border-gray-300'
            } ${!canEdit ? 'bg-gray-50 text-gray-500' : ''}`}
            placeholder="e.g., ENAMEL_WIRE"
          />
          {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Family Name *
          </label>
          <input
            type="text"
            required
            disabled={!canEdit}
            value={formData.name}
            onChange={(e) => onChange({ ...formData, name: e.target.value })}
            className={`block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            } ${!canEdit ? 'bg-gray-50 text-gray-500' : ''}`}
            placeholder="e.g., Enamel Wire"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          rows={3}
          disabled={!canEdit}
          value={formData.description || ''}
          onChange={(e) => onChange({ ...formData, description: e.target.value })}
          className={`block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500 ${
            !canEdit ? 'bg-gray-50 text-gray-500' : ''
          }`}
          placeholder="Detailed description of this product family..."
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          disabled={!canEdit}
          checked={formData.isActive}
          onChange={(e) => onChange({ ...formData, isActive: e.target.checked })}
          className="h-4 w-4 text-copper-600 focus:ring-copper-500 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">
          Active (can be used in work orders)
        </label>
      </div>
    </div>
  )
}

// Routing Rules Tab Component
interface RoutingRulesTabProps {
  rules: Omit<RoutingRule, 'stationId'>[]
  onChange: (rules: Omit<RoutingRule, 'stationId'>[]) => void
  canEdit: boolean
}

function RoutingRulesTab({ rules, onChange, canEdit }: RoutingRulesTabProps) {
  const [newRule, setNewRule] = useState<Omit<RoutingRule, 'stationId'> | null>(null)

  const addRule = () => {
    setNewRule({
      stationName: '',
      sequence: rules.length + 1,
      isOptional: false,
      defaultDurationHours: 1
    })
  }

  const saveRule = (rule: Omit<RoutingRule, 'stationId'>) => {
    onChange([...rules, rule])
    setNewRule(null)
  }

  const deleteRule = (index: number) => {
    const updated = rules.filter((_, i) => i !== index)
    // Resequence
    const resequenced = updated.map((rule, i) => ({ ...rule, sequence: i + 1 }))
    onChange(resequenced)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-medium text-gray-900">Default Routing Rules</h4>
          <p className="text-sm text-gray-500">Define the standard production sequence for this product family</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={addRule}
            className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-copper-600 hover:bg-copper-700"
          >
            Add Station
          </button>
        )}
      </div>

      <div className="space-y-3">
        {rules.map((rule, index) => (
          <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-gray-900">
                  {rule.sequence}. {rule.stationName}
                </h5>
                <div className="text-xs text-gray-500 mt-1">
                  Duration: {rule.defaultDurationHours}h
                  {rule.isOptional && ' • Optional'}
                </div>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => deleteRule(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {rules.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="text-sm font-medium text-gray-900">No routing rules defined</h3>
          <p className="text-sm text-gray-500">Add stations to define the production sequence</p>
        </div>
      )}

      {newRule && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="text-sm font-medium text-gray-900 mb-3">Add Routing Station</h5>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Station Name</label>
              <input
                type="text"
                value={newRule.stationName}
                onChange={(e) => setNewRule({ ...newRule, stationName: e.target.value })}
                className="block w-full px-2 py-1 text-sm border border-gray-300 rounded"
                placeholder="e.g., Wire Drawing"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Duration (hours)</label>
              <input
                type="number"
                step="0.5"
                value={newRule.defaultDurationHours}
                onChange={(e) => setNewRule({ ...newRule, defaultDurationHours: parseFloat(e.target.value) || 1 })}
                className="block w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div className="flex items-end space-x-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newRule.isOptional}
                  onChange={(e) => setNewRule({ ...newRule, isOptional: e.target.checked })}
                  className="rounded border-gray-300 text-copper-600 focus:ring-copper-500"
                />
                <span className="ml-1 text-xs text-gray-700">Optional</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-3">
            <button
              type="button"
              onClick={() => setNewRule(null)}
              className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => newRule.stationName.trim() && saveRule(newRule)}
              disabled={!newRule.stationName.trim()}
              className="px-3 py-1 text-xs border border-transparent rounded text-white bg-copper-600 hover:bg-copper-700 disabled:opacity-50"
            >
              Add Station
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Packing Rules Tab Component
interface PackingRulesTabProps {
  rules: PackingRule
  onChange: (rules: PackingRule) => void
  canEdit: boolean
}

function PackingRulesTab({ rules, onChange, canEdit }: PackingRulesTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-medium text-gray-900">Default Packing Rules</h4>
        <p className="text-sm text-gray-500">Configure default packing and labeling for this product family</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Packing Unit
          </label>
          <input
            type="text"
            disabled={!canEdit}
            value={rules.defaultPackingUnit}
            onChange={(e) => onChange({ ...rules, defaultPackingUnit: e.target.value })}
            className={`block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500 ${
              !canEdit ? 'bg-gray-50 text-gray-500' : ''
            }`}
            placeholder="e.g., Spool, Drum, Coil"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Quantity per Unit
          </label>
          <input
            type="number"
            min="1"
            disabled={!canEdit}
            value={rules.defaultQuantityPerUnit}
            onChange={(e) => onChange({ ...rules, defaultQuantityPerUnit: parseInt(e.target.value) || 1 })}
            className={`block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500 ${
              !canEdit ? 'bg-gray-50 text-gray-500' : ''
            }`}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Label Template ID (Optional)
        </label>
        <input
          type="text"
          disabled={!canEdit}
          value={rules.labelTemplateId || ''}
          onChange={(e) => onChange({ ...rules, labelTemplateId: e.target.value || undefined })}
          className={`block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-copper-500 focus:border-copper-500 ${
            !canEdit ? 'bg-gray-50 text-gray-500' : ''
          }`}
          placeholder="e.g., label-enamel-wire"
        />
        <p className="mt-1 text-xs text-gray-500">
          Reference to the label template for this product family
        </p>
      </div>
    </div>
  )
}
