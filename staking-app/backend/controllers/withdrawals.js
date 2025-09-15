const pool = require('../db');
const { DateTime } = require('luxon');

exports.withdraw = async (req, res) => {
  const { stakeId, userId } = req.body;
  if (!stakeId || !userId) return res.status(400).json({ error: 'Missing fields' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: stakeRows } = await client.query('SELECT * FROM stakes WHERE id=$1 AND user_id=$2 FOR UPDATE', [stakeId, userId]);
    const stake = stakeRows[0];
    if (!stake) throw new Error('Stake not found');
    if (stake.withdrawn) throw new Error('Already withdrawn');
    if (DateTime.utc() < DateTime.fromISO(stake.end_ts)) throw new Error('Stake not matured');
    // Mark withdrawn
    await client.query('UPDATE stakes SET withdrawn=TRUE, withdrawn_ts=NOW() WHERE id=$1', [stakeId]);
    // Credit wallet
    await client.query('UPDATE wallets SET balance=balance+$1 WHERE user_id=$2 AND token_id=$3', [stake.amount, userId, stake.token_id]);
    // Insert transaction
    await client.query('INSERT INTO transactions (user_id, type, amount, token_id, meta) VALUES ($1, $2, $3, $4, $5)', [userId, 'withdraw', stake.amount, stake.token_id, JSON.stringify({ stakeId })]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
};
