const courseController = require('../../../controllers/courseController');
const Course = require('../../../models/Course');

jest.mock('../../../models/Course');

describe('Unit Test: Course Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { query: {}, params: {}, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getCourses', () => {
    test('Lấy danh sách môn học thành công (200 OK)', async () => {
      const mockCourses = [{ id: 1, course_name: 'Lập trình Web', credit: 3, teacher: 'Giảng viên A' }];
      Course.findAll.mockResolvedValue({ rows: mockCourses, total: 1 });

      await courseController.getCourses(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCourses,
        page: 1,
        total: 1,
        totalPages: 1
      });
    });
  });

  describe('addCourse', () => {
    test('Trả về 400 nếu thiếu tên môn học', async () => {
      req.body = { course_name: '', credit: 3 };

      await courseController.addCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Thiếu tên môn học'
      });
    });

    test('Trả về 400 nếu số tín chỉ ngoài khoảng 1 đến 10', async () => {
      req.body = { course_name: 'Toán cao cấp', credit: 15 };

      await courseController.addCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Số tín chỉ phải từ 1 đến 10'
      });
    });

    test('Thêm môn học thành công (201 Created)', async () => {
      const courseData = { course_name: 'Cơ sở dữ liệu', credit: 3, teacher: 'Giảng viên B' };
      req.body = courseData;
      Course.create.mockResolvedValue({ id: 1, ...courseData });

      await courseController.addCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1, ...courseData }
      });
    });
  });

  describe('updateCourse', () => {
    test('Trả về 404 nếu không tìm thấy môn học cần sửa', async () => {
      req.params.id = '999';
      req.body = { course_name: 'Vật lý 1', credit: 2 };
      Course.findById.mockResolvedValue(null);

      await courseController.updateCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Không tìm thấy môn học'
      });
    });

    test('Cập nhật môn học thành công (200 OK)', async () => {
      req.params.id = '1';
      req.body = { course_name: 'Vật lý đại cương', credit: 3, teacher: 'Giảng viên C' };
      Course.findById.mockResolvedValue({ id: 1 });
      Course.update.mockResolvedValue();

      await courseController.updateCourse(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Đã cập nhật môn học'
      });
    });
  });

  describe('deleteCourse', () => {
    test('Trả về 404 nếu không tìm thấy môn học cần xóa', async () => {
      req.params.id = '999';
      Course.remove.mockResolvedValue(0);

      await courseController.deleteCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Không tìm thấy môn học'
      });
    });

    test('Xóa môn học thành công (200 OK)', async () => {
      req.params.id = '1';
      Course.remove.mockResolvedValue(1);

      await courseController.deleteCourse(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Đã xóa môn học'
      });
    });
  });
});