-- Credit System: user balances, transaction logs, and atomic operations

-- User credit balances (materialized, one row per user)
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    total_earned BIGINT NOT NULL DEFAULT 0,
    total_spent BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_credits_balance_desc ON user_credits (balance DESC);

CREATE TRIGGER set_user_credits_updated_at
    BEFORE UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Credit transaction log (append-only audit trail)
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'spend', 'bonus', 'adjustment')),
    source VARCHAR(50) NOT NULL,
    source_detail JSONB DEFAULT '{}'::jsonb,
    agent_id UUID REFERENCES user_claim_tokens(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_transactions_user_created
    ON credit_transactions (user_id, created_at DESC);

-- Atomic earn credit function
CREATE OR REPLACE FUNCTION earn_credit(
    p_user_id UUID,
    p_amount INTEGER,
    p_source VARCHAR(50),
    p_source_detail JSONB DEFAULT '{}'::jsonb,
    p_agent_id UUID DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    v_new_balance BIGINT;
BEGIN
    INSERT INTO user_credits (user_id, balance, total_earned)
    VALUES (p_user_id, p_amount, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET
        balance = user_credits.balance + p_amount,
        total_earned = user_credits.total_earned + p_amount,
        updated_at = now()
    RETURNING balance INTO v_new_balance;

    INSERT INTO credit_transactions (user_id, amount, type, source, source_detail, agent_id)
    VALUES (p_user_id, p_amount, 'earn', p_source, p_source_detail, p_agent_id);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic grant bonus credit function
CREATE OR REPLACE FUNCTION grant_bonus_credit(
    p_user_id UUID,
    p_amount INTEGER,
    p_source VARCHAR(50),
    p_source_detail JSONB DEFAULT '{}'::jsonb,
    p_agent_id UUID DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    v_new_balance BIGINT;
BEGIN
    INSERT INTO user_credits (user_id, balance, total_earned)
    VALUES (p_user_id, p_amount, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET
        balance = user_credits.balance + p_amount,
        total_earned = user_credits.total_earned + p_amount,
        updated_at = now()
    RETURNING balance INTO v_new_balance;

    INSERT INTO credit_transactions (user_id, amount, type, source, source_detail, agent_id)
    VALUES (p_user_id, p_amount, 'bonus', p_source, p_source_detail, p_agent_id);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic spend credit function (with balance check + row lock)
CREATE OR REPLACE FUNCTION spend_credit(
    p_user_id UUID,
    p_amount INTEGER,
    p_source VARCHAR(50),
    p_source_detail JSONB DEFAULT '{}'::jsonb,
    p_agent_id UUID DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    v_current BIGINT;
    v_new_balance BIGINT;
BEGIN
    SELECT balance INTO v_current
    FROM user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No credit record for user %', p_user_id;
    END IF;

    IF v_current < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance: have %, need %', v_current, p_amount;
    END IF;

    UPDATE user_credits SET
        balance = balance - p_amount,
        total_spent = total_spent + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;

    INSERT INTO credit_transactions (user_id, amount, type, source, source_detail, agent_id)
    VALUES (p_user_id, p_amount, 'spend', p_source, p_source_detail, p_agent_id);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- user_credits: public read (for leaderboard), service_role write
CREATE POLICY "user_credits_public_read"
    ON user_credits FOR SELECT
    USING (true);

CREATE POLICY "user_credits_service_all"
    ON user_credits FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- credit_transactions: users read own records, service_role write
CREATE POLICY "credit_transactions_own_read"
    ON credit_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "credit_transactions_service_all"
    ON credit_transactions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
