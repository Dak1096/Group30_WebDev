const gradeController = require('../../../controllers/gradeController');
const Grade = require('../../../models/Grade');
const Student = require('../../../models/Student');
const Course = require('../../../models/Course');

// Replace all three models, no database is touched
jest.mock('../../../models/Grade');
jest.mock('../../../models/Student');
jest.mock('../../../models/Course');

describe('Unit Test: Grade Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { query: {}, params: {}, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('saveGrade', () => {
    test('Returns 400 when student_id is missing', async () => {
      req.body = { course_id: 1, grade: 8 };

      await gradeController.saveGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(Grade.upsert).not.toHaveBeenCalled();
    });

    test('Returns 400 when the grade is above 10', async () => {
      req.body = { student_id: 1, course_id: 1, grade: 12 };

      await gradeController.saveGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Grade must be between 0 and 10',
      });
    });

    test('Returns 404 when the student does not exist', async () => {
      req.body = { student_id: 999, course_id: 1, grade: 8 };
      Student.findById.mockResolvedValue(undefined);

      await gradeController.saveGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Student not found',
      });
    });

    test('Returns 404 when the course does not exist', async () => {
      req.body = { student_id: 1, course_id: 999, grade: 8 };
      Student.findById.mockResolvedValue({ id: 1 });
      Course.findById.mockResolvedValue(undefined);

      await gradeController.saveGrade(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Course not found',
      });
    });

    test('Saves the grade, 201', async () => {
      req.body = { student_id: 1, course_id: 2, grade: 8.5 };
      Student.findById.mockResolvedValue({ id: 1 });
      Course.findById.mockResolvedValue({ id: 2 });
      Grade.upsert.mockResolvedValue({ student_id: 1, course_id: 2, grade: 8.5 });

      await gradeController.saveGrade(req, res);

      expect(Grade.upsert).toHaveBeenCalledWith({ student_id: 1, course_id: 2, grade: 8.5 });
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('deleteGradeById', () => {
    test('Returns 400 when the id is not a number', async () => {
      req.params.id = 'abc';

      await gradeController.deleteGradeById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(Grade.removeById).not.toHaveBeenCalled();
    });

    test('Returns 404 when no row was deleted', async () => {
      req.params.id = '999';
      Grade.removeById.mockResolvedValue(0);

      await gradeController.deleteGradeById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Grade not found',
      });
    });

    test('Deletes the grade, 200', async () => {
      req.params.id = '7';
      Grade.removeById.mockResolvedValue(1);

      await gradeController.deleteGradeById(req, res);

      expect(Grade.removeById).toHaveBeenCalledWith(7);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Grade deleted',
      });
    });
  });

  describe('deleteGradeByPair', () => {
    test('Returns 400 when course_id is missing', async () => {
      req.query = { student_id: '1' };

      await gradeController.deleteGradeByPair(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(Grade.removeByPair).not.toHaveBeenCalled();
    });

    test('Returns 404 when the pair has no grade', async () => {
      req.query = { student_id: '1', course_id: '2' };
      Grade.removeByPair.mockResolvedValue(0);

      await gradeController.deleteGradeByPair(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'This student has no grade in this course',
      });
    });

    test('Deletes by the pair, 200', async () => {
      req.query = { student_id: '1', course_id: '2' };
      Grade.removeByPair.mockResolvedValue(1);

      await gradeController.deleteGradeByPair(req, res);

      expect(Grade.removeByPair).toHaveBeenCalledWith(1, 2);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Grade deleted',
      });
    });
  });

  describe('getGrades', () => {
    test('Rejects an invalid student_id filter, 400', async () => {
      req.query = { student_id: 'abc' };

      await gradeController.getGrades(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(Grade.findAll).not.toHaveBeenCalled();
    });

    test('Passes the filters to the model', async () => {
      req.query = { student_id: '1', course_id: '2' };
      Grade.findAll.mockResolvedValue({ rows: [], total: 0 });

      await gradeController.getGrades(req, res);

      expect(Grade.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: 1, courseId: 2 })
      );
    });
  });
});
