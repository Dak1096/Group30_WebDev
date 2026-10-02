// Model only talks to the database, it knows nothing about request or response
const pool = require('../config/db');

// Created by database/upgrade.sql
const FULLTEXT_INDEX = 'ft_students_name';

// MySQL drops words shorter than innodb_ft_min_token_size, default 3.
// Vietnamese names are full of two letter syllables such as Ha or Le,
// so set innodb_ft_min_token_size = 2 in my.ini and keep this value in step.
const MIN_TOKEN = Number(process.env.FT_MIN_TOKEN_SIZE) || 2;

// Looked up once, then cached for the life of the process
let fulltextReady = null;

async function hasFulltextIndex() {
  if (fulltextReady !== null) return fulltextReady;
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS found FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'students'
       AND INDEX_NAME = ?`,
    [FULLTEXT_INDEX]
  );
  fulltextReady = rows[0].found > 0;
  if (!fulltextReady) {
    console.warn('Fulltext index missing, search falls back to LIKE. Run database/upgrade.sql');
  }
  return fulltextReady;
}

// Turn "thu ha" into "+thu* +ha*" so every word must match and a prefix is enough.
// Boolean operators typed by the user are stripped, they would change the meaning.
function toBooleanQuery(search) {
  return search
    .split(/\s+/)
    .map((word) => word.replace(/[+\-><()~*"@]/g, ''))
    .filter(Boolean)
    .map((word) => '+' + word + '*')
    .join(' ');
}

// Fulltext silently returns nothing when a word is below the minimum length
function tokensAreIndexable(search) {
  const words = search.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((word) => word.length >= MIN_TOKEN);
}

// Pick the fastest search that still returns the correct rows.
// Fulltext uses an index and matches a word anywhere in the name.
// LIKE with a leading wildcard is always correct but scans the table,
// so it only runs when fulltext cannot serve the term.
async function buildSearchClause(search) {
  if (!search) return null;
  const booleanQuery = toBooleanQuery(search);
  if (booleanQuery && tokensAreIndexable(search) && (await hasFulltextIndex())) {
    return {
      clause: 'MATCH(name) AGAINST (? IN BOOLEAN MODE)',
      param: booleanQuery,
      mode: 'fulltext',
    };
  }
  return { clause: 'name LIKE ?', param: '%' + search + '%', mode: 'like' };
}

const Student = {
  // List with search, class filter and paging
  async findAll({ search, className, limit, offset }) {
    const conditions = [];
    const params = [];
    let searchMode = 'none';

    const searchPart = await buildSearchClause(search);
    if (searchPart) {
      conditions.push(searchPart.clause);
      params.push(searchPart.param);
      searchMode = searchPart.mode;
    }
    if (className) {
      conditions.push('class_name = ?');
      params.push(className);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await pool.query(
      `SELECT * FROM students ${where} ORDER BY id LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM students ${where}`,
      params
    );
    return { rows, total, searchMode };
  },

  async create({ name, email, class_name }) {
    const [result] = await pool.query(
      'INSERT INTO students (name, email, class_name) VALUES (?, ?, ?)',
      [name, email, class_name]
    );
    return { id: result.insertId, name, email, class_name };
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
    return rows[0];
  },

  // Student plus every grade, used by GET /api/students/:id
  async findDetail(id) {
    const student = await Student.findById(id);
    if (!student) return undefined;
    const [grades] = await pool.query(
      `SELECT g.id, g.course_id, c.course_name, c.credit, g.grade
       FROM grades g
       JOIN courses c ON g.course_id = c.id
       WHERE g.student_id = ?
       ORDER BY c.course_name`,
      [id]
    );
    return { ...student, grades };
  },

  async update(id, { name, email, class_name }) {
    await pool.query(
      'UPDATE students SET name = ?, email = ?, class_name = ? WHERE id = ?',
      [name, email, class_name, id]
    );
  },

  // Returns rows deleted, 0 means this student does not exist
  async remove(id) {
    const [result] = await pool.query('DELETE FROM students WHERE id = ?', [id]);
    return result.affectedRows;
  },

  // Classes in use, feeds the class filter dropdown
  async listClasses() {
    const [rows] = await pool.query(
      `SELECT DISTINCT class_name FROM students
       WHERE class_name IS NOT NULL ORDER BY class_name`
    );
    return rows.map((r) => r.class_name);
  },
};

module.exports = Student;
