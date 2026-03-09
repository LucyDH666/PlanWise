'use strict'

const express = require('express')
const router = express.Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

// GET /api/kpis
router.get('/', requireAuth, (req, res) => {
  const org = req.session.orgSlug

  const total      = db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE org_slug = ?").get(org).n
  const completed  = db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE org_slug = ? AND status = 'completed'").get(org).n
  const planned    = db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE org_slug = ? AND status = 'planned'").get(org).n
  const inProgress = db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE org_slug = ? AND status = 'in_progress'").get(org).n
  const technicians = db.prepare("SELECT COUNT(*) AS n FROM technicians WHERE org_slug = ? AND active = 1").get(org).n
  const installations = db.prepare("SELECT COUNT(*) AS n FROM installations WHERE org_slug = ?").get(org).n

  res.json({
    totalTickets: total,
    completedTickets: completed,
    plannedTickets: planned,
    inProgressTickets: inProgress,
    activeTechnicians: technicians,
    totalInstallations: installations,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
  })
})

module.exports = router
