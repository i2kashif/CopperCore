/**
 * Users Management Component
 * Provides full CRUD operations for user management with factory assignments
 */

import React, { useState, useMemo } from 'react'
import {
  useUsers,
  useFactories,
  useCreateUser,
  useInviteUser,
  useUpdateUser,
  useDeleteUser,
  useUpdateUserFactoryAssignments,
  useUsernameAvailability
} from '../../hooks/useCompany'
import type { 
  ManagedUser, 
  UserFormData, 
  UserInviteFormData, 
  UserFilters, 
  ManagedFactory 
} from '../../modules/company/types'
import type { UserRole } from '../../modules/auth/types'
import { companyService } from '../../modules/company/service'

const USER_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'CEO', label: 'CEO', description: 'Chief Executive Officer - Full system access' },
  { value: 'Director', label: 'Director', description: 'Executive Director - Full system access' },
  { value: 'FM', label: 'Factory Manager', description: 'Manages factory operations' },
  { value: 'FW', label: 'Factory Worker', description: 'Factory floor operations' },
  { value: 'Office', label: 'Office Staff', description: 'Office and administrative tasks' }
]

// User Form Modal Component
interface UserFormModalProps {
  isOpen: boolean
  onClose: () => void
  user?: ManagedUser
  onSuccess: () => void
  mode: 'create' | 'invite' | 'edit'
}

function UserFormModal({ isOpen, onClose, user, onSuccess, mode }: UserFormModalProps) {
  const [formData, setFormData] = useState<UserFormData | UserInviteFormData>({
    username: user?.username || '',
    email: user?.email || '',
    full_name: user?.full_name || '',
    role: user?.role || 'FW',
    active: user?.active ?? true,
    factory_ids: user?.factories?.map(f => f.id) || [],
    ...(mode === 'create' && { password: '' })
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValidating, setIsValidating] = useState(false)

  const createUser = useCreateUser()
  const inviteUser = useInviteUser()
  const updateUser = useUpdateUser()
  const { data: factories = [] } = useFactories()

  // Check username availability for new users or when username changes
  const { data: usernameAvailable, isLoading: checkingUsername } = useUsernameAvailability(
    formData.username,
    user?.id,
    formData.username !== user?.username && formData.username.length >= 2
  )

  const isEditing = mode === 'edit'
  const isCreating = mode === 'create'
  const isInviting = mode === 'invite'

  // Reset form when modal opens/closes or user changes
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        username: user?.username || '',
        email: user?.email || '',
        full_name: user?.full_name || '',
        role: user?.role || 'FW',
        active: user?.active ?? true,
        factory_ids: user?.factories?.map(f => f.id) || [],
        ...(mode === 'create' && { password: '' })
      })
      setErrors({})
    }
  }, [isOpen, user, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsValidating(true)

    // Validate form
    const validation = companyService.validateUserForm(formData)
    if (!validation.valid) {
      setErrors(validation.errors)
      setIsValidating(false)
      return
    }

    // Check username availability
    if (!isEditing || formData.username !== user?.username) {
      if (checkingUsername || usernameAvailable === false) {
        setErrors({ username: 'Username is already taken' })
        setIsValidating(false)
        return
      }
    }

    try {
      if (isEditing && user) {
        await updateUser.mutateAsync({ userId: user.id, data: formData as UserFormData })
      } else if (isCreating) {
        await createUser.mutateAsync(formData as UserFormData)
      } else if (isInviting) {
        await inviteUser.mutateAsync(formData as UserInviteFormData)
      }
      onSuccess()
      onClose()
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Operation failed' })
    }
    
    setIsValidating(false)
  }

  const handleFactoryToggle = (factoryId: string, selected: boolean) => {
    setFormData(prev => ({
      ...prev,
      factory_ids: selected
        ? [...prev.factory_ids, factoryId]
        : prev.factory_ids.filter(id => id !== factoryId)
    }))
  }

  if (!isOpen) return null

  const modalTitle = isEditing ? 'Edit User' : isInviting ? 'Invite User' : 'Create User'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="modal-panel large" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h3 className="modal-title">{modalTitle}</h3>
            </div>

            <div className="modal-body space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h4>
                <div className="form-grid">
                  {/* Username */}
                  <div className="form-field">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      className={`form-input ${errors.username ? 'error' : ''}`}
                      placeholder="Enter username"
                      data-testid="user-username-input"
                    />
                    {errors.username && (
                      <div className="text-red-600 text-sm mt-1">{errors.username}</div>
                    )}
                    {checkingUsername && (
                      <div className="text-blue-600 text-sm mt-1">Checking availability...</div>
                    )}
                    {!checkingUsername && usernameAvailable === false && formData.username !== user?.username && (
                      <div className="text-red-600 text-sm mt-1">Username is already taken</div>
                    )}
                    {!checkingUsername && usernameAvailable === true && formData.username.length >= 2 && (
                      <div className="text-green-600 text-sm mt-1">Username is available</div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="form-field">
                    <label className="form-label">Email (Optional)</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value || null }))}
                      className={`form-input ${errors.email ? 'error' : ''}`}
                      placeholder="user@example.com"
                      data-testid="user-email-input"
                    />
                    {errors.email && (
                      <div className="text-red-600 text-sm mt-1">{errors.email}</div>
                    )}
                  </div>

                  {/* Full Name */}
                  <div className="form-field full-width">
                    <label className="form-label">Full Name (Optional)</label>
                    <input
                      type="text"
                      value={formData.full_name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value || null }))}
                      className={`form-input ${errors.full_name ? 'error' : ''}`}
                      placeholder="Enter full name"
                      data-testid="user-fullname-input"
                    />
                    {errors.full_name && (
                      <div className="text-red-600 text-sm mt-1">{errors.full_name}</div>
                    )}
                  </div>

                  {/* Password (Create mode only) */}
                  {isCreating && (
                    <div className="form-field full-width">
                      <label className="form-label">Password</label>
                      <input
                        type="password"
                        value={(formData as UserFormData).password || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className={`form-input ${errors.password ? 'error' : ''}`}
                        placeholder="Enter password"
                        data-testid="user-password-input"
                      />
                      {errors.password && (
                        <div className="text-red-600 text-sm mt-1">{errors.password}</div>
                      )}
                      <div className="text-sm text-gray-500 mt-1">
                        Minimum 8 characters required
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Role & Status */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Role & Status</h4>
                <div className="form-grid">
                  {/* Role */}
                  <div className="form-field">
                    <label className="form-label">User Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                      className={`select-input ${errors.role ? 'error' : ''}`}
                      data-testid="user-role-select"
                    >
                      {USER_ROLES.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    {errors.role && (
                      <div className="text-red-600 text-sm mt-1">{errors.role}</div>
                    )}
                    <div className="text-sm text-gray-500 mt-1">
                      {USER_ROLES.find(r => r.value === formData.role)?.description}
                    </div>
                  </div>

                  {/* Active Status */}
                  <div className="form-field">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                        className="checkbox mr-2"
                        data-testid="user-active-checkbox"
                      />
                      <span className="form-label mb-0">Active User</span>
                    </label>
                    <div className="text-sm text-gray-500 mt-1">
                      Only active users can log in to the system
                    </div>
                  </div>
                </div>
              </div>

              {/* Factory Assignments */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Factory Access</h4>
                {errors.factory_ids && (
                  <div className="text-red-600 text-sm mb-3">{errors.factory_ids}</div>
                )}
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {factories.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No factories available
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {factories.map((factory) => (
                        <label
                          key={factory.id}
                          className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.factory_ids.includes(factory.id)}
                            onChange={(e) => handleFactoryToggle(factory.id, e.target.checked)}
                            className="checkbox mr-3"
                            data-testid={`factory-assignment-${factory.code}`}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{factory.name}</div>
                            <div className="text-sm text-gray-500">{factory.code}</div>
                          </div>
                          <span className={`badge ${factory.active ? 'badge-active' : 'badge-inactive'}`}>
                            {factory.active ? 'Active' : 'Inactive'}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Select factories this user can access. Global roles (CEO, Director) can access all factories.
                </div>
              </div>

              {/* Invite Options (Invite mode only) */}
              {isInviting && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Invitation Options</h4>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(formData as UserInviteFormData).send_invite ?? true}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        send_invite: e.target.checked 
                      }))}
                      className="checkbox mr-2"
                      data-testid="user-send-invite-checkbox"
                    />
                    <span className="text-sm">Send invitation email</span>
                  </label>
                  <div className="text-sm text-gray-500 mt-1">
                    If unchecked, you'll receive an invitation link to share manually
                  </div>
                </div>
              )}

              {errors.submit && (
                <div className="alert alert-error">{errors.submit}</div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isValidating || createUser.isPending || inviteUser.isPending || updateUser.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={
                  isValidating || 
                  createUser.isPending || 
                  inviteUser.isPending || 
                  updateUser.isPending ||
                  checkingUsername ||
                  (!isEditing && usernameAvailable === false)
                }
                data-testid="user-submit-button"
              >
                {isValidating || createUser.isPending || inviteUser.isPending || updateUser.isPending ? (
                  <span className="loading-spinner"></span>
                ) : (
                  isEditing ? 'Update User' : isInviting ? 'Send Invite' : 'Create User'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Delete Confirmation Modal
interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  user: ManagedUser | null
  onConfirm: () => void
  isDeleting: boolean
}

function DeleteConfirmModal({ isOpen, onClose, user, onConfirm, isDeleting }: DeleteConfirmModalProps) {
  if (!isOpen || !user) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title text-red-600">Delete User</h3>
          </div>

          <div className="modal-body">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <p className="text-gray-900 font-medium mb-2">
                Are you sure you want to delete "{user.username}"?
              </p>
              <p className="text-gray-600 text-sm mb-4">
                This action cannot be undone. The user will lose access to all factories and data.
              </p>
              {user.factory_count && user.factory_count > 0 && (
                <div className="alert alert-warning">
                  <strong>Warning:</strong> This user has access to {user.factory_count} factory(ies). 
                  All access will be revoked.
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="btn-primary bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
              data-testid="delete-user-confirm"
            >
              {isDeleting ? (
                <span className="loading-spinner"></span>
              ) : (
                'Delete User'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Users Management Component
export function UsersManagement() {
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: undefined,
    active: undefined,
    factory_id: undefined,
    sort_by: 'username',
    sort_order: 'asc'
  })
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null)

  // Data fetching
  const { data: users = [], isLoading, error, refetch } = useUsers(filters)
  const { data: factories = [] } = useFactories()
  const deleteUser = useDeleteUser()

  // Filtered and sorted data
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase()
        const matchesSearch = 
          user.username.toLowerCase().includes(search) ||
          (user.full_name && user.full_name.toLowerCase().includes(search)) ||
          (user.email && user.email.toLowerCase().includes(search))
        if (!matchesSearch) return false
      }

      // Role filter
      if (filters.role && user.role !== filters.role) return false

      // Active filter
      if (filters.active !== undefined && user.active !== filters.active) return false

      // Factory filter
      if (filters.factory_id) {
        if (!user.factories?.some(f => f.id === filters.factory_id)) return false
      }

      return true
    })
  }, [users, filters])

  const handleDeleteUser = async () => {
    if (!deletingUser) return

    try {
      await deleteUser.mutateAsync(deletingUser.id)
      setDeletingUser(null)
      setSelectedUsers(prev => prev.filter(id => id !== deletingUser.id))
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  const handleBulkAction = async (action: 'activate' | 'deactivate') => {
    // Implementation for bulk actions would go here
    console.log(`Bulk ${action} for users:`, selectedUsers)
  }

  const handleSelectUser = (userId: string, selected: boolean) => {
    setSelectedUsers(prev => 
      selected 
        ? [...prev, userId]
        : prev.filter(id => id !== userId)
    )
  }

  const handleSelectAll = (selected: boolean) => {
    setSelectedUsers(selected ? filteredUsers.map(u => u.id) : [])
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'CEO': return 'badge-ceo'
      case 'Director': return 'badge-director'
      case 'FM': return 'badge-fm'
      case 'FW': return 'badge-fw'
      case 'Office': return 'badge-office'
      default: return 'badge-office'
    }
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-4xl mb-4">❌</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Users</h3>
        <p className="text-gray-600 mb-4">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <button onClick={() => refetch()} className="btn-primary">
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          <p className="text-sm text-gray-600">
            {filteredUsers.length} of {users.length} users
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-secondary"
            data-testid="invite-user-button"
          >
            <span className="mr-2">📧</span>
            Invite User
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
            data-testid="create-user-button"
          >
            <span className="mr-2">+</span>
            Create User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-row">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="search-input"
              placeholder="Search users..."
              data-testid="users-search"
            />
          </div>

          {/* Role Filter */}
          <select
            value={filters.role || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              role: e.target.value === '' ? undefined : e.target.value as UserRole
            }))}
            className="select-input"
            data-testid="users-role-filter"
          >
            <option value="">All Roles</option>
            {USER_ROLES.map(role => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          {/* Active Filter */}
          <select
            value={filters.active === undefined ? '' : filters.active.toString()}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              active: e.target.value === '' ? undefined : e.target.value === 'true'
            }))}
            className="select-input"
            data-testid="users-active-filter"
          >
            <option value="">All Status</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>

          {/* Factory Filter */}
          <select
            value={filters.factory_id || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              factory_id: e.target.value === '' ? undefined : e.target.value
            }))}
            className="select-input"
            data-testid="users-factory-filter"
          >
            <option value="">All Factories</option>
            {factories.map(factory => (
              <option key={factory.id} value={factory.id}>
                {factory.name} ({factory.code})
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={`${filters.sort_by}-${filters.sort_order}`}
            onChange={(e) => {
              const [sort_by, sort_order] = e.target.value.split('-')
              setFilters(prev => ({ 
                ...prev, 
                sort_by: sort_by as any,
                sort_order: sort_order as any
              }))
            }}
            className="select-input"
          >
            <option value="username-asc">Username (A-Z)</option>
            <option value="username-desc">Username (Z-A)</option>
            <option value="full_name-asc">Name (A-Z)</option>
            <option value="full_name-desc">Name (Z-A)</option>
            <option value="role-asc">Role (A-Z)</option>
            <option value="role-desc">Role (Z-A)</option>
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bulk-actions">
          <div className="bulk-actions-info">
            {selectedUsers.length} user(s) selected
          </div>
          <div className="bulk-actions-buttons">
            <button
              onClick={() => handleBulkAction('activate')}
              className="btn-sm btn-secondary"
            >
              Activate
            </button>
            <button
              onClick={() => handleBulkAction('deactivate')}
              className="btn-sm btn-secondary"
            >
              Deactivate
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-gray-600">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No users found</div>
            <div className="empty-state-description">
              {filters.search || filters.role || filters.active !== undefined || filters.factory_id
                ? 'No users match your current filters'
                : 'Get started by creating your first user'
              }
            </div>
            {!filters.search && !filters.role && filters.active === undefined && !filters.factory_id && (
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="btn-secondary"
                >
                  Invite User
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary"
                >
                  Create User
                </button>
              </div>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="checkbox"
                  />
                </th>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Factories</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} data-testid={`user-row-${user.username}`}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                      className="checkbox"
                    />
                  </td>
                  <td>
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.full_name || user.username}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{user.username}
                        {user.email && ` • ${user.email}`}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.active ? 'badge-active' : 'badge-inactive'}`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="text-sm">
                      {user.factories && user.factories.length > 0 ? (
                        <div>
                          <div className="font-medium">{user.factories.length} factories</div>
                          <div className="text-gray-500">
                            {user.factories.slice(0, 2).map(f => f.code).join(', ')}
                            {user.factories.length > 2 && ` +${user.factories.length - 2} more`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">No factories</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="text-sm text-gray-600">
                      {new Date(user.created_at || '').toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="btn-sm btn-secondary"
                        data-testid={`edit-user-${user.username}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingUser(user)}
                        className="btn-sm btn-outline text-red-600 border-red-600"
                        data-testid={`delete-user-${user.username}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <UserFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetch()}
        mode="create"
      />

      <UserFormModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => refetch()}
        mode="invite"
      />

      <UserFormModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser || undefined}
        onSuccess={() => refetch()}
        mode="edit"
      />

      <DeleteConfirmModal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        user={deletingUser}
        onConfirm={handleDeleteUser}
        isDeleting={deleteUser.isPending}
      />
    </div>
  )
}

export default UsersManagement