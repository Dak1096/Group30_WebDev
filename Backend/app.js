require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

// Stop right away when the secret is missing, it avoids confusing errors later
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing from the .env file');
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const courseRoutes = require('./routes/courses');
const gradeRoutes = require('./routes/grades');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
app.use(cors());            // lets the front end on another port call the API
app.use(express.json());    // makes req.body readable as JSON

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Unknown path
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Single error handler for the whole app, so every failure answers the same shape
app.use((err, req, res, next) => {
  // Body that is not valid JSON
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ success: false, message: 'Request body is not valid JSON' });
  }
  // Body larger than the express.json limit
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body is too large' });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Server error' });
});

// Check the MySQL connection as soon as the server starts
pool.query('SELECT 1')
  .then(() => console.log('Connected to MySQL'))
  .catch((err) => console.error('Cannot connect to MySQL:', err.message));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
