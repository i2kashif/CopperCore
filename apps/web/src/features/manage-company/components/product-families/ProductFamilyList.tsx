import type { ProductFamily, ProductFamilySort } from '../../types/productFamily'

interface Props {
  families: ProductFamily[]
  loading: boolean
  sort: ProductFamilySort
  onSortChange: (sort: ProductFamilySort) => void
  onEdit: (family: ProductFamily) => void
  onDelete: (id: string) => void
  onToggleStatus: (id: string) => void
  canEdit: boolean
}

export function ProductFamilyList({
  families,
  loading,
  sort,
  onSortChange,
  onEdit,
  onDelete,
  onToggleStatus,
  canEdit
}: Props) {
  const handleSort = (field: ProductFamilySort['field']) => {
    onSortChange({
      field,
      direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc'
    })
  }

  const getSortIcon = (field: ProductFamilySort['field']) => {
    if (sort.field !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    
    return sort.direction === 'asc' ? (
      <svg className="w-4 h-4 text-copper-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-copper-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const generateSKUPreview = (family: ProductFamily) => {
    const skuAttributes = family.attributes.filter(attr => attr.level === 'sku').slice(0, 3)
    if (skuAttributes.length === 0) return 'No SKU attributes'

    const sampleValues = skuAttributes.map(attr => {
      switch (attr.type) {
        case 'enum':
          return attr.validation.enumOptions?.[0] || 'Option1'
        case 'number':
          return (attr.validation.min || 1).toString()
        case 'text':
          return 'Sample'
        default:
          return 'Value'
      }
    })

    let preview = family.skuNamingRule.pattern
    skuAttributes.forEach((attr, index) => {
      const placeholder = `{${attr.key}}`
      if (preview.includes(placeholder)) {
        preview = preview.replace(placeholder, sampleValues[index])
      }
    })

    // Apply case transformation
    switch (family.skuNamingRule.caseTransform) {
      case 'upper':
        preview = preview.toUpperCase()
        break
      case 'lower':
        preview = preview.toLowerCase()
        break
    }

    return preview
  }

  if (loading && families.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg border border-gray-100 p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper-600"></div>
        <p className="mt-2 text-sm text-gray-500">Loading product families...</p>
      </div>
    )
  }

  if (families.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg border border-gray-100 p-8 text-center">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m-16-5c9.667 0 16-3.582 16-8" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No product families found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first product family configuration.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Name</span>
                  {getSortIcon('name')}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('code')}
              >
                <div className="flex items-center space-x-1">
                  <span>Code</span>
                  {getSortIcon('code')}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('attributeCount')}
              >
                <div className="flex items-center space-x-1">
                  <span>Attributes</span>
                  {getSortIcon('attributeCount')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU Preview
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center space-x-1">
                  <span>Created</span>
                  {getSortIcon('createdAt')}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {families.map((family) => (
              <tr key={family.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{family.name}</div>
                    {family.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">{family.description}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                  {family.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-copper-100 text-copper-800">
                      {family.attributes.length} total
                    </span>
                    <div className="flex space-x-1">
                      {family.attributes.filter(attr => attr.level === 'sku').length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          SKU: {family.attributes.filter(attr => attr.level === 'sku').length}
                        </span>
                      )}
                      {family.attributes.filter(attr => attr.level === 'lot').length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          LOT: {family.attributes.filter(attr => attr.level === 'lot').length}
                        </span>
                      )}
                      {family.attributes.filter(attr => attr.level === 'unit').length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          UNIT: {family.attributes.filter(attr => attr.level === 'unit').length}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono max-w-xs truncate">
                  {generateSKUPreview(family)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => canEdit && onToggleStatus(family.id)}
                    disabled={!canEdit}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      family.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    } ${canEdit ? 'cursor-pointer hover:opacity-75' : 'cursor-not-allowed'}`}
                  >
                    {family.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(family.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onEdit(family)}
                      className="text-copper-600 hover:text-copper-900"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    {canEdit && (
                      <>
                        <button
                          onClick={() => onEdit(family)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDelete(family.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}