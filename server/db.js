'use strict'

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const { randomUUID } = require('crypto')

const DATA_DIR = path.join(__dirname, '..', 'data')
const DB_PATH = path.join(DATA_DIR, 'planwise.db')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const db = new Database(DB_PATH)

// WAL mode voor betere concurrency
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    org_slug     TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    plan         TEXT DEFAULT 'starter',
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    org_slug   TEXT NOT NULL REFERENCES tenants(org_slug),
    username   TEXT NOT NULL,
    password   TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'viewer',
    name       TEXT,
    email      TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(org_slug, username)
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id                     TEXT PRIMARY KEY,
    org_slug               TEXT NOT NULL REFERENCES tenants(org_slug),
    title                  TEXT,
    category               TEXT,
    priority               TEXT    DEFAULT 'normal',
    status                 TEXT    DEFAULT 'new',
    customer_name          TEXT,
    assigned_technician_id TEXT,
    data                   TEXT    DEFAULT '{}',
    created_at             TEXT    DEFAULT (datetime('now')),
    updated_at             TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS technicians (
    id         TEXT PRIMARY KEY,
    org_slug   TEXT NOT NULL REFERENCES tenants(org_slug),
    name       TEXT NOT NULL,
    email      TEXT,
    skills     TEXT DEFAULT '[]',
    active     INTEGER DEFAULT 1,
    data       TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id            TEXT PRIMARY KEY,
    org_slug      TEXT NOT NULL REFERENCES tenants(org_slug),
    job_id        TEXT,
    technician_id TEXT,
    title         TEXT,
    start         TEXT,
    end           TEXT,
    locked        INTEGER DEFAULT 0,
    color         TEXT,
    data          TEXT DEFAULT '{}',
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS installations (
    id            TEXT PRIMARY KEY,
    org_slug      TEXT NOT NULL REFERENCES tenants(org_slug),
    type          TEXT,
    customer_name TEXT,
    address       TEXT,
    brand         TEXT,
    model         TEXT,
    serial_number TEXT,
    install_date  TEXT,
    last_service  TEXT,
    next_service  TEXT,
    contract_id   TEXT,
    status        TEXT DEFAULT 'active',
    notes         TEXT,
    data          TEXT DEFAULT '{}',
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id            TEXT PRIMARY KEY,
    org_slug      TEXT NOT NULL REFERENCES tenants(org_slug),
    customer_name TEXT,
    type          TEXT,
    start_date    TEXT,
    end_date      TEXT,
    value         REAL,
    status        TEXT DEFAULT 'active',
    data          TEXT DEFAULT '{}',
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    org_slug   TEXT PRIMARY KEY REFERENCES tenants(org_slug),
    data       TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    org_slug  TEXT NOT NULL,
    action    TEXT NOT NULL,
    entity    TEXT,
    entity_id TEXT,
    username  TEXT,
    timestamp TEXT DEFAULT (datetime('now')),
    data      TEXT
  );

  CREATE TABLE IF NOT EXISTS platform_settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_org          ON jobs(org_slug);
  CREATE INDEX IF NOT EXISTS idx_jobs_status       ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_technicians_org   ON technicians(org_slug);
  CREATE INDEX IF NOT EXISTS idx_events_org        ON calendar_events(org_slug);
  CREATE INDEX IF NOT EXISTS idx_installations_org ON installations(org_slug);
  CREATE INDEX IF NOT EXISTS idx_audit_org         ON audit_log(org_slug);
`)

// Seed: platform tenant + superadmin (eenmalig)
const hasPlatform = db.prepare('SELECT 1 FROM tenants WHERE org_slug = ?').get('PLANWISE_PLATFORM')
if (!hasPlatform) {
  db.prepare('INSERT INTO tenants (org_slug, company_name, plan) VALUES (?, ?, ?)').run(
    'PLANWISE_PLATFORM', 'PlanWise Platform', 'enterprise'
  )
  db.prepare(
    'INSERT INTO users (id, org_slug, username, password, role) VALUES (?, ?, ?, ?, ?)'
  ).run(randomUUID(), 'PLANWISE_PLATFORM', 'superadmin', 'planwise2025!', 'superadmin')
}

module.exports = db
