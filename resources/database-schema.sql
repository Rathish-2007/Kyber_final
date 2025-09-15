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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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