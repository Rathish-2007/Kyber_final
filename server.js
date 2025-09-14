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
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        password: process.env.PGPASSWORD,
        port: process.env.PGPORT,
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
    } finally {
        await client.end();
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

    // API endpoint to create a donation request (campaign) is mostly fine
    app.post('/api/donation-request', async (req, res) => {
        // ... (your existing code is okay for a demo, but for production, consider a proper user lookup)
        // For brevity, the logic is kept the same, but the response will be handled by the /api/campaigns refresh
        const { requester, title, description, goal } = req.body;
        // ... validation ...
        try {
            // ... (your user and campaign insertion logic)
            // The io.emit can be improved to send the full campaign object with creator name
            // but for simplicity, we'll just trigger a refetch on the client side
             const shortDesc = description.length > 100 ? description.substring(0, 100) + '...' : description;

            // Simplified for example
            const userResult = await pool.query("INSERT INTO users (username, email, password_hash, first_name) VALUES ($1, $1 || '@example.com', 'hash', $1) ON CONFLICT (username) DO UPDATE SET username=EXCLUDED.username RETURNING user_id", [requester]);
            const creator_id = userResult.rows[0].user_id;

            const campaignResult = await pool.query('INSERT INTO campaigns (title, description, short_description, goal_amount, creator_id, category, end_date, status) VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL \'30 days\', $7) RETURNING *', [title, description, shortDesc, parseFloat(goal), creator_id, 'General', 'active']);

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
        // ... (your existing validation)
        const donationAmount = parseFloat(amount);

        const client = await pool.connect(); // Get a client from the pool
        try {
            // Start the transaction
            await client.query('BEGIN');

            // 1. Insert donor record
            const donorInsertQuery = 'INSERT INTO donors (campaign_id, name, email, amount, wallet) VALUES ($1, $2, $3, $4, $5)';
            await client.query(donorInsertQuery, [campaign_id, name, email, donationAmount, wallet]);

            // 2. Update campaign's amount_raised
            const campaignUpdateQuery = 'UPDATE campaigns SET amount_raised = amount_raised + $1 WHERE campaign_id = $2 RETURNING amount_raised';
            const updatedCampaign = await client.query(campaignUpdateQuery, [donationAmount, campaign_id]);

            // Commit the transaction
            await client.query('COMMIT');

            // Emit the updated amount to all clients
            io.emit('donation-update', {
                campaign_id: campaign_id,
                new_amount_raised: updatedCampaign.rows[0].amount_raised
            });

            res.json({ success: true });

        } catch (err) {
            // If any error occurs, rollback the transaction
            await client.query('ROLLBACK');
            console.error('Donation DB error (transaction rolled back):', err);
            res.status(500).json({ error: 'Database error during donation.' });
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