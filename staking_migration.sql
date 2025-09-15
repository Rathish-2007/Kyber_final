-- Separate staking users table
CREATE TABLE IF NOT EXISTS staking_users (
    email VARCHAR(255) PRIMARY KEY,
    wallet_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Staking tables for pool tokens only
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    email VARCHAR(255) PRIMARY KEY,
    wallet_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    apy NUMERIC(5,2) NOT NULL,
    min_amount NUMERIC(38,18) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES staking_users(email),
    pool_id UUID REFERENCES pools(id),
    balance NUMERIC(38,18) NOT NULL
);

CREATE TABLE IF NOT EXISTS stakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    pool_id UUID REFERENCES pools(id),
    amount NUMERIC(38,18) NOT NULL,
    apy NUMERIC(5,2) NOT NULL,
    start_ts TIMESTAMP WITH TIME ZONE NOT NULL,
    end_ts TIMESTAMP WITH TIME ZONE NOT NULL,
    withdrawn BOOLEAN DEFAULT FALSE,
    withdrawn_ts TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    type TEXT,
    amount NUMERIC(38,18),
    pool_id UUID REFERENCES pools(id),
    meta JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stakes_user_id ON stakes(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_pools_symbol ON pools(symbol);

INSERT INTO staking_users (email, wallet_address) VALUES ('sarah@example.com', '0xuserwallet') ON CONFLICT DO NOTHING;
INSERT INTO pools (id, symbol, name, apy, min_amount) VALUES ('22222222-2222-2222-2222-222222222222', 'POOL', 'Pool Token', 5.00, 10.0) ON CONFLICT DO NOTHING;
INSERT INTO wallets (id, user_id, pool_id, balance) VALUES ('33333333-3333-3333-3333-333333333333', 'sarah@example.com', '22222222-2222-2222-2222-222222222222', 1000.0) ON CONFLICT DO NOTHING;
