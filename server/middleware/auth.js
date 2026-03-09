'use strict'

const crypto = require('crypto')

// In-memory sessies — vervang door Redis in productie
const sessions = new Map()

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

function createSession(user) {
  const token = generateToken()
  sessions.set(token, {
    token,
    userId: user.id,
    orgSlug: user.org_slug,
    role: user.role,
    username: user.username,
    expiresAt: Date.now() + 8 * 60 * 60 * 1000 // 8 uur
  })
  return token
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Niet ingelogd' })

  const session = sessions.get(token)
  if (!session) return res.status(401).json({ error: 'Ongeldige sessie' })
  if (session.expiresAt < Date.now()) {
    sessions.delete(token)
    return res.status(401).json({ error: 'Sessie verlopen, log opnieuw in' })
  }

  req.session = session
  next()
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session) return res.status(401).json({ error: 'Niet ingelogd' })
    if (req.session.role === 'superadmin') return next()
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ error: 'Onvoldoende rechten' })
    }
    next()
  }
}

function deleteSession(token) {
  sessions.delete(token)
}

module.exports = { requireAuth, requireRole, createSession, deleteSession }
