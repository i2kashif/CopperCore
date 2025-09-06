import Fastify from 'fastify'
import cors from '@fastify/cors'
import env from '@fastify/env'

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

server.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

server.get('/api/ping', async (request, reply) => {
  return { message: 'pong', service: 'CopperCore API' }
})

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