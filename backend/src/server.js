require('dotenv').config()

const express      = require('express')
const cors         = require('cors')
const helmet       = require('helmet')
const morgan       = require('morgan')
const rateLimit    = require('express-rate-limit')

const connectDB    = require('./config/db')
const routes       = require('./routes')
const errorHandler = require('./middleware/errorHandler')
const notFound     = require('./middleware/notFound')
const logger       = require('./utils/logger')

// ── Connect Database ───────────────────────────────────────────────────────
connectDB()

const app = express()

// ── Security ───────────────────────────────────────────────────────────────
app.use(helmet())

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173']

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return cb(null, true)
      if (allowedOrigins.includes(origin)) return cb(null, true)
      cb(new Error(`CORS: origin ${origin} not allowed`))
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)

// ── Rate limiting ──────────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  })
)

// ── Request parsing ────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ── HTTP logging ───────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.http(msg.trim()) },
    })
  )
}

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/', routes)

// ── 404 & Error handler ────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
})

// Graceful shutdown
const shutdown = (signal) => {
  logger.info(`${signal} received – shutting down gracefully`)
  server.close(() => {
    logger.info('HTTP server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled rejection: ${err.message}`)
  shutdown('unhandledRejection')
})

module.exports = app
