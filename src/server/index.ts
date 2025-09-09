/**
 * CopperCore ERP Backend API Server
 * Express server with PostgreSQL authentication
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from 'dotenv'
import { authRouter } from './routes/auth.js'
import { companyRouter } from './routes/company.js'
import { errorHandler } from './middleware/errorHandler.js'
import { createDbConnection } from './lib/database.js'

// Load environment variables
config()

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}))

// Body parsing middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/auth', authRouter)
app.use('/api/company', companyRouter)

// Error handling middleware
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Start server
async function startServer() {
  try {
    // Test database connection
    const db = await createDbConnection()
    await db.end()
    console.log('✅ Database connection verified')

    app.listen(PORT, () => {
      console.log(`🚀 CopperCore API server running on port ${PORT}`)
      console.log(`📍 Health check: http://localhost:${PORT}/health`)
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`)
      console.log(`🏭 Company endpoints: http://localhost:${PORT}/api/company`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

startServer()