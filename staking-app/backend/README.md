# Staking Backend

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Run migration:
   ```
   psql -f migrations/001_init.sql <your_db>
   ```
3. Copy `.env.example` to `.env` and fill in your DB credentials.
4. Start server:
   ```
   npm run dev
   ```

## API Endpoints
- `GET /api/campaigns` - List campaigns
- `GET /api/pools` - List pools
- `POST /api/pools` - Create pool (admin)
- `GET /api/wallet/:userId` - Get wallet balances
- `POST /api/stake` - Create stake
- `GET /api/stakes/:userId` - List user stakes
- `POST /api/withdraw` - Withdraw matured stake

See code comments for reward calculation, DB transactions, and UI logic for campaign-side "Create" button.
