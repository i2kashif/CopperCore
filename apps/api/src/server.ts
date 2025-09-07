import Fastify from 'fastify'
import cors from '@fastify/cors'
import env from '@fastify/env'
import cookie from '@fastify/cookie'
import { checkDatabaseHealth } from './lib/supabase'
import { setupAuthRoutes, startSessionCleanup } from './middleware/auth'
import { factoriesRoutes } from './modules/factories/routes'
import { usersRoutes } from './modules/users/routes'
import { userFactoryAssignmentsRoutes } from './modules/user-factory-assignments/routes'

const server = Fastify({
  logger: true
})

const schema = {
  type: 'object',
  required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  properties: {
    SUPABASE_URL: { type: 'string' },
    SUPABASE_SERVICE_ROLE_KEY: { type: 'string' },
    PORT: { type: 'string', default: '3001' }
  }
}

const options = {
  confKey: 'config',
  schema: schema,
  dotenv: true
}

await server.register(env, options)

await server.register(cors, {
  origin: (origin, cb) => {
    const hostname = new URL(origin || 'http://localhost:3000').hostname
    if (hostname === 'localhost') {
      cb(null, true)
      return
    }
    cb(new Error("Not allowed"), false)
  }
})

// Register cookie support for session management
await server.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'copper-core-cookie-secret-dev-only',
  parseOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
})

// Health check endpoint with database status
server.get('/health', async (request, reply) => {
  const dbHealth = await checkDatabaseHealth()
  
  return {
    status: dbHealth.connected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbHealth.connected,
      latency: dbHealth.latency,
      error: dbHealth.error
    },
    version: '1.0.0'
  }
})

server.get('/api/ping', async (request, reply) => {
  return { message: 'pong', service: 'CopperCore API', version: '1.0.0' }
})

// Register route modules
await setupAuthRoutes(server)
await factoriesRoutes(server)
await usersRoutes(server)
await userFactoryAssignmentsRoutes(server)

// Start session cleanup
startSessionCleanup()

const start = async () => {
  try {
    const port = parseInt((server as any).config.PORT) || 3001
    await server.listen({ port, host: '0.0.0.0' })
    server.log.info(`🚀 API server ready at http://localhost:${port}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()