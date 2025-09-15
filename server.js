    // (Moved /api/wallet/:userId endpoint inside initializeDatabase().then block below)
// (Removed top-level /api/donations-received endpoint definition. It is now only defined after app is initialized.)
// (Removed top-level /api/donation-history endpoint definition. It is now only defined after app is initialized.)
// (Removed duplicate /api/user-rewards endpoint definition. It is now only defined after app is initialized.)
// Basic Express server with PostgreSQL connection using dotenv
require('dotenv').config();
const express = require('express');
const { Pool, Client } = require('pg');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const port = 3000;

let app, server, io, pool;

async function initializeDatabase() {
    const client = new Client({
        user: process.env.PGUSER || 'postgres',
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'crowdfunding_db',
        password: process.env.PGPASSWORD || 'password',
        port: process.env.PGPORT || 5432,
    });
    try {
        console.log('Attempting to connect to database...');
        await client.connect();
        console.log('Connected to database successfully');
        
        const schemaPath = path.join(__dirname, 'resources', 'database-schema.sql');
        console.log('Reading schema from:', schemaPath);
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('Executing database schema...');
        await client.query(schemaSql);
        console.log('Database initialized successfully.');
    } catch (err) {
        console.error('Database initialization failed:', err);
        console.log('Please ensure:');
        console.log('1. PostgreSQL is running');
        console.log('2. Database "crowdfunding_db" exists');
        console.log('3. User has proper permissions');
        console.log('4. Check your .env file configuration');
    } finally {
        await client.end();
    }
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

    // POOLS ENDPOINT: list available pools
    app.get('/api/pools', async (req, res) => {
        try {
            const result = await pool.query('SELECT id, symbol, name, apy, min_amount FROM pools ORDER BY id ASC');
            res.json({ success: true, pools: result.rows });
        } catch (err) {
            console.error('Error fetching pools:', err);
            res.status(500).json({ success: false, error: 'Database error fetching pools' });
        }
    });

    // WALLET ENDPOINT: Get all pool tokens and balances for a user (staking schema)
    app.get('/api/wallet/:userId', async (req, res) => {
        const { userId } = req.params;
        if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });
        try {
            // 1. Get the user's email from the main users table (database-schema.sql)
            const userRes = await pool.query('SELECT email FROM users WHERE user_id = $1', [userId]);
            if (!userRes.rows.length) return res.status(404).json({ success: false, error: 'User not found' });
            const email = userRes.rows[0].email;
            if (!email) return res.status(404).json({ success: false, error: 'No email for user' });
            // 2. Find staking user by email (staking_users table)
            const stakeUserRes = await pool.query('SELECT email FROM staking_users WHERE email = $1', [email]);
            if (!stakeUserRes.rows.length) return res.status(404).json({ success: false, error: 'Staking user not found' });
            // 3. Fetch wallet tokens for staking user (email is PK)
            const result = await pool.query(`
                SELECT w.pool_id, w.balance, p.symbol, p.name, p.apy, p.min_amount
                FROM wallets w
                JOIN pools p ON w.pool_id = p.id
                WHERE w.user_id = $1
            `, [email]);
            res.json({ success: true, tokens: result.rows });
        } catch (err) {
            console.error('Error fetching wallet tokens:', err);
            res.status(500).json({ success: false, error: 'Database error fetching wallet tokens' });
        }
    });

    // STAKE ENDPOINT: record a stake and update wallet balance
    app.post('/api/stake', async (req, res) => {
        // Relaxed payload: only amount and periodMonths required; infer user and default pool
        const { userId, poolId, amount, periodMonths } = req.body || {};
        if (!amount || !periodMonths) {
            return res.status(400).json({ success: false, error: 'amount and periodMonths are required' });
        }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Resolve email for staking user
            let effectiveUserId = userId;
            if (!effectiveUserId) {
                // Try to read from a header for logged-in user (optional enhancement)
                effectiveUserId = req.header('x-user-id') || null;
            }
            if (!effectiveUserId) {
                await client.query('ROLLBACK');
                return res.status(401).json({ success: false, error: 'User not identified' });
            }
            const userRes = await client.query('SELECT email FROM users WHERE user_id = $1', [effectiveUserId]);
            if (!userRes.rows.length) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            const email = userRes.rows[0].email;
            // Ensure staking user exists
            await client.query('INSERT INTO staking_users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [email]);
            // Choose default pool if not provided: pick first pool
            let effectivePoolId = poolId;
            if (!effectivePoolId) {
                const poolRes = await client.query('SELECT id FROM pools ORDER BY id ASC LIMIT 1');
                if (!poolRes.rows.length) {
                    await client.query('ROLLBACK');
                    return res.status(500).json({ success: false, error: 'No pools configured' });
                }
                effectivePoolId = poolRes.rows[0].id;
            }
            // Insert stake record (both legacy stakes and stake_pool_tokens for UI)
            const unlockAtExpr = `NOW() + ($1::int || ' months')::interval`;
            await client.query(
                `INSERT INTO stakes (user_id, pool_id, amount, period_months, unlock_at)
                 VALUES ($1, $2, $3::numeric, $4, ${unlockAtExpr})`,
                [email, effectivePoolId, amount, periodMonths]
            );
            await client.query(
                `INSERT INTO stake_pool_tokens (user_id, pool_id, amount, period_months, unlock_at)
                 VALUES ($1, $2, $3::numeric, $4, ${unlockAtExpr})`,
                [email, effectivePoolId, amount, periodMonths]
            );
            // Update wallet balance
            await client.query(
                `INSERT INTO wallets (user_id, pool_id, balance) VALUES ($1, $2, $3::numeric)
                 ON CONFLICT (user_id, pool_id) DO UPDATE SET balance = wallets.balance + EXCLUDED.balance`,
                [email, effectivePoolId, amount]
            );
            await client.query('COMMIT');
            res.json({ success: true });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error creating stake:', err);
            res.status(500).json({ success: false, error: 'Database error creating stake' });
        } finally {
            client.release();
        }
    });

    // List current user's active stakes with remaining time
    app.get('/api/my-stakes', async (req, res) => {
        const userId = req.query.userId || req.header('x-user-id');
        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not identified' });
        }
        try {
            const userRes = await pool.query('SELECT email FROM users WHERE user_id = $1', [userId]);
            if (!userRes.rows.length) return res.status(404).json({ success: false, error: 'User not found' });
            const email = userRes.rows[0].email;
            const result = await pool.query(`
                SELECT spt.id, spt.amount, spt.period_months, spt.started_at, spt.unlock_at,
                       p.symbol, p.name,
                       GREATEST(EXTRACT(EPOCH FROM (spt.unlock_at - NOW())), 0) AS seconds_remaining
                FROM stake_pool_tokens spt
                JOIN pools p ON spt.pool_id = p.id
                WHERE spt.user_id = $1
                ORDER BY spt.started_at DESC
            `, [email]);
            res.json({ success: true, stakes: result.rows });
        } catch (err) {
            console.error('Error fetching my-stakes:', err);
            res.status(500).json({ success: false, error: 'Database error fetching stakes' });
        }
    });

    app.use(express.json());
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });
    app.use(express.static(path.join(__dirname)));

    io.on('connection', (socket) => { console.log('A user connected'); });

    // AUTHENTICATION ENDPOINTS
    app.post('/api/signup', async (req, res) => {
        const { username, email, first_name, last_name, password } = req.body;
        if (!username || !email || !password || !first_name) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        try {
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const result = await pool.query(
                'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING user_id',
                [username, email, hashedPassword, first_name, last_name]
            );
            res.status(201).json({ success: true, userId: result.rows[0].user_id });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'User with this email or username may already exist.' });
        }
    });

    app.post('/api/login', async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        try {
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials.' });
            }
            const user = result.rows[0];
            const match = await bcrypt.compare(password, user.password_hash);
            if (match) {
                delete user.password_hash; // Don't send hash to client
                res.json({ success: true, user });
            } else {
                res.status(401).json({ error: 'Invalid credentials.' });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error during login.' });
        }
    });

    // PROFILE ENDPOINT
    app.get('/api/profile/:userId', async (req, res) => {
        const { userId } = req.params;
        try {
            const campaignsRes = await pool.query('SELECT * FROM campaigns WHERE creator_id = $1 ORDER BY created_at DESC', [userId]);
            const donationsMadeRes = await pool.query(
                'SELECT t.amount, t.transaction_date, t.is_anonymous, c.title as campaign_title FROM transactions t JOIN campaigns c ON t.campaign_id = c.campaign_id WHERE t.donor_id = $1 ORDER BY t.transaction_date DESC',
                [userId]
            );
            const donationsReceivedRes = await pool.query(
                `SELECT t.amount, t.transaction_date, t.is_anonymous, t.donor_name, c.title as campaign_title 
                 FROM transactions t 
                 JOIN campaigns c ON t.campaign_id = c.campaign_id
                 WHERE c.creator_id = $1 ORDER BY t.transaction_date DESC`,
                [userId]
            );

            res.json({
                created_campaigns: campaignsRes.rows,
                donations_made: donationsMadeRes.rows,
                donations_received: donationsReceivedRes.rows
            });
        } catch (err) {
            console.error('Error fetching profile data:', err);
            res.status(500).json({ error: 'Database error fetching profile data.' });
        }
    });
    
    // CAMPAIGN & DONATION ENDPOINTS (Updated)
    app.get('/api/campaigns', async (req, res) => {
        try {
            const query = `
                SELECT c.*, u.first_name || ' ' || u.last_name as creator_name
                FROM campaigns c
                JOIN users u ON c.creator_id = u.user_id
                WHERE c.status = 'active'
                ORDER BY c.created_at DESC
            `;
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database error.' });
        }
    });

    app.post('/api/donation-request', async (req, res) => {
        const { title, description, goal, creator_id } = req.body;
        if (!title || !description || !goal || !creator_id) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }
        try {
            const campaignResult = await pool.query(
                'INSERT INTO campaigns (title, description, short_description, goal_amount, creator_id, category, end_date, status) VALUES ($1, $2, $3, $4::decimal, $5::uuid, $6, NOW() + INTERVAL \'30 days\', $7) RETURNING *', 
                [title, description, description.substring(0,100), parseFloat(goal), creator_id, 'Community', 'active']
            );
            res.json({ success: true, campaign: campaignResult.rows[0] });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database error.' });
        }
    });

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
            const donorInsertQuery = `
                INSERT INTO transactions (campaign_id, donor_id, amount, is_anonymous, donor_name, donor_email, wallet_address) 
                VALUES ($1::uuid, $2::uuid, $3::decimal, $4, $5, $6, $7)
            `;
            await client.query(donorInsertQuery, [campaign_id, user_id || null, donationAmount, is_anonymous || false, donorName, donorEmail, wallet]);
            const campaignUpdateQuery = 'UPDATE campaigns SET amount_raised = amount_raised + $1::decimal WHERE campaign_id = $2::uuid RETURNING amount_raised';
            const updatedCampaign = await client.query(campaignUpdateQuery, [donationAmount, campaign_id]);
            // Add 10% of donation as pool token reward (global)
            const reward = donationAmount * 0.10;
            await client.query(
                `INSERT INTO user_rewards (email, reward_points) VALUES ($1, $2)
                 ON CONFLICT (email) DO UPDATE SET reward_points = user_rewards.reward_points + $2`,
                [donorEmail, reward]
            );
            // Add/update per-campaign reward
            await client.query(
                `INSERT INTO user_campaign_rewards (user_email, campaign_id, reward_points) VALUES ($1, $2, $3)
                 ON CONFLICT (user_email, campaign_id) DO UPDATE SET reward_points = user_campaign_rewards.reward_points + $3, last_updated = CURRENT_TIMESTAMP`,
                [donorEmail, campaign_id, reward]
            );
            await client.query('COMMIT');
            io.emit('donation-update', {
                campaign_id: campaign_id,
                new_amount_raised: updatedCampaign.rows[0].amount_raised
            });
            res.json({ success: true, reward });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Donation DB error:', err);
            res.status(500).json({ error: 'Database error during donation.' });
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

    // USER REWARDS DETAIL: total and per-campaign breakdown
    app.get('/api/user-rewards-detail', async (req, res) => {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required.' });
        }
        try {
            const totalRes = await pool.query('SELECT reward_points FROM user_rewards WHERE email = $1', [email]);
            const total = totalRes.rows.length ? Number(totalRes.rows[0].reward_points) : 0;
            const perCampaign = await pool.query(`
                SELECT ucr.reward_points::numeric AS reward_points,
                       c.title AS campaign_title,
                       ucr.campaign_id
                FROM user_campaign_rewards ucr
                JOIN campaigns c ON c.campaign_id = ucr.campaign_id
                WHERE ucr.user_email = $1
                ORDER BY ucr.last_updated DESC
            `, [email]);
            res.json({ success: true, total_reward_points: total, campaigns: perCampaign.rows });
        } catch (err) {
            console.error('Error fetching user rewards detail:', err);
            res.status(500).json({ success: false, error: 'Database error fetching rewards detail' });
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