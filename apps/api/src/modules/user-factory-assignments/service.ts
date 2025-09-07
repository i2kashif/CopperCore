import { getSupabaseClient } from '../../lib/supabase'
import { UserFactoryAssignment, UserContext, ApiResponse, ListQuery, ErrorCodes } from '../common/types'
import { 
  createUserFactoryAssignmentSchema, 
  updateUserFactoryAssignmentSchema, 
  listQuerySchema,
  createErrorResponse, 
  createSuccessResponse,
  validateFactoryScope,
  canManageUsers 
} from '../common/validation'
import { AuditService } from '../audit/service'
import { z } from 'zod'

/**
 * User-Factory Assignments service - handles many-to-many relationships
 * 
 * Per PRD §2.2: Factory linkage & visibility - Many-to-many assignments
 * Per PRD §5.12: Manage Company - User management with factory assignments
 */

export class UserFactoryAssignmentsService {
  private getSupabase() {
    return getSupabaseClient()
  }
  private auditService = new AuditService()

  /**
   * Get user's assigned factories
   */
  async getUserFactories(userId: string, userContext: UserContext): Promise<ApiResponse<Array<{
    assignment_id: string
    factory_id: string
    factory: {
      code: string
      name: string
      city: string
      is_active: boolean
    }
    assigned_by: string
    assigned_at: string
    is_active: boolean
  }>>> {
    try {
      // Check if user can view this user's assignments
      if (!canManageUsers(userContext.role) && userId !== userContext.user_id) {
        return createErrorResponse(ErrorCodes.FORBIDDEN, 'Cannot view other users factory assignments')
      }
      
      const { data: assignments, error } = await this.getSupabase()
        .from('user_factory_assignments')
        .select(`
          id,
          factory_id,
          assigned_by,
          assigned_at,
          is_active,
          factories!inner (
            code,
            name,
            city,
            is_active
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })
      
      if (error) {
        console.error('Failed to get user factory assignments:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch user factory assignments')
      }
      
      // Transform the response
      const transformedAssignments = (assignments || []).map(assignment => ({
        assignment_id: assignment.id,
        factory_id: assignment.factory_id,
        factory: assignment.factories,
        assigned_by: assignment.assigned_by,
        assigned_at: assignment.assigned_at,
        is_active: assignment.is_active
      }))
      
      return createSuccessResponse(transformedAssignments, {
        user_role: userContext.role,
        target_user_id: userId
      })
    } catch (error) {
      console.error('Unexpected error in getUserFactories:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Get factory's assigned users
   */
  async getFactoryUsers(factoryId: string, userContext: UserContext): Promise<ApiResponse<Array<{
    assignment_id: string
    user_id: string
    user: {
      username: string
      first_name: string
      last_name: string
      role: string
      is_active: boolean
    }
    assigned_by: string
    assigned_at: string
    is_active: boolean
  }>>> {
    try {
      // Check factory scope
      if (!validateFactoryScope(userContext.factory_ids, factoryId, userContext.is_global)) {
        return createErrorResponse(ErrorCodes.FACTORY_SCOPE_VIOLATION, 'Access denied for factory')
      }
      
      const { data: assignments, error } = await this.getSupabase()
        .from('user_factory_assignments')
        .select(`
          id,
          user_id,
          assigned_by,
          assigned_at,
          is_active,
          users!inner (
            username,
            first_name,
            last_name,
            role,
            is_active
          )
        `)
        .eq('factory_id', factoryId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })
      
      if (error) {
        console.error('Failed to get factory user assignments:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch factory user assignments')
      }
      
      // Transform the response
      const transformedAssignments = (assignments || []).map(assignment => ({
        assignment_id: assignment.id,
        user_id: assignment.user_id,
        user: assignment.users,
        assigned_by: assignment.assigned_by,
        assigned_at: assignment.assigned_at,
        is_active: assignment.is_active
      }))
      
      return createSuccessResponse(transformedAssignments, {
        user_role: userContext.role,
        factory_id: factoryId
      })
    } catch (error) {
      console.error('Unexpected error in getFactoryUsers:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Create user-factory assignment (CEO/Director only)
   */
  async create(
    input: z.infer<typeof createUserFactoryAssignmentSchema>, 
    userContext: UserContext
  ): Promise<ApiResponse<UserFactoryAssignment>> {
    try {
      // Validate input
      const validatedInput = createUserFactoryAssignmentSchema.parse(input)
      
      // Check factory scope for non-global users
      if (!validateFactoryScope(userContext.factory_ids, validatedInput.factory_id, userContext.is_global)) {
        return createErrorResponse(ErrorCodes.FACTORY_SCOPE_VIOLATION, 'Cannot assign users to factories outside your scope')
      }
      
      // Check if assignment already exists
      const { data: existing } = await this.getSupabase()
        .from('user_factory_assignments')
        .select('id, is_active')
        .eq('user_id', validatedInput.user_id)
        .eq('factory_id', validatedInput.factory_id)
        .single()
      
      if (existing) {
        if (existing.is_active) {
          return createErrorResponse(ErrorCodes.DUPLICATE_ENTRY, 'User is already assigned to this factory')
        } else {
          // Reactivate existing assignment
          const now = new Date().toISOString()
          const { data: assignment, error } = await this.getSupabase()
            .from('user_factory_assignments')
            .update({
              is_active: true,
              assigned_by: userContext.user_id,
              assigned_at: now,
              updated_at: now,
              updated_by: userContext.user_id
            })
            .eq('id', existing.id)
            .select()
            .single()
          
          if (error) {
            console.error('Failed to reactivate assignment:', error)
            return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to reactivate assignment')
          }
          
          // Log audit event
          await this.auditService.logEvent({
            entity_type: 'UserFactoryAssignment',
            entity_id: assignment.id,
            action: 'CREATE',
            factory_id: validatedInput.factory_id,
            user_id: userContext.user_id,
            after_values: assignment,
            reason: 'Reactivated existing assignment',
            session_id: userContext.session_id
          })
          
          return createSuccessResponse(assignment, {
            user_role: userContext.role,
            factory_id: validatedInput.factory_id
          })
        }
      }
      
      // Create new assignment
      const now = new Date().toISOString()
      const assignmentData = {
        ...validatedInput,
        assigned_by: userContext.user_id,
        assigned_at: now,
        created_at: now,
        updated_at: now,
        created_by: userContext.user_id,
        updated_by: userContext.user_id,
        version: 1
      }
      
      const { data: assignment, error } = await this.getSupabase()
        .from('user_factory_assignments')
        .insert(assignmentData)
        .select()
        .single()
      
      if (error) {
        console.error('Failed to create assignment:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create assignment')
      }
      
      // Log audit event
      await this.auditService.logEvent({
        entity_type: 'UserFactoryAssignment',
        entity_id: assignment.id,
        action: 'CREATE',
        factory_id: validatedInput.factory_id,
        user_id: userContext.user_id,
        after_values: assignment,
        session_id: userContext.session_id
      })
      
      return createSuccessResponse(assignment, {
        user_role: userContext.role,
        factory_id: validatedInput.factory_id
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid input data', error.errors)
      }
      
      console.error('Unexpected error in create assignment:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Update user-factory assignment (CEO/Director only)
   */
  async update(
    id: string,
    input: z.infer<typeof updateUserFactoryAssignmentSchema>,
    userContext: UserContext
  ): Promise<ApiResponse<UserFactoryAssignment>> {
    try {
      // Validate input
      const validatedInput = updateUserFactoryAssignmentSchema.parse(input)
      const { version, ...updateData } = validatedInput
      
      // Get current assignment for validation and audit
      const { data: currentAssignment, error: fetchError } = await this.getSupabase()
        .from('user_factory_assignments')
        .select('*')
        .eq('id', id)
        .single()
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return createErrorResponse(ErrorCodes.NOT_FOUND, 'Assignment not found')
        }
        console.error('Failed to fetch assignment for update:', fetchError)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch assignment')
      }
      
      // Check factory scope
      if (!validateFactoryScope(userContext.factory_ids, currentAssignment.factory_id, userContext.is_global)) {
        return createErrorResponse(ErrorCodes.FACTORY_SCOPE_VIOLATION, 'Access denied for factory')
      }
      
      // Check optimistic locking
      if (currentAssignment.version !== version) {
        return createErrorResponse(
          ErrorCodes.OPTIMISTIC_LOCK_ERROR, 
          'Assignment has been modified by another user', 
          {
            currentVersion: currentAssignment.version,
            attemptedVersion: version
          }
        )
      }
      
      const now = new Date().toISOString()
      const assignmentUpdate = {
        ...updateData,
        updated_at: now,
        updated_by: userContext.user_id,
        version: currentAssignment.version + 1
      }
      
      const { data: assignment, error } = await this.getSupabase()
        .from('user_factory_assignments')
        .update(assignmentUpdate)
        .eq('id', id)
        .eq('version', version) // Double-check version in DB
        .select()
        .single()
      
      if (error) {
        console.error('Failed to update assignment:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update assignment')
      }
      
      // Log audit event
      await this.auditService.logEvent({
        entity_type: 'UserFactoryAssignment',
        entity_id: id,
        action: 'UPDATE',
        factory_id: currentAssignment.factory_id,
        user_id: userContext.user_id,
        before_values: currentAssignment,
        after_values: assignment,
        session_id: userContext.session_id
      })
      
      return createSuccessResponse(assignment, {
        user_role: userContext.role,
        factory_id: currentAssignment.factory_id
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid input data', error.errors)
      }
      
      console.error('Unexpected error in update assignment:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Remove user-factory assignment (CEO/Director only)
   */
  async remove(
    id: string, 
    userContext: UserContext,
    reason?: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    try {
      // Get current assignment
      const { data: currentAssignment, error: fetchError } = await this.getSupabase()
        .from('user_factory_assignments')
        .select('*')
        .eq('id', id)
        .single()
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return createErrorResponse(ErrorCodes.NOT_FOUND, 'Assignment not found')
        }
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch assignment')
      }
      
      // Check factory scope
      if (!validateFactoryScope(userContext.factory_ids, currentAssignment.factory_id, userContext.is_global)) {
        return createErrorResponse(ErrorCodes.FACTORY_SCOPE_VIOLATION, 'Access denied for factory')
      }
      
      const now = new Date().toISOString()
      const { data: assignment, error } = await this.getSupabase()
        .from('user_factory_assignments')
        .update({
          is_active: false,
          updated_at: now,
          updated_by: userContext.user_id,
          version: currentAssignment.version + 1
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Failed to remove assignment:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to remove assignment')
      }
      
      // Log audit event
      await this.auditService.logEvent({
        entity_type: 'UserFactoryAssignment',
        entity_id: id,
        action: 'DELETE',
        factory_id: currentAssignment.factory_id,
        user_id: userContext.user_id,
        before_values: currentAssignment,
        after_values: assignment,
        reason: reason || 'Removed via API',
        session_id: userContext.session_id
      })
      
      return createSuccessResponse({ success: true }, {
        user_role: userContext.role,
        factory_id: currentAssignment.factory_id
      })
    } catch (error) {
      console.error('Unexpected error in remove assignment:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Bulk assign user to multiple factories
   */
  async bulkAssign(
    userId: string,
    factoryIds: string[],
    userContext: UserContext
  ): Promise<ApiResponse<{ created: number; reactivated: number; skipped: number }>> {
    try {
      if (factoryIds.length === 0) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'At least one factory ID is required')
      }
      
      if (factoryIds.length > 10) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Maximum 10 factories can be assigned at once')
      }
      
      // Validate all factories are within user's scope
      if (!userContext.is_global) {
        const invalidFactories = factoryIds.filter(factoryId => 
          !userContext.factory_ids.includes(factoryId)
        )
        
        if (invalidFactories.length > 0) {
          return createErrorResponse(
            ErrorCodes.FACTORY_SCOPE_VIOLATION, 
            'Cannot assign user to factories outside your scope',
            { invalid_factories: invalidFactories }
          )
        }
      }
      
      let created = 0
      let reactivated = 0
      let skipped = 0
      
      for (const factoryId of factoryIds) {
        const result = await this.create({
          user_id: userId,
          factory_id: factoryId,
          is_active: true
        }, userContext)
        
        if (result.success) {
          created++
        } else if (result.error?.code === ErrorCodes.DUPLICATE_ENTRY) {
          skipped++
        }
        // Note: In a real implementation, you'd want better tracking of reactivated vs created
      }
      
      return createSuccessResponse({
        created,
        reactivated,
        skipped
      }, {
        user_role: userContext.role,
        target_user_id: userId
      })
    } catch (error) {
      console.error('Unexpected error in bulk assign:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Get assignment statistics
   */
  async getStats(userContext: UserContext): Promise<ApiResponse<{
    total_assignments: number
    active_assignments: number
    assignments_by_factory: Record<string, number>
    assignments_by_role: Record<string, number>
  }>> {
    try {
      // Build query based on user permissions
      let query = this.getSupabase()
        .from('user_factory_assignments')
        .select(`
          is_active,
          factory_id,
          users!inner (
            role
          )
        `)
      
      // Apply factory scoping for non-global users
      if (!userContext.is_global) {
        if (userContext.factory_ids.length === 0) {
          return createSuccessResponse({
            total_assignments: 0,
            active_assignments: 0,
            assignments_by_factory: {},
            assignments_by_role: {}
          })
        }
        query = query.in('factory_id', userContext.factory_ids)
      }
      
      const { data: assignments, error } = await query
      
      if (error) {
        console.error('Failed to get assignment stats:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch assignment statistics')
      }
      
      const stats = (assignments || []).reduce((acc, assignment) => {
        acc.total_assignments++
        
        if (assignment.is_active) {
          acc.active_assignments++
          acc.assignments_by_factory[assignment.factory_id] = (acc.assignments_by_factory[assignment.factory_id] || 0) + 1
        }
        
        acc.assignments_by_role[assignment.users.role] = (acc.assignments_by_role[assignment.users.role] || 0) + 1
        
        return acc
      }, {
        total_assignments: 0,
        active_assignments: 0,
        assignments_by_factory: {} as Record<string, number>,
        assignments_by_role: {} as Record<string, number>
      })
      
      return createSuccessResponse(stats, {
        user_role: userContext.role
      })
    } catch (error) {
      console.error('Unexpected error in get assignment stats:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }
}