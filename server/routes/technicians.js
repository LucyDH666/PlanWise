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
    name: body.name || existing.name || '',
    email: body.email || existing.email || null,
    skills: JSON.stringify(body.skills || existing.skills || []),
    active: body.active !== undefined ? (body.active ? 1 : 0) : 1,
    data: JSON.stringify(merged),
    created_at: existing.created_at || now,
    updated_at: now
  }
}

function fromRow(row) {
  if (!row) return null
  try { return JSON.parse(row.data) } catch { return { id: row.id, name: row.name } }
}

router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM technicians WHERE org_slug = ? ORDER BY name').all(req.session.orgSlug)
  res.json(rows.map(fromRow))
})

router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM technicians WHERE id = ? AND org_slug = ?').get(req.params.id, req.session.orgSlug)
  if (!row) return res.status(404).json({ error: 'Niet gevonden' })
  res.json(fromRow(row))
})

router.post('/', requireAuth, (req, res) => {
  const row = toRow(req.session.orgSlug, req.body)
  db.prepare(`
    INSERT OR REPLACE INTO technicians (id, org_slug, name, email, skills, active, data, created_at, updated_at)
    VALUES (@id, @org_slug, @name, @email, @skills, @active, @data, @created_at, @updated_at)
  `).run(row)
  res.status(201).json(fromRow(db.prepare('SELECT * FROM technicians WHERE id = ?').get(row.id)))
})

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM technicians WHERE id = ? AND org_slug = ?').get(req.params.id, req.session.orgSlug)
  if (!existing) return res.status(404).json({ error: 'Niet gevonden' })
  const existingData = JSON.parse(existing.data || '{}')
  const row = toRow(req.session.orgSlug, { ...req.body, id: req.params.id }, { ...existingData, created_at: existing.created_at })
  db.prepare(`
    UPDATE technicians SET name = @name, email = @email, skills = @skills, active = @active,
      data = @data, updated_at = @updated_at
    WHERE id = @id AND org_slug = @org_slug
  `).run(row)
  res.json(fromRow(db.prepare('SELECT * FROM technicians WHERE id = ?').get(req.params.id)))
})

router.delete('/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM technicians WHERE id = ? AND org_slug = ?').run(req.params.id, req.session.orgSlug)
  if (result.changes === 0) return res.status(404).json({ error: 'Niet gevonden' })
  res.json({ ok: true })
})

router.post('/bulk', requireAuth, (req, res) => {
  const { technicians } = req.body
  if (!Array.isArray(technicians)) return res.status(400).json({ error: 'technicians array verplicht' })
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO technicians (id, org_slug, name, email, skills, active, data, created_at, updated_at)
    VALUES (@id, @org_slug, @name, @email, @skills, @active, @data, @created_at, @updated_at)
  `)
  db.transaction((items) => items.forEach(t => stmt.run(toRow(req.session.orgSlug, t))))(technicians)
  res.json({ imported: technicians.length })
})

module.exports = router
