const pool = require('../db');

exports.getPools = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, token_id, apy, min_amount FROM pools');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

exports.createPool = async (req, res) => {
  const { token_id, name, apy, min_amount } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO pools (token_id, name, apy, min_amount) VALUES ($1, $2, $3, $4) RETURNING *',
      [token_id, name, apy, min_amount]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};
