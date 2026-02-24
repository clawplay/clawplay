-- Developer Platform Schema
-- Enables third-party developers to create apps for ClawPlay agents

-- Developer tokens table (one per user)
CREATE TABLE IF NOT EXISTS developer_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Developer apps table
CREATE TABLE IF NOT EXISTS developer_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  developer_id UUID NOT NULL REFERENCES developer_tokens(id) ON DELETE CASCADE,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(200),
  icon_url TEXT,
  skill_url TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'other' CHECK (category IN ('social', 'tool', 'game', 'other')),
  is_published BOOLEAN DEFAULT false,
  agent_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent identity tokens table (short-lived tokens for identity verification)
CREATE TABLE IF NOT EXISTS agent_identity_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES user_claim_tokens(id) ON DELETE CASCADE,
  token VARCHAR(96) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_developer_tokens_user_id ON developer_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_developer_tokens_token ON developer_tokens(token);

CREATE INDEX IF NOT EXISTS idx_developer_apps_developer_id ON developer_apps(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_apps_slug ON developer_apps(slug);
CREATE INDEX IF NOT EXISTS idx_developer_apps_is_published ON developer_apps(is_published);
CREATE INDEX IF NOT EXISTS idx_developer_apps_category ON developer_apps(category);

CREATE INDEX IF NOT EXISTS idx_agent_identity_tokens_agent_id ON agent_identity_tokens(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_identity_tokens_token ON agent_identity_tokens(token);
CREATE INDEX IF NOT EXISTS idx_agent_identity_tokens_expires_at ON agent_identity_tokens(expires_at);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_developer_tokens_updated_at ON developer_tokens;
CREATE TRIGGER update_developer_tokens_updated_at
  BEFORE UPDATE ON developer_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_developer_apps_updated_at ON developer_apps;
CREATE TRIGGER update_developer_apps_updated_at
  BEFORE UPDATE ON developer_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE developer_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_identity_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Service role has full access to developer_tokens" ON developer_tokens;
CREATE POLICY "Service role has full access to developer_tokens"
  ON developer_tokens FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role has full access to developer_apps" ON developer_apps;
CREATE POLICY "Service role has full access to developer_apps"
  ON developer_apps FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Published developer apps are viewable by everyone" ON developer_apps;
CREATE POLICY "Published developer apps are viewable by everyone"
  ON developer_apps FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "Service role has full access to agent_identity_tokens" ON agent_identity_tokens;
CREATE POLICY "Service role has full access to agent_identity_tokens"
  ON agent_identity_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- Table comments
COMMENT ON TABLE developer_tokens IS 'API tokens for third-party developers';
COMMENT ON COLUMN developer_tokens.token IS 'Developer API key (clawplay_dev_xxx format)';
COMMENT ON COLUMN developer_tokens.name IS 'Optional developer/organization name';

COMMENT ON TABLE developer_apps IS 'Applications created by third-party developers';
COMMENT ON COLUMN developer_apps.skill_url IS 'URL to the app skill.md file (required)';
COMMENT ON COLUMN developer_apps.agent_count IS 'Number of agents using this app';

COMMENT ON TABLE agent_identity_tokens IS 'Short-lived tokens for agent identity verification';
COMMENT ON COLUMN agent_identity_tokens.token IS 'Identity token (clawplay_id_xxx format)';
COMMENT ON COLUMN agent_identity_tokens.expires_at IS 'Token expiration time (5 minutes from creation)';
COMMENT ON COLUMN agent_identity_tokens.used_at IS 'When the token was verified (one-time use)';

-- Function to clean up expired identity tokens (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_identity_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM agent_identity_tokens
  WHERE expires_at < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_identity_tokens IS 'Removes expired identity tokens older than 1 hour';
