'use strict'

/**
 * POST /api/migrate
 * Importeert een volledige localStorage state naar SQLite.
 * Gebruik dit eenmalig na de switch naar de backend.
 */

const express = require('express')
const router = express.Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')
const { randomUUID } = require('crypto')

router.post('/', requireAuth, (req, res) => {
  const { state } = req.body
  const orgSlug = req.session.orgSlug

  if (!state || typeof state !== 'object') {
    return res.status(400).json({ error: 'state object verplicht' })
  }

  const counts = { jobs: 0, technicians: 0, events: 0, installations: 0 }

  db.transaction(() => {
    // Zorg dat tenant bestaat
    const hasTenant = db.prepare('SELECT 1 FROM tenants WHERE org_slug = ?').get(orgSlug)
    if (!hasTenant) {
      db.prepare('INSERT INTO tenants (org_slug, company_name) VALUES (?, ?)').run(
        orgSlug, state.settings?.companyName || orgSlug
      )
    }

    // Jobs / tickets
    if (Array.isArray(state.tickets)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO jobs (id, org_slug, title, category, priority, status, customer_name, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const j of state.tickets) {
        const now = new Date().toISOString()
        stmt.run(
          j.id || randomUUID(), orgSlug,
          j.title || j.description || '', j.category || '', j.priority || 'normal', j.status || 'new',
          j.customerName || j.customer?.name || '',
          JSON.stringify(j), j.createdAt || now, now
        )
        counts.jobs++
      }
    }

    // Technicians
    if (Array.isArray(state.technicians)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO technicians (id, org_slug, name, email, skills, active, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
      `)
      for (const t of state.technicians) {
        const now = new Date().toISOString()
        stmt.run(
          t.id || randomUUID(), orgSlug,
          t.name || '', t.email || null, JSON.stringify(t.skills || []),
          JSON.stringify(t), t.createdAt || now, now
        )
        counts.technicians++
      }
    }

    // Calendar events
    if (Array.isArray(state.calendarEvents)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO calendar_events (id, org_slug, job_id, technician_id, title, start, end, locked, color, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const e of state.calendarEvents) {
        const now = new Date().toISOString()
        stmt.run(
          e.id || randomUUID(), orgSlug,
          e.jobId || e.job_id || null, e.technicianId || e.technician_id || null,
          e.title || '', e.start || null, e.end || null,
          e.locked ? 1 : 0, e.color || null,
          JSON.stringify(e), e.createdAt || now, now
        )
        counts.events++
      }
    }

    // Installations
    if (Array.isArray(state.installations)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO installations (id, org_slug, type, customer_name, address, status, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const i of state.installations) {
        const now = new Date().toISOString()
        stmt.run(
          i.id || randomUUID(), orgSlug,
          i.type || '', i.customerName || i.customer_name || '', i.address || '', i.status || 'active',
          JSON.stringify(i), i.createdAt || now, now
        )
        counts.installations++
      }
    }

    // Settings
    if (state.settings && typeof state.settings === 'object') {
      db.prepare('INSERT OR REPLACE INTO settings (org_slug, data) VALUES (?, ?)').run(
        orgSlug, JSON.stringify(state.settings)
      )
    }
  })()

  res.json({ ok: true, imported: counts })
})

module.exports = router
