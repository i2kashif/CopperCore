import { getSupabaseClient } from '../../lib/supabase'
import { User, UserContext, ApiResponse, ListQuery, ErrorCodes, UserRole } from '../common/types'
import { 
  createUserSchema, 
  updateUserSchema, 
  listQuerySchema,
  createErrorResponse, 
  createSuccessResponse,
  validateFactoryScope,
  isGlobalRole,
  canManageUsers
} from '../common/validation'
import { AuditService } from '../audit/service'
import { z } from 'zod'

/**
 * Users service - handles CRUD operations with factory assignment support
 * 
 * Per PRD §5.12: Manage Company - Users management
 * Per PRD §2.2: Factory linkage & visibility - Many-to-many assignments
 * Per PRD §2.1: Role-based permissions
 */

export class UsersService {
  private getSupabase() {
    return getSupabaseClient()
  }
  private auditService = new AuditService()

  /**
   * List users with factory scoping
   */
  async list(query: ListQuery, userContext: UserContext): Promise<ApiResponse<Array<User & { assigned_factories?: string[] }>>> {
    try {
      // Validate query parameters
      const validatedQuery = listQuerySchema.parse(query)
      
      // Build query with factory scoping
      let dbQuery = this.getSupabase()
        .from('users')
        .select(`
          *,
          user_factory_assignments!left (
            factory_id,
            is_active
          )
        `, { count: 'exact' })
      
      // Apply role-based filtering
      if (!canManageUsers(userContext.role)) {
        // Non-managers can only see users in their assigned factories
        if (userContext.factory_ids.length === 0) {
          return createSuccessResponse([], { total: 0, page: validatedQuery.page, limit: validatedQuery.limit })
        }
        
        // Join with user_factory_assignments to filter by shared factories
        dbQuery = this.getSupabase()
          .from('users')
          .select(`
            *,
            user_factory_assignments!inner (
              factory_id,
              is_active
            )
          `, { count: 'exact' })
          .in('user_factory_assignments.factory_id', userContext.factory_ids)
          .eq('user_factory_assignments.is_active', true)
      }
      
      // Apply filters
      if (validatedQuery.is_active !== undefined) {
        dbQuery = dbQuery.eq('is_active', validatedQuery.is_active)
      }
      
      if (validatedQuery.search) {
        dbQuery = dbQuery.or(
          `username.ilike.%${validatedQuery.search}%,first_name.ilike.%${validatedQuery.search}%,last_name.ilike.%${validatedQuery.search}%,email.ilike.%${validatedQuery.search}%`
        )
      }
      
      // Apply sorting
      const sortBy = validatedQuery.sort_by || 'username'
      const sortOrder = validatedQuery.sort_order || 'asc'
      dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' })
      
      // Apply pagination
      const offset = (validatedQuery.page - 1) * validatedQuery.limit
      dbQuery = dbQuery.range(offset, offset + validatedQuery.limit - 1)
      
      const { data: users, error, count } = await dbQuery
      
      if (error) {
        console.error('Failed to list users:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch users')
      }
      
      // Transform data to include assigned_factories
      const transformedUsers = (users || []).map(user => {
        const assignedFactories = user.user_factory_assignments
          ?.filter((assignment: any) => assignment.is_active)
          .map((assignment: any) => assignment.factory_id) || []
        
        return {
          ...user,
          assigned_factories: assignedFactories,
          user_factory_assignments: undefined // Remove from response
        }
      })
      
      return createSuccessResponse(transformedUsers, {
        total: count || 0,
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        user_role: userContext.role
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid query parameters', error.errors)
      }
      
      console.error('Unexpected error in list users:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Get single user by ID
   */
  async getById(id: string, userContext: UserContext): Promise<ApiResponse<User & { assigned_factories: string[] }>> {
    try {
      const { data: user, error } = await this.getSupabase()
        .from('users')
        .select(`
          *,
          user_factory_assignments!left (
            factory_id,
            is_active
          )
        `)
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return createErrorResponse(ErrorCodes.NOT_FOUND, 'User not found')
        }
        
        console.error('Failed to get user:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch user')
      }
      
      // Check if user can view this user (factory scope for non-managers)
      if (!canManageUsers(userContext.role)) {
        const userFactoryIds = user.user_factory_assignments
          ?.filter((assignment: any) => assignment.is_active)
          .map((assignment: any) => assignment.factory_id) || []
        
        const hasSharedFactory = userFactoryIds.some(factoryId => 
          userContext.factory_ids.includes(factoryId)
        )
        
        if (!hasSharedFactory) {
          return createErrorResponse(ErrorCodes.FORBIDDEN, 'Access denied for user')
        }
      }
      
      // Transform response
      const assignedFactories = user.user_factory_assignments
        ?.filter((assignment: any) => assignment.is_active)
        .map((assignment: any) => assignment.factory_id) || []
      
      const userResponse = {
        ...user,
        assigned_factories: assignedFactories,
        user_factory_assignments: undefined
      }
      
      return createSuccessResponse(userResponse, {
        user_role: userContext.role
      })
    } catch (error) {
      console.error('Unexpected error in get user:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Create new user with factory assignments (CEO/Director only)
   */
  async create(
    input: z.infer<typeof createUserSchema>, 
    userContext: UserContext
  ): Promise<ApiResponse<User & { assigned_factories: string[] }>> {
    try {
      // Validate input
      const validatedInput = createUserSchema.parse(input)
      const { factory_ids, ...userData } = validatedInput
      
      // Check if username already exists
      const { data: existing } = await this.getSupabase()
        .from('users')
        .select('id')
        .eq('username', validatedInput.username)
        .single()
      
      if (existing) {
        return createErrorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Username already exists')
      }
      
      // Check if email already exists
      const { data: existingEmail } = await this.getSupabase()
        .from('users')
        .select('id')
        .eq('email', validatedInput.email)
        .single()
      
      if (existingEmail) {
        return createErrorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Email already exists')
      }
      
      // Validate factory assignments for non-global users
      if (!isGlobalRole(userContext.role)) {
        const invalidFactories = factory_ids.filter(factoryId => 
          !userContext.factory_ids.includes(factoryId)
        )
        
        if (invalidFactories.length > 0) {
          return createErrorResponse(
            ErrorCodes.FACTORY_SCOPE_VIOLATION, 
            'Cannot assign user to factories outside your scope'
          )
        }
      }
      
      const now = new Date().toISOString()
      const newUserData = {
        ...userData,
        created_at: now,
        updated_at: now,
        created_by: userContext.user_id,
        updated_by: userContext.user_id,
        version: 1
      }
      
      // Create user
      const { data: user, error: userError } = await this.getSupabase()
        .from('users')
        .insert(newUserData)
        .select()
        .single()
      
      if (userError) {
        console.error('Failed to create user:', userError)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create user')
      }
      
      // Create factory assignments
      if (factory_ids.length > 0) {
        const assignments = factory_ids.map(factoryId => ({
          user_id: user.id,
          factory_id: factoryId,
          assigned_by: userContext.user_id,
          assigned_at: now,
          is_active: true,
          created_at: now,
          updated_at: now,
          created_by: userContext.user_id,
          updated_by: userContext.user_id,
          version: 1
        }))
        
        const { error: assignmentError } = await this.getSupabase()
          .from('user_factory_assignments')
          .insert(assignments)
        
        if (assignmentError) {
          console.error('Failed to create factory assignments:', assignmentError)
          // TODO: Consider rolling back user creation in production
        }
      }
      
      // Log audit event
      await this.auditService.logEvent({
        entity_type: 'User',
        entity_id: user.id,
        action: 'CREATE',
        user_id: userContext.user_id,
        after_values: { ...user, assigned_factories: factory_ids },
        session_id: userContext.session_id
      })
      
      return createSuccessResponse({
        ...user,
        assigned_factories: factory_ids
      }, {
        user_role: userContext.role
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid input data', error.errors)
      }
      
      console.error('Unexpected error in create user:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Update user with factory assignments (CEO/Director only)
   */
  async update(
    id: string,
    input: z.infer<typeof updateUserSchema>,
    userContext: UserContext
  ): Promise<ApiResponse<User & { assigned_factories: string[] }>> {
    try {
      // Validate input
      const validatedInput = updateUserSchema.parse(input)
      const { version, factory_ids, ...updateData } = validatedInput
      
      // Get current user for optimistic locking and audit trail
      const { data: currentUser, error: fetchError } = await this.getSupabase()
        .from('users')
        .select(`
          *,
          user_factory_assignments!left (
            id,
            factory_id,
            is_active
          )
        `)
        .eq('id', id)
        .single()
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return createErrorResponse(ErrorCodes.NOT_FOUND, 'User not found')
        }
        console.error('Failed to fetch user for update:', fetchError)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch user')
      }
      
      // Check optimistic locking
      if (currentUser.version !== version) {
        return createErrorResponse(
          ErrorCodes.OPTIMISTIC_LOCK_ERROR, 
          'User has been modified by another user', 
          {
            currentVersion: currentUser.version,
            attemptedVersion: version
          }
        )
      }
      
      // Check for conflicts if username/email are being updated
      if (updateData.username && updateData.username !== currentUser.username) {
        const { data: existing } = await this.getSupabase()
          .from('users')
          .select('id')
          .eq('username', updateData.username)
          .neq('id', id)
          .single()
        
        if (existing) {
          return createErrorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Username already exists')
        }
      }
      
      if (updateData.email && updateData.email !== currentUser.email) {
        const { data: existing } = await this.getSupabase()
          .from('users')
          .select('id')
          .eq('email', updateData.email)
          .neq('id', id)
          .single()
        
        if (existing) {
          return createErrorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Email already exists')
        }
      }
      
      const now = new Date().toISOString()
      const userUpdate = {
        ...updateData,
        updated_at: now,
        updated_by: userContext.user_id,
        version: currentUser.version + 1
      }
      
      // Update user
      const { data: user, error } = await this.getSupabase()
        .from('users')
        .update(userUpdate)
        .eq('id', id)
        .eq('version', version) // Double-check version in DB
        .select()
        .single()
      
      if (error) {
        console.error('Failed to update user:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update user')
      }
      
      // Update factory assignments if provided
      let finalFactoryIds = currentUser.user_factory_assignments
        ?.filter((assignment: any) => assignment.is_active)
        .map((assignment: any) => assignment.factory_id) || []
      
      if (factory_ids !== undefined) {
        // Validate new factory assignments for non-global users
        if (!isGlobalRole(userContext.role)) {
          const invalidFactories = factory_ids.filter(factoryId => 
            !userContext.factory_ids.includes(factoryId)
          )
          
          if (invalidFactories.length > 0) {
            return createErrorResponse(
              ErrorCodes.FACTORY_SCOPE_VIOLATION, 
              'Cannot assign user to factories outside your scope'
            )
          }
        }
        
        // Deactivate all current assignments
        await this.getSupabase()
          .from('user_factory_assignments')
          .update({
            is_active: false,
            updated_at: now,
            updated_by: userContext.user_id
          })
          .eq('user_id', id)
        
        // Create new assignments
        if (factory_ids.length > 0) {
          const assignments = factory_ids.map(factoryId => ({
            user_id: id,
            factory_id: factoryId,
            assigned_by: userContext.user_id,
            assigned_at: now,
            is_active: true,
            created_at: now,
            updated_at: now,
            created_by: userContext.user_id,
            updated_by: userContext.user_id,
            version: 1
          }))
          
          await this.getSupabase()
            .from('user_factory_assignments')
            .insert(assignments)
        }
        
        finalFactoryIds = factory_ids
      }
      
      // Log audit event
      await this.auditService.logEvent({
        entity_type: 'User',
        entity_id: id,
        action: 'UPDATE',
        user_id: userContext.user_id,
        before_values: { ...currentUser, assigned_factories: currentUser.user_factory_assignments?.map((a: any) => a.factory_id) },
        after_values: { ...user, assigned_factories: finalFactoryIds },
        session_id: userContext.session_id
      })
      
      return createSuccessResponse({
        ...user,
        assigned_factories: finalFactoryIds
      }, {
        user_role: userContext.role
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid input data', error.errors)
      }
      
      console.error('Unexpected error in update user:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Soft delete user (CEO/Director only)
   */
  async delete(
    id: string, 
    userContext: UserContext,
    reason?: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    try {
      // Get current user
      const { data: currentUser, error: fetchError } = await this.getSupabase()
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return createErrorResponse(ErrorCodes.NOT_FOUND, 'User not found')
        }
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch user')
      }
      
      // Don't allow deleting CEO users
      if (currentUser.role === UserRole.CEO) {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR, 
          'Cannot delete CEO users'
        )
      }
      
      const now = new Date().toISOString()
      const { data: user, error } = await this.getSupabase()
        .from('users')
        .update({
          is_active: false,
          updated_at: now,
          updated_by: userContext.user_id,
          version: currentUser.version + 1
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Failed to delete user:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete user')
      }
      
      // Deactivate factory assignments
      await this.getSupabase()
        .from('user_factory_assignments')
        .update({
          is_active: false,
          updated_at: now,
          updated_by: userContext.user_id
        })
        .eq('user_id', id)
      
      // Log audit event
      await this.auditService.logEvent({
        entity_type: 'User',
        entity_id: id,
        action: 'DELETE',
        user_id: userContext.user_id,
        before_values: currentUser,
        after_values: user,
        reason: reason || 'Soft delete via API',
        session_id: userContext.session_id
      })
      
      return createSuccessResponse({ success: true }, {
        user_role: userContext.role
      })
    } catch (error) {
      console.error('Unexpected error in delete user:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Get user statistics (for dashboard)
   */
  async getStats(userContext: UserContext): Promise<ApiResponse<{
    total: number
    active: number
    inactive: number
    by_role: Record<string, number>
    by_factory: Record<string, number>
  }>> {
    try {
      // Build query based on user permissions
      let baseQuery = this.getSupabase()
        .from('users')
        .select(`
          is_active,
          role,
          user_factory_assignments!left (
            factory_id,
            is_active
          )
        `)
      
      // Apply role-based filtering
      if (!canManageUsers(userContext.role)) {
        // Non-managers can only see users in their assigned factories
        if (userContext.factory_ids.length === 0) {
          return createSuccessResponse({
            total: 0,
            active: 0,
            inactive: 0,
            by_role: {},
            by_factory: {}
          })
        }
        
        baseQuery = this.getSupabase()
          .from('users')
          .select(`
            is_active,
            role,
            user_factory_assignments!inner (
              factory_id,
              is_active
            )
          `)
          .in('user_factory_assignments.factory_id', userContext.factory_ids)
          .eq('user_factory_assignments.is_active', true)
      }
      
      const { data: users, error } = await baseQuery
      
      if (error) {
        console.error('Failed to get user stats:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch user statistics')
      }
      
      const stats = (users || []).reduce((acc, user) => {
        acc.total++
        if (user.is_active) {
          acc.active++
        } else {
          acc.inactive++
        }
        acc.by_role[user.role] = (acc.by_role[user.role] || 0) + 1
        
        // Count factory assignments
        user.user_factory_assignments?.forEach((assignment: any) => {
          if (assignment.is_active) {
            acc.by_factory[assignment.factory_id] = (acc.by_factory[assignment.factory_id] || 0) + 1
          }
        })
        
        return acc
      }, {
        total: 0,
        active: 0,
        inactive: 0,
        by_role: {} as Record<string, number>,
        by_factory: {} as Record<string, number>
      })
      
      return createSuccessResponse(stats, {
        user_role: userContext.role
      })
    } catch (error) {
      console.error('Unexpected error in get user stats:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }
}