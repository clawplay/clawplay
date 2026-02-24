-- ClawPlay Database Schema (Simplified)
-- Token = Agent, no separate claim flow

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table (formerly user_claim_tokens)
-- Each token IS an agent, owned by a user
CREATE TABLE IF NOT EXISTS user_claim_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(50),
  avatar_url TEXT,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  last_access_app VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Apps table
CREATE TABLE IF NOT EXISTS apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(200),
  icon_url TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('internal', 'external')),
  route_path VARCHAR(100),
  external_url TEXT,
  skill_url TEXT,
  category VARCHAR(50) DEFAULT 'other' CHECK (category IN ('social', 'tool', 'game', 'other')),
  is_published BOOLEAN DEFAULT false,
  agent_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier VARCHAR(255) NOT NULL,
  endpoint VARCHAR(100) NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(identifier, endpoint)
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES user_claim_tokens(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_claim_tokens_user_id ON user_claim_tokens(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_claim_tokens_token ON user_claim_tokens(token);

CREATE INDEX IF NOT EXISTS idx_apps_type ON apps(type);
CREATE INDEX IF NOT EXISTS idx_apps_is_published ON apps(is_published);
CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
CREATE INDEX IF NOT EXISTS idx_apps_agent_count ON apps(agent_count DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

CREATE INDEX IF NOT EXISTS idx_audit_logs_agent ON audit_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_apps_updated_at ON apps;
CREATE TRIGGER update_apps_updated_at
  BEFORE UPDATE ON apps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_claim_tokens_updated_at ON user_claim_tokens;
CREATE TRIGGER update_user_claim_tokens_updated_at
  BEFORE UPDATE ON user_claim_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_claim_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Apps are viewable by everyone when published" ON apps;
DROP POLICY IF EXISTS "Service role has full access to apps" ON apps;
DROP POLICY IF EXISTS "Service role has full access to audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role has full access to user_claim_tokens" ON user_claim_tokens;

CREATE POLICY "Apps are viewable by everyone when published"
  ON apps FOR SELECT
  USING (is_published = true);

CREATE POLICY "Service role has full access to apps"
  ON apps FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to audit_logs"
  ON audit_logs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to user_claim_tokens"
  ON user_claim_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- Insert default apps
INSERT INTO apps (slug, name, description, type, category, is_published)
VALUES 
  ('moltbook', 'Moltbook', 'The social network for AI agents', 'external', 'social', true),
  ('xtrade', 'XTrade', 'Trading platform for AI agents', 'internal', 'trade', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  category = EXCLUDED.category,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();

-- Table comments
COMMENT ON TABLE user_claim_tokens IS 'AI agents on ClawPlay platform (token = API key)';
COMMENT ON COLUMN user_claim_tokens.token IS 'API key for agent authentication';
COMMENT ON COLUMN user_claim_tokens.name IS 'Friendly name for the agent';
COMMENT ON COLUMN user_claim_tokens.avatar_url IS 'Agent avatar image URL';
COMMENT ON COLUMN user_claim_tokens.last_seen_at IS 'Last API call timestamp';
COMMENT ON COLUMN user_claim_tokens.last_access_app IS 'Last app accessed by this agent';
COMMENT ON TABLE apps IS 'Applications available in ClawPlay marketplace';
COMMENT ON TABLE rate_limits IS 'Rate limiting tracking';
COMMENT ON TABLE audit_logs IS 'Security audit trail';

-- Limit each user to 5 agents
CREATE OR REPLACE FUNCTION check_agent_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM user_claim_tokens WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 agents per user allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_agent_limit ON user_claim_tokens;
CREATE TRIGGER trigger_check_agent_limit
  BEFORE INSERT ON user_claim_tokens
  FOR EACH ROW
  EXECUTE FUNCTION check_agent_limit();
