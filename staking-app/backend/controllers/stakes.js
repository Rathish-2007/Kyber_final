const pool = require('../db');
const { DateTime } = require('luxon');

// Helper: calculate projected rewards
function calcReward(amount, apy, months) {
  return Number(amount) * (Number(apy) / 100) * (months / 12);
}

exports.createStake = async (req, res) => {
  const { userId, poolId, campaignId, token, amount, periodMonths } = req.body;
  if (!userId || !poolId || !amount || !periodMonths) return res.status(400).json({ error: 'Missing fields' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Check wallet balance
    const { rows: walletRows } = await client.query('SELECT * FROM wallets WHERE user_id=$1 AND token_id=$2 FOR UPDATE', [userId, token]);
    if (!walletRows[0] || Number(walletRows[0].balance) < Number(amount)) throw new Error('Insufficient balance');
    // Debit wallet
    await client.query('UPDATE wallets SET balance=balance-$1 WHERE id=$2', [amount, walletRows[0].id]);
    // Get pool APY
    const { rows: poolRows } = await client.query('SELECT apy FROM pools WHERE id=$1', [poolId]);
    const apy = poolRows[0]?.apy || 0;
    // Insert stake
    const start = DateTime.utc();
    const end = start.plus({ months: periodMonths });
    const { rows: stakeRows } = await client.query(
      'INSERT INTO stakes (user_id, pool_id, campaign_id, token_id, amount, apy, start_ts, end_ts) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [userId, poolId, campaignId, token, amount, apy, start.toISO(), end.toISO()]
    );
    await client.query('COMMIT');
    res.status(201).json(stakeRows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
};

exports.getStakes = async (req, res) => {
  const { userId } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM stakes WHERE user_id=$1', [userId]);
    // Compute projectedRewards, timeElapsedPct, withdrawable
    const now = DateTime.utc();
    const stakes = rows.map(stake => {
      const projectedRewards = calcReward(stake.amount, stake.apy, (DateTime.fromISO(stake.end_ts).diff(DateTime.fromISO(stake.start_ts), 'months').months));
      const timeElapsed = Math.max(0, Math.min(1, now.diff(DateTime.fromISO(stake.start_ts), 'seconds').seconds / DateTime.fromISO(stake.end_ts).diff(DateTime.fromISO(stake.start_ts), 'seconds').seconds));
      return {
        ...stake,
        projectedRewards,
        timeElapsedPct: Math.round(timeElapsed * 100),
        withdrawable: now >= DateTime.fromISO(stake.end_ts) && !stake.withdrawn
      };
    });
    res.json(stakes);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};
