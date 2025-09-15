const express = require('express');
const cors = require('cors');
const pool = require('./db');
const campaigns = require('./controllers/campaigns');
const pools = require('./controllers/pools');
const stakes = require('./controllers/stakes');
const withdrawals = require('./controllers/withdrawals');

const app = express();
app.use(cors());
app.use(express.json());

// Campaigns
app.get('/api/campaigns', campaigns.getCampaigns);

// Pools
app.get('/api/pools', pools.getPools);
app.post('/api/pools', pools.createPool);

// Wallet (mocked for now)
app.get('/api/wallet/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { rows } = await pool.query('SELECT token_id, balance FROM wallets WHERE user_id=$1', [userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Stakes
app.post('/api/stake', stakes.createStake);
app.get('/api/stakes/:userId', stakes.getStakes);

// Withdrawals
app.post('/api/withdraw', withdrawals.withdraw);

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Staking backend running on port ${PORT}`));
