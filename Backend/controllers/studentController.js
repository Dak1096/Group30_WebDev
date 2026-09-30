const Student = require('../models/Student');
const readPaging = require('../utils/paging');
const handleError = require('../utils/handleError');
const {
  text,
  checkId,
  checkName,
  checkEmail,
  checkOptionalText,
} = require('../utils/validators');

// Validate the body once, reused by add and update
function checkStudentBody(body) {
  const source = body || {};

  const name = checkName(source.name, 'Student name', 100);
  if (name.error) return { error: name.error };

  const email = checkEmail(source.email);
  if (email.error) return { error: email.error };

  const className = checkOptionalText(source.class_name, 'Class name', 50);
  if (className.error) return { error: className.error };

  return { data: { name: name.value, email: email.value, class_name: className.value } };
}

exports.getStudents = async (req, res) => {
  try {
    const { page, limit, offset } = readPaging(req.query);
    const { rows, total, searchMode } = await Student.findAll({
      search: text(req.query.search),
      className: text(req.query.class_name),
      limit,
      offset,
    });
    const totalPages = Math.ceil(total / limit);
    // searchMode shows which strategy ran, useful in the benchmark report
    res.json({ success: true, data: rows, page, total, totalPages, searchMode });
  } catch (err) {
    handleError(res, err);
  }
};

exports.getClasses = async (req, res) => {
  try {
    res.json({ success: true, data: await Student.listClasses() });
  } catch (err) {
    handleError(res, err);
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const id = checkId(req.params.id, 'Student id');
    if (id.error) {
      return res.status(400).json({ success: false, message: id.error });
    }
    const student = await Student.findDetail(id.value);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, data: student });
  } catch (err) {
    handleError(res, err);
  }
};

exports.addStudent = async (req, res) => {
  try {
    const { error, data } = checkStudentBody(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }
    const student = await Student.create(data);
    res.status(201).json({ success: true, data: student });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    handleError(res, err);
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const id = checkId(req.params.id, 'Student id');
    if (id.error) {
      return res.status(400).json({ success: false, message: id.error });
    }
    const { error, data } = checkStudentBody(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }
    if (!(await Student.findById(id.value))) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    await Student.update(id.value, data);
    res.json({ success: true, message: 'Student updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    handleError(res, err);
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const id = checkId(req.params.id, 'Student id');
    if (id.error) {
      return res.status(400).json({ success: false, message: id.error });
    }
    // Grades of this student are removed by ON DELETE CASCADE
    const removed = await Student.remove(id.value);
    if (removed === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, message: 'Student deleted' });
  } catch (err) {
    handleError(res, err);
  }
};
