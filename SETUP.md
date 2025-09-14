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

1. Make sure PostgreSQL is installed and running
2. Create a database named `crowdfunding_db`
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

## Troubleshooting

If you encounter database connection errors:
- Make sure PostgreSQL is running
- Check that the database `crowdfunding_db` exists
- Verify the credentials in your `.env` file
- Ensure the database user has the necessary permissions
