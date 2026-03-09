'use strict'

const express = require('express')
const router = express.Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')
const { randomUUID } = require('crypto')

function toRow(orgSlug, body, existing = {}) {
  const now = new Date().toISOString()
  const id = body.id || existing.id || randomUUID()
  const merged = { ...existing, ...body, id }
  return {
    id,
    org_slug: orgSlug,
    job_id: body.jobId || body.job_id || existing.job_id || null,
    technician_id: body.technicianId || body.technician_id || existing.technician_id || null,
    title: body.title || existing.title || '',
    start: body.start || existing.start || null,
    end: body.end || existing.end || null,
    locked: body.locked !== undefined ? (body.locked ? 1 : 0) : (existing.locked || 0),
    color: body.color || existing.color || null,
    data: JSON.stringify(merged),
    created_at: existing.created_at || now,
    updated_at: now
  }
}

function fromRow(row) {
  if (!row) return null
  try { return JSON.parse(row.data) } catch { return { id: row.id, title: row.title } }
}

router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM calendar_events WHERE org_slug = ? ORDER BY start').all(req.session.orgSlug)
  res.json(rows.map(fromRow))
})

router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM calendar_events WHERE id = ? AND org_slug = ?').get(req.params.id, req.session.orgSlug)
  if (!row) return res.status(404).json({ error: 'Niet gevonden' })
  res.json(fromRow(row))
})

router.post('/', requireAuth, (req, res) => {
  const row = toRow(req.session.orgSlug, req.body)
  db.prepare(`
    INSERT OR REPLACE INTO calendar_events
      (id, org_slug, job_id, technician_id, title, start, end, locked, color, data, created_at, updated_at)
    VALUES
      (@id, @org_slug, @job_id, @technician_id, @title, @start, @end, @locked, @color, @data, @created_at, @updated_at)
  `).run(row)
  res.status(201).json(fromRow(db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(row.id)))
})

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM calendar_events WHERE id = ? AND org_slug = ?').get(req.params.id, req.session.orgSlug)
  if (!existing) return res.status(404).json({ error: 'Niet gevonden' })
  const existingData = JSON.parse(existing.data || '{}')
  const row = toRow(req.session.orgSlug, { ...req.body, id: req.params.id }, { ...existingData, created_at: existing.created_at })
  db.prepare(`
    UPDATE calendar_events SET job_id = @job_id, technician_id = @technician_id, title = @title,
      start = @start, end = @end, locked = @locked, color = @color, data = @data, updated_at = @updated_at
    WHERE id = @id AND org_slug = @org_slug
  `).run(row)
  res.json(fromRow(db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(req.params.id)))
})

router.delete('/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM calendar_events WHERE id = ? AND org_slug = ?').run(req.params.id, req.session.orgSlug)
  if (result.changes === 0) return res.status(404).json({ error: 'Niet gevonden' })
  res.json({ ok: true })
})

router.post('/bulk', requireAuth, (req, res) => {
  const { events } = req.body
  if (!Array.isArray(events)) return res.status(400).json({ error: 'events array verplicht' })
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO calendar_events
      (id, org_slug, job_id, technician_id, title, start, end, locked, color, data, created_at, updated_at)
    VALUES
      (@id, @org_slug, @job_id, @technician_id, @title, @start, @end, @locked, @color, @data, @created_at, @updated_at)
  `)
  db.transaction((items) => items.forEach(e => stmt.run(toRow(req.session.orgSlug, e))))(events)
  res.json({ imported: events.length })
})

module.exports = router
