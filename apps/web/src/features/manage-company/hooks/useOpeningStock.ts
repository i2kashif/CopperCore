import { useState, useCallback } from 'react'
import type { OpeningStockItem, OpeningStockFormData } from '../types'

// Mock data for opening stock
const mockOpeningStock: OpeningStockItem[] = [
  {
    id: 'os1',
    factoryId: 'f1',
    skuId: 'sku1',
    skuCode: 'CU-WIRE-001',
    skuName: 'Copper Wire 2.5mm',
    lotNumber: 'LOT-2024-001',
    quantity: 1000,
    unit: 'kg',
    location: 'Warehouse A, Rack 1',
    expiryDate: '2025-12-31',
    notes: 'Initial stock from old system',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'ceo'
  },
  {
    id: 'os2',
    factoryId: 'f1',
    skuId: 'sku2',
    skuCode: 'CU-CABLE-002',
    skuName: 'Copper Cable 4mm',
    lotNumber: 'LOT-2024-002',
    quantity: 500,
    unit: 'kg',
    location: 'Warehouse A, Rack 2',
    notes: 'Opening stock',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'ceo'
  },
  {
    id: 'os3',
    factoryId: 'f2',
    skuId: 'sku3',
    skuCode: 'CU-WIRE-003',
    skuName: 'Copper Wire 1.5mm',
    lotNumber: 'LOT-2024-003',
    quantity: 750,
    unit: 'kg',
    location: 'Main Storage',
    notes: 'Transferred from Karachi',
    createdAt: '2024-01-15T00:00:00Z',
    createdBy: 'director1'
  }
]

export function useOpeningStock() {
  const [openingStock, setOpeningStock] = useState<OpeningStockItem[]>(mockOpeningStock)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addOpeningStock = useCallback(async (data: OpeningStockFormData) => {
    setLoading(true)
    setError(null)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // In real app, would fetch SKU details from backend
    const mockSkuDetails = {
      skuCode: `SKU-${Date.now()}`,
      skuName: 'Mock Product Name'
    }
    
    const newItem: OpeningStockItem = {
      ...data,
      ...mockSkuDetails,
      id: `os${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: 'ceo' // In real app, would get from auth context
    }
    
    setOpeningStock(prev => [...prev, newItem])
    setLoading(false)
    
    return newItem
  }, [])

  const updateOpeningStock = useCallback(async (id: string, data: Partial<OpeningStockFormData>) => {
    setLoading(true)
    setError(null)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setOpeningStock(prev => prev.map(item => 
      item.id === id 
        ? { ...item, ...data }
        : item
    ))
    
    setLoading(false)
  }, [])

  const deleteOpeningStock = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setOpeningStock(prev => prev.filter(item => item.id !== id))
    setLoading(false)
  }, [])

  const getStockByFactory = useCallback((factoryId: string) => {
    return openingStock.filter(item => item.factoryId === factoryId)
  }, [openingStock])

  return {
    openingStock,
    loading,
    error,
    addOpeningStock,
    updateOpeningStock,
    deleteOpeningStock,
    getStockByFactory
  }
}