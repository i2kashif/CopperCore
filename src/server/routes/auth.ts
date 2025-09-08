
/**
 * Authentication Routes
 * Login, logout, and token management for CopperCore ERP
 */

import { Router, Request, Response } from 'express'
import { query, transaction } from '../lib/database.js'
import { verifyPassword, generateTokenPair, verifyToken } from '../lib/auth.js'
import { createApiError, asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = Router()

interface LoginRequest {
  username: string
  password: string
}

interface LoginResponse {
  session: {
    user: {
      id: string
      username: string
      full_name: string | null
      email: string | null
      role: string
      active: boolean
    }
    accessToken: string
    refreshToken: string
    expiresAt: number
  }
  error: null
}

interface RefreshRequest {
  refreshToken: string
}

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { username, password }: LoginRequest = req.body

  // Validate input
  if (!username || !password) {
    throw createApiError('Username and password are required', 400, 'MISSING_CREDENTIALS')
  }

  // Validate username format (alphanumeric, underscore, hyphen, 2-50 chars)
  const usernameRegex = /^[a-zA-Z0-9_-]{2,50}$/
  if (!usernameRegex.test(username)) {
    throw createApiError(
      'Invalid username format. Use only letters, numbers, underscore, and hyphen (2-50 characters)',
      400,
      'INVALID_USERNAME'
    )
  }

  // Find user by username
  const userResult = await query(
    'SELECT id, username, password_hash, full_name, email, role, active FROM users WHERE username = $1',
    [username]
  )

  if (userResult.rows.length === 0) {
    throw createApiError('Invalid username or password', 401, 'INVALID_CREDENTIALS')
  }

  const user = userResult.rows[0]

  // Check if user is active
  if (!user.active) {
    throw createApiError('User account is disabled', 403, 'ACCOUNT_DISABLED')
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password_hash)
  if (!isPasswordValid) {
    throw createApiError('Invalid username or password', 401, 'INVALID_CREDENTIALS')
  }

  // Generate token pair
  const tokens = generateTokenPair({
    userId: user.id,
    username: user.username,
    role: user.role
  })

  // Update last login timestamp
  await query(
    'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  )

  // Return successful login response
  const response: LoginResponse = {
    session: {
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        active: user.active
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt
    },
    error: null
  }

  res.json(response)
}))

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken }: RefreshRequest = req.body

  if (!refreshToken) {
    throw createApiError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN')
  }

  try {
    // Verify refresh token
    const payload = verifyToken(refreshToken)

    // Verify user still exists and is active
    const userResult = await query(
      'SELECT id, username, full_name, email, role, active FROM users WHERE id = $1 AND active = true',
      [payload.userId]
    )

    if (userResult.rows.length === 0) {
      throw createApiError('User not found or inactive', 401, 'USER_INACTIVE')
    }

    const user = userResult.rows[0]

    // Generate new token pair
    const tokens = generateTokenPair({
      userId: user.id,
      username: user.username,
      role: user.role
    })

    const response: LoginResponse = {
      session: {
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          active: user.active
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt
      },
      error: null
    }

    res.json(response)
  } catch (error) {
    throw createApiError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN')
  }
}))

/**
 * POST /api/auth/logout
 * Logout current user (client should discard tokens)
 */
router.post('/logout', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  // For JWT tokens, logout is handled client-side by discarding tokens
  // In a more sophisticated setup, we could maintain a token blacklist
  
  res.json({ 
    success: true, 
    message: 'Logged out successfully',
    error: null 
  })
}))

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  // Fetch full user details
  const userResult = await query(
    'SELECT id, username, full_name, email, role, active, created_at, updated_at FROM users WHERE id = $1',
    [req.user.userId]
  )

  if (userResult.rows.length === 0) {
    throw createApiError('User not found', 404, 'USER_NOT_FOUND')
  }

  const user = userResult.rows[0]

  res.json({
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      active: user.active,
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  })
}))

/**
 * GET /api/auth/factories
 * Get user's accessible factories
 */
router.get('/factories', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  let factoriesQuery: string
  let queryParams: any[]

  // CEO and Director have access to all factories
  if (req.user.role === 'CEO' || req.user.role === 'Director') {
    factoriesQuery = `
      SELECT id, name, code, active, created_at, updated_at 
      FROM factories 
      WHERE active = true 
      ORDER BY name
    `
    queryParams = []
  } else {
    // Other roles only see assigned factories
    factoriesQuery = `
      SELECT f.id, f.name, f.code, f.active, f.created_at, f.updated_at
      FROM factories f
      INNER JOIN user_factory_links ufl ON f.id = ufl.factory_id
      WHERE f.active = true 
        AND ufl.user_id = $1
      ORDER BY f.name
    `
    queryParams = [req.user.userId]
  }

  const factoriesResult = await query(factoriesQuery, queryParams)

  res.json({
    factories: factoriesResult.rows
  })
}))

/**
 * POST /api/auth/switch-factory
 * Switch user's active factory context
 */
router.post('/switch-factory', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createApiError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  const { factoryId } = req.body

  if (!factoryId) {
    throw createApiError('Factory ID is required', 400, 'MISSING_FACTORY_ID')
  }

  // Verify user has access to the factory
  let accessQuery: string
  let queryParams: any[]

  if (req.user.role === 'CEO' || req.user.role === 'Director') {
    // CEO and Director have access to all active factories
    accessQuery = `
      SELECT id, name, code 
      FROM factories 
      WHERE id = $1 AND active = true
    `
    queryParams = [factoryId]
  } else {
    // Other roles need explicit factory assignment
    accessQuery = `
      SELECT f.id, f.name, f.code
      FROM factories f
      INNER JOIN user_factory_links ufl ON f.id = ufl.factory_id
      WHERE f.id = $1 
        AND f.active = true 
        AND ufl.user_id = $2
    `
    queryParams = [factoryId, req.user.userId]
  }

  const accessResult = await query(accessQuery, queryParams)

  if (accessResult.rows.length === 0) {
    throw createApiError('Access denied to factory', 403, 'FACTORY_ACCESS_DENIED')
  }

  const factory = accessResult.rows[0]

  // Update user's current factory context
  await transaction(async (client) => {
    // Upsert user settings
    await client.query(`
      INSERT INTO user_settings (user_id, current_factory_id, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        current_factory_id = $2,
        updated_at = CURRENT_TIMESTAMP
    `, [req.user!.userId, factoryId])
  })

  res.json({
    success: true,
    factory: {
      id: factory.id,
      name: factory.name,
      code: factory.code
    },
    message: `Switched to factory: ${factory.name}`
  })
}))

export { router as authRouter }