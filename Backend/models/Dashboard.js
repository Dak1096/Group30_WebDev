const pool = require('../config/db');

const Dashboard = {
  // Numbers for the four summary cards
  async overview() {
    const [[students]] = await pool.query('SELECT COUNT(*) AS total FROM students');
    const [[courses]] = await pool.query('SELECT COUNT(*) AS total FROM courses');
    const [[grades]] = await pool.query(
      'SELECT COUNT(*) AS total, ROUND(AVG(grade), 2) AS average FROM grades'
    );
    return {
      totalStudents: students.total,
      totalCourses: courses.total,
      totalGrades: grades.total,
      averageGrade: grades.average,      // NULL when no grade exists yet
    };
  },

  // Data for the two charts on the dashboard
  async charts() {
    // Count grades per band, same bands the interface uses
    const [[dist]] = await pool.query(
      `SELECT
         COALESCE(SUM(grade >= 8), 0) AS excellent,
         COALESCE(SUM(grade >= 7 AND grade < 8), 0) AS good,
         COALESCE(SUM(grade >= 5 AND grade < 7), 0) AS average,
         COALESCE(SUM(grade < 5), 0) AS weak
       FROM grades`
    );

    // Students per class, eight largest classes only
    const [classes] = await pool.query(
      `SELECT class_name AS label, COUNT(*) AS total
       FROM students
       WHERE class_name IS NOT NULL
       GROUP BY class_name
       ORDER BY total DESC
       LIMIT 8`
    );

    return {
      gradeDistribution: [
        { label: 'Excellent', value: Number(dist.excellent), color: 'green' },
        { label: 'Good', value: Number(dist.good), color: 'blue' },
        { label: 'Average', value: Number(dist.average), color: 'yellow' },
        { label: 'Weak', value: Number(dist.weak), color: 'red' },
      ],
      studentsByClass: classes.map((c) => ({ label: c.label, value: Number(c.total) })),
    };
  },
};

module.exports = Dashboard;
