// (Removed top-level /api/donations-received endpoint definition. It is now only defined after app is initialized.)
// (Removed top-level /api/donation-history endpoint definition. It is now only defined after app is initialized.)
// (Removed duplicate /api/user-rewards endpoint definition. It is now only defined after app is initialized.)
// Basic Express server with PostgreSQL connection using dotenv
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { ethers } = require('ethers'); // --- NEW: Import Ethers.js ---

const saltRounds = 10;
const port = 3000;

let app, server, io, pool;

// --- ETH REWARD CONFIG (optional). If not configured, donations still succeed ---
const ETH_RPC_URL = process.env.ETH_RPC_URL || 'http://127.0.0.1:8545';
const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY || null; // optional
let ethProvider = null;
let treasurySigner = null;
try {
    ethProvider = new ethers.JsonRpcProvider(ETH_RPC_URL);
    if (TREASURY_PRIVATE_KEY) {
        treasurySigner = new ethers.Wallet(TREASURY_PRIVATE_KEY, ethProvider);
    }
} catch (e) {
    console.warn('ETH provider not available; rewards will be skipped.');
}

// --- [No changes in the initializeDatabase() or the initial setup] ---
async function initializeDatabase() {
    // ... (database initialization logic remains the same)
}

initializeDatabase().then(() => {
    pool = new Pool({
        user: process.env.PGUSER || 'postgres',
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'crowdfunding_db',
        password: process.env.PGPASSWORD || 'password',
        port: process.env.PGPORT || 5432,
    });
    app = express();
    server = http.createServer(app);
    io = socketIo(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

    app.use(express.json());
    app.use(cors({ origin: '*'}));
    app.use(express.static(path.join(__dirname)));

    // AUTH ENDPOINTS
    app.post('/api/signup', async (req, res) => {
        try {
            const { username, email, first_name, last_name, password } = req.body || {};
            if (!username || !email || !password) {
                return res.status(400).json({ error: 'username, email and password are required' });
            }

            const client = await pool.connect();
            try {
                const exists = await client.query(
                    'SELECT 1 FROM users WHERE email = $1 OR username = $2',
                    [email, username]
                );
                if (exists.rows.length > 0) {
                    return res.status(409).json({ error: 'Email or username already in use' });
                }

                const password_hash = await bcrypt.hash(password, saltRounds);
                const insert = await client.query(
                    `INSERT INTO users (username, email, password_hash, first_name, last_name)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING user_id, username, email, first_name, last_name, created_at`,
                    [username, email, password_hash, first_name || null, last_name || null]
                );
                return res.json({ success: true, user: insert.rows[0] });
            } finally {
                client.release();
            }
        } catch (err) {
            console.error('Signup error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/login', async (req, res) => {
        try {
            const { email, password } = req.body || {};
            if (!email || !password) {
                return res.status(400).json({ error: 'email and password are required' });
            }

            const client = await pool.connect();
            try {
                const result = await client.query(
                    `SELECT user_id, username, email, password_hash, first_name, last_name, avatar_url, role
                     FROM users WHERE email = $1`,
                    [email]
                );
                if (result.rows.length === 0) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
                const user = result.rows[0];
                const ok = await bcrypt.compare(password, user.password_hash);
                if (!ok) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
                await client.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [user.user_id]);
                const { password_hash, ...safeUser } = user;
                return res.json({ user: safeUser });
            } finally {
                client.release();
            }
        } catch (err) {
            console.error('Login error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    // BASIC PROFILE ENDPOINT
    app.get('/api/profile/:userId', async (req, res) => {
        const { userId } = req.params;
        try {
            const result = await pool.query(
                `SELECT user_id, username, email, first_name, last_name, avatar_url, bio, created_at, role
                 FROM users WHERE user_id = $1`,
                [userId]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
            return res.json({ user: result.rows[0] });
        } catch (err) {
            console.error('Profile error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    // CAMPAIGN ENDPOINTS
    app.get('/api/campaigns', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT 
                    c.campaign_id,
                    c.title,
                    c.description,
                    c.short_description,
                    c.goal_amount,
                    c.amount_raised,
                    c.category,
                    c.main_image_url,
                    c.end_date,
                    u.username,
                    u.first_name,
                    u.last_name,
                    COALESCE(NULLIF(TRIM(CONCAT(u.first_name,' ',u.last_name)), ''), u.username) AS creator_name
                FROM campaigns c
                LEFT JOIN users u ON u.user_id = c.creator_id
                WHERE c.status <> 'archived'
                ORDER BY c.created_at DESC
            `);
            return res.json(result.rows);
        } catch (err) {
            console.error('List campaigns error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/campaign/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query(`
                SELECT 
                    c.*, 
                    COALESCE(NULLIF(TRIM(CONCAT(u.first_name,' ',u.last_name)), ''), u.username) AS creator_name
                FROM campaigns c
                LEFT JOIN users u ON u.user_id = c.creator_id
                WHERE c.campaign_id = $1
            `, [id]);
            if (result.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
            return res.json(result.rows[0]);
        } catch (err) {
            console.error('Get campaign error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/donation-request', async (req, res) => {
        try {
            const { title, description, goal, creator_id } = req.body || {};
            if (!title || !description || !goal || !creator_id) {
                return res.status(400).json({ error: 'title, description, goal, creator_id are required' });
            }
            const goalAmount = parseFloat(goal);
            if (Number.isNaN(goalAmount) || goalAmount <= 0) {
                return res.status(400).json({ error: 'goal must be a positive number' });
            }

            const defaultCategory = 'General';
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);

            const result = await pool.query(
                `INSERT INTO campaigns (title, description, goal_amount, amount_raised, creator_id, category, end_date, status)
                 VALUES ($1, $2, $3, 0, $4, $5, $6, 'active')
                 RETURNING *`,
                [title, description, goalAmount, creator_id, defaultCategory, endDate]
            );
            return res.json({ success: true, campaign: result.rows[0] });
        } catch (err) {
            console.error('Create campaign error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    app.get('/api/campaigns', async (req, res) => { /* ... */ });
    app.post('/api/donation-request', async (req, res) => { /* ... */ });
    app.get('/api/campaign/:id', async (req, res) => { /* ... */ });


    // Donation endpoint: logs to DB and optionally sends ETH reward
    app.post('/api/donate', async (req, res) => {
        // Accept both old and new payload shapes
        const campaign_id = req.body.campaign_id;
        const donorName = req.body.name || req.body.donor_name || null;
        const donorEmail = req.body.email || req.body.donor_email || null;
        const amount = req.body.amount;
        const wallet = req.body.wallet || req.body.wallet_address || null;
        const user_id = req.body.user_id || req.body.donor_id || null;
        const is_anonymous = req.body.is_anonymous || false;
        const donationAmount = parseFloat(amount);
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            
            // 1. Log the fiat donation to your database (your original logic)
            const donorInsertQuery = `
                INSERT INTO transactions (campaign_id, donor_id, amount, is_anonymous, donor_name, donor_email, wallet_address) 
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;
            await client.query(donorInsertQuery, [campaign_id, user_id || null, donationAmount, is_anonymous || false, name, email, wallet]);
            
            const campaignUpdateQuery = 'UPDATE campaigns SET amount_raised = amount_raised + $1 WHERE campaign_id = $2 RETURNING amount_raised';
            const updatedCampaign = await client.query(campaignUpdateQuery, [donationAmount, campaign_id]);
            
            await client.query('COMMIT');

            // Optional ETH reward, best-effort and non-blocking
            if (treasurySigner && wallet) {
                try {
                    const rewardAmountETH = (donationAmount * 0.01).toString();
                    const tx = await treasurySigner.sendTransaction({
                        to: wallet,
                        value: ethers.parseEther(rewardAmountETH)
                    });
                    console.log(`ETH reward sent! Transaction Hash: ${tx.hash}`);
                } catch (rewardErr) {
                    console.warn('Skipping ETH reward due to error:', rewardErr.message);
                }
            } else {
                console.log('ETH reward skipped (no signer configured or wallet missing).');
            }

            // Notify clients and respond
            io.emit('donation-update', {
                campaign_id: campaign_id,
                new_amount_raised: updatedCampaign.rows[0].amount_raised
            });
            res.json({ success: true });

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Donation error:', err);
            res.status(500).json({ error: 'Database error.' });
        } finally {
            client.release();
        }
    });

    // USER REWARDS ENDPOINT
    app.get('/api/user-rewards', async (req, res) => {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required.' });
        }
        try {
            const result = await pool.query('SELECT reward_points FROM user_rewards WHERE email = $1', [email]);
            const rewardPoints = result.rows.length > 0 ? Number(result.rows[0].reward_points) : 0;
            res.json({ success: true, reward_points: rewardPoints });
        } catch (err) {
            console.error('Error fetching user rewards:', err);
            // Return zero instead of failing the UI
            res.json({ success: true, reward_points: 0 });
        }
    });

    // DONATION HISTORY (Donations made by a user email)
    app.get('/api/donation-history', async (req, res) => {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required.' });
        }
        try {
            const query = `
                SELECT t.amount, t.transaction_date, c.title AS campaign_title
                FROM transactions t
                JOIN campaigns c ON t.campaign_id = c.campaign_id
                WHERE t.donor_email = $1
                ORDER BY t.transaction_date DESC
            `;
            const result = await pool.query(query, [email]);
            res.json({ success: true, history: result.rows });
        } catch (err) {
            console.error('Error fetching donation history:', err);
            // Return empty history instead of failing the UI
            res.json({ success: true, history: [] });
        }
    });

    // DONATIONS RECEIVED (for campaigns created by a user)
    app.get('/api/donations-received', async (req, res) => {
        const { user_id } = req.query;
        if (!user_id) {
            return res.status(400).json({ success: false, error: 'user_id is required.' });
        }
        try {
            const query = `
                SELECT t.amount, t.transaction_date, COALESCE(t.donor_name, 'Anonymous') AS donor_name, c.title AS campaign_title
                FROM transactions t
                JOIN campaigns c ON t.campaign_id = c.campaign_id
                WHERE c.creator_id = $1
                ORDER BY t.transaction_date DESC
            `;
            const result = await pool.query(query, [user_id]);
            res.json({ success: true, donations: result.rows });
        } catch (err) {
            console.error('Error fetching donations received:', err);
            // Return empty list instead of failing the UI
            res.json({ success: true, donations: [] });
        }
    });

    server.listen(port, () => { console.log(`Server running on http://localhost:${port}`); });
});