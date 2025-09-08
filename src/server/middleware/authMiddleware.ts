/**
 * Authentication Middleware
 * JWT token verification and user context for CopperCore ERP
 */

import { Request, Response, NextFunction } from 'express'
import { verifyToken, JWTPayload } from '../lib/auth.js'
import { query } from '../lib/database.js'
import { createApiError } from './errorHandler.js'

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        username: string
        role: string
        factoryId?: string
      }
    }
  }
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      throw createApiError('Access token required', 401, 'TOKEN_MISSING')
    }

    // Verify token
    const payload: JWTPayload = verifyToken(token)

    // Verify user still exists and is active
    const userResult = await query(
      'SELECT id, username, role, active FROM users WHERE id = $1 AND active = true',
      [payload.userId]
    )

    if (userResult.rows.length === 0) {
      throw createApiError('User not found or inactive', 401, 'USER_INACTIVE')
    }

    const user = userResult.rows[0]

    // Attach user to request
    req.user = {
      userId: user.id,
      username: user.username,
      role: user.role
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Middleware to check user role authorization
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createApiError('Authentication required', 401, 'AUTH_REQUIRED'))
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(createApiError(
        `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        403,
        'INSUFFICIENT_ROLE'
      ))
    }

    next()
  }
}

/**
 * Middleware to set factory context from user settings or request
 */
export async function setFactoryContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(createApiError('Authentication required', 401, 'AUTH_REQUIRED'))
    }

    // Get factory context from request header or user settings
    const requestedFactoryId = req.headers['x-factory-id'] as string
    
    let factoryId: string | null = null

    if (requestedFactoryId) {
      // Verify user has access to requested factory
      const accessResult = await query(`
        SELECT f.id, f.name, f.code 
        FROM factories f
        LEFT JOIN user_factory_links ufl ON f.id = ufl.factory_id
        WHERE f.id = $1 
          AND f.active = true
          AND (
            ufl.user_id = $2 
            OR $3 IN ('CEO', 'Director')
          )
      `, [requestedFactoryId, req.user.userId, req.user.role])

      if (accessResult.rows.length > 0) {
        factoryId = requestedFactoryId
      } else {
        throw createApiError('Access denied to factory', 403, 'FACTORY_ACCESS_DENIED')
      }
    } else {
      // Get user's current factory context from user_settings
      const settingsResult = await query(
        'SELECT current_factory_id FROM user_settings WHERE user_id = $1',
        [req.user.userId]
      )

      if (settingsResult.rows.length > 0 && settingsResult.rows[0].current_factory_id) {
        factoryId = settingsResult.rows[0].current_factory_id
      }
    }

    // Add factory context to user
    if (factoryId) {
      req.user.factoryId = factoryId
    }

    next()
  } catch (error) {
    next(error)
  }
}