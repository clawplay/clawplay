-- Migration: Hash all stored tokens (agent, developer, identity) with SHA-256
-- Adds token_prefix column for display, converts plaintext tokens to hashes.
-- Requires pgcrypto extension.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. user_claim_tokens (agent tokens)
ALTER TABLE user_claim_tokens ADD COLUMN IF NOT EXISTS token_prefix VARCHAR(24);

-- Populate prefix from current plaintext values (only for unhashed rows)
UPDATE user_claim_tokens
SET token_prefix = LEFT(token, 20)
WHERE token LIKE 'clawplay_%';

-- Hash existing plaintext tokens in-place
UPDATE user_claim_tokens
SET token = encode(digest(token, 'sha256'), 'hex')
WHERE token LIKE 'clawplay_%';

-- 2. developer_tokens
ALTER TABLE developer_tokens ADD COLUMN IF NOT EXISTS token_prefix VARCHAR(24);

UPDATE developer_tokens
SET token_prefix = LEFT(token, 20)
WHERE token LIKE 'clawplay_dev_%';

UPDATE developer_tokens
SET token = encode(digest(token, 'sha256'), 'hex')
WHERE token LIKE 'clawplay_dev_%';

-- 3. agent_identity_tokens
ALTER TABLE agent_identity_tokens ADD COLUMN IF NOT EXISTS token_prefix VARCHAR(24);

UPDATE agent_identity_tokens
SET token_prefix = LEFT(token, 20)
WHERE token LIKE 'clawplay_id_%';

UPDATE agent_identity_tokens
SET token = encode(digest(token, 'sha256'), 'hex')
WHERE token LIKE 'clawplay_id_%';
