# Setup Instructions

## Environment Configuration

Create a `.env` file in the root directory with the following content:

```
# PostgreSQL Database Configuration
PGUSER=postgres
PGHOST=localhost
PGDATABASE=crowdfunding_db
PGPASSWORD=password
PGPORT=5432

# Server Configuration
NODE_ENV=development
PORT=3000
```

## Database Setup

### Option 1: Automatic Setup (Recommended)
Run the database setup script:
```bash
node setup-database.js
```

### Option 2: Manual Setup
1. Make sure PostgreSQL is installed and running
2. Create a database named `crowdfunding_db`:
   ```bash
   createdb crowdfunding_db
   ```
3. The server will automatically create the required tables when you start it

## Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. ~~Open your browser and go to `http://localhost:3000`~~
Install the Liver Server Extensions and click Go Live.


## Troubleshooting Database Issues

### Common Error: "Database initialization failed"

**Possible causes:**
1. **PostgreSQL not running**: Start PostgreSQL service
2. **Database doesn't exist**: Run `createdb crowdfunding_db`
3. **Wrong credentials**: Check your `.env` file
4. **Permission issues**: Ensure user can create databases
5. **Schema file not found**: Check that `resources/database-schema.sql` exists

**Debug steps:**
1. Run `node setup-database.js` for detailed diagnostics
2. Check PostgreSQL logs
3. Verify database connection manually:
   ```bash
   psql -U postgres -h localhost -d crowdfunding_db
   ```

### Environment Variables
Make sure your `.env` file exists and contains the correct PostgreSQL credentials for your system.
