// Authorization guard. Runs AFTER authMiddleware, so req.user already holds
// the token payload { id, username, role }.
// Usage: router.post('/', requireRole('admin'), controller.addStudent)

module.exports = function requireRole(...allowedRoles) {
  return function roleGuard(req, res, next) {
    // No req.user means authMiddleware was not mounted before this guard
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not signed in' });
    }

    // 403 not 401: the token is valid, the role is simply not high enough
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Your account does not have permission for this action',
      });
    }

    next();
  };
};
