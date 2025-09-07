import { useState, useCallback, useMemo } from 'react'
import type { SKU, SKUFilters, SKUSort, SKUFormData, BulkSKUGenerationData, SKUApprovalData } from '../types/sku'
import type { ProductFamily } from '../types/productFamily'

// Mock data generator
const generateMockSKUs = (): SKU[] => {
  return [
    {
      id: 'sku-1',
      code: 'CU-2.5-150-RED',
      name: 'Copper Wire 2.5mm 150μm Red',
      familyId: 'family-1',
      familyCode: 'ENAM-WIRE',
      familyName: 'Enamel Wire',
      status: 'active',
      attributes: [
        { attributeKey: 'metal', attributeLabel: 'Metal', value: 'CU', level: 'sku' },
        { attributeKey: 'rod_diameter_mm', attributeLabel: 'Rod Diameter', value: 2.5, unit: 'mm', level: 'sku' },
        { attributeKey: 'enamel_thickness_um', attributeLabel: 'Enamel Thickness', value: 150, unit: 'μm', level: 'sku' },
        { attributeKey: 'color', attributeLabel: 'Color', value: 'RED', level: 'sku' },
      ],
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-01-15T10:00:00Z',
      createdBy: 'admin',
      totalInventory: 1250.5,
      lastUsedAt: '2025-01-20T14:30:00Z',
      usageCount: 45,
    },
    {
      id: 'sku-2',
      code: 'AL-1.5-100-BLACK',
      name: 'Aluminum Wire 1.5mm 100μm Black',
      familyId: 'family-1',
      familyCode: 'ENAM-WIRE',
      familyName: 'Enamel Wire',
      status: 'active',
      attributes: [
        { attributeKey: 'metal', attributeLabel: 'Metal', value: 'AL', level: 'sku' },
        { attributeKey: 'rod_diameter_mm', attributeLabel: 'Rod Diameter', value: 1.5, unit: 'mm', level: 'sku' },
        { attributeKey: 'enamel_thickness_um', attributeLabel: 'Enamel Thickness', value: 100, unit: 'μm', level: 'sku' },
        { attributeKey: 'color', attributeLabel: 'Color', value: 'BLACK', level: 'sku' },
      ],
      createdAt: '2025-01-14T09:00:00Z',
      updatedAt: '2025-01-14T09:00:00Z',
      createdBy: 'admin',
      totalInventory: 850.0,
      lastUsedAt: '2025-01-19T11:20:00Z',
      usageCount: 32,
    },
    {
      id: 'sku-3',
      code: 'PENDING-001',
      name: 'Copper Wire 3.0mm 200μm Blue (Pending)',
      familyId: 'family-1',
      familyCode: 'ENAM-WIRE',
      familyName: 'Enamel Wire',
      status: 'pending',
      pendingReason: 'on_the_fly',
      attributes: [
        { attributeKey: 'metal', attributeLabel: 'Metal', value: 'CU', level: 'sku' },
        { attributeKey: 'rod_diameter_mm', attributeLabel: 'Rod Diameter', value: 3.0, unit: 'mm', level: 'sku' },
        { attributeKey: 'enamel_thickness_um', attributeLabel: 'Enamel Thickness', value: 200, unit: 'μm', level: 'sku' },
        { attributeKey: 'color', attributeLabel: 'Color', value: 'BLUE', level: 'sku' },
      ],
      createdAt: '2025-01-20T15:00:00Z',
      updatedAt: '2025-01-20T15:00:00Z',
      createdBy: 'factory-manager-1',
      totalInventory: 0,
      usageCount: 0,
    },
    {
      id: 'sku-4',
      code: 'PVC-FLEX-16-BLK',
      name: 'PVC Flexible Cable 16mm² Black',
      familyId: 'family-2',
      familyCode: 'PVC-CABLE',
      familyName: 'PVC Cable',
      status: 'active',
      attributes: [
        { attributeKey: 'type', attributeLabel: 'Type', value: 'FLEX', level: 'sku' },
        { attributeKey: 'cross_section_mm2', attributeLabel: 'Cross Section', value: 16, unit: 'mm²', level: 'sku' },
        { attributeKey: 'insulation_color', attributeLabel: 'Insulation Color', value: 'BLACK', level: 'sku' },
      ],
      createdAt: '2025-01-10T08:00:00Z',
      updatedAt: '2025-01-10T08:00:00Z',
      createdBy: 'admin',
      totalInventory: 2500.0,
      lastUsedAt: '2025-01-21T09:15:00Z',
      usageCount: 78,
    },
    {
      id: 'sku-5',
      code: 'CU-2.0-125-GREEN',
      name: 'Copper Wire 2.0mm 125μm Green',
      familyId: 'family-1',
      familyCode: 'ENAM-WIRE',
      familyName: 'Enamel Wire',
      status: 'disabled',
      disableReason: 'Discontinued - replaced by CU-2.0-130-GREEN',
      attributes: [
        { attributeKey: 'metal', attributeLabel: 'Metal', value: 'CU', level: 'sku' },
        { attributeKey: 'rod_diameter_mm', attributeLabel: 'Rod Diameter', value: 2.0, unit: 'mm', level: 'sku' },
        { attributeKey: 'enamel_thickness_um', attributeLabel: 'Enamel Thickness', value: 125, unit: 'μm', level: 'sku' },
        { attributeKey: 'color', attributeLabel: 'Color', value: 'GREEN', level: 'sku' },
      ],
      createdAt: '2024-12-01T10:00:00Z',
      updatedAt: '2025-01-05T14:00:00Z',
      createdBy: 'admin',
      disabledBy: 'director-1',
      disabledAt: '2025-01-05T14:00:00Z',
      totalInventory: 0,
      lastUsedAt: '2025-01-03T16:45:00Z',
      usageCount: 156,
    },
  ]
}

export function useSKUs() {
  const [skus, setSKUs] = useState<SKU[]>(generateMockSKUs())
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<SKUFilters>({
    search: '',
  })
  const [sort, setSort] = useState<SKUSort>({
    field: 'code',
    direction: 'asc',
  })

  // Filter and sort SKUs
  const filteredSKUs = useMemo(() => {
    let filtered = [...skus]

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        sku =>
          sku.code.toLowerCase().includes(searchLower) ||
          sku.name.toLowerCase().includes(searchLower) ||
          sku.familyName.toLowerCase().includes(searchLower)
      )
    }

    if (filters.familyId) {
      filtered = filtered.filter(sku => sku.familyId === filters.familyId)
    }

    if (filters.status) {
      filtered = filtered.filter(sku => sku.status === filters.status)
    }

    if (filters.hasInventory !== undefined) {
      filtered = filtered.filter(sku => 
        filters.hasInventory ? (sku.totalInventory || 0) > 0 : (sku.totalInventory || 0) === 0
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sort.field]
      let bVal: any = b[sort.field]

      if (sort.field === 'usageCount') {
        aVal = a.usageCount || 0
        bVal = b.usageCount || 0
      }

      if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [skus, filters, sort])

  // Create SKU
  const createSKU = useCallback(async (data: SKUFormData, family: ProductFamily) => {
    setLoading(true)
    try {
      // Generate SKU code from naming rule
      let code = family.skuNamingRule.pattern
      data.attributes.forEach(attr => {
        code = code.replace(`{${attr.key}}`, String(attr.value))
      })
      
      if (family.skuNamingRule.caseTransform === 'upper') {
        code = code.toUpperCase()
      } else if (family.skuNamingRule.caseTransform === 'lower') {
        code = code.toLowerCase()
      }

      const newSKU: SKU = {
        id: `sku-${Date.now()}`,
        code,
        name: `${family.name} ${code}`,
        familyId: family.id,
        familyCode: family.code,
        familyName: family.name,
        status: 'active',
        attributes: data.attributes.map(attr => {
          const familyAttr = family.attributes.find(fa => fa.key === attr.key)!
          return {
            attributeKey: attr.key,
            attributeLabel: familyAttr.label,
            value: attr.value,
            unit: familyAttr.unit,
            level: familyAttr.level,
          }
        }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'current-user',
        totalInventory: 0,
        usageCount: 0,
      }

      setSKUs(prev => [...prev, newSKU])
      return newSKU
    } finally {
      setLoading(false)
    }
  }, [])

  // Bulk generate SKUs
  const bulkGenerateSKUs = useCallback(async (data: BulkSKUGenerationData, family: ProductFamily) => {
    setLoading(true)
    try {
      const newSKUs: SKU[] = []
      
      // Generate all combinations
      const generateCombinations = (arrays: any[][]): any[][] => {
        if (arrays.length === 0) return [[]]
        const [first, ...rest] = arrays
        const restCombinations = generateCombinations(rest)
        const result: any[][] = []
        for (const value of first) {
          for (const combination of restCombinations) {
            result.push([value, ...combination])
          }
        }
        return result
      }

      const valueArrays = data.attributeGrids.map(grid => grid.values)
      const combinations = generateCombinations(valueArrays)

      combinations.forEach(combination => {
        let code = family.skuNamingRule.pattern
        const attributes: any[] = []
        
        combination.forEach((value, index) => {
          const grid = data.attributeGrids[index]
          code = code.replace(`{${grid.key}}`, String(value))
          
          const familyAttr = family.attributes.find(fa => fa.key === grid.key)!
          attributes.push({
            attributeKey: grid.key,
            attributeLabel: familyAttr.label,
            value,
            unit: familyAttr.unit,
            level: familyAttr.level,
          })
        })

        if (family.skuNamingRule.caseTransform === 'upper') {
          code = code.toUpperCase()
        } else if (family.skuNamingRule.caseTransform === 'lower') {
          code = code.toLowerCase()
        }

        // Check if SKU already exists
        if (!data.skipExisting || !skus.some(sku => sku.code === code)) {
          newSKUs.push({
            id: `sku-${Date.now()}-${Math.random()}`,
            code,
            name: `${family.name} ${code}`,
            familyId: family.id,
            familyCode: family.code,
            familyName: family.name,
            status: 'active',
            attributes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'current-user',
            totalInventory: 0,
            usageCount: 0,
          })
        }
      })

      setSKUs(prev => [...prev, ...newSKUs])
      return newSKUs
    } finally {
      setLoading(false)
    }
  }, [skus])

  // Approve/Reject SKU
  const processApproval = useCallback(async (data: SKUApprovalData) => {
    setLoading(true)
    try {
      setSKUs(prev => prev.map(sku => {
        if (sku.id === data.skuId) {
          if (data.action === 'approve') {
            return {
              ...sku,
              status: 'active',
              pendingReason: undefined,
              approvedBy: 'current-user',
              approvedAt: new Date().toISOString(),
            }
          } else {
            return {
              ...sku,
              status: 'disabled',
              disableReason: data.reason || 'Rejected',
              disabledBy: 'current-user',
              disabledAt: new Date().toISOString(),
            }
          }
        }
        return sku
      }))
    } finally {
      setLoading(false)
    }
  }, [])

  // Toggle SKU status
  const toggleSKUStatus = useCallback(async (skuId: string, reason?: string) => {
    setSKUs(prev => prev.map(sku => {
      if (sku.id === skuId) {
        if (sku.status === 'active') {
          return {
            ...sku,
            status: 'disabled' as const,
            disableReason: reason,
            disabledBy: 'current-user',
            disabledAt: new Date().toISOString(),
          }
        } else if (sku.status === 'disabled') {
          return {
            ...sku,
            status: 'active' as const,
            disableReason: undefined,
            disabledBy: undefined,
            disabledAt: undefined,
          }
        }
      }
      return sku
    }))
  }, [])

  return {
    skus: filteredSKUs,
    loading,
    filters,
    setFilters,
    sort,
    setSort,
    createSKU,
    bulkGenerateSKUs,
    processApproval,
    toggleSKUStatus,
  }
}