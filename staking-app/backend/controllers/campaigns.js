const pool = require('../db');

exports.getCampaigns = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, campaign_id, name, pool_id FROM campaigns');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};
