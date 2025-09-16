-- Table to track pool token rewards per user per campaign (for history and per-campaign rewards)
CREATE TABLE IF NOT EXISTS user_campaign_rewards (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    campaign_id UUID NOT NULL,
    reward_points DECIMAL(20,2) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    CONSTRAINT user_campaign_unique UNIQUE (user_email, campaign_id)
);
CREATE INDEX IF NOT EXISTS idx_user_campaign_rewards_email ON user_campaign_rewards(user_email);
CREATE INDEX IF NOT EXISTS idx_user_campaign_rewards_campaign ON user_campaign_rewards(campaign_id);

-- Table to track total pool token rewards per user (for "View My Rewards")
CREATE TABLE IF NOT EXISTS user_rewards (
    email VARCHAR(255) PRIMARY KEY,
    reward_points DECIMAL(20,2) NOT NULL DEFAULT 0
);
-- Table to track pool token rewards per user per campaign
CREATE TABLE IF NOT EXISTS user_campaign_rewards (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    campaign_id UUID NOT NULL,
    reward_points DECIMAL(20,2) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    CONSTRAINT user_campaign_unique UNIQUE (user_email, campaign_id)
);
CREATE INDEX IF NOT EXISTS idx_user_campaign_rewards_email ON user_campaign_rewards(user_email);
CREATE INDEX IF NOT EXISTS idx_user_campaign_rewards_campaign ON user_campaign_rewards(campaign_id);
-- User rewards table for tracking reward points
CREATE TABLE IF NOT EXISTS user_rewards (
    email VARCHAR(255) PRIMARY KEY,
    reward_points DECIMAL(20,2) NOT NULL DEFAULT 0
);
-- Crowdfunding Platform Database Schema
-- This schema follows best practices for PostgreSQL database design

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    user_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user'
);

-- Campaigns table for fundraising initiatives
CREATE TABLE IF NOT EXISTS campaigns (
    campaign_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(500),
    goal_amount DECIMAL(15, 2) NOT NULL,
    amount_raised DECIMAL(15, 2) DEFAULT 0,
    creator_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    main_image_url TEXT,
    video_url TEXT,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    country VARCHAR(100),
    city VARCHAR(100),
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    wallet_address VARCHAR(42)
);

-- Drop old donors table if it exists
DROP TABLE IF EXISTS donors CASCADE;

-- New transactions table to log all donations
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    donor_id UUID REFERENCES users(user_id) ON DELETE SET NULL, -- Can be NULL for non-logged-in users
    amount DECIMAL(15, 2) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_anonymous BOOLEAN DEFAULT FALSE,
    -- Fields for non-logged-in donors
    donor_name VARCHAR(100),
    donor_email VARCHAR(255),
    wallet_address VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS rewards (
    reward_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    minimum_pledge DECIMAL(15, 2) NOT NULL,
    estimated_delivery DATE,
    quantity_available INTEGER,
    is_limited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON campaigns(category);
CREATE INDEX IF NOT EXISTS idx_transactions_donor ON transactions(donor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_campaign ON transactions(campaign_id);


-- Sample data insertion
INSERT INTO users (username, email, password_hash, first_name, last_name, is_verified)
SELECT * FROM (
    VALUES
    ('sarahj', 'sarah@example.com', '$2b$10$f/..somehash', 'Sarah', 'Johnson', true),
    ('alexr', 'alex@example.com', '$2b$10$f/..somehash', 'Alex', 'Rivera', true),
    ('communitygt', 'community@example.com', '$2b$10$f/..somehash', 'Community', 'Green Team', true)
) AS v(username, email, password_hash, first_name, last_name, is_verified)
WHERE NOT EXISTS (SELECT 1 FROM users);

-- =============================
-- Staking subsystem (wallets, pools, stakes)
-- =============================

-- Users in staking use email as identifier to interop with main users table
CREATE TABLE IF NOT EXISTS staking_users (
    email VARCHAR(255) PRIMARY KEY
);

-- Available staking pools (simple fixed-APY pools)
CREATE TABLE IF NOT EXISTS pools (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(16) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    apy NUMERIC(6,2) NOT NULL DEFAULT 5.00,
    min_amount NUMERIC(20,8) NOT NULL DEFAULT 0.01000000
);

-- Wallet balances per staking user per pool
CREATE TABLE IF NOT EXISTS wallets (
    user_id VARCHAR(255) NOT NULL,
    pool_id INTEGER NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
    balance NUMERIC(30,8) NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, pool_id)
);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_pool ON wallets(pool_id);

-- Stakes ledger
CREATE TABLE IF NOT EXISTS stakes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    pool_id INTEGER NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
    amount NUMERIC(30,8) NOT NULL,
    period_months INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_stakes_user ON stakes(user_id);
CREATE INDEX IF NOT EXISTS idx_stakes_pool ON stakes(pool_id);

-- Add unlock_at for showing remaining time (safe to run multiple times)
ALTER TABLE stakes ADD COLUMN IF NOT EXISTS unlock_at TIMESTAMP WITH TIME ZONE;

-- Dedicated table to record pool token stakes for auditing and UI
CREATE TABLE IF NOT EXISTS stake_pool_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    pool_id INTEGER NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
    amount NUMERIC(30,8) NOT NULL,
    period_months INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unlock_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'locked'
);
CREATE INDEX IF NOT EXISTS idx_stake_pool_tokens_user ON stake_pool_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_stake_pool_tokens_pool ON stake_pool_tokens(pool_id);

-- Seed default pools if none exist
INSERT INTO pools (symbol, name, apy, min_amount)
SELECT * FROM (
    VALUES
    ('POOL', 'Core Pool Token', 5.00, 0.01000000),
    ('POOLX', 'Growth Pool Token', 12.00, 0.05000000)
) AS v(symbol, name, apy, min_amount)
WHERE NOT EXISTS (SELECT 1 FROM pools);

-- Seed staking users for existing sample users (by email) if they don't exist
INSERT INTO staking_users (email)
SELECT u.email FROM users u
LEFT JOIN staking_users su ON su.email = u.email
WHERE su.email IS NULL;