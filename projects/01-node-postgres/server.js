const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = 4500;

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/items', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM items ORDER BY id'
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Database query failed:', err.message);
    res.status(500).json({ error: 'database unavailable' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`inventory-api listening on 0.0.0.0:${port}`);
});
// marker comment
