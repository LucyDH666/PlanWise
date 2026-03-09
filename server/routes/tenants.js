'use strict'

const express = require('express')
const router = express.Router()
const db = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')
const { randomUUID } = require('crypto')

// GET /api/tenants — alleen superadmin
router.get('/', requireAuth, requireRole('superadmin'), (req, res) => {
  const tenants = db.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all()
  res.json(tenants)
})

// POST /api/tenants — nieuwe tenant aanmaken
router.post('/', requireAuth, requireRole('superadmin'), (req, res) => {
  const { orgSlug, companyName, plan = 'starter', adminUsername, adminPassword } = req.body
  if (!orgSlug || !companyName) return res.status(400).json({ error: 'orgSlug en companyName verplicht' })

  const exists = db.prepare('SELECT 1 FROM tenants WHERE org_slug = ?').get(orgSlug)
  if (exists) return res.status(409).json({ error: 'orgSlug al in gebruik' })

  db.transaction(() => {
    db.prepare('INSERT INTO tenants (org_slug, company_name, plan) VALUES (?, ?, ?)').run(orgSlug, companyName, plan)
    if (adminUsername) {
      db.prepare('INSERT INTO users (id, org_slug, username, password, role) VALUES (?, ?, ?, ?, ?)').run(
        randomUUID(), orgSlug, adminUsername, adminPassword || 'planwise2025!', 'admin'
      )
    }
    db.prepare('INSERT INTO settings (org_slug, data) VALUES (?, ?)').run(orgSlug, JSON.stringify({ companyName }))
  })()

  res.status(201).json({ orgSlug, companyName, plan })
})

// PUT /api/tenants/:slug
router.put('/:slug', requireAuth, requireRole('superadmin'), (req, res) => {
  const { companyName, plan } = req.body
  db.prepare('UPDATE tenants SET company_name = COALESCE(?, company_name), plan = COALESCE(?, plan), updated_at = datetime(\'now\') WHERE org_slug = ?').run(
    companyName || null, plan || null, req.params.slug
  )
  res.json(db.prepare('SELECT * FROM tenants WHERE org_slug = ?').get(req.params.slug))
})

// DELETE /api/tenants/:slug
router.delete('/:slug', requireAuth, requireRole('superadmin'), (req, res) => {
  if (req.params.slug === 'PLANWISE_PLATFORM') {
    return res.status(403).json({ error: 'Platform tenant kan niet worden verwijderd' })
  }
  db.transaction(() => {
    db.prepare('DELETE FROM jobs WHERE org_slug = ?').run(req.params.slug)
    db.prepare('DELETE FROM technicians WHERE org_slug = ?').run(req.params.slug)
    db.prepare('DELETE FROM calendar_events WHERE org_slug = ?').run(req.params.slug)
    db.prepare('DELETE FROM installations WHERE org_slug = ?').run(req.params.slug)
    db.prepare('DELETE FROM settings WHERE org_slug = ?').run(req.params.slug)
    db.prepare('DELETE FROM users WHERE org_slug = ?').run(req.params.slug)
    db.prepare('DELETE FROM tenants WHERE org_slug = ?').run(req.params.slug)
  })()
  res.json({ ok: true })
})

module.exports = router
