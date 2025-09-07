import { useState } from 'react'
import type { 
  ProductFamily, 
  ProductFamilyFormData, 
  ProductFamilyFilters, 
  ProductFamilySort,
  ProductFamilyTemplate 
} from '../types/productFamily'

// Mock data for development
const mockProductFamilies: ProductFamily[] = [
  {
    id: 'pf-1',
    code: 'ENAMEL_WIRE',
    name: 'Enamel Wire',
    description: 'Copper conductors with enamel insulation for transformers and motors',
    attributes: [
      {
        id: 'attr-1',
        key: 'metal',
        label: 'Metal Type',
        type: 'enum',
        level: 'sku',
        decideWhen: 'wo',
        showIn: ['wo', 'inventory', 'packing', 'invoice'],
        validation: {
          enumOptions: ['Copper', 'Aluminum']
        },
        allowAppendOptions: false,
        order: 1,
        isRequired: true
      },
      {
        id: 'attr-2',
        key: 'rod_diameter_mm',
        label: 'Rod Diameter',
        type: 'number',
        unit: 'mm',
        level: 'sku',
        decideWhen: 'wo',
        showIn: ['wo', 'inventory', 'packing', 'invoice'],
        validation: {
          min: 0.1,
          max: 50,
          step: 0.1
        },
        allowAppendOptions: false,
        order: 2,
        isRequired: true
      },
      {
        id: 'attr-3',
        key: 'enamel_thickness_um',
        label: 'Enamel Thickness',
        type: 'number',
        unit: 'μm',
        level: 'sku',
        decideWhen: 'wo',
        showIn: ['wo', 'inventory', 'packing'],
        validation: {
          min: 10,
          max: 200,
          step: 5
        },
        allowAppendOptions: false,
        order: 3,
        isRequired: true
      },
      {
        id: 'attr-4',
        key: 'enamel_type',
        label: 'Enamel Type',
        type: 'enum',
        level: 'lot',
        decideWhen: 'production',
        showIn: ['inventory', 'packing'],
        validation: {
          enumOptions: ['Polyurethane', 'Polyester', 'Polyimide']
        },
        allowAppendOptions: true,
        order: 4,
        isRequired: true
      },
      {
        id: 'attr-5',
        key: 'nominal_resistance_ohm_km',
        label: 'Nominal Resistance',
        type: 'number',
        unit: 'Ω/km',
        level: 'lot',
        decideWhen: 'production',
        showIn: ['inventory'],
        validation: {
          min: 0.1,
          max: 1000,
          step: 0.1
        },
        allowAppendOptions: false,
        order: 5,
        isRequired: false
      }
    ],
    skuNamingRule: {
      pattern: '{metal}-{rod_diameter_mm}mm-{enamel_thickness_um}um',
      separator: '-',
      caseTransform: 'upper'
    },
    defaultRoutingRules: [
      {
        stationId: 'st-1',
        stationName: 'Wire Drawing',
        sequence: 1,
        isOptional: false,
        defaultDurationHours: 2
      },
      {
        stationId: 'st-2',
        stationName: 'Enamel Coating',
        sequence: 2,
        isOptional: false,
        defaultDurationHours: 4
      },
      {
        stationId: 'st-3',
        stationName: 'Quality Testing',
        sequence: 3,
        isOptional: false,
        defaultDurationHours: 0.5
      }
    ],
    defaultPackingRules: {
      defaultPackingUnit: 'Spool',
      defaultQuantityPerUnit: 100,
      labelTemplateId: 'label-enamel-wire'
    },
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    createdBy: 'user-ceo-1'
  },
  {
    id: 'pf-2',
    code: 'PVC_CABLE',
    name: 'PVC Cable',
    description: 'Multi-core cables with PVC insulation for electrical installations',
    attributes: [
      {
        id: 'attr-6',
        key: 'metal',
        label: 'Conductor Material',
        type: 'enum',
        level: 'sku',
        decideWhen: 'wo',
        showIn: ['wo', 'inventory', 'packing', 'invoice'],
        validation: {
          enumOptions: ['Copper', 'Aluminum']
        },
        allowAppendOptions: false,
        order: 1,
        isRequired: true
      },
      {
        id: 'attr-7',
        key: 'conductor_area_mm2',
        label: 'Conductor Cross-Section',
        type: 'number',
        unit: 'mm²',
        level: 'sku',
        decideWhen: 'wo',
        showIn: ['wo', 'inventory', 'packing', 'invoice'],
        validation: {
          min: 0.5,
          max: 500,
          step: 0.5
        },
        allowAppendOptions: false,
        order: 2,
        isRequired: true
      },
      {
        id: 'attr-8',
        key: 'cores',
        label: 'Number of Cores',
        type: 'number',
        level: 'sku',
        decideWhen: 'wo',
        showIn: ['wo', 'inventory', 'packing', 'invoice'],
        validation: {
          min: 1,
          max: 37,
          step: 1
        },
        allowAppendOptions: false,
        order: 3,
        isRequired: true
      },
      {
        id: 'attr-9',
        key: 'insulation_thickness_mm',
        label: 'Insulation Thickness',
        type: 'number',
        unit: 'mm',
        level: 'sku',
        decideWhen: 'wo',
        showIn: ['wo', 'inventory', 'packing'],
        validation: {
          min: 0.5,
          max: 5,
          step: 0.1
        },
        allowAppendOptions: false,
        order: 4,
        isRequired: true
      },
      {
        id: 'attr-10',
        key: 'pvc_type',
        label: 'PVC Grade',
        type: 'enum',
        level: 'lot',
        decideWhen: 'production',
        showIn: ['inventory', 'packing'],
        validation: {
          enumOptions: ['Standard', 'Low Smoke', 'Flame Retardant']
        },
        allowAppendOptions: true,
        order: 5,
        isRequired: true
      }
    ],
    skuNamingRule: {
      pattern: '{metal}-{conductor_area_mm2}mm2-{cores}C-{insulation_thickness_mm}mm',
      separator: '-',
      caseTransform: 'upper'
    },
    defaultRoutingRules: [
      {
        stationId: 'st-4',
        stationName: 'Stranding',
        sequence: 1,
        isOptional: false,
        defaultDurationHours: 3
      },
      {
        stationId: 'st-5',
        stationName: 'Insulation',
        sequence: 2,
        isOptional: false,
        defaultDurationHours: 2
      },
      {
        stationId: 'st-6',
        stationName: 'Jacketing',
        sequence: 3,
        isOptional: false,
        defaultDurationHours: 1.5
      },
      {
        stationId: 'st-3',
        stationName: 'Quality Testing',
        sequence: 4,
        isOptional: false,
        defaultDurationHours: 0.5
      }
    ],
    defaultPackingRules: {
      defaultPackingUnit: 'Drum',
      defaultQuantityPerUnit: 500,
      labelTemplateId: 'label-pvc-cable'
    },
    isActive: true,
    createdAt: '2024-01-10T09:15:00Z',
    updatedAt: '2024-01-18T11:20:00Z',
    createdBy: 'user-ceo-1'
  }
]

// Template definitions
export const productFamilyTemplates: ProductFamilyTemplate[] = [
  {
    id: 'template-enamel-wire',
    name: 'Enamel Wire',
    description: 'Standard enamel wire configuration with metal, diameter, and coating attributes',
    icon: '⚡',
    template: {
      description: 'Copper or aluminum conductors with enamel insulation',
      attributes: [
        {
          key: 'metal',
          label: 'Metal Type',
          type: 'enum',
          level: 'sku',
          decideWhen: 'wo',
          showIn: ['wo', 'inventory', 'packing', 'invoice'],
          validation: { enumOptions: ['Copper', 'Aluminum'] },
          allowAppendOptions: false,
          isRequired: true
        },
        {
          key: 'rod_diameter_mm',
          label: 'Rod Diameter',
          type: 'number',
          unit: 'mm',
          level: 'sku',
          decideWhen: 'wo',
          showIn: ['wo', 'inventory', 'packing', 'invoice'],
          validation: { min: 0.1, max: 50, step: 0.1 },
          allowAppendOptions: false,
          isRequired: true
        },
        {
          key: 'enamel_thickness_um',
          label: 'Enamel Thickness',
          type: 'number',
          unit: 'μm',
          level: 'sku',
          decideWhen: 'wo',
          showIn: ['wo', 'inventory', 'packing'],
          validation: { min: 10, max: 200, step: 5 },
          allowAppendOptions: false,
          isRequired: true
        },
        {
          key: 'enamel_type',
          label: 'Enamel Type',
          type: 'enum',
          level: 'lot',
          decideWhen: 'production',
          showIn: ['inventory', 'packing'],
          validation: { enumOptions: ['Polyurethane', 'Polyester', 'Polyimide'] },
          allowAppendOptions: true,
          isRequired: true
        }
      ],
      skuNamingRule: {
        pattern: '{metal}-{rod_diameter_mm}mm-{enamel_thickness_um}um',
        separator: '-',
        caseTransform: 'upper'
      },
      defaultRoutingRules: [
        { stationName: 'Wire Drawing', sequence: 1, isOptional: false, defaultDurationHours: 2 },
        { stationName: 'Enamel Coating', sequence: 2, isOptional: false, defaultDurationHours: 4 },
        { stationName: 'Quality Testing', sequence: 3, isOptional: false, defaultDurationHours: 0.5 }
      ],
      defaultPackingRules: {
        defaultPackingUnit: 'Spool',
        defaultQuantityPerUnit: 100
      },
      isActive: true
    }
  },
  {
    id: 'template-pvc-cable',
    name: 'PVC Cable',
    description: 'Multi-core PVC insulated cable configuration',
    icon: '🔌',
    template: {
      description: 'Multi-core cables with PVC insulation for electrical installations',
      attributes: [
        {
          key: 'metal',
          label: 'Conductor Material',
          type: 'enum',
          level: 'sku',
          decideWhen: 'wo',
          showIn: ['wo', 'inventory', 'packing', 'invoice'],
          validation: { enumOptions: ['Copper', 'Aluminum'] },
          allowAppendOptions: false,
          isRequired: true
        },
        {
          key: 'conductor_area_mm2',
          label: 'Conductor Cross-Section',
          type: 'number',
          unit: 'mm²',
          level: 'sku',
          decideWhen: 'wo',
          showIn: ['wo', 'inventory', 'packing', 'invoice'],
          validation: { min: 0.5, max: 500, step: 0.5 },
          allowAppendOptions: false,
          isRequired: true
        },
        {
          key: 'cores',
          label: 'Number of Cores',
          type: 'number',
          level: 'sku',
          decideWhen: 'wo',
          showIn: ['wo', 'inventory', 'packing', 'invoice'],
          validation: { min: 1, max: 37, step: 1 },
          allowAppendOptions: false,
          isRequired: true
        },
        {
          key: 'insulation_thickness_mm',
          label: 'Insulation Thickness',
          type: 'number',
          unit: 'mm',
          level: 'sku',
          decideWhen: 'wo',
          showIn: ['wo', 'inventory', 'packing'],
          validation: { min: 0.5, max: 5, step: 0.1 },
          allowAppendOptions: false,
          isRequired: true
        },
        {
          key: 'pvc_type',
          label: 'PVC Grade',
          type: 'enum',
          level: 'lot',
          decideWhen: 'production',
          showIn: ['inventory', 'packing'],
          validation: { enumOptions: ['Standard', 'Low Smoke', 'Flame Retardant'] },
          allowAppendOptions: true,
          isRequired: true
        }
      ],
      skuNamingRule: {
        pattern: '{metal}-{conductor_area_mm2}mm2-{cores}C-{insulation_thickness_mm}mm',
        separator: '-',
        caseTransform: 'upper'
      },
      defaultRoutingRules: [
        { stationName: 'Stranding', sequence: 1, isOptional: false, defaultDurationHours: 3 },
        { stationName: 'Insulation', sequence: 2, isOptional: false, defaultDurationHours: 2 },
        { stationName: 'Jacketing', sequence: 3, isOptional: false, defaultDurationHours: 1.5 },
        { stationName: 'Quality Testing', sequence: 4, isOptional: false, defaultDurationHours: 0.5 }
      ],
      defaultPackingRules: {
        defaultPackingUnit: 'Drum',
        defaultQuantityPerUnit: 500
      },
      isActive: true
    }
  }
]

export function useProductFamilies() {
  const [productFamilies, setProductFamilies] = useState<ProductFamily[]>(mockProductFamilies)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filtered and sorted data
  const getFilteredAndSortedFamilies = (
    filters: ProductFamilyFilters,
    sort: ProductFamilySort
  ) => {
    let filtered = productFamilies

      // Apply filters
      if (filters.search) {
        const search = filters.search.toLowerCase()
        filtered = filtered.filter(family =>
          family.name.toLowerCase().includes(search) ||
          family.code.toLowerCase().includes(search) ||
          family.description?.toLowerCase().includes(search)
        )
      }

      if (filters.isActive !== undefined) {
        filtered = filtered.filter(family => family.isActive === filters.isActive)
      }

      if (filters.hasAttributes !== undefined) {
        if (filters.hasAttributes) {
          filtered = filtered.filter(family => family.attributes.length > 0)
        } else {
          filtered = filtered.filter(family => family.attributes.length === 0)
        }
      }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date
      let bValue: string | number | Date

      switch (sort.field) {
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        case 'code':
          aValue = a.code
          bValue = b.code
          break
        case 'createdAt':
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
          break
        case 'attributeCount':
          aValue = a.attributes.length
          bValue = b.attributes.length
          break
        default:
          return 0
      }

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }

  // Create a new product family
  const createProductFamily = async (data: ProductFamilyFormData): Promise<string> => {
    setLoading(true)
    setError(null)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      const newFamily: ProductFamily = {
        id: `pf-${Date.now()}`,
        ...data,
        attributes: data.attributes.map((attr, index) => ({
          ...attr,
          id: `attr-${Date.now()}-${index}`,
          order: index + 1
        })),
        defaultRoutingRules: data.defaultRoutingRules.map(rule => ({
          ...rule,
          stationId: `st-${Date.now()}-${rule.sequence}`
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'current-user-id'
      }

      setProductFamilies(prev => [...prev, newFamily])
      return newFamily.id
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create product family'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Update an existing product family
  const updateProductFamily = async (id: string, data: ProductFamilyFormData): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      setProductFamilies(prev => prev.map(family => 
        family.id === id 
          ? {
              ...family,
              ...data,
              attributes: data.attributes.map((attr, index) => ({
                ...attr,
                id: `attr-${Date.now()}-${index}`,
                order: index + 1
              })),
              defaultRoutingRules: data.defaultRoutingRules.map(rule => ({
                ...rule,
                stationId: `st-${Date.now()}-${rule.sequence}`
              })),
              updatedAt: new Date().toISOString()
            }
          : family
      ))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update product family'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Delete a product family
  const deleteProductFamily = async (id: string): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300))

      setProductFamilies(prev => prev.filter(family => family.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete product family'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Toggle active status
  const toggleProductFamilyStatus = async (id: string): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200))

      setProductFamilies(prev => prev.map(family =>
        family.id === id 
          ? { ...family, isActive: !family.isActive, updatedAt: new Date().toISOString() }
          : family
      ))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update product family status'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return {
    productFamilies,
    loading,
    error,
    getFilteredAndSortedFamilies,
    createProductFamily,
    updateProductFamily,
    deleteProductFamily,
    toggleProductFamilyStatus,
    templates: productFamilyTemplates
  }
}
