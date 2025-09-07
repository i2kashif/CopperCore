import type { ProductFamilyFilters } from '../../types/productFamily'

interface Props {
  filters: ProductFamilyFilters
  onFiltersChange: (filters: ProductFamilyFilters) => void
  totalCount: number
  filteredCount: number
}

export function ProductFamilyFilters({ filters, onFiltersChange, totalCount, filteredCount }: Props) {
  return (
    <div className="bg-white shadow rounded-lg border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-900">Filters</h4>
        <div className="text-sm text-gray-500">
          Showing {filteredCount} of {totalCount} product families
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search families..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-copper-500 focus:border-copper-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.isActive === undefined ? '' : filters.isActive.toString()}
            onChange={(e) => {
              const value = e.target.value === '' ? undefined : e.target.value === 'true'
              onFiltersChange({ ...filters, isActive: value })
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-copper-500 focus:border-copper-500"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {/* Attributes Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attributes
          </label>
          <select
            value={filters.hasAttributes === undefined ? '' : filters.hasAttributes.toString()}
            onChange={(e) => {
              const value = e.target.value === '' ? undefined : e.target.value === 'true'
              onFiltersChange({ ...filters, hasAttributes: value })
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-copper-500 focus:border-copper-500"
          >
            <option value="">All Families</option>
            <option value="true">With Attributes</option>
            <option value="false">Without Attributes</option>
          </select>
        </div>

        {/* Clear Filters */}
        <div className="flex items-end">
          <button
            onClick={() => onFiltersChange({ search: '', isActive: undefined, hasAttributes: undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-copper-500"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  )
}