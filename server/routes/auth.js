'use strict'

const express = require('express')
const router = express.Router()
const db = require('../db')
const { requireAuth, createSession, deleteSession } = require('../middleware/auth')

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password, orgSlug } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'username en password zijn verplicht' })
  }

  const user = orgSlug
    ? db.prepare('SELECT * FROM users WHERE username = ? AND password = ? AND org_slug = ?').get(username, password, orgSlug)
    : db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password)

  if (!user) return res.status(401).json({ error: 'Ongeldige inloggegevens' })

  const tenant = db.prepare('SELECT * FROM tenants WHERE org_slug = ?').get(user.org_slug)
  const token = createSession(user)

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, orgSlug: user.org_slug },
    tenant: { orgSlug: tenant.org_slug, companyName: tenant.company_name, plan: tenant.plan }
  })
})

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim()
  deleteSession(token)
  res.json({ ok: true })
})

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const { token: _t, ...session } = req.session
  res.json(session)
})

// GET /api/auth/organizations
router.get('/organizations', requireAuth, (req, res) => {
  const tenants = req.session.role === 'superadmin'
    ? db.prepare('SELECT org_slug, company_name, plan, created_at FROM tenants ORDER BY created_at').all()
    : db.prepare('SELECT org_slug, company_name, plan, created_at FROM tenants WHERE org_slug = ?').all(req.session.orgSlug)
  res.json(tenants)
})

module.exports = router
