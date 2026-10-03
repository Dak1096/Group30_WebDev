const authController = require('../../../controllers/authController');
const User = require('../../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../../../models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Unit Test: Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    process.env.JWT_SECRET = 'test_secret_key';
  });

  describe('login', () => {
    test('Trả về 400 nếu thiếu username hoặc password', async () => {
      req.body = { username: '', password: '' };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Thiếu tài khoản hoặc mật khẩu'
      });
    });

    test('Trả về 401 nếu không tìm thấy username trong CSDL', async () => {
      req.body = { username: 'nonexistent', password: 'password123' };
      User.findByUsername.mockResolvedValue(null);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Sai tài khoản hoặc mật khẩu'
      });
    });

    test('Trả về 401 nếu sai mật khẩu (bcrypt.compare = false)', async () => {
      req.body = { username: 'admin', password: 'wrongpassword' };
      User.findByUsername.mockResolvedValue({ id: 1, username: 'admin', password_hash: 'hashed_pw' });
      bcrypt.compare.mockResolvedValue(false);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Sai tài khoản hoặc mật khẩu'
      });
    });

    test('Đăng nhập thành công trả về token JWT (200 OK)', async () => {
      req.body = { username: 'admin', password: 'correctpassword' };
      const mockUser = { id: 1, role: 'admin', password_hash: 'hashed_pw' };
      User.findByUsername.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mocked_token_string');

      await authController.login(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { token: 'mocked_token_string' }
      });
    });
  });
});