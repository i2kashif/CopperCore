// TanStack Query cache key factory following PRD-v1.5.md realtime requirements

export const cacheKeys = {
  // Work Orders - factory scoped
  workOrders: {
    all: ['work_orders'] as const,
    lists: () => [...cacheKeys.workOrders.all, 'list'] as const,
    list: (factoryId: string, filters?: Record<string, any>) =>
      [...cacheKeys.workOrders.lists(), factoryId, filters] as const,
    details: () => [...cacheKeys.workOrders.all, 'detail'] as const,
    detail: (id: string) => [...cacheKeys.workOrders.details(), id] as const,
  },

  // Packing Units - factory scoped with PU code lookups
  packingUnits: {
    all: ['packing_units'] as const,
    lists: () => [...cacheKeys.packingUnits.all, 'list'] as const,
    list: (factoryId: string, filters?: Record<string, any>) =>
      [...cacheKeys.packingUnits.lists(), factoryId, filters] as const,
    details: () => [...cacheKeys.packingUnits.all, 'detail'] as const,
    detail: (id: string) => [...cacheKeys.packingUnits.details(), id] as const,
    byCode: (puCode: string, factoryId: string) =>
      [...cacheKeys.packingUnits.all, 'by_code', puCode, factoryId] as const,
  },

  // Dispatch Notes - factory scoped
  dispatchNotes: {
    all: ['dispatch_notes'] as const,
    lists: () => [...cacheKeys.dispatchNotes.all, 'list'] as const,
    list: (factoryId: string, filters?: Record<string, any>) =>
      [...cacheKeys.dispatchNotes.lists(), factoryId, filters] as const,
    details: () => [...cacheKeys.dispatchNotes.all, 'detail'] as const,
    detail: (id: string) => [...cacheKeys.dispatchNotes.details(), id] as const,
  },

  // GRNs - factory scoped with DN cross-references  
  grns: {
    all: ['grns'] as const,
    lists: () => [...cacheKeys.grns.all, 'list'] as const,
    list: (factoryId: string, filters?: Record<string, any>) =>
      [...cacheKeys.grns.lists(), factoryId, filters] as const,
    details: () => [...cacheKeys.grns.all, 'detail'] as const,
    detail: (id: string) => [...cacheKeys.grns.details(), id] as const,
    byDispatchNote: (dnId: string, factoryId: string) =>
      [...cacheKeys.grns.all, 'by_dn', dnId, factoryId] as const,
  },

  // Inventory - factory scoped with lot tracking
  inventory: {
    all: ['inventory'] as const,
    lots: (factoryId: string) => [...cacheKeys.inventory.all, 'lots', factoryId] as const,
    lot: (lotId: string, factoryId: string) =>
      [...cacheKeys.inventory.all, 'lot', lotId, factoryId] as const,
    movements: (factoryId: string, filters?: Record<string, any>) =>
      [...cacheKeys.inventory.all, 'movements', factoryId, filters] as const,
  },

  // Testing/QC - factory scoped
  qc: {
    all: ['qc'] as const,
    tests: (factoryId: string) => [...cacheKeys.qc.all, 'tests', factoryId] as const,
    test: (testId: string, factoryId: string) =>
      [...cacheKeys.qc.all, 'test', testId, factoryId] as const,
    results: (puId: string, factoryId: string) =>
      [...cacheKeys.qc.all, 'results', puId, factoryId] as const,
  },

  // Users and authentication - global but role-filtered
  users: {
    all: ['users'] as const,
    profile: (userId: string) => [...cacheKeys.users.all, 'profile', userId] as const,
    permissions: (userId: string) => [...cacheKeys.users.all, 'permissions', userId] as const,
  },

  // Product families and SKUs - factory scoped
  products: {
    all: ['products'] as const,
    families: (factoryId: string) => [...cacheKeys.products.all, 'families', factoryId] as const,
    family: (familyId: string, factoryId: string) =>
      [...cacheKeys.products.all, 'family', familyId, factoryId] as const,
    skus: (factoryId: string, familyId?: string) =>
      [...cacheKeys.products.all, 'skus', factoryId, familyId] as const,
    sku: (skuId: string, factoryId: string) =>
      [...cacheKeys.products.all, 'sku', skuId, factoryId] as const,
  },
} as const

// Helper function to invalidate related caches after mutations
export const getInvalidationKeys = (
  entityType: string,
  factoryId: string,
  entityId?: string
): Array<readonly (string | Record<string, any>)[]> => {
  const keys: Array<readonly (string | Record<string, any>)[]> = []

  switch (entityType) {
    case 'work_order':
      keys.push(cacheKeys.workOrders.lists())
      keys.push(cacheKeys.workOrders.list(factoryId))
      if (entityId) keys.push(cacheKeys.workOrders.detail(entityId))
      break

    case 'packing_unit':
      keys.push(cacheKeys.packingUnits.lists())
      keys.push(cacheKeys.packingUnits.list(factoryId))
      keys.push(cacheKeys.inventory.lots(factoryId))
      if (entityId) keys.push(cacheKeys.packingUnits.detail(entityId))
      break

    case 'dispatch_note':
      keys.push(cacheKeys.dispatchNotes.lists())
      keys.push(cacheKeys.dispatchNotes.list(factoryId))
      keys.push(cacheKeys.inventory.movements(factoryId))
      if (entityId) keys.push(cacheKeys.dispatchNotes.detail(entityId))
      break

    case 'grn':
      keys.push(cacheKeys.grns.lists())
      keys.push(cacheKeys.grns.list(factoryId))
      keys.push(cacheKeys.inventory.lots(factoryId))
      keys.push(cacheKeys.inventory.movements(factoryId))
      if (entityId) keys.push(cacheKeys.grns.detail(entityId))
      break
  }

  return keys
}