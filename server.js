// Basic Express server with PostgreSQL connection using dotenv
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const port = 3000;
let app, server, io, pool;



// Read and execute the schema SQL file to initialize the database in a single transaction
async function initializeDatabase() {
    // Create a temporary pool for initialization
    const tempPool = new (require('pg').Pool)({
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        password: process.env.PGPASSWORD,
        port: process.env.PGPORT,
    });
    let client;
    try {
        client = await tempPool.connect();
        const schemaPath = path.join(__dirname, 'resources', 'database-schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split SQL file into individual statements (split on every semicolon)
        const statements = schemaSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of statements) {
            try {
                await client.query(statement);
            } catch (err) {
                // Log and continue if statement already exists, else throw
                if (err.code === '42P07' || (err.message && err.message.includes('already exists'))) {
                    console.warn('Skipping statement (already exists):', statement.split('\n')[0]);
                } else {
                    throw err;
                }
            }
        }

        console.log('Database initialized successfully from database-schema.sql.');
    } catch (err) {
        console.error('Database initialization failed:', err);
        console.error('Stack trace:', err.stack);
        // Do not exit, allow the server to start with the error
    } finally {
        if (client) {
            client.release();
        }
        await tempPool.end();
    }
}


// Initialize DB, then create pool, app, endpoints, and start server
initializeDatabase().then(() => {
    pool = new Pool({
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        password: process.env.PGPASSWORD,
        port: process.env.PGPORT,
    });
    app = express();
    server = http.createServer(app);
    io = socketIo(server);

    app.use(express.json());
    // Serve static files from css, js, and resources folders
    app.use('/css', express.static(path.join(__dirname, 'css')));
    app.use('/js', express.static(path.join(__dirname, 'js')));
    app.use('/resources', express.static(path.join(__dirname, 'resources')));
    // Serve all static files from the project root (for HTML, images, etc.)
    app.use(express.static(path.join(__dirname)));

    // Socket.io connection
    io.on('connection', (socket) => {
        console.log('A user connected');
        socket.on('disconnect', () => {
            console.log('A user disconnected');
        });
    });

    // Test DB connection route
    app.get('/db-test', async (req, res) => {
        try {
            const result = await pool.query('SELECT NOW()');
            res.json({ time: result.rows[0].now });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // API endpoint to fetch all campaigns
    app.get('/api/campaigns', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM campaigns ORDER BY created_at DESC');
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching campaigns:', err);
            res.status(500).json({ error: 'Database error: ' + (err.message || err) });
        }
    });

    // API endpoint to create a donation request (campaign)
    app.post('/api/donation-request', async (req, res) => {
        const { requester, title, description, goal } = req.body;
        if (!requester || !title || !description || !goal) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        const goalAmount = parseFloat(goal);
        if (isNaN(goalAmount) || goalAmount <= 0) {
            return res.status(400).json({ error: 'Goal must be a positive number.' });
        }
        try {
            // Insert a new user if not exists (for demo, using name as username/email)
            let userResult = await pool.query(
                'INSERT INTO users (username, email, password_hash, first_name) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO UPDATE SET username=EXCLUDED.username RETURNING user_id',
                [requester, requester + '@example.com', 'dummyhash', requester]
            );
            const creator_id = userResult.rows[0].user_id;

            // Insert campaign with short_description
            const shortDesc = description.length > 100 ? description.substring(0, 100) + '...' : description;
            const campaignResult = await pool.query(
                'INSERT INTO campaigns (title, description, short_description, goal_amount, creator_id, category, end_date, status) VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL \'30 days\', $7) RETURNING *',
                [title, description, shortDesc, goalAmount, creator_id, 'General', 'active']
            );
            // Add frontend-expected fields
            const campaign = campaignResult.rows[0];
            campaign.amount_raised = 0;
            campaign.category = campaign.category || 'General';
            campaign.creator_name = requester;
            // Emit new campaign to all connected clients
            io.emit('new-campaign', campaign);
            res.json({ success: true, campaign });
        } catch (err) {
            console.error('Donation request DB error:', err);
            if (err.stack) console.error(err.stack);
            res.status(500).json({ error: 'Database error: ' + (err.message || err) });
        }
    });

    // API endpoint to handle donations
    app.post('/api/donate', async (req, res) => {
        const { campaign_id, name, email, amount, wallet } = req.body;
        if (!campaign_id || !name || !email || !amount || !wallet) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        const donationAmount = parseFloat(amount);
        if (isNaN(donationAmount) || donationAmount <= 0) {
            return res.status(400).json({ error: 'Donation amount must be a positive number.' });
        }
        try {
            // Insert donor record
            await pool.query(
                'INSERT INTO donors (campaign_id, name, email, amount, wallet) VALUES ($1, $2, $3, $4, $5)',
                [campaign_id, name, email, donationAmount, wallet]
            );
            // Update campaign's amount_raised
            await pool.query(
                'UPDATE campaigns SET amount_raised = amount_raised + $1 WHERE campaign_id = $2',
                [donationAmount, campaign_id]
            );
            res.json({ success: true });
        } catch (err) {
            console.error('Donation DB error:', err);
            if (err.stack) console.error(err.stack);
            res.status(500).json({ error: 'Database error: ' + (err.message || err) });
        }
    });

    // Fallback: serve index.html for any unknown route (SPA support)
    // This must be the last route
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    server.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
});