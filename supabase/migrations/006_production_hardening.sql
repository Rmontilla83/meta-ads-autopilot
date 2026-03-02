-- Migration 006: Production Hardening - Indexes for performance
-- These indexes optimize the most common query patterns

-- Campaign metrics: time-series queries by campaign
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_date
  ON campaign_metrics(campaign_id, date DESC);

-- Campaigns: listing by user and status
CREATE INDEX IF NOT EXISTS idx_campaigns_user_status
  ON campaigns(user_id, status);

-- Notifications: feed ordered by date
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

-- Notifications: unread count
CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read
  ON notifications(user_id, is_read);

-- Automation rules: active rules per user
CREATE INDEX IF NOT EXISTS idx_automation_rules_user_active
  ON automation_rules(user_id, is_enabled);

-- Rule executions: history by rule
CREATE INDEX IF NOT EXISTS idx_rule_executions_rule_date
  ON rule_executions(rule_id, created_at DESC);

-- Subscriptions: webhook lookups by Stripe IDs
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id
  ON subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id
  ON subscriptions(stripe_customer_id);

-- Meta connections: active connections for cron jobs
CREATE INDEX IF NOT EXISTS idx_meta_connections_active
  ON meta_connections(is_active) WHERE is_active = true;

-- Meta connections: token expiry for refresh cron
CREATE INDEX IF NOT EXISTS idx_meta_connections_token_expires
  ON meta_connections(token_expires_at) WHERE is_active = true;
