-- Staking Platform Schema Migration
-- Users
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tokens
CREATE TABLE IF NOT EXISTS tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT,
    contract_address TEXT,
    decimals INT
);

-- Pools
CREATE TABLE IF NOT EXISTS pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id UUID REFERENCES tokens(id),
    name TEXT,
    apy NUMERIC(5,2),
    min_amount NUMERIC(38,18),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id TEXT UNIQUE,
    name TEXT,
    pool_id UUID REFERENCES pools(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    token_id UUID REFERENCES tokens(id),
    balance NUMERIC(38,18)
);

-- Stakes
CREATE TABLE IF NOT EXISTS stakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    pool_id UUID REFERENCES pools(id),
    campaign_id UUID REFERENCES campaigns(id),
    token_id UUID REFERENCES tokens(id),
    amount NUMERIC(38,18),
    apy NUMERIC(5,2),
    start_ts TIMESTAMP WITH TIME ZONE,
    end_ts TIMESTAMP WITH TIME ZONE,
    withdrawn BOOLEAN DEFAULT FALSE,
    withdrawn_ts TIMESTAMP WITH TIME ZONE
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    type TEXT,
    amount NUMERIC(38,18),
    token_id UUID REFERENCES tokens(id),
    meta JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stakes_user_id ON stakes(user_id);
CREATE INDEX IF NOT EXISTS idx_pools_token_id ON pools(token_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_id ON campaigns(campaign_id);

-- Seed Data
INSERT INTO tokens (id, symbol, contract_address, decimals) VALUES
    ('11111111-1111-1111-1111-111111111111', 'POOL', '0xpooltoken', 18)
ON CONFLICT DO NOTHING;

INSERT INTO users (id, wallet_address) VALUES
    ('22222222-2222-2222-2222-222222222222', '0xuserwallet')
ON CONFLICT DO NOTHING;

INSERT INTO pools (id, token_id, name, apy, min_amount) VALUES
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Main Pool', 5.00, 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO campaigns (id, campaign_id, name, pool_id) VALUES
    ('44444444-4444-4444-4444-444444444444', 'CAMP-001', 'Sample Campaign', '33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

INSERT INTO wallets (id, user_id, token_id, balance) VALUES
    ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 1000.0)
ON CONFLICT DO NOTHING;
