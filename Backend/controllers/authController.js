const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const handleError = require('../utils/handleError');
const { text } = require('../utils/validators');

exports.login = async (req, res) => {
  try {
    const body = req.body || {};
    const username = text(body.username);
    const password = String(body.password || '');
    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Username and password are required' });
    }

    const user = await User.findByUsername(username);
    // Compare against the stored hash, never compare raw strings
    const valid = user && (await bcrypt.compare(password, user.password_hash));
    if (!valid) {
      // One message for every failure, it must not reveal which part was wrong
      return res
        .status(401)
        .json({ success: false, message: 'Incorrect username or password' });
    }

    // role travels inside the token, roleMiddleware reads it on every request
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    // user is sent back so the front end can hide buttons a viewer cannot use
    res.json({
      success: true,
      data: { token, user: { id: user.id, username: user.username, role: user.role } },
    });
  } catch (err) {
    handleError(res, err);
  }
};

// GET /api/auth/me, lets the front end restore the session after a refresh
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account no longer exists' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    handleError(res, err);
  }
};
