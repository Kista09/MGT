-- ══════════════════════════════════════════════════════════════
-- BotFlow — PostgreSQL Schema
-- Run via: psql -U botflow -d botflow -f schema.sql
-- Or auto-applied via docker-compose volume mount
-- ══════════════════════════════════════════════════════════════

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fast text search

-- ── Timestamps trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════
-- CLIENTS (bot company customers)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE clients (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255)  NOT NULL,
    slug          VARCHAR(100)  NOT NULL UNIQUE,   -- e.g. "noon"
    plan          VARCHAR(50)   NOT NULL DEFAULT 'growth'
                  CHECK (plan IN ('growth','scale','enterprise','enterprise_plus')),
    status        VARCHAR(50)   NOT NULL DEFAULT 'trial'
                  CHECK (status IN ('active','trial','churned','suspended')),
    mrr_cents     INTEGER       NOT NULL DEFAULT 0,
    tag           VARCHAR(100),
    whatsapp_number VARCHAR(30),
    meta_business_id VARCHAR(100),
    meta_verified  BOOLEAN       NOT NULL DEFAULT false,
    timezone      VARCHAR(60)   NOT NULL DEFAULT 'Asia/Riyadh',
    locale        VARCHAR(10)   NOT NULL DEFAULT 'en',
    logo_url      TEXT,
    joined_at     DATE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ══════════════════════════════════════════════════════════════
-- USERS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    name            VARCHAR(255)  NOT NULL,
    role            VARCHAR(50)   NOT NULL DEFAULT 'client_viewer'
                    CHECK (role IN ('superadmin','client_admin','client_manager','client_viewer')),
    client_id       UUID          REFERENCES clients(id) ON DELETE SET NULL,
    avatar_url      TEXT,
    notify_escalations BOOLEAN    NOT NULL DEFAULT true,
    notify_reports     BOOLEAN    NOT NULL DEFAULT false,
    notify_errors      BOOLEAN    NOT NULL DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    is_active       BOOLEAN       NOT NULL DEFAULT true,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX users_client_id_idx ON users (client_id);
CREATE INDEX users_email_idx     ON users (email);
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ══════════════════════════════════════════════════════════════
-- REFRESH TOKENS (token rotation)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ  NOT NULL,
    ip_address  INET,
    user_agent  TEXT,
    revoked     BOOLEAN      NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_token_hash_idx ON refresh_tokens (token_hash);

-- ══════════════════════════════════════════════════════════════
-- BOTS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE bots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id   UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    bot_type    VARCHAR(50)  NOT NULL DEFAULT 'support'
                CHECK (bot_type IN ('support','ops','marketing','sales')),
    language    VARCHAR(20)  NOT NULL DEFAULT 'en',
    status      VARCHAR(30)  NOT NULL DEFAULT 'offline'
                CHECK (status IN ('online','offline','warning','trial')),
    welcome_msg TEXT,
    fallback_msg TEXT,
    tone        VARCHAR(50)  NOT NULL DEFAULT 'friendly',
    typing_delay_ms INTEGER  NOT NULL DEFAULT 1500,
    auto_close_hours INTEGER NOT NULL DEFAULT 24,
    messages_today INTEGER   NOT NULL DEFAULT 0,
    uptime_pct  NUMERIC(5,2) NOT NULL DEFAULT 100.0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX bots_client_id_idx ON bots (client_id);
CREATE TRIGGER bots_updated_at BEFORE UPDATE ON bots
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ══════════════════════════════════════════════════════════════
-- QA RESPONSES
-- ══════════════════════════════════════════════════════════════
CREATE TABLE qa_responses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id   UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    bot_id      UUID         REFERENCES bots(id) ON DELETE SET NULL,
    category    VARCHAR(100) NOT NULL,
    question    TEXT         NOT NULL,
    answer      TEXT         NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT true,
    match_count INTEGER      NOT NULL DEFAULT 0,  -- how often this was triggered
    created_by  UUID         REFERENCES users(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX qa_client_id_idx ON qa_responses (client_id);
CREATE INDEX qa_category_idx  ON qa_responses (client_id, category);
-- Full-text search
CREATE INDEX qa_question_fts ON qa_responses USING gin(to_tsvector('english', question));
CREATE TRIGGER qa_updated_at BEFORE UPDATE ON qa_responses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ══════════════════════════════════════════════════════════════
-- FLOW NODES
-- ══════════════════════════════════════════════════════════════
CREATE TABLE flow_nodes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id   UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    bot_id      UUID         REFERENCES bots(id) ON DELETE CASCADE,
    node_key    VARCHAR(100) NOT NULL,  -- e.g. "start", "menu", "track"
    node_type   VARCHAR(50)  NOT NULL
                CHECK (node_type IN ('start','message','menu','condition','action','end')),
    label       VARCHAR(255) NOT NULL,
    content     TEXT,
    pos_x       INTEGER      NOT NULL DEFAULT 0,
    pos_y       INTEGER      NOT NULL DEFAULT 0,
    outputs     TEXT[]       NOT NULL DEFAULT '{}',  -- array of node_keys
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, bot_id, node_key)
);
CREATE INDEX flow_nodes_client_bot_idx ON flow_nodes (client_id, bot_id);

-- ══════════════════════════════════════════════════════════════
-- CALENDAR / BUSINESS HOURS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE business_hours (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id   UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    day_of_week SMALLINT     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun
    is_open     BOOLEAN      NOT NULL DEFAULT true,
    open_time   TIME,
    close_time  TIME,
    UNIQUE (client_id, day_of_week)
);

CREATE TABLE calendar_overrides (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id   UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    override_date DATE        NOT NULL,
    override_type VARCHAR(30) NOT NULL CHECK (override_type IN ('holiday','special','normal')),
    note        TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, override_date)
);

-- ══════════════════════════════════════════════════════════════
-- CONTACTS (subscribers who interact with bot)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    phone           VARCHAR(30)  NOT NULL,
    name            VARCHAR(255),
    country_code    CHAR(2),
    opt_in          BOOLEAN      NOT NULL DEFAULT true,
    opt_in_at       TIMESTAMPTZ,
    opt_out_at      TIMESTAMPTZ,
    tags            TEXT[]       NOT NULL DEFAULT '{}',
    conversation_count INTEGER   NOT NULL DEFAULT 0,
    last_seen_at    TIMESTAMPTZ,
    blocked         BOOLEAN      NOT NULL DEFAULT false,
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, phone)
);
CREATE INDEX contacts_client_id_idx   ON contacts (client_id);
CREATE INDEX contacts_phone_idx       ON contacts (client_id, phone);
CREATE INDEX contacts_opt_in_idx      ON contacts (client_id, opt_in);
CREATE INDEX contacts_tags_idx        ON contacts USING gin (tags);
CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ══════════════════════════════════════════════════════════════
-- CONVERSATIONS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    bot_id          UUID         REFERENCES bots(id),
    contact_id      UUID         NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    assigned_agent  UUID         REFERENCES users(id),
    status          VARCHAR(30)  NOT NULL DEFAULT 'bot'
                    CHECK (status IN ('bot','escalated','resolved','closed')),
    escalation_reason TEXT,
    resolved_at     TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX conversations_client_id_idx  ON conversations (client_id);
CREATE INDEX conversations_contact_id_idx ON conversations (contact_id);
CREATE INDEX conversations_status_idx     ON conversations (client_id, status);
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ══════════════════════════════════════════════════════════════
-- MESSAGES
-- ══════════════════════════════════════════════════════════════
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID         NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type     VARCHAR(20)  NOT NULL CHECK (sender_type IN ('customer','bot','agent')),
    sender_id       UUID,        -- user ID if agent
    content         TEXT         NOT NULL,
    whatsapp_msg_id VARCHAR(255),
    status          VARCHAR(20)  NOT NULL DEFAULT 'sent'
                    CHECK (status IN ('sent','delivered','read','failed')),
    sent_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX messages_conversation_id_idx ON messages (conversation_id);
CREATE INDEX messages_sent_at_idx         ON messages (sent_at);

-- ══════════════════════════════════════════════════════════════
-- TEMPLATES
-- ══════════════════════════════════════════════════════════════
CREATE TABLE templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(50)  NOT NULL CHECK (category IN ('UTILITY','MARKETING','AUTHENTICATION')),
    language        VARCHAR(10)  NOT NULL DEFAULT 'en',
    body            TEXT         NOT NULL,
    variables       TEXT[]       NOT NULL DEFAULT '{}',
    meta_status     VARCHAR(30)  NOT NULL DEFAULT 'PENDING'
                    CHECK (meta_status IN ('PENDING','APPROVED','REJECTED','PAUSED')),
    meta_template_id VARCHAR(255),
    rejection_reason TEXT,
    total_sends     INTEGER      NOT NULL DEFAULT 0,
    submitted_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX templates_client_id_idx ON templates (client_id);
CREATE TRIGGER templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ══════════════════════════════════════════════════════════════
-- BROADCASTS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE broadcasts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    template_id     UUID         NOT NULL REFERENCES templates(id),
    name            VARCHAR(255) NOT NULL,
    segment         VARCHAR(255) NOT NULL DEFAULT 'all',
    status          VARCHAR(30)  NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','scheduled','sending','sent','failed','cancelled')),
    scheduled_at    TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    total_sent      INTEGER      NOT NULL DEFAULT 0,
    total_delivered INTEGER      NOT NULL DEFAULT 0,
    total_read      INTEGER      NOT NULL DEFAULT 0,
    total_failed    INTEGER      NOT NULL DEFAULT 0,
    created_by      UUID         REFERENCES users(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX broadcasts_client_id_idx ON broadcasts (client_id);
CREATE TRIGGER broadcasts_updated_at BEFORE UPDATE ON broadcasts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ══════════════════════════════════════════════════════════════
-- AUDIT LOG
-- ══════════════════════════════════════════════════════════════
CREATE TABLE audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
    client_id   UUID         REFERENCES clients(id) ON DELETE CASCADE,
    action      VARCHAR(100) NOT NULL,  -- e.g. "qa.create", "bot.settings.update"
    entity_type VARCHAR(50),
    entity_id   UUID,
    diff        JSONB,
    ip_address  INET,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX audit_log_user_id_idx   ON audit_log (user_id);
CREATE INDEX audit_log_client_id_idx ON audit_log (client_id);
CREATE INDEX audit_log_action_idx    ON audit_log (action);
CREATE INDEX audit_log_created_at_idx ON audit_log (created_at DESC);

-- ══════════════════════════════════════════════════════════════
-- SEED — default data
-- ══════════════════════════════════════════════════════════════

-- Clients
INSERT INTO clients (id, name, slug, plan, status, mrr_cents, tag, timezone, joined_at)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'Noon.com',        'noon',   'enterprise', 'active', 420000, 'E-Commerce', 'Asia/Riyadh', '2023-08-01'),
  ('11111111-0000-0000-0000-000000000002', 'Careem',          'careem', 'enterprise', 'active', 510000, 'Transport',  'Asia/Dubai',  '2023-02-01'),
  ('11111111-0000-0000-0000-000000000003', 'Jarir Bookstore', 'jarir',  'growth',     'trial',  0,      'Retail',     'Asia/Riyadh', '2025-01-01');

-- Users (passwords are bcrypt hash of "demo123")
-- Hash generated with: bcrypt.hashSync("demo123", 12)
INSERT INTO users (id, email, password_hash, name, role, client_id)
VALUES
  ('22222222-0000-0000-0000-000000000001',
   'admin@mgucatech.com',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J4cFE8mGq',
   'MgucaTECH Admin', 'superadmin', NULL),
  ('22222222-0000-0000-0000-000000000002',
   'dina@noon.com',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J4cFE8mGq',
   'Dina Khalil', 'client_admin', '11111111-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000003',
   'omar@noon.com',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J4cFE8mGq',
   'Omar Al-Rashid', 'client_manager', '11111111-0000-0000-0000-000000000001');

-- Default business hours for Noon.com (Sun-Thu open, Fri-Sat closed)
INSERT INTO business_hours (client_id, day_of_week, is_open, open_time, close_time)
SELECT '11111111-0000-0000-0000-000000000001', d,
       d NOT IN (0, 6),  -- 0=Sun closed, 6=Sat closed
       '09:00'::time, '18:00'::time
FROM generate_series(0, 6) d;

-- Sample Q&A
INSERT INTO qa_responses (client_id, category, question, answer, is_active)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'Orders',  'How do I track my order?',        'Reply with your order number and we''ll send real-time tracking info.', true),
  ('11111111-0000-0000-0000-000000000001', 'Returns', 'What is your return policy?',     'Returns accepted within 30 days. Items must be unused and in original packaging.', true),
  ('11111111-0000-0000-0000-000000000001', 'Support', 'How do I speak to a human agent?','Reply AGENT at any time to connect to a live representative.', true);
