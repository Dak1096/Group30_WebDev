const studentController = require('../../../controllers/studentController');
const Student = require('../../../models/Student');

// Replace the whole Student model, no database is touched
jest.mock('../../../models/Student');

describe('Unit Test: Student Controller', () => {
  let req, res;

  beforeEach(() => {
    // Fresh mocks and fresh req, res for every case
    jest.clearAllMocks();
    req = { query: {}, params: {}, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('getStudents', () => {
    test('Returns the list with paging fields, 200', async () => {
      const mockRows = [{ id: 1, name: 'Nguyen Van A', class_name: 'CNTT1' }];
      // Model now also reports which search strategy ran
      Student.findAll.mockResolvedValue({ rows: mockRows, total: 1, searchMode: 'none' });

      await studentController.getStudents(req, res);

      expect(Student.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRows,
        page: 1,
        total: 1,
        totalPages: 1,
        searchMode: 'none',
      });
    });

    test('Passes the search term down to the model', async () => {
      req.query = { search: 'Ha', class_name: 'CNTT1' };
      Student.findAll.mockResolvedValue({ rows: [], total: 0, searchMode: 'fulltext' });

      await studentController.getStudents(req, res);

      expect(Student.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Ha', className: 'CNTT1' })
      );
    });
  });

  describe('addStudent', () => {
    test('Returns 400 when the name is missing', async () => {
      req.body = { name: '' };

      await studentController.addStudent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Student name is required',
      });
      expect(Student.create).not.toHaveBeenCalled();
    });

    test('Returns 400 when the email format is wrong', async () => {
      req.body = { name: 'Tran Van B', email: 'not-an-email' };

      await studentController.addStudent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email format is invalid, expected name@example.com',
      });
      expect(Student.create).not.toHaveBeenCalled();
    });

    test('Creates the student, 201', async () => {
      const newStudent = { name: 'Tran Van B', email: 'b@gmail.com', class_name: 'CNTT2' };
      req.body = newStudent;
      Student.create.mockResolvedValue({ id: 2, ...newStudent });

      await studentController.addStudent(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 2, ...newStudent },
      });
    });

    test('Stores an empty optional field as NULL', async () => {
      req.body = { name: 'Tran Van B', email: '', class_name: '' };
      Student.create.mockResolvedValue({ id: 3 });

      await studentController.addStudent(req, res);

      expect(Student.create).toHaveBeenCalledWith({
        name: 'Tran Van B',
        email: null,
        class_name: null,
      });
    });

    test('Returns 409 when the email is already taken', async () => {
      req.body = { name: 'Tran Van B', email: 'taken@gmail.com' };
      const dupError = new Error('Duplicate entry');
      dupError.code = 'ER_DUP_ENTRY';
      Student.create.mockRejectedValue(dupError);

      await studentController.addStudent(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email already exists',
      });
    });
  });

  describe('getStudentById', () => {
    test('Returns 400 when the id is not a number', async () => {
      req.params.id = 'abc';

      await studentController.getStudentById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(Student.findDetail).not.toHaveBeenCalled();
    });

    test('Returns the student with the grades, 200', async () => {
      req.params.id = '1';
      const detail = { id: 1, name: 'Nguyen Van A', grades: [] };
      Student.findDetail.mockResolvedValue(detail);

      await studentController.getStudentById(req, res);

      expect(Student.findDetail).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: detail });
    });
  });

  describe('deleteStudent', () => {
    test('Returns 404 when no row was deleted', async () => {
      req.params.id = '999';
      Student.remove.mockResolvedValue(0);

      await studentController.deleteStudent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Student not found',
      });
    });

    test('Deletes the student, 200', async () => {
      req.params.id = '1';
      Student.remove.mockResolvedValue(1);

      await studentController.deleteStudent(req, res);

      expect(Student.remove).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Student deleted',
      });
    });
  });
});
