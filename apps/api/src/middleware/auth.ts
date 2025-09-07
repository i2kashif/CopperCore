import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { getSupabaseClient } from '../lib/supabase'
import { UserRole, UserContext, FactoryScopedContext, ErrorCodes } from '../modules/common/types'
import { createErrorResponse, isGlobalRole, validateFactoryScope } from '../modules/common/validation'
import { createHash } from 'crypto'

/**
 * Authentication and authorization middleware for CopperCore API
 * 
 * Per PRD §2: Users, Roles & Factory Scoping
 * - CEO/Director: Global access to all factories
 * - Factory Manager/Worker: Scoped to assigned factories only
 * - Office: Configurable factory access
 * 
 * Per PRD §10: Security - RLS enforcement at application level
 */

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserContext
    factoryContext?: FactoryScopedContext
  }
}

interface AuthOptions {
  requireRole?: UserRole[]
  requireFactory?: boolean
  requireGlobal?: boolean
}

/**
 * Mock user session store (replace with Redis/JWT in production)
 */
const sessionStore = new Map<string, {
  user_id: string
  username: string
  role: UserRole
  factory_ids: string[]
  expires_at: number
  ip_address: string
  user_agent: string
}>()

/**
 * Generate session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2)
  return createHash('sha256').update(`${timestamp}-${random}`).digest('hex')
}

/**
 * Create user session (called after login)
 */
export async function createUserSession(
  userId: string,
  ipAddress: string,
  userAgent: string
): Promise<{ sessionId: string; expiresAt: number } | null> {
  const supabase = getSupabaseClient()
  
  try {
    // Get user details with factory assignments
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        username,
        role,
        is_active,
        user_factory_assignments!inner (
          factory_id,
          is_active
        )
      `)
      .eq('id', userId)
      .eq('is_active', true)
      .single()
    
    if (userError || !user) {
      return null
    }
    
    // Extract factory IDs
    const factoryIds = (user as any).user_factory_assignments
      .filter((assignment: any) => assignment.is_active)
      .map((assignment: any) => assignment.factory_id)
    
    // Create session
    const sessionId = generateSessionId()
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    
    sessionStore.set(sessionId, {
      user_id: user.id,
      username: user.username,
      role: user.role as UserRole,
      factory_ids: factoryIds,
      expires_at: expiresAt,
      ip_address: ipAddress,
      user_agent: userAgent
    })
    
    // Update last login
    await supabase
      .from('users')
      .update({
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: userId
      })
      .eq('id', userId)
    
    return { sessionId, expiresAt }
  } catch (error) {
    console.error('Failed to create user session:', error)
    return null
  }
}

/**
 * Validate session and extract user context
 */
async function validateSession(sessionId: string): Promise<UserContext | null> {
  const session = sessionStore.get(sessionId)
  
  if (!session || session.expires_at < Date.now()) {
    // Clean up expired session
    if (session) {
      sessionStore.delete(sessionId)
    }
    return null
  }
  
  const isGlobal = isGlobalRole(session.role)
  
  return {
    user_id: session.user_id,
    username: session.username,
    role: session.role,
    factory_ids: session.factory_ids,
    is_global: isGlobal,
    session_id: sessionId
  }
}

/**
 * Authentication middleware - validates session
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract session ID from Authorization header or cookie
    const authHeader = request.headers.authorization
    const sessionCookie = request.cookies?.['copper-session']
    
    let sessionId: string | undefined
    
    if (authHeader?.startsWith('Bearer ')) {
      sessionId = authHeader.substring(7)
    } else if (sessionCookie) {
      sessionId = sessionCookie
    }
    
    if (!sessionId) {
      return reply.code(401).send(
        createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required')
      )
    }
    
    const user = await validateSession(sessionId)
    
    if (!user) {
      return reply.code(401).send(
        createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Invalid or expired session')
      )
    }
    
    // Attach user context to request
    request.user = user
  } catch (error) {
    console.error('Authentication error:', error)
    return reply.code(500).send(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Authentication failed')
    )
  }
}

/**
 * Authorization middleware factory - checks roles and factory access
 */
export function authorize(options: AuthOptions = {}) {
  return async function(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.user) {
      return reply.code(401).send(
        createErrorResponse(ErrorCodes.UNAUTHORIZED, 'User context not found')
      )
    }
    
    const user = request.user
    
    // Check role requirements
    if (options.requireRole && !options.requireRole.includes(user.role)) {
      return reply.code(403).send(
        createErrorResponse(ErrorCodes.FORBIDDEN, `Role ${user.role} not authorized`)
      )
    }
    
    // Check global access requirement
    if (options.requireGlobal && !user.is_global) {
      return reply.code(403).send(
        createErrorResponse(ErrorCodes.FORBIDDEN, 'Global access required')
      )
    }
    
    // Check factory access for scoped operations
    if (options.requireFactory) {
      const factoryId = request.params?.factory_id || 
                       request.body?.factory_id ||
                       request.query?.factory_id
      
      if (!factoryId) {
        return reply.code(400).send(
          createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Factory ID required')
        )
      }
      
      if (!validateFactoryScope(user.factory_ids, factoryId, user.is_global)) {
        return reply.code(403).send(
          createErrorResponse(ErrorCodes.FACTORY_SCOPE_VIOLATION, 'Access denied for factory')
        )
      }
      
      // Create factory-scoped context
      request.factoryContext = {
        ...user,
        target_factory_id: factoryId
      }
    }
  }
}

/**
 * Session management endpoints
 */
// eslint-disable-next-line max-lines-per-function
export async function setupAuthRoutes(fastify: FastifyInstance) {
  // Mock login endpoint (replace with proper auth in production)
  fastify.post('/auth/login', async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string }
    
    if (!username || !password) {
      return reply.code(400).send(
        createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Username and password required')
      )
    }
    
    const supabase = getSupabaseClient()
    
    try {
      // Mock authentication (replace with proper password verification)
      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, role, is_active')
        .eq('username', username)
        .eq('is_active', true)
        .single()
      
      if (error || !user) {
        return reply.code(401).send(
          createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Invalid credentials')
        )
      }
      
      // For demo: accept 'admin123' for CEO, 'password' for others
      const expectedPassword = user.role === 'CEO' ? 'admin123' : 'password'
      if (password !== expectedPassword) {
        return reply.code(401).send(
          createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Invalid credentials')
        )
      }
      
      const clientIp = request.ip || 'unknown'
      const userAgent = request.headers['user-agent'] || 'unknown'
      
      const session = await createUserSession(user.id, clientIp, userAgent)
      
      if (!session) {
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create session')
        )
      }
      
      // Set secure cookie
      reply.setCookie('copper-session', session.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      })
      
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          },
          session: {
            expires_at: new Date(session.expiresAt).toISOString()
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      return reply.code(500).send(
        createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Login failed')
      )
    }
  })
  
  // Logout endpoint
  fastify.post('/auth/logout', { preHandler: authenticate }, async (request, reply) => {
    if (request.user?.session_id) {
      sessionStore.delete(request.user.session_id)
    }
    
    reply.clearCookie('copper-session')
    
    return { success: true, message: 'Logged out successfully' }
  })
  
  // Session info endpoint
  fastify.get('/auth/me', { preHandler: authenticate }, async request => {
    return {
      success: true,
      data: {
        user: {
          id: request.user!.user_id,
          username: request.user!.username,
          role: request.user!.role,
          factory_ids: request.user!.factory_ids,
          is_global: request.user!.is_global
        }
      }
    }
  })
  
  // Health check for auth system
  fastify.get('/auth/health', async () => {
    const activeSessions = sessionStore.size
    const expiredSessions = Array.from(sessionStore.values())
      .filter(session => session.expires_at < Date.now()).length
    
    return {
      success: true,
      data: {
        active_sessions: activeSessions - expiredSessions,
        expired_sessions: expiredSessions
      }
    }
  })
}

/**
 * Clean up expired sessions periodically
 */
export function startSessionCleanup() {
  setInterval(() => {
    const now = Date.now()
    for (const [sessionId, session] of sessionStore.entries()) {
      if (session.expires_at < now) {
        sessionStore.delete(sessionId)
      }
    }
  }, 15 * 60 * 1000) // Clean every 15 minutes
}

/**
 * Get current session count (for monitoring)
 */
export function getActiveSessionCount(): number {
  const now = Date.now()
  return Array.from(sessionStore.values())
    .filter(session => session.expires_at >= now).length
}
