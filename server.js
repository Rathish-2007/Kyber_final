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
        const { campaign_id, name, email, amount, wallet, user_id, is_anonymous } = req.body;
        const donationAmount = parseFloat(amount);
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const donorInsertQuery = `
                INSERT INTO transactions (campaign_id, donor_id, amount, is_anonymous, donor_name, donor_email, wallet_address) 
                VALUES ($1::uuid, $2::uuid, $3::decimal, $4, $5, $6, $7)
            `;
            await client.query(donorInsertQuery, [campaign_id, user_id || null, donationAmount, is_anonymous || false, name, email, wallet]);
            const campaignUpdateQuery = 'UPDATE campaigns SET amount_raised = amount_raised + $1::decimal WHERE campaign_id = $2::uuid RETURNING amount_raised';
            const updatedCampaign = await client.query(campaignUpdateQuery, [donationAmount, campaign_id]);
            await client.query('COMMIT');
            io.emit('donation-update', {
                campaign_id: campaign_id,
                new_amount_raised: updatedCampaign.rows[0].amount_raised
            });
            res.json({ success: true });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Donation DB error:', err);
            res.status(500).json({ error: 'Database error during donation.' });
        } finally {
            client.release();
        }
    });

    server.listen(port, () => { console.log(`Server running on http://localhost:${port}`); });
});