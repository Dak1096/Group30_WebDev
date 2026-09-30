const pool = require('../config/db');

const Course = {
  // Small table, so a contains search needs no index
  async findAll({ search, limit, offset }) {
    const where = search ? 'WHERE course_name LIKE ?' : '';
    const params = search ? ['%' + search + '%'] : [];

    const [rows] = await pool.query(
      `SELECT * FROM courses ${where} ORDER BY id LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM courses ${where}`,
      params
    );
    return { rows, total };
  },

  async create({ course_name, credit, teacher }) {
    const [result] = await pool.query(
      'INSERT INTO courses (course_name, credit, teacher) VALUES (?, ?, ?)',
      [course_name, credit, teacher]
    );
    return { id: result.insertId, course_name, credit, teacher };
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM courses WHERE id = ?', [id]);
    return rows[0];
  },

  // Course plus enrolled students, used by GET /api/courses/:id
  async findDetail(id) {
    const course = await Course.findById(id);
    if (!course) return undefined;
    const [grades] = await pool.query(
      `SELECT g.id, g.student_id, s.name AS student_name, s.class_name, g.grade
       FROM grades g
       JOIN students s ON g.student_id = s.id
       WHERE g.course_id = ?
       ORDER BY s.name`,
      [id]
    );
    const [[stats]] = await pool.query(
      `SELECT COUNT(*) AS totalStudents, ROUND(AVG(grade), 2) AS averageGrade
       FROM grades WHERE course_id = ?`,
      [id]
    );
    return { ...course, totalStudents: stats.totalStudents, averageGrade: stats.averageGrade, grades };
  },

  async update(id, { course_name, credit, teacher }) {
    await pool.query(
      'UPDATE courses SET course_name = ?, credit = ?, teacher = ? WHERE id = ?',
      [course_name, credit, teacher, id]
    );
  },

  async remove(id) {
    const [result] = await pool.query('DELETE FROM courses WHERE id = ?', [id]);
    return result.affectedRows;
  },
};

module.exports = Course;
