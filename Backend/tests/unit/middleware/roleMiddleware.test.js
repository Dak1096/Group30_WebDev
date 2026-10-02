const requireRole = require('../../../middleware/roleMiddleware');

describe('Unit Test: Role Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  test('Returns 401 when authMiddleware did not set req.user', () => {
    requireRole('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('Returns 403 when the role is not allowed', () => {
    req.user = { id: 2, username: 'viewer', role: 'viewer' };

    requireRole('admin')(req, res, next);

    // 403 not 401: the token is valid, the role is simply too low
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Your account does not have permission for this action',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('Calls next when the role is allowed', () => {
    req.user = { id: 1, username: 'admin', role: 'admin' };

    requireRole('admin')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('Accepts any role from the allowed list', () => {
    req.user = { id: 2, username: 'viewer', role: 'viewer' };

    requireRole('admin', 'viewer')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('An unknown role is rejected', () => {
    req.user = { id: 3, username: 'ghost', role: 'teacher' };

    requireRole('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
