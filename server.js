'use strict'

const express = require('express')
const cors = require('cors')
const path = require('path')

const authRouter = require('./server/routes/auth')
const jobsRouter = require('./server/routes/jobs')
const techniciansRouter = require('./server/routes/technicians')
const eventsRouter = require('./server/routes/events')
const installationsRouter = require('./server/routes/installations')
const settingsRouter = require('./server/routes/settings')
const kpisRouter = require('./server/routes/kpis')
const tenantsRouter = require('./server/routes/tenants')
const migrateRouter = require('./server/routes/migrate')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.static(path.join(__dirname)))

app.use('/api/auth', authRouter)
app.use('/api/jobs', jobsRouter)
app.use('/api/technicians', techniciansRouter)
app.use('/api/events', eventsRouter)
app.use('/api/installations', installationsRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/kpis', kpisRouter)
app.use('/api/tenants', tenantsRouter)
app.use('/api/migrate', migrateRouter)

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

// Globale foutafhandeling
app.use((err, req, res, _next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Interne serverfout' })
})

app.listen(PORT, () => {
  console.log(`PlanWise draait op http://localhost:${PORT}`)
})

module.exports = app
