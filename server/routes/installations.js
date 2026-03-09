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
    type: body.type || existing.type || '',
    customer_name: body.customerName || body.customer_name || existing.customer_name || '',
    address: body.address || existing.address || '',
    brand: body.brand || existing.brand || null,
    model: body.model || existing.model || null,
    serial_number: body.serialNumber || body.serial_number || existing.serial_number || null,
    install_date: body.installDate || body.install_date || existing.install_date || null,
    last_service: body.lastService || body.last_service || existing.last_service || null,
    next_service: body.nextService || body.next_service || existing.next_service || null,
    contract_id: body.contractId || body.contract_id || existing.contract_id || null,
    status: body.status || existing.status || 'active',
    notes: body.notes || existing.notes || null,
    data: JSON.stringify(merged),
    created_at: existing.created_at || now,
    updated_at: now
  }
}

function fromRow(row) {
  if (!row) return null
  try { return JSON.parse(row.data) } catch { return { id: row.id, type: row.type } }
}

router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM installations WHERE org_slug = ? ORDER BY created_at DESC').all(req.session.orgSlug)
  res.json(rows.map(fromRow))
})

router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM installations WHERE id = ? AND org_slug = ?').get(req.params.id, req.session.orgSlug)
  if (!row) return res.status(404).json({ error: 'Niet gevonden' })
  res.json(fromRow(row))
})

router.post('/', requireAuth, (req, res) => {
  const row = toRow(req.session.orgSlug, req.body)
  db.prepare(`
    INSERT OR REPLACE INTO installations
      (id, org_slug, type, customer_name, address, brand, model, serial_number,
       install_date, last_service, next_service, contract_id, status, notes, data, created_at, updated_at)
    VALUES
      (@id, @org_slug, @type, @customer_name, @address, @brand, @model, @serial_number,
       @install_date, @last_service, @next_service, @contract_id, @status, @notes, @data, @created_at, @updated_at)
  `).run(row)
  res.status(201).json(fromRow(db.prepare('SELECT * FROM installations WHERE id = ?').get(row.id)))
})

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM installations WHERE id = ? AND org_slug = ?').get(req.params.id, req.session.orgSlug)
  if (!existing) return res.status(404).json({ error: 'Niet gevonden' })
  const existingData = JSON.parse(existing.data || '{}')
  const row = toRow(req.session.orgSlug, { ...req.body, id: req.params.id }, { ...existingData, created_at: existing.created_at })
  db.prepare(`
    UPDATE installations SET type = @type, customer_name = @customer_name, address = @address,
      brand = @brand, model = @model, serial_number = @serial_number, install_date = @install_date,
      last_service = @last_service, next_service = @next_service, contract_id = @contract_id,
      status = @status, notes = @notes, data = @data, updated_at = @updated_at
    WHERE id = @id AND org_slug = @org_slug
  `).run(row)
  res.json(fromRow(db.prepare('SELECT * FROM installations WHERE id = ?').get(req.params.id)))
})

router.delete('/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM installations WHERE id = ? AND org_slug = ?').run(req.params.id, req.session.orgSlug)
  if (result.changes === 0) return res.status(404).json({ error: 'Niet gevonden' })
  res.json({ ok: true })
})

router.post('/bulk', requireAuth, (req, res) => {
  const { installations } = req.body
  if (!Array.isArray(installations)) return res.status(400).json({ error: 'installations array verplicht' })
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO installations
      (id, org_slug, type, customer_name, address, brand, model, serial_number,
       install_date, last_service, next_service, contract_id, status, notes, data, created_at, updated_at)
    VALUES
      (@id, @org_slug, @type, @customer_name, @address, @brand, @model, @serial_number,
       @install_date, @last_service, @next_service, @contract_id, @status, @notes, @data, @created_at, @updated_at)
  `)
  db.transaction((items) => items.forEach(i => stmt.run(toRow(req.session.orgSlug, i))))(installations)
  res.json({ imported: installations.length })
})

module.exports = router
