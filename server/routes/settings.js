'use strict'

const express = require('express')
const router = express.Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

// GET /api/settings
router.get('/', requireAuth, (req, res) => {
  const row = db.prepare('SELECT data FROM settings WHERE org_slug = ?').get(req.session.orgSlug)
  res.json(row ? JSON.parse(row.data) : {})
})

// PUT /api/settings
router.put('/', requireAuth, (req, res) => {
  const now = new Date().toISOString()
  const existing = db.prepare('SELECT data FROM settings WHERE org_slug = ?').get(req.session.orgSlug)
  const merged = { ...(existing ? JSON.parse(existing.data) : {}), ...req.body }
  db.prepare('INSERT OR REPLACE INTO settings (org_slug, data, updated_at) VALUES (?, ?, ?)').run(
    req.session.orgSlug, JSON.stringify(merged), now
  )
  res.json(merged)
})

module.exports = router
