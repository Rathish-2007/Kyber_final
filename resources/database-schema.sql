-- Crowdfunding Platform Database Schema
-- This schema follows best practices for PostgreSQL database design

-- Enable UUID extension for unique identifiers
DROP EXTENSION IF EXISTS "uuid-ossp"; 
CREATE EXTENSION "uuid-ossp";

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

DROP TABLE IF EXISTS donors CASCADE;
CREATE TABLE donors (
    donor_id SERIAL PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    wallet VARCHAR(100) NOT NULL,
    donated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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


-- Rewards table for campaign incentive tiers



-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON campaigns(category);


-- Sample data insertion

-- Insert sample users only if table is empty
INSERT INTO users (username, email, password_hash, first_name, last_name, is_verified)
SELECT * FROM (
    VALUES
    ('sarahj', 'sarah@example.com', 'hashed_password_1', 'Sarah', 'Johnson', true),
    ('alexr', 'alex@example.com', 'hashed_password_2', 'Alex', 'Rivera', true),
    ('communitygt', 'community@example.com', 'hashed_password_3', 'Community', 'Green Team', true)
) AS v(username, email, password_hash, first_name, last_name, is_verified)
WHERE NOT EXISTS (SELECT 1 FROM users);

-- Insert sample campaigns only if table is empty

-- Insert sample campaigns only if table is empty
