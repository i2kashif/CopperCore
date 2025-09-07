import { useState } from 'react'
import { useUsers } from '../hooks/useUsers'
import { useFactories } from '../hooks/useFactories'
import type { User, UserFormData } from '../types'

function UserForm({ 
  onSubmit, 
  onCancel, 
  initialData 
}: { 
  onSubmit: (data: UserFormData) => void
  onCancel: () => void
  initialData?: User 
}) {
  const { factories } = useFactories()
  const [formData, setFormData] = useState<UserFormData>({
    username: initialData?.username || '',
    email: initialData?.email || '',
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    password: '',
    role: initialData?.role || 'Factory Worker',
    assignedFactories: initialData?.assignedFactories || [],
    isActive: initialData?.isActive ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const isGlobalRole = formData.role === 'CEO' || formData.role === 'Director'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Username *</label>
          <input
            type="text"
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">First Name *</label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Last Name *</label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          />
        </div>
      </div>

      {!initialData && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Password *</label>
          <input
            type="password"
            required={!initialData}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Role *</label>
        <select
          value={formData.role}
          onChange={(e) => setFormData({ 
            ...formData, 
            role: e.target.value as User['role'],
            assignedFactories: (e.target.value === 'CEO' || e.target.value === 'Director') ? [] : formData.assignedFactories
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-copper-500 focus:ring-copper-500 sm:text-sm"
        >
          <option value="CEO">CEO</option>
          <option value="Director">Director</option>
          <option value="Factory Manager">Factory Manager</option>
          <option value="Factory Worker">Factory Worker</option>
          <option value="Office">Office</option>
        </select>
      </div>

      {!isGlobalRole && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Assigned Factories</label>
          <div className="mt-2 space-y-2">
            {factories.map((factory) => (
              <label key={factory.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.assignedFactories.includes(factory.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ 
                        ...formData, 
                        assignedFactories: [...formData.assignedFactories, factory.id]
                      })
                    } else {
                      setFormData({ 
                        ...formData, 
                        assignedFactories: formData.assignedFactories.filter(id => id !== factory.id)
                      })
                    }
                  }}
                  className="h-4 w-4 text-copper-600 focus:ring-copper-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{factory.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="h-4 w-4 text-copper-600 focus:ring-copper-500 border-gray-300 rounded"
        />
        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">Active</label>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-copper-600 hover:bg-copper-700"
        >
          {initialData ? 'Update' : 'Create'} User
        </button>
      </div>
    </form>
  )
}

export function UsersTab() {
  const { 
    users, 
    loading, 
    createUser, 
    updateUser, 
    deleteUser, 
    toggleUserStatus, 
    getDisplayFactoryInfo,
    refreshUsers
  } = useUsers()
  const { factories } = useFactories()
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  // BACK-15: Add optimistic update states for better UX
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [optimisticUsers, setOptimisticUsers] = useState<User[]>([])

  const handleSubmit = async (data: UserFormData) => {
    try {
      // BACK-15: Add loading state for form submission
      const actionKey = editingUser ? `edit-${editingUser.id}` : 'create'
      setActionLoading(prev => ({ ...prev, [actionKey]: true }))
      
      if (editingUser) {
        // Optimistic update: show changes immediately
        const optimisticUpdate = { ...editingUser, ...data, updatedAt: new Date().toISOString() }
        setOptimisticUsers(prev => prev.map(u => u.id === editingUser.id ? optimisticUpdate : u))
        
        await updateUser(editingUser.id, data)
      } else {
        // Optimistic create: show new user immediately
        const tempId = `temp-${Date.now()}`
        const optimisticUser: User = {
          id: tempId,
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: undefined
        }
        setOptimisticUsers(prev => [optimisticUser, ...prev])
        
        await createUser(data)
      }
      
      setShowForm(false)
      setEditingUser(null)
    } catch (error) {
      // Revert optimistic updates on error
      setOptimisticUsers([])
      console.error('Failed to submit user form:', error)
    } finally {
      const actionKey = editingUser ? `edit-${editingUser.id}` : 'create'
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setShowForm(true)
  }

  // BACK-15: Add optimistic toggle status with loading states
  const handleToggleStatus = async (userId: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [`toggle-${userId}`]: true }))
      
      // Optimistic update: toggle status immediately
      setOptimisticUsers(prev => prev.length > 0 ? prev.map(u => 
        u.id === userId ? { ...u, isActive: !u.isActive, updatedAt: new Date().toISOString() } : u
      ) : [])
      
      await toggleUserStatus(userId)
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticUsers([])
      console.error('Failed to toggle user status:', error)
    } finally {
      setActionLoading(prev => ({ ...prev, [`toggle-${userId}`]: false }))
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        // BACK-15: Add loading state for delete action
        setActionLoading(prev => ({ ...prev, [`delete-${id}`]: true }))
        
        // Optimistic delete: hide user immediately
        setOptimisticUsers(prev => prev.filter(u => u.id !== id))
        
        await deleteUser(id)
      } catch (error) {
        // Revert optimistic delete on error
        setOptimisticUsers([])
        console.error('Failed to delete user:', error)
      } finally {
        setActionLoading(prev => ({ ...prev, [`delete-${id}`]: false }))
      }
    }
  }

  const getFactoryNames = (user: User) => {
    const factoryInfo = getDisplayFactoryInfo(user)
    
    if (factoryInfo.isGlobal) {
      return factoryInfo.displayText // "Global Access"
    }
    
    const factoryIds = factoryInfo.displayText as string[]
    if (factoryIds.length === 0) return 'No Factories Assigned'
    return factoryIds
      .map(id => factories.find(f => f.id === id)?.name || id)
      .join(', ')
  }

  const getRoleBadgeColor = (role: User['role']) => {
    switch (role) {
      case 'CEO': return 'bg-purple-100 text-purple-800'
      case 'Director': return 'bg-blue-100 text-blue-800'
      case 'Factory Manager': return 'bg-yellow-100 text-yellow-800'
      case 'Factory Worker': return 'bg-gray-100 text-gray-800'
      case 'Office': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium text-gray-900">Users</h3>
          {/* BACK-16: Realtime connection status */}
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live Updates</span>
            </div>
            <button 
              onClick={refreshUsers}
              className="text-copper-600 hover:text-copper-800 font-medium"
              title="Refresh users"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            disabled={actionLoading['create']}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-copper-600 hover:bg-copper-700 disabled:opacity-50"
          >
            {actionLoading['create'] ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            )}
            Add User
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {editingUser ? 'Edit User' : 'New User'}
          </h4>
          <UserForm
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false)
              setEditingUser(null)
            }}
            initialData={editingUser || undefined}
          />
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-copper-500 hover:bg-copper-400 transition ease-in-out duration-150">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading users...
              </div>
            </div>
          ) : (optimisticUsers.length > 0 ? optimisticUsers : users).length === 0 ? (
            <div className="p-4 text-center text-gray-500">No users yet</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {(optimisticUsers.length > 0 ? optimisticUsers : users).map((user) => (
                <li key={user.id} className={user.id.startsWith('temp-') ? 'bg-blue-50 border-l-4 border-blue-400' : ''}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                          </span>
                          {(user.role === 'CEO' || user.role === 'Director') && (
                            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                              Global Access
                            </span>
                          )}
                          {user.isActive ? (
                            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          @{user.username} • {user.email}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Factories: {getFactoryNames(user)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleStatus(user.id)}
                          disabled={actionLoading[`toggle-${user.id}`]}
                          className="text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d={user.isActive 
                                ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" 
                                : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              } 
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-copper-600 hover:text-copper-900"
                          title="Edit"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
