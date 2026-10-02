const pool = require('../config/db');

const Grade = {
  // JOIN students and courses so the list carries names, not only ids.
  // studentId and courseId are optional filters, both may be left out.
  async findAll({ studentId, courseId, limit, offset }) {
    const conditions = [];
    const params = [];
    if (studentId) {
      conditions.push('g.student_id = ?');
      params.push(studentId);
    }
    if (courseId) {
      conditions.push('g.course_id = ?');
      params.push(courseId);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await pool.query(
      `SELECT g.id, g.student_id, g.course_id, s.name AS student_name,
              c.course_name, g.grade
       FROM grades g
       JOIN students s ON g.student_id = s.id
       JOIN courses c ON g.course_id = c.id
       ${where}
       ORDER BY g.id LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM grades g ${where}`,
      params
    );
    return { rows, total };
  },

  // Insert, or update when this student already has a grade in this course
  async upsert({ student_id, course_id, grade }) {
    await pool.query(
      `INSERT INTO grades (student_id, course_id, grade) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE grade = VALUES(grade)`,
      [student_id, course_id, grade]
    );
    return { student_id, course_id, grade };
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM grades WHERE id = ?', [id]);
    return rows[0];
  },

  // The pair is UNIQUE in the schema, so at most one row comes back
  async findByPair(student_id, course_id) {
    const [rows] = await pool.query(
      'SELECT * FROM grades WHERE student_id = ? AND course_id = ?',
      [student_id, course_id]
    );
    return rows[0];
  },

  // Returns rows deleted, 0 means nothing matched
  async removeById(id) {
    const [result] = await pool.query('DELETE FROM grades WHERE id = ?', [id]);
    return result.affectedRows;
  },

  async removeByPair(student_id, course_id) {
    const [result] = await pool.query(
      'DELETE FROM grades WHERE student_id = ? AND course_id = ?',
      [student_id, course_id]
    );
    return result.affectedRows;
  },
};

module.exports = Grade;
