/**
 * Authentication Utilities
 * JWT token management and password hashing for CopperCore ERP
 */

import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'

export interface JWTPayload {
  userId: string
  username: string
  role: string
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'coppercore-erp',
    audience: 'coppercore-client'
  })
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'coppercore-erp',
    audience: 'coppercore-client'
  })
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: JWTPayload): TokenPair {
  const accessToken = generateAccessToken(payload)
  const refreshToken = generateRefreshToken(payload)
  
  // Decode to get expiration time
  const decoded = jwt.decode(accessToken) as any
  const expiresAt = decoded.exp * 1000 // Convert to milliseconds
  
  return {
    accessToken,
    refreshToken,
    expiresAt
  }
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'coppercore-erp',
      audience: 'coppercore-client'
    }) as JWTPayload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

/**
 * Decode JWT token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload
  } catch (error) {
    return null
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return true
  
  const now = Math.floor(Date.now() / 1000)
  return decoded.exp < now
}

/**
 * Get token expiration time in milliseconds
 */
export function getTokenExpiration(token: string): number | null {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return null
  
  return decoded.exp * 1000
}