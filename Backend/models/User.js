const pool = require('../config/db');

const User = {
  async findByUsername(username) {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  },

  // Never selects password_hash, this feeds GET /api/auth/me
  async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, username, role FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  async create({ username, password_hash, role }) {
    await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, password_hash, role]
    );
  },
};

module.exports = User;
