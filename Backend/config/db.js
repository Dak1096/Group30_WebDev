// Load .env variables
require('dotenv').config();
const mysql = require('mysql2/promise');

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',        // support Vietnamese & emoji
  waitForConnections: true,  // queue requests when pool is full
  connectionLimit: 10,       // max 10 concurrent connections
});

module.exports = pool;       // shared pool for all models