/**
 * Company Management Routes
 * Factory CRUD operations for CopperCore ERP
 */

import { Router, Request, Response } from 'express'
import { query, transaction } from '../lib/database.js'
import { createApiError, asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js'
import { eventEmitter } from '../lib/events.js'
import bcrypt from 'bcryptjs'

const router = Router()

// Apply authentication to all routes
router.use(authenticateToken)

interface CreateFactoryRequest {
  code: string
  name: string
}

interface UpdateFactoryRequest {
  code?: string
  name?: string
}

interface FactoryResponse {
  id: string
  code: string
  name: string
  active: boolean
  created_at: string
  updated_at: string
}

// User Management Interfaces
type UserRole = 'CEO' | 'Director' | 'FM' | 'FW' | 'Office'

interface CreateUserRequest {
  username: string
  email?: string
  role: UserRole
  full_name?: string
  factory_ids?: string[]
}

interface UpdateUserRequest {
  email?: string
  role?: UserRole
  full_name?: string
  active?: boolean
}

interface UserResponse {
  id: string
  auth_id?: string
  username: string
  email?: string
  role: UserRole
  full_name?: string
  active: boolean
  created_at: string
  updated_at: string
  factories?: Array<{
    id: string
    code: string
    name: string
    created_at: string
  }>
}

interface AssignFactoryRequest {
  factory_id: string
}

/**
 * GET /api/company/factories
 * List factories (RLS filtered based on user role)
 */
router.get('/factories', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  let factoriesQuery: string
  let queryParams: any[]

  // CEO and Director have access to all factories (including inactive)
  if (req.user.role === 'CEO' || req.user.role === 'Director') {
    factoriesQuery = `
      SELECT id, code, name, active, created_at, updated_at
      FROM factories 
      ORDER BY name
    `
    queryParams = []
  } else {
    // Other roles only see assigned active factories
    factoriesQuery = `
      SELECT f.id, f.code, f.name, f.active, f.created_at, f.updated_at
      FROM factories f
      INNER JOIN user_factory_assignments ufa ON f.id = ufa.factory_id
      WHERE f.active = true 
        AND ufa.user_id = $1
        AND ufa.is_active = true
      ORDER BY f.name
    `
    queryParams = [req.user.userId]
  }

  const result = await query(factoriesQuery, queryParams)
  
  res.json({
    success: true,
    factories: result.rows as FactoryResponse[],
    total: result.rows.length
  })
}))

/**
 * GET /api/company/factories/:id
 * Get factory details by ID
 */
router.get('/factories/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  const { id } = req.params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw createApiError('Invalid factory ID format', 400, 'INVALID_FACTORY_ID')
  }

  let factoryQuery: string
  let queryParams: any[]

  // CEO and Director have access to all factories
  if (req.user.role === 'CEO' || req.user.role === 'Director') {
    factoryQuery = `
      SELECT id, code, name, active, created_at, updated_at
      FROM factories 
      WHERE id = $1
    `
    queryParams = [id]
  } else {
    // Other roles only see assigned active factories
    factoryQuery = `
      SELECT f.id, f.code, f.name, f.active, f.created_at, f.updated_at
      FROM factories f
      INNER JOIN user_factory_assignments ufa ON f.id = ufa.factory_id
      WHERE f.id = $1 
        AND f.active = true 
        AND ufa.user_id = $2
        AND ufa.is_active = true
    `
    queryParams = [id, req.user.userId]
  }

  const result = await query(factoryQuery, queryParams)

  if (result.rows.length === 0) {
    throw createApiError('Factory not found or access denied', 404, 'FACTORY_NOT_FOUND')
  }

  res.json({
    success: true,
    factory: result.rows[0] as FactoryResponse
  })
}))

/**
 * POST /api/company/factories
 * Create a new factory (CEO/Director only)
 */
router.post('/factories', requireRole('CEO', 'Director'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  const { code, name }: CreateFactoryRequest = req.body

  // Validate required fields
  if (!code || !name) {
    throw createApiError('Factory code and name are required', 400, 'MISSING_REQUIRED_FIELDS')
  }

  // Validate factory code format (2-10 chars, alphanumeric)
  const codeRegex = /^[a-zA-Z0-9]{2,10}$/
  if (!codeRegex.test(code)) {
    throw createApiError(
      'Factory code must be 2-10 characters, alphanumeric only',
      400,
      'INVALID_FACTORY_CODE'
    )
  }

  // Validate name length
  if (name.length < 2 || name.length > 100) {
    throw createApiError(
      'Factory name must be 2-100 characters',
      400,
      'INVALID_FACTORY_NAME'
    )
  }

  const result = await transaction(async (client) => {
    // Check if code already exists
    const existingResult = await client.query(
      'SELECT id FROM factories WHERE code = $1',
      [code]
    )

    if (existingResult.rows.length > 0) {
      throw createApiError(
        'Factory code already exists',
        409,
        'DUPLICATE_FACTORY_CODE'
      )
    }

    // Insert new factory
    const insertResult = await client.query(`
      INSERT INTO factories (code, name, active, created_at, updated_at)
      VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, code, name, active, created_at, updated_at
    `, [code, name])

    return insertResult.rows[0] as FactoryResponse
  })

  // Emit factory created event
  eventEmitter.emitFactoryEvent('created', result.id, ['code', 'name', 'active'], result)

  res.status(201).json({
    success: true,
    factory: result,
    message: 'Factory created successfully'
  })
}))

/**
 * PUT /api/company/factories/:id
 * Update factory details (CEO/Director only)
 */
router.put('/factories/:id', requireRole('CEO', 'Director'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  const { id } = req.params
  const { code, name }: UpdateFactoryRequest = req.body

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw createApiError('Invalid factory ID format', 400, 'INVALID_FACTORY_ID')
  }

  // At least one field must be provided
  if (!code && !name) {
    throw createApiError('At least one field must be provided for update', 400, 'NO_UPDATE_FIELDS')
  }

  // Validate fields if provided
  if (code) {
    const codeRegex = /^[a-zA-Z0-9]{2,10}$/
    if (!codeRegex.test(code)) {
      throw createApiError(
        'Factory code must be 2-10 characters, alphanumeric only',
        400,
        'INVALID_FACTORY_CODE'
      )
    }
  }

  if (name) {
    if (name.length < 2 || name.length > 100) {
      throw createApiError(
        'Factory name must be 2-100 characters',
        400,
        'INVALID_FACTORY_NAME'
      )
    }
  }

  const result = await transaction(async (client) => {
    // Check if factory exists
    const existingResult = await client.query(
      'SELECT id, code, name FROM factories WHERE id = $1',
      [id]
    )

    if (existingResult.rows.length === 0) {
      throw createApiError('Factory not found', 404, 'FACTORY_NOT_FOUND')
    }

    // Check if new code conflicts with existing factory (if code is being changed)
    if (code && code !== existingResult.rows[0].code) {
      const codeCheckResult = await client.query(
        'SELECT id FROM factories WHERE code = $1 AND id != $2',
        [code, id]
      )

      if (codeCheckResult.rows.length > 0) {
        throw createApiError(
          'Factory code already exists',
          409,
          'DUPLICATE_FACTORY_CODE'
        )
      }
    }

    // Build update query dynamically
    const updateFields = []
    const updateValues = []
    let paramCounter = 1

    if (code) {
      updateFields.push(`code = $${paramCounter}`)
      updateValues.push(code)
      paramCounter++
    }

    if (name) {
      updateFields.push(`name = $${paramCounter}`)
      updateValues.push(name)
      paramCounter++
    }


    // Always update the updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    updateValues.push(id)

    const updateQuery = `
      UPDATE factories 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING id, code, name, active, created_at, updated_at
    `

    const updateResult = await client.query(updateQuery, updateValues)
    return updateResult.rows[0] as FactoryResponse
  })

  // Determine changed keys
  const changedKeys = []
  if (code) changedKeys.push('code')
  if (name) changedKeys.push('name')

  // Emit factory updated event
  eventEmitter.emitFactoryEvent('updated', result.id, changedKeys, result)

  res.json({
    success: true,
    factory: result,
    message: 'Factory updated successfully'
  })
}))

/**
 * PUT /api/company/factories/:id/deactivate
 * Deactivate factory (CEO/Director only)
 */
router.put('/factories/:id/deactivate', requireRole('CEO', 'Director'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  const { id } = req.params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw createApiError('Invalid factory ID format', 400, 'INVALID_FACTORY_ID')
  }

  const result = await transaction(async (client) => {
    // Check if factory exists and is active
    const existingResult = await client.query(
      'SELECT id, code, name, active FROM factories WHERE id = $1',
      [id]
    )

    if (existingResult.rows.length === 0) {
      throw createApiError('Factory not found', 404, 'FACTORY_NOT_FOUND')
    }

    const factory = existingResult.rows[0]

    if (!factory.active) {
      throw createApiError('Factory is already deactivated', 409, 'FACTORY_ALREADY_INACTIVE')
    }

    // Deactivate factory
    const updateResult = await client.query(`
      UPDATE factories 
      SET active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, code, name, active, created_at, updated_at
    `, [id])

    return updateResult.rows[0] as FactoryResponse
  })

  // Emit factory deactivated event
  eventEmitter.emitFactoryEvent('deactivated', result.id, ['active'], result)

  res.json({
    success: true,
    factory: result,
    message: 'Factory deactivated successfully'
  })
}))

/**
 * PUT /api/company/factories/:id/reactivate
 * Reactivate factory (CEO/Director only)
 */
router.put('/factories/:id/reactivate', requireRole('CEO', 'Director'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  const { id } = req.params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw createApiError('Invalid factory ID format', 400, 'INVALID_FACTORY_ID')
  }

  const result = await transaction(async (client) => {
    // Check if factory exists and is inactive
    const existingResult = await client.query(
      'SELECT id, code, name, active FROM factories WHERE id = $1',
      [id]
    )

    if (existingResult.rows.length === 0) {
      throw createApiError('Factory not found', 404, 'FACTORY_NOT_FOUND')
    }

    const factory = existingResult.rows[0]

    if (factory.active) {
      throw createApiError('Factory is already active', 409, 'FACTORY_ALREADY_ACTIVE')
    }

    // Reactivate factory
    const updateResult = await client.query(`
      UPDATE factories 
      SET active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, code, name, active, created_at, updated_at
    `, [id])

    return updateResult.rows[0] as FactoryResponse
  })

  // Emit factory reactivated event
  eventEmitter.emitFactoryEvent('reactivated', result.id, ['active'], result)

  res.json({
    success: true,
    factory: result,
    message: 'Factory reactivated successfully'
  })
}))

// =============================================================================
// USER MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * GET /api/company/users
 * List users (with RLS filtering)
 * CEO/Director: see all users
 * Others: see only users in same factories
 */
router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  let usersQuery: string
  let queryParams: any[]

  // CEO and Director have access to all users (including inactive)
  if (req.user.role === 'CEO' || req.user.role === 'Director') {
    usersQuery = `
      SELECT 
        u.id, u.auth_id, u.username, u.email, u.role, u.full_name, u.active,
        u.created_at, u.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', f.id,
              'code', f.code,
              'name', f.name,
              'created_at', ufl.created_at
            ) ORDER BY f.name
          ) FILTER (WHERE f.id IS NOT NULL), 
          '[]'
        ) as factories
      FROM users u
      LEFT JOIN user_factory_links ufl ON u.id = ufl.user_id
      LEFT JOIN factories f ON ufl.factory_id = f.id AND f.active = true
      GROUP BY u.id, u.auth_id, u.username, u.email, u.role, u.full_name, u.active, u.created_at, u.updated_at
      ORDER BY u.username
    `
    queryParams = []
  } else {
    // Other roles only see users in shared factories (active users only)
    usersQuery = `
      SELECT DISTINCT
        u.id, u.auth_id, u.username, u.email, u.role, u.full_name, u.active,
        u.created_at, u.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', f.id,
              'code', f.code,
              'name', f.name,
              'created_at', ufl.created_at
            ) ORDER BY f.name
          ) FILTER (WHERE f.id IS NOT NULL), 
          '[]'
        ) as factories
      FROM users u
      LEFT JOIN user_factory_links ufl ON u.id = ufl.user_id
      LEFT JOIN factories f ON ufl.factory_id = f.id AND f.active = true
      WHERE u.active = true
        AND (
          u.id = $1 OR
          EXISTS (
            SELECT 1 
            FROM user_factory_links ufl1
            INNER JOIN user_factory_links ufl2 ON ufl1.factory_id = ufl2.factory_id
            WHERE ufl1.user_id = u.id
            AND ufl2.user_id = $1
          )
        )
      GROUP BY u.id, u.auth_id, u.username, u.email, u.role, u.full_name, u.active, u.created_at, u.updated_at
      ORDER BY u.username
    `
    queryParams = [req.user.userId]
  }

  const result = await query(usersQuery, queryParams)
  
  res.json({
    success: true,
    users: result.rows as UserResponse[],
    total: result.rows.length
  })
}))

/**
 * GET /api/company/users/:id
 * Get user details by ID with factory assignments
 */
router.get('/users/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  const { id } = req.params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw createApiError('Invalid user ID format', 400, 'INVALID_USER_ID')
  }

  let userQuery: string
  let queryParams: any[]

  // CEO and Director have access to all users
  if (req.user.role === 'CEO' || req.user.role === 'Director') {
    userQuery = `
      SELECT 
        u.id, u.auth_id, u.username, u.email, u.role, u.full_name, u.active,
        u.created_at, u.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', f.id,
              'code', f.code,
              'name', f.name,
              'created_at', ufl.created_at
            ) ORDER BY f.name
          ) FILTER (WHERE f.id IS NOT NULL), 
          '[]'
        ) as factories
      FROM users u
      LEFT JOIN user_factory_links ufl ON u.id = ufl.user_id
      LEFT JOIN factories f ON ufl.factory_id = f.id AND f.active = true
      WHERE u.id = $1
      GROUP BY u.id, u.auth_id, u.username, u.email, u.role, u.full_name, u.active, u.created_at, u.updated_at
    `
    queryParams = [id]
  } else {
    // Other roles only see users in shared factories
    userQuery = `
      SELECT DISTINCT
        u.id, u.auth_id, u.username, u.email, u.role, u.full_name, u.active,
        u.created_at, u.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', f.id,
              'code', f.code,
              'name', f.name,
              'created_at', ufl.created_at
            ) ORDER BY f.name
          ) FILTER (WHERE f.id IS NOT NULL), 
          '[]'
        ) as factories
      FROM users u
      LEFT JOIN user_factory_links ufl ON u.id = ufl.user_id
      LEFT JOIN factories f ON ufl.factory_id = f.id AND f.active = true
      WHERE u.id = $1
        AND u.active = true
        AND (
          u.id = $2 OR
          EXISTS (
            SELECT 1 
            FROM user_factory_links ufl1
            INNER JOIN user_factory_links ufl2 ON ufl1.factory_id = ufl2.factory_id
            WHERE ufl1.user_id = u.id
            AND ufl2.user_id = $2
          )
        )
      GROUP BY u.id, u.auth_id, u.username, u.email, u.role, u.full_name, u.active, u.created_at, u.updated_at
    `
    queryParams = [id, req.user.userId]
  }

  const result = await query(userQuery, queryParams)

  if (result.rows.length === 0) {
    throw createApiError('User not found or access denied', 404, 'USER_NOT_FOUND')
  }

  res.json({
    success: true,
    user: result.rows[0] as UserResponse
  })
}))

/**
 * POST /api/company/users
 * Create/invite user (CEO/Director only)
 */
router.post('/users', requireRole('CEO', 'Director'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  const { username, email, role, full_name, factory_ids }: CreateUserRequest = req.body

  // Validate required fields
  if (!username || !role) {
    throw createApiError('Username and role are required', 400, 'MISSING_REQUIRED_FIELDS')
  }

  // Validate username format
  const usernameRegex = /^[a-zA-Z0-9_-]+$/
  if (!usernameRegex.test(username) || username.length < 2 || username.length > 50) {
    throw createApiError(
      'Username must be 2-50 characters, alphanumeric, underscore, or hyphen only',
      400,
      'INVALID_USERNAME'
    )
  }

  // Validate role
  const validRoles: UserRole[] = ['CEO', 'Director', 'FM', 'FW', 'Office']
  if (!validRoles.includes(role)) {
    throw createApiError(
      'Invalid role. Must be one of: CEO, Director, FM, FW, Office',
      400,
      'INVALID_ROLE'
    )
  }

  // Validate email format if provided
  if (email) {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    if (!emailRegex.test(email)) {
      throw createApiError('Invalid email format', 400, 'INVALID_EMAIL')
    }
  }

  // Validate full name length if provided
  if (full_name && (full_name.length < 2 || full_name.length > 100)) {
    throw createApiError(
      'Full name must be 2-100 characters',
      400,
      'INVALID_FULL_NAME'
    )
  }

  // Validate factory IDs if provided
  if (factory_ids && factory_ids.length > 0) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    for (const factoryId of factory_ids) {
      if (!uuidRegex.test(factoryId)) {
        throw createApiError(`Invalid factory ID format: ${factoryId}`, 400, 'INVALID_FACTORY_ID')
      }
    }
  }

  // Generate a temporary password (simple for now)
  const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
  // Note: For now we're just generating the password but not storing it hashed
  // This will be enhanced when we implement proper authentication flow

  const result = await transaction(async (client) => {
    // Check if username already exists
    const existingUserResult = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    )

    if (existingUserResult.rows.length > 0) {
      throw createApiError(
        'Username already exists',
        409,
        'DUPLICATE_USERNAME'
      )
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmailResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      )

      if (existingEmailResult.rows.length > 0) {
        throw createApiError(
          'Email already exists',
          409,
          'DUPLICATE_EMAIL'
        )
      }
    }

    // Validate factory IDs exist (if provided)
    if (factory_ids && factory_ids.length > 0) {
      const factoryCheckResult = await client.query(
        `SELECT id FROM factories WHERE id = ANY($1) AND active = true`,
        [factory_ids]
      )

      if (factoryCheckResult.rows.length !== factory_ids.length) {
        throw createApiError(
          'One or more factory IDs are invalid or inactive',
          400,
          'INVALID_FACTORY_IDS'
        )
      }
    }

    // Insert new user
    const insertResult = await client.query(`
      INSERT INTO users (username, email, role, full_name, active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, auth_id, username, email, role, full_name, active, created_at, updated_at
    `, [username, email, role, full_name])

    const newUser = insertResult.rows[0]

    // Create factory assignments if provided
    const factoryAssignments = []
    if (factory_ids && factory_ids.length > 0) {
      for (const factoryId of factory_ids) {
        await client.query(`
          INSERT INTO user_factory_links (user_id, factory_id, created_at, created_by)
          VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
        `, [newUser.id, factoryId, req.user!.userId])
        
        // Get factory details for response
        const factoryResult = await client.query(
          'SELECT id, code, name FROM factories WHERE id = $1',
          [factoryId]
        )
        if (factoryResult.rows.length > 0) {
          factoryAssignments.push(factoryResult.rows[0])
        }
      }
    }

    return {
      ...newUser,
      factories: factoryAssignments,
      tempPassword // Include temp password in response for now
    }
  })

  // Emit user created event
  eventEmitter.emitUserEvent('created', result.id, ['username', 'role', 'active'], result)

  res.status(201).json({
    success: true,
    user: result,
    message: 'User created successfully',
    tempPassword: result.tempPassword // Temporary - should be sent via email in production
  })
}))

/**
 * PUT /api/company/users/:id
 * Update user details (CEO/Director only)
 */
router.put('/users/:id', requireRole('CEO', 'Director'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  const { id } = req.params
  const { email, role, full_name, active }: UpdateUserRequest = req.body

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw createApiError('Invalid user ID format', 400, 'INVALID_USER_ID')
  }

  // At least one field must be provided
  if (email === undefined && role === undefined && full_name === undefined && active === undefined) {
    throw createApiError('At least one field must be provided for update', 400, 'NO_UPDATE_FIELDS')
  }

  // Validate fields if provided
  if (email !== undefined && email !== null && email !== '') {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    if (!emailRegex.test(email)) {
      throw createApiError('Invalid email format', 400, 'INVALID_EMAIL')
    }
  }

  if (role) {
    const validRoles: UserRole[] = ['CEO', 'Director', 'FM', 'FW', 'Office']
    if (!validRoles.includes(role)) {
      throw createApiError(
        'Invalid role. Must be one of: CEO, Director, FM, FW, Office',
        400,
        'INVALID_ROLE'
      )
    }
  }

  if (full_name && (full_name.length < 2 || full_name.length > 100)) {
    throw createApiError(
      'Full name must be 2-100 characters',
      400,
      'INVALID_FULL_NAME'
    )
  }

  const result = await transaction(async (client) => {
    // Check if user exists
    const existingResult = await client.query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [id]
    )

    if (existingResult.rows.length === 0) {
      throw createApiError('User not found', 404, 'USER_NOT_FOUND')
    }

    const existingUser = existingResult.rows[0]

    // Check if new email conflicts with existing user (if email is being changed)
    if (email && email !== existingUser.email) {
      const emailCheckResult = await client.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      )

      if (emailCheckResult.rows.length > 0) {
        throw createApiError(
          'Email already exists',
          409,
          'DUPLICATE_EMAIL'
        )
      }
    }

    // Build update query dynamically
    const updateFields = []
    const updateValues = []
    let paramCounter = 1

    if (email !== undefined) {
      updateFields.push(`email = $${paramCounter}`)
      updateValues.push(email)
      paramCounter++
    }

    if (role !== undefined) {
      updateFields.push(`role = $${paramCounter}`)
      updateValues.push(role)
      paramCounter++
    }

    if (full_name !== undefined) {
      updateFields.push(`full_name = $${paramCounter}`)
      updateValues.push(full_name)
      paramCounter++
    }

    if (active !== undefined) {
      updateFields.push(`active = $${paramCounter}`)
      updateValues.push(active)
      paramCounter++
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    updateValues.push(id)

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING id, auth_id, username, email, role, full_name, active, created_at, updated_at
    `

    const updateResult = await client.query(updateQuery, updateValues)
    
    // Get factory assignments
    const factoryResult = await client.query(`
      SELECT 
        f.id, f.code, f.name, ufl.created_at
      FROM user_factory_links ufl
      JOIN factories f ON ufl.factory_id = f.id
      WHERE ufl.user_id = $1 AND f.active = true
      ORDER BY f.name
    `, [id])

    return {
      ...updateResult.rows[0],
      factories: factoryResult.rows
    }
  })

  // Determine changed keys
  const changedKeys = []
  if (email !== undefined) changedKeys.push('email')
  if (role !== undefined) changedKeys.push('role')
  if (full_name !== undefined) changedKeys.push('full_name')
  if (active !== undefined) changedKeys.push('active')

  // Emit user updated event
  eventEmitter.emitUserEvent('updated', result.id, changedKeys, result)

  res.json({
    success: true,
    user: result as UserResponse,
    message: 'User updated successfully'
  })
}))

/**
 * PUT /api/company/users/:id/deactivate
 * Deactivate user (CEO/Director only)
 */
router.put('/users/:id/deactivate', requireRole('CEO', 'Director'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  const { id } = req.params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw createApiError('Invalid user ID format', 400, 'INVALID_USER_ID')
  }

  // Prevent users from deactivating themselves
  if (id === req.user.userId) {
    throw createApiError('Cannot deactivate your own account', 400, 'CANNOT_DEACTIVATE_SELF')
  }

  const result = await transaction(async (client) => {
    // Check if user exists and is active
    const existingResult = await client.query(
      'SELECT id, username, active FROM users WHERE id = $1',
      [id]
    )

    if (existingResult.rows.length === 0) {
      throw createApiError('User not found', 404, 'USER_NOT_FOUND')
    }

    const user = existingResult.rows[0]

    if (!user.active) {
      throw createApiError('User is already deactivated', 409, 'USER_ALREADY_INACTIVE')
    }

    // Deactivate user
    const updateResult = await client.query(`
      UPDATE users 
      SET active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, auth_id, username, email, role, full_name, active, created_at, updated_at
    `, [id])

    // Get factory assignments
    const factoryResult = await client.query(`
      SELECT 
        f.id, f.code, f.name, ufl.created_at
      FROM user_factory_links ufl
      JOIN factories f ON ufl.factory_id = f.id
      WHERE ufl.user_id = $1 AND f.active = true
      ORDER BY f.name
    `, [id])

    return {
      ...updateResult.rows[0],
      factories: factoryResult.rows
    }
  })

  // Emit user deactivated event
  eventEmitter.emitUserEvent('deactivated', result.id, ['active'], result)

  res.json({
    success: true,
    user: result as UserResponse,
    message: 'User deactivated successfully'
  })
}))

/**
 * PUT /api/company/users/:id/reactivate
 * Reactivate user (CEO/Director only)
 */
router.put('/users/:id/reactivate', requireRole('CEO', 'Director'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  const { id } = req.params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw createApiError('Invalid user ID format', 400, 'INVALID_USER_ID')
  }

  const result = await transaction(async (client) => {
    // Check if user exists and is inactive
    const existingResult = await client.query(
      'SELECT id, username, active FROM users WHERE id = $1',
      [id]
    )

    if (existingResult.rows.length === 0) {
      throw createApiError('User not found', 404, 'USER_NOT_FOUND')
    }

    const user = existingResult.rows[0]

    if (user.active) {
      throw createApiError('User is already active', 409, 'USER_ALREADY_ACTIVE')
    }

    // Reactivate user
    const updateResult = await client.query(`
      UPDATE users 
      SET active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, auth_id, username, email, role, full_name, active, created_at, updated_at
    `, [id])

    // Get factory assignments
    const factoryResult = await client.query(`
      SELECT 
        f.id, f.code, f.name, ufl.created_at
      FROM user_factory_links ufl
      JOIN factories f ON ufl.factory_id = f.id
      WHERE ufl.user_id = $1 AND f.active = true
      ORDER BY f.name
    `, [id])

    return {
      ...updateResult.rows[0],
      factories: factoryResult.rows
    }
  })

  // Emit user reactivated event
  eventEmitter.emitUserEvent('reactivated', result.id, ['active'], result)

  res.json({
    success: true,
    user: result as UserResponse,
    message: 'User reactivated successfully'
  })
}))

/**
 * GET /api/company/users/:id/factories
 * Get user's assigned factories
 */
router.get('/users/:id/factories', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  const { id } = req.params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw createApiError('Invalid user ID format', 400, 'INVALID_USER_ID')
  }

  // Check if user has permission to view this user's factories
  if (req.user.role !== 'CEO' && req.user.role !== 'Director' && req.user.userId !== id) {
    // Non-global users can only view their own factory assignments
    throw createApiError('Access denied', 403, 'ACCESS_DENIED')
  }

  // Check if user exists
  const userResult = await query(
    'SELECT id, username FROM users WHERE id = $1',
    [id]
  )

  if (userResult.rows.length === 0) {
    throw createApiError('User not found', 404, 'USER_NOT_FOUND')
  }

  // Get factory assignments
  const factoriesResult = await query(`
    SELECT 
      f.id, f.code, f.name, f.active, ufl.created_at, ufl.created_by,
      creator.username as created_by_username
    FROM user_factory_links ufl
    JOIN factories f ON ufl.factory_id = f.id
    LEFT JOIN users creator ON ufl.created_by = creator.id
    WHERE ufl.user_id = $1
    ORDER BY f.name
  `, [id])

  res.json({
    success: true,
    user: userResult.rows[0],
    factories: factoriesResult.rows,
    total: factoriesResult.rows.length
  })
}))

/**
 * POST /api/company/users/:id/factories
 * Assign factory to user (CEO/Director only)
 */
router.post('/users/:id/factories', requireRole('CEO', 'Director'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  const { id } = req.params
  const { factory_id }: AssignFactoryRequest = req.body

  // Validate UUID formats
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw createApiError('Invalid user ID format', 400, 'INVALID_USER_ID')
  }
  if (!factory_id || !uuidRegex.test(factory_id)) {
    throw createApiError('Invalid factory ID format', 400, 'INVALID_FACTORY_ID')
  }

  const result = await transaction(async (client) => {
    // Check if user exists
    const userResult = await client.query(
      'SELECT id, username FROM users WHERE id = $1',
      [id]
    )

    if (userResult.rows.length === 0) {
      throw createApiError('User not found', 404, 'USER_NOT_FOUND')
    }

    // Check if factory exists and is active
    const factoryResult = await client.query(
      'SELECT id, code, name, active FROM factories WHERE id = $1',
      [factory_id]
    )

    if (factoryResult.rows.length === 0) {
      throw createApiError('Factory not found', 404, 'FACTORY_NOT_FOUND')
    }

    const factory = factoryResult.rows[0]
    if (!factory.active) {
      throw createApiError('Cannot assign inactive factory to user', 400, 'FACTORY_INACTIVE')
    }

    // Check if assignment already exists
    const existingAssignment = await client.query(
      'SELECT user_id, factory_id FROM user_factory_links WHERE user_id = $1 AND factory_id = $2',
      [id, factory_id]
    )

    if (existingAssignment.rows.length > 0) {
      throw createApiError(
        'User is already assigned to this factory',
        409,
        'ASSIGNMENT_ALREADY_EXISTS'
      )
    }

    // Create the assignment
    await client.query(`
      INSERT INTO user_factory_links (user_id, factory_id, created_at, created_by)
      VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
    `, [id, factory_id, req.user!.userId])

    return {
      user: userResult.rows[0],
      factory: factory,
      assigned_at: new Date().toISOString()
    }
  })

  // Emit factory assignment event
  eventEmitter.emitUserEvent('factory_assigned', id, ['factories'], result, factory_id)

  res.status(201).json({
    success: true,
    assignment: result,
    message: 'Factory assigned to user successfully'
  })
}))

/**
 * DELETE /api/company/users/:id/factories/:factoryId
 * Remove factory assignment from user (CEO/Director only)
 */
router.delete('/users/:id/factories/:factoryId', requireRole('CEO', 'Director'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  const { id, factoryId } = req.params

  // Validate UUID formats
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw createApiError('Invalid user ID format', 400, 'INVALID_USER_ID')
  }
  if (!uuidRegex.test(factoryId)) {
    throw createApiError('Invalid factory ID format', 400, 'INVALID_FACTORY_ID')
  }

  const result = await transaction(async (client) => {
    // Check if user exists
    const userResult = await client.query(
      'SELECT id, username FROM users WHERE id = $1',
      [id]
    )

    if (userResult.rows.length === 0) {
      throw createApiError('User not found', 404, 'USER_NOT_FOUND')
    }

    // Check if factory exists
    const factoryResult = await client.query(
      'SELECT id, code, name FROM factories WHERE id = $1',
      [factoryId]
    )

    if (factoryResult.rows.length === 0) {
      throw createApiError('Factory not found', 404, 'FACTORY_NOT_FOUND')
    }

    // Check if assignment exists
    const existingAssignment = await client.query(
      'SELECT user_id, factory_id, created_at FROM user_factory_links WHERE user_id = $1 AND factory_id = $2',
      [id, factoryId]
    )

    if (existingAssignment.rows.length === 0) {
      throw createApiError(
        'User is not assigned to this factory',
        404,
        'ASSIGNMENT_NOT_FOUND'
      )
    }

    // Remove the assignment
    await client.query(
      'DELETE FROM user_factory_links WHERE user_id = $1 AND factory_id = $2',
      [id, factoryId]
    )

    return {
      user: userResult.rows[0],
      factory: factoryResult.rows[0],
      removed_at: new Date().toISOString()
    }
  })

  // Emit factory removal event
  eventEmitter.emitUserEvent('factory_removed', id, ['factories'], result, factoryId)

  res.json({
    success: true,
    removal: result,
    message: 'Factory assignment removed successfully'
  })
}))

export { router as companyRouter }