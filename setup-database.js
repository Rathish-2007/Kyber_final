// Database setup and diagnostic script
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    console.log('🔧 Database Setup and Diagnostic Tool\n');
    
    // First, try to connect to PostgreSQL server (without specifying database)
    const adminClient = new Client({
        user: process.env.PGUSER || 'postgres',
        host: process.env.PGHOST || 'localhost',
        password: process.env.PGPASSWORD || 'password',
        port: process.env.PGPORT || 5432,
        database: 'postgres' // Connect to default postgres database
    });
    
    try {
        console.log('1️⃣ Connecting to PostgreSQL server...');
        await adminClient.connect();
        console.log('✅ Connected to PostgreSQL server successfully');
        
        // Check if the database exists
        console.log('\n2️⃣ Checking if database exists...');
        const dbCheck = await adminClient.query(
            "SELECT 1 FROM pg_database WHERE datname = $1", 
            [process.env.PGDATABASE || 'crowdfunding_db']
        );
        
        if (dbCheck.rows.length === 0) {
            console.log('❌ Database does not exist. Creating it...');
            await adminClient.query(`CREATE DATABASE ${process.env.PGDATABASE || 'crowdfunding_db'}`);
            console.log('✅ Database created successfully');
        } else {
            console.log('✅ Database already exists');
        }
        
        await adminClient.end();
        
        // Now connect to the specific database and run schema
        console.log('\n3️⃣ Connecting to target database...');
        const client = new Client({
            user: process.env.PGUSER || 'postgres',
            host: process.env.PGHOST || 'localhost',
            database: process.env.PGDATABASE || 'crowdfunding_db',
            password: process.env.PGPASSWORD || 'password',
            port: process.env.PGPORT || 5432,
        });
        
        await client.connect();
        console.log('✅ Connected to target database');
        
        console.log('\n4️⃣ Running database schema...');
        const schemaPath = path.join(__dirname, 'resources', 'database-schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);
        console.log('✅ Database schema executed successfully');
        
        console.log('\n5️⃣ Verifying tables were created...');
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📋 Created tables:');
        tables.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
        await client.end();
        console.log('\n🎉 Database setup completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Database setup failed:', error.message);
        console.log('\n🔍 Troubleshooting steps:');
        console.log('1. Make sure PostgreSQL is installed and running');
        console.log('2. Check your .env file has correct credentials');
        console.log('3. Ensure the postgres user has permission to create databases');
        console.log('4. Try running: createdb crowdfunding_db');
        
        if (adminClient) {
            await adminClient.end();
        }
    }
}

// Run the setup
setupDatabase();
