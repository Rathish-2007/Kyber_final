// Basic Express server with PostgreSQL connection using dotenv
require('dotenv').config();
const express = require('express');
const { Pool, Client } = require('pg'); // Import Client as well
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const port = 3000;
let app, server, io, pool;

// Read and execute the schema SQL file to initialize the database
async function initializeDatabase() {
    // Use a single client for initialization, not a whole pool
    const client = new Client({
        user: process.env.PGUSER || 'postgres',
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'crowdfunding_db',
        password: process.env.PGPASSWORD || 'password',
        port: process.env.PGPORT || 5432,
    });
    try {
        await client.connect();
        const schemaPath = path.join(__dirname, 'resources', 'database-schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Execute the entire file as a single query. No need to split.
        // Make sure your database-schema.sql uses "CREATE TABLE IF NOT EXISTS"
        await client.query(schemaSql);

        console.log('Database initialized successfully from database-schema.sql.');
    } catch (err) {
        console.error('Database initialization failed:', err);
        console.log('Please make sure PostgreSQL is running and the database exists.');
        console.log('You can create the database with: createdb crowdfunding_db');
    } finally {
        await client.end();
    }
}

// Initialize DB, then create pool, app, endpoints, and start server
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
    io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["Content-Type"],
            credentials: true
        }
    });

    app.use(express.json());
    
    // Enable CORS for Live Server compatibility
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
        } else {
            next();
        }
    });
    
    // Static file serving is fine as is
    app.use(express.static(path.join(__dirname)));


    // Socket.io connection
    io.on('connection', (socket) => {
        console.log('A user connected');
        socket.on('disconnect', () => {
            console.log('A user disconnected');
        });
    });

    // API endpoint to fetch all campaigns with creator's name
    app.get('/api/campaigns', async (req, res) => {
        try {
            // Join with users table to get the creator's name
            const query = `
                SELECT c.*, u.first_name as creator_name
                FROM campaigns c
                JOIN users u ON c.creator_id = u.user_id
                ORDER BY c.created_at DESC
            `;
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching campaigns:', err);
            res.status(500).json({ error: 'Database error fetching campaigns.' });
        }
    });

    // API endpoint to create a donation request (campaign)
    app.post('/api/donation-request', async (req, res) => {
        const { requester, title, description, goal } = req.body;
        
        // Basic validation
        if (!requester || !title || !description || !goal) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        try {
            const shortDesc = description.length > 100 ? description.substring(0, 100) + '...' : description;
            const goalAmount = parseFloat(goal);
            
            if (isNaN(goalAmount) || goalAmount <= 0) {
                return res.status(400).json({ error: 'Invalid goal amount' });
            }

            // Insert or get user
            const userResult = await pool.query(
                "INSERT INTO users (username, email, password_hash, first_name) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO UPDATE SET username=EXCLUDED.username RETURNING user_id", 
                [requester, requester + '@example.com', 'hash', requester]
            );
            const creator_id = userResult.rows[0].user_id;

            // Insert campaign with proper type casting
            const campaignResult = await pool.query(
                'INSERT INTO campaigns (title, description, short_description, goal_amount, creator_id, category, end_date, status) VALUES ($1, $2, $3, $4::decimal, $5::uuid, $6, NOW() + INTERVAL \'30 days\', $7) RETURNING *', 
                [title, description, shortDesc, goalAmount, creator_id, 'General', 'active']
            );

            io.emit('new-campaign', campaignResult.rows[0]); // Client should ideally refetch the full list
            res.json({ success: true, campaign: campaignResult.rows[0] });

        } catch (err) {
            console.error('Donation request DB error:', err);
            res.status(500).json({ error: 'Database error creating request.' });
        }
    });

    // API endpoint to handle donations WITH A TRANSACTION
    app.post('/api/donate', async (req, res) => {
        const { campaign_id, name, email, amount, wallet } = req.body;
        console.log('Received donation request:', req.body);
        if (!campaign_id || !name || !email || !amount || !wallet) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        // Validate campaign_id is a UUID (basic check)
        if (!/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.test(campaign_id)) {
            return res.status(400).json({ error: 'Invalid campaign_id format. Must be a UUID.' });
        }
        const donationAmount = parseFloat(amount);
        if (isNaN(donationAmount) || donationAmount <= 0) {
            return res.status(400).json({ error: 'Donation amount must be a positive number.' });
        }

        const client = await pool.connect(); // Get a client from the pool
        try {
            // Start the transaction
            await client.query('BEGIN');

            // 1. Insert donor record
            const donorInsertQuery = 'INSERT INTO donors (campaign_id, name, email, amount, wallet) VALUES ($1::uuid, $2, $3, $4::decimal, $5)';
            await client.query(donorInsertQuery, [campaign_id, name, email, donationAmount, wallet]);

            // 2. Update campaign's amount_raised
            const campaignUpdateQuery = 'UPDATE campaigns SET amount_raised = amount_raised + $1::decimal WHERE campaign_id = $2::uuid RETURNING amount_raised';
            const updatedCampaign = await client.query(campaignUpdateQuery, [donationAmount, campaign_id]);

            // 3. Add 10% of donation as reward for the user
            const reward = donationAmount * 0.10;
            await client.query(
                `INSERT INTO user_rewards (email, reward_points) VALUES ($1, $2)
                 ON CONFLICT (email) DO UPDATE SET reward_points = user_rewards.reward_points + $2`,
                [email, reward]
            );

            // Commit the transaction
            await client.query('COMMIT');

            // Emit the updated amount to all clients
            io.emit('donation-update', {
                campaign_id: campaign_id,
                new_amount_raised: updatedCampaign.rows[0].amount_raised
            });

            res.json({ success: true, reward });

        } catch (err) {
            // If any error occurs, rollback the transaction
            await client.query('ROLLBACK');
            console.error('Donation DB error (transaction rolled back):', err);
            res.status(500).json({ error: 'Database error during donation.', details: err.message });
        } finally {
            // Release the client back to the pool
            client.release();
        }
    });

    // The static middleware already handles serving index.html for the '/' route
    // So the app.get('/') is not needed unless it's a specific SPA fallback like app.get('*', ...)

    server.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
});