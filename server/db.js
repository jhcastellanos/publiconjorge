const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "membership.sqlite");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS terms_acceptances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    business_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    terms_version TEXT NOT NULL,
    accepted_at TEXT NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_checkout_session_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    contact_name TEXT,
    business_name TEXT,
    phone TEXT,
    plan_id TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    status TEXT,
    current_period_end TEXT,
    cancel_at_period_end INTEGER DEFAULT 0,
    terms_version TEXT,
    terms_accepted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS access_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    processed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    to_email TEXT NOT NULL,
    template TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_acceptances_email ON terms_acceptances(email);
  CREATE INDEX IF NOT EXISTS idx_memberships_email ON memberships(email);
  CREATE INDEX IF NOT EXISTS idx_memberships_customer ON memberships(stripe_customer_id);
  CREATE INDEX IF NOT EXISTS idx_tokens_email ON access_tokens(email);
  CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(token_hash);
`);

function now() {
  return new Date().toISOString();
}

function insertTermsAcceptance(data) {
  const createdAt = now();
  const result = db
    .prepare(
      `INSERT INTO terms_acceptances (
        email, contact_name, business_name, phone, plan_id,
        terms_version, accepted_at, stripe_checkout_session_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.email,
      data.contactName,
      data.businessName,
      data.phone,
      data.planId,
      data.termsVersion,
      data.acceptedAt,
      data.checkoutSessionId || null,
      createdAt,
    );
  return result.lastInsertRowid;
}

function updateAcceptanceStripe(id, fields) {
  db.prepare(
    `UPDATE terms_acceptances
     SET stripe_customer_id = COALESCE(?, stripe_customer_id),
         stripe_subscription_id = COALESCE(?, stripe_subscription_id),
         stripe_checkout_session_id = COALESCE(?, stripe_checkout_session_id)
     WHERE id = ?`,
  ).run(fields.customerId || null, fields.subscriptionId || null, fields.sessionId || null, id);
}

function findAcceptanceById(id) {
  return db.prepare("SELECT * FROM terms_acceptances WHERE id = ?").get(id);
}

function upsertMembership(data) {
  const updatedAt = now();
  const existing = data.subscriptionId
    ? db.prepare("SELECT * FROM memberships WHERE stripe_subscription_id = ?").get(data.subscriptionId)
    : null;

  if (existing) {
    db.prepare(
      `UPDATE memberships SET
        email = ?, contact_name = COALESCE(?, contact_name),
        business_name = COALESCE(?, business_name), phone = COALESCE(?, phone),
        plan_id = COALESCE(?, plan_id), stripe_customer_id = ?,
        status = ?, current_period_end = ?, cancel_at_period_end = ?,
        terms_version = COALESCE(?, terms_version),
        terms_accepted_at = COALESCE(?, terms_accepted_at),
        updated_at = ?
       WHERE id = ?`,
    ).run(
      data.email,
      data.contactName || null,
      data.businessName || null,
      data.phone || null,
      data.planId || null,
      data.customerId || null,
      data.status || null,
      data.currentPeriodEnd || null,
      data.cancelAtPeriodEnd ? 1 : 0,
      data.termsVersion || null,
      data.termsAcceptedAt || null,
      updatedAt,
      existing.id,
    );
    return existing.id;
  }

  const result = db
    .prepare(
      `INSERT INTO memberships (
        email, contact_name, business_name, phone, plan_id,
        stripe_customer_id, stripe_subscription_id, status,
        current_period_end, cancel_at_period_end, terms_version,
        terms_accepted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.email,
      data.contactName || null,
      data.businessName || null,
      data.phone || null,
      data.planId || null,
      data.customerId || null,
      data.subscriptionId || null,
      data.status || null,
      data.currentPeriodEnd || null,
      data.cancelAtPeriodEnd ? 1 : 0,
      data.termsVersion || null,
      data.termsAcceptedAt || null,
      updatedAt,
      updatedAt,
    );
  return result.lastInsertRowid;
}

function createAccessToken({ email, tokenHash, expiresAt }) {
  db.prepare(
    `INSERT INTO access_tokens (email, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run(email, tokenHash, expiresAt, now());
}

function findAccessToken(tokenHash) {
  return db.prepare("SELECT * FROM access_tokens WHERE token_hash = ?").get(tokenHash);
}

function markAccessTokenUsed(id) {
  db.prepare("UPDATE access_tokens SET used_at = ? WHERE id = ?").run(now(), id);
}

function createSession({ tokenHash, email, customerId, expiresAt }) {
  db.prepare(
    `INSERT INTO sessions (token_hash, email, stripe_customer_id, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(tokenHash, email, customerId, expiresAt, now());
}

function findSession(tokenHash) {
  return db.prepare("SELECT * FROM sessions WHERE token_hash = ?").get(tokenHash);
}

function deleteSession(tokenHash) {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

function hasProcessedEvent(id) {
  return Boolean(db.prepare("SELECT id FROM webhook_events WHERE id = ?").get(id));
}

function markEventProcessed(id, type) {
  db.prepare("INSERT OR IGNORE INTO webhook_events (id, type, processed_at) VALUES (?, ?, ?)").run(
    id,
    type,
    now(),
  );
}

function queueEmail({ to, template, payload, status = "pending" }) {
  const createdAt = now();
  const result = db
    .prepare(
      `INSERT INTO email_outbox (to_email, template, payload, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(to, template, JSON.stringify(payload), status, createdAt, createdAt);
  return result.lastInsertRowid;
}

function updateEmailStatus(id, status) {
  db.prepare("UPDATE email_outbox SET status = ?, updated_at = ? WHERE id = ?").run(status, now(), id);
}

module.exports = {
  db,
  insertTermsAcceptance,
  updateAcceptanceStripe,
  findAcceptanceById,
  upsertMembership,
  createAccessToken,
  findAccessToken,
  markAccessTokenUsed,
  createSession,
  findSession,
  deleteSession,
  hasProcessedEvent,
  markEventProcessed,
  queueEmail,
  updateEmailStatus,
};
