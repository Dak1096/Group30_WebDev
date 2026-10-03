const studentController = require('../../../controllers/studentController');
const Student = require('../../../models/Student');

// Mock toàn bộ Model Student
jest.mock('../../../models/Student');

describe('Unit Test: Student Controller', () => {
    let req, res;

    beforeEach(() => {
        // Reset mock và khởi tạo lại req, res cho mỗi test case
        jest.clearAllMocks();
        req = {
            query: {},
            params: {},
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('getStudents', () => {
        test('Lấy danh sách sinh viên thành công (200 OK)', async () => {
            const mockRows = [{ id: 1, name: 'Nguyen Van A', class_name: 'CNTT1' }];
            // Match đúng cấu trúc { rows, total } mà Model trả về
            Student.findAll.mockResolvedValue({ rows: mockRows, total: 1 });

            await studentController.getStudents(req, res);

            expect(Student.findAll).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockRows,
                page: 1,
                total: 1,
                totalPages: 1
            });
        });
    });

    describe('addStudent', () => {
        test('Trả về 400 nếu thiếu tên sinh viên', async () => {
            req.body = { name: '' };

            await studentController.addStudent(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Thiếu tên sinh viên'
            });
        });

        test('Thêm sinh viên thành công (201 Created)', async () => {
            const newStudent = { name: 'Tran Van B', email: 'b@gmail.com', class_name: 'CNTT2' };
            req.body = newStudent;
            Student.create.mockResolvedValue({ id: 2, ...newStudent });

            await studentController.addStudent(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { id: 2, ...newStudent }
            });
        });

        test('Trả về 409 nếu Email bị trùng', async () => {
            req.body = { name: 'Tran Van B', email: 'trung@gmail.com' };
            const dupError = new Error('Duplicate entry');
            dupError.code = 'ER_DUP_ENTRY';
            Student.create.mockRejectedValue(dupError);

            await studentController.addStudent(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email đã tồn tại'
            });
        });
    });

    describe('deleteStudent', () => {
        test('Trả về 404 nếu không tìm thấy sinh viên cần xóa', async () => {
            req.params.id = '999';
            Student.remove.mockResolvedValue(0); // 0 dòng bị xóa

            await studentController.deleteStudent(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Không tìm thấy sinh viên'
            });
        });

        test('Xóa sinh viên thành công (200 OK)', async () => {
            req.params.id = '1';
            Student.remove.mockResolvedValue(1); // 1 dòng bị xóa

            await studentController.deleteStudent(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Đã xóa sinh viên'
            });
        });
    });
});