const authMiddleware = require('../../../middleware/authMiddleware');
const jwt = require('jsonwebtoken');

// Đảm bảo secret key dùng chung cho bài test
process.env.JWT_SECRET = 'test_jwt_secret_key';

describe('Unit Test: Auth Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    test('Trả về 401 nếu thiếu Authorization header', () => {
        req = {
            headers: {},
            header: jest.fn().mockReturnValue(null)
        };

        authMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('Gọi next() nếu Token hợp lệ', () => {
        const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
        const authHeaderValue = `Bearer ${token}`;

        // Giả lập đủ cả req.headers lẫn phương thức req.header() của Express
        req = {
            headers: { authorization: authHeaderValue },
            header: jest.fn((headerName) => {
                if (headerName.toLowerCase() === 'authorization') {
                    return authHeaderValue;
                }
                return null;
            })
        };

        authMiddleware(req, res, next);

        // Kiểm tra next() đã được gọi
        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
    });
});