'use strict'

const express = require('express')
const router = express.Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')
const { randomUUID } = require('crypto')

// Zet een frontend-object om naar een DB-rij.
// De volledige payload wordt opgeslagen in `data` voor backwards-compatibiliteit.
function toRow(orgSlug, body, existing = {}) {
  const now = new Date().toISOString()
  const id = body.id || existing.id || randomUUID()
  const merged = { ...existing, ...body, id }
  return {
    id,
    org_slug: orgSlug,
    title: body.title || body.description || existing.title || '',
    category: body.category || existing.category || '',
    priority: body.priority || existing.priority || 'normal',
    status: body.status || existing.status || 'new',
    customer_name: body.customerName || body.customer?.name || existing.customer_name || '',
    assigned_technician_id: body.assignedTechnicianId || body.assignedTo || existing.assigned_technician_id || null,
    data: JSON.stringify(merged),
    created_at: existing.created_at || now,
    updated_at: now
  }
}

function fromRow(row) {
  if (!row) return null
  try { return JSON.parse(row.data) } catch { return { id: row.id, title: row.title, status: row.status } }
}

router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM jobs WHERE org_slug = ? ORDER BY created_at DESC').all(req.session.orgSlug)
  res.json(rows.map(fromRow))
})

router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM jobs WHERE id = ? AND org_slug = ?').get(req.params.id, req.session.orgSlug)
  if (!row) return res.status(404).json({ error: 'Niet gevonden' })
  res.json(fromRow(row))
})

router.post('/', requireAuth, (req, res) => {
  const row = toRow(req.session.orgSlug, req.body)
  db.prepare(`
    INSERT OR REPLACE INTO jobs
      (id, org_slug, title, category, priority, status, customer_name, assigned_technician_id, data, created_at, updated_at)
    VALUES
      (@id, @org_slug, @title, @category, @priority, @status, @customer_name, @assigned_technician_id, @data, @created_at, @updated_at)
  `).run(row)
  res.status(201).json(fromRow(db.prepare('SELECT * FROM jobs WHERE id = ?').get(row.id)))
})

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM jobs WHERE id = ? AND org_slug = ?').get(req.params.id, req.session.orgSlug)
  if (!existing) return res.status(404).json({ error: 'Niet gevonden' })
  const existingData = JSON.parse(existing.data || '{}')
  const row = toRow(req.session.orgSlug, { ...req.body, id: req.params.id }, { ...existingData, created_at: existing.created_at })
  db.prepare(`
    UPDATE jobs SET title = @title, category = @category, priority = @priority, status = @status,
      customer_name = @customer_name, assigned_technician_id = @assigned_technician_id,
      data = @data, updated_at = @updated_at
    WHERE id = @id AND org_slug = @org_slug
  `).run(row)
  res.json(fromRow(db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id)))
})

router.delete('/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM jobs WHERE id = ? AND org_slug = ?').run(req.params.id, req.session.orgSlug)
  if (result.changes === 0) return res.status(404).json({ error: 'Niet gevonden' })
  res.json({ ok: true })
})

// Bulk import vanuit localStorage migratie
router.post('/bulk', requireAuth, (req, res) => {
  const { jobs } = req.body
  if (!Array.isArray(jobs)) return res.status(400).json({ error: 'jobs array verplicht' })
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO jobs
      (id, org_slug, title, category, priority, status, customer_name, assigned_technician_id, data, created_at, updated_at)
    VALUES
      (@id, @org_slug, @title, @category, @priority, @status, @customer_name, @assigned_technician_id, @data, @created_at, @updated_at)
  `)
  db.transaction((items) => items.forEach(j => stmt.run(toRow(req.session.orgSlug, j))))(jobs)
  res.json({ imported: jobs.length })
})

module.exports = router
