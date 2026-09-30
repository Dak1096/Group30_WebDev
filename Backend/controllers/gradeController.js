const Grade = require('../models/Grade');
const Student = require('../models/Student');
const Course = require('../models/Course');
const readPaging = require('../utils/paging');
const handleError = require('../utils/handleError');
const { checkId, checkGrade, isBlank } = require('../utils/validators');

exports.getGrades = async (req, res) => {
  try {
    const { page, limit, offset } = readPaging(req.query);

    // Both filters are optional, an invalid value is rejected rather than ignored
    let studentId = null;
    if (!isBlank(req.query.student_id)) {
      const checked = checkId(req.query.student_id, 'Student id');
      if (checked.error) {
        return res.status(400).json({ success: false, message: checked.error });
      }
      studentId = checked.value;
    }
    let courseId = null;
    if (!isBlank(req.query.course_id)) {
      const checked = checkId(req.query.course_id, 'Course id');
      if (checked.error) {
        return res.status(400).json({ success: false, message: checked.error });
      }
      courseId = checked.value;
    }

    const { rows, total } = await Grade.findAll({ studentId, courseId, limit, offset });
    const totalPages = Math.ceil(total / limit);
    res.json({ success: true, data: rows, page, total, totalPages });
  } catch (err) {
    handleError(res, err);
  }
};

exports.saveGrade = async (req, res) => {
  try {
    const body = req.body || {};

    const studentId = checkId(body.student_id, 'Student id');
    if (studentId.error) {
      return res.status(400).json({ success: false, message: studentId.error });
    }
    const courseId = checkId(body.course_id, 'Course id');
    if (courseId.error) {
      return res.status(400).json({ success: false, message: courseId.error });
    }
    // Checked here as well, data from the browser is never trusted
    const grade = checkGrade(body.grade);
    if (grade.error) {
      return res.status(400).json({ success: false, message: grade.error });
    }

    // Look up both rows first so the message names the missing one
    if (!(await Student.findById(studentId.value))) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    if (!(await Course.findById(courseId.value))) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const saved = await Grade.upsert({
      student_id: studentId.value,
      course_id: courseId.value,
      grade: grade.value,
    });
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ success: false, message: 'Student or course does not exist' });
    }
    handleError(res, err);
  }
};

// DELETE /api/grades/:id
exports.deleteGradeById = async (req, res) => {
  try {
    const id = checkId(req.params.id, 'Grade id');
    if (id.error) {
      return res.status(400).json({ success: false, message: id.error });
    }
    const removed = await Grade.removeById(id.value);
    if (removed === 0) {
      return res.status(404).json({ success: false, message: 'Grade not found' });
    }
    res.json({ success: true, message: 'Grade deleted' });
  } catch (err) {
    handleError(res, err);
  }
};

// DELETE /api/grades?student_id=1&course_id=2
// The pair is UNIQUE, so the front end can delete without knowing the grade id
exports.deleteGradeByPair = async (req, res) => {
  try {
    const source = { ...req.query, ...(req.body || {}) };

    const studentId = checkId(source.student_id, 'Student id');
    if (studentId.error) {
      return res.status(400).json({ success: false, message: studentId.error });
    }
    const courseId = checkId(source.course_id, 'Course id');
    if (courseId.error) {
      return res.status(400).json({ success: false, message: courseId.error });
    }

    const removed = await Grade.removeByPair(studentId.value, courseId.value);
    if (removed === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'This student has no grade in this course' });
    }
    res.json({ success: true, message: 'Grade deleted' });
  } catch (err) {
    handleError(res, err);
  }
};
