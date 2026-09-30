const jwt = require('jsonwebtoken');

// Runs before every controller, blocks a request with no token or a bad token
module.exports = function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not signed in' });
  }
  try {
    // Payload is { id, username, role }, roleMiddleware reads role from here
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Session expired, please sign in again' });
  }
};
