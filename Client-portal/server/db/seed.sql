-- ══════════════════════════════════════════════════════════════
-- BotFlow — Seed Data
-- Run via: psql $DATABASE_URL -f server/db/seed.sql
-- ══════════════════════════════════════════════════════════════

-- Clients
INSERT INTO clients (id, name, slug, plan, status, mrr_cents, tag, timezone, joined_at)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'Noon.com',        'noon',   'enterprise', 'active', 420000, 'E-Commerce', 'Asia/Riyadh', '2023-08-01'),
  ('11111111-0000-0000-0000-000000000002', 'Careem',          'careem', 'enterprise', 'active', 510000, 'Transport',  'Asia/Dubai',  '2023-02-01'),
  ('11111111-0000-0000-0000-000000000003', 'Jarir Bookstore', 'jarir',  'growth',     'trial',  0,      'Retail',     'Asia/Riyadh', '2025-01-01')
ON CONFLICT (slug) DO NOTHING;

-- Users (passwords are bcrypt hash of "demo123", 12 rounds)
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
   'Omar Al-Rashid', 'client_manager', '11111111-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;

-- Default business hours for Noon.com (Sun-Thu open, Fri-Sat closed)
INSERT INTO business_hours (client_id, day_of_week, is_open, open_time, close_time)
SELECT '11111111-0000-0000-0000-000000000001', d,
       d NOT IN (0, 6),
       '09:00'::time, '18:00'::time
FROM generate_series(0, 6) d
ON CONFLICT (client_id, day_of_week) DO NOTHING;

-- Sample Q&A
INSERT INTO qa_responses (client_id, category, question, answer, is_active)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'Orders',  'How do I track my order?',
   'Reply with your order number and we''ll send real-time tracking info.', true),
  ('11111111-0000-0000-0000-000000000001', 'Returns', 'What is your return policy?',
   'Returns accepted within 30 days. Items must be unused and in original packaging.', true),
  ('11111111-0000-0000-0000-000000000001', 'Support', 'How do I speak to a human agent?',
   'Reply AGENT at any time to connect to a live representative.', true);
