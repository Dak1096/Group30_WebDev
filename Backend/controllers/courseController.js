const Course = require('../models/Course');
const readPaging = require('../utils/paging');
const handleError = require('../utils/handleError');
const {
  text,
  checkId,
  checkName,
  checkCredit,
  checkOptionalText,
} = require('../utils/validators');

// Validate the body once, reused by add and update
function checkCourseBody(body) {
  const source = body || {};

  const courseName = checkName(source.course_name, 'Course name', 100);
  if (courseName.error) return { error: courseName.error };

  const credit = checkCredit(source.credit);
  if (credit.error) return { error: credit.error };

  const teacher = checkOptionalText(source.teacher, 'Teacher name', 100);
  if (teacher.error) return { error: teacher.error };

  return {
    data: { course_name: courseName.value, credit: credit.value, teacher: teacher.value },
  };
}

exports.getCourses = async (req, res) => {
  try {
    const { page, limit, offset } = readPaging(req.query);
    const { rows, total } = await Course.findAll({
      search: text(req.query.search),
      limit,
      offset,
    });
    const totalPages = Math.ceil(total / limit);
    res.json({ success: true, data: rows, page, total, totalPages });
  } catch (err) {
    handleError(res, err);
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const id = checkId(req.params.id, 'Course id');
    if (id.error) {
      return res.status(400).json({ success: false, message: id.error });
    }
    const course = await Course.findDetail(id.value);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.json({ success: true, data: course });
  } catch (err) {
    handleError(res, err);
  }
};

exports.addCourse = async (req, res) => {
  try {
    const { error, data } = checkCourseBody(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }
    const course = await Course.create(data);
    res.status(201).json({ success: true, data: course });
  } catch (err) {
    handleError(res, err);
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const id = checkId(req.params.id, 'Course id');
    if (id.error) {
      return res.status(400).json({ success: false, message: id.error });
    }
    const { error, data } = checkCourseBody(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }
    if (!(await Course.findById(id.value))) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    await Course.update(id.value, data);
    res.json({ success: true, message: 'Course updated' });
  } catch (err) {
    handleError(res, err);
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const id = checkId(req.params.id, 'Course id');
    if (id.error) {
      return res.status(400).json({ success: false, message: id.error });
    }
    // Grades of this course are removed by ON DELETE CASCADE
    const removed = await Course.remove(id.value);
    if (removed === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    handleError(res, err);
  }
};
