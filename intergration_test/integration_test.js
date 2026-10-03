const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const BASE = 'http://localhost:3000/api';
const stamp = Date.now(); // làm dữ liệu test không trùng với dữ liệu thật
const className = 'ITEST' + stamp;

// Gửi request tới Backend. raw dùng để gửi chuỗi không phải JSON hợp lệ
async function call(method, path, { body, token, raw } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  let payload;
  if (raw !== undefined) payload = raw;
  else if (body !== undefined) payload = JSON.stringify(body);
  const res = await fetch(BASE + path, { method, headers, body: payload });
  let json = {};
  try {
    json = await res.json();
  } catch {
    // Phản hồi không phải JSON, giữ json rỗng
  }
  return { status: res.status, json };
}

// Đọc một dòng trực tiếp từ database để đối chiếu với kết quả API
async function dbRow(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows[0];
}

describe('Integration test SMS', () => {
  let token;
  const studentIds = []; // id dữ liệu test, dùng để dọn dẹp cuối cùng
  const courseIds = [];
  let counter = 0;

  // Tạo sinh viên qua API và ghi nhớ id để dọn
  async function createStudent(fields = {}) {
    counter++;
    const r = await call('POST', '/students', {
      body: { name: `Zitest${stamp}n${counter}`, ...fields },
      token,
    });
    assert.equal(r.status, 201);
    studentIds.push(r.json.data.id);
    return r.json.data.id;
  }

  async function createCourse(fields = {}) {
    counter++;
    const r = await call('POST', '/courses', {
      body: { course_name: `Môn itest ${stamp} ${counter}`, credit: 3, ...fields },
      token,
    });
    assert.equal(r.status, 201);
    courseIds.push(r.json.data.id);
    return r.json.data.id;
  }

  before(async () => {
    const r = await call('POST', '/auth/login', {
      body: { username: 'admin', password: 'admin123' },
    });
    assert.equal(r.status, 200, 'Không đăng nhập được, hãy chạy seed_admin.js');
    token = r.json.data.token;
  });

  after(async () => {
    // Xóa sinh viên và môn học test, điểm liên quan bị xóa theo nhờ CASCADE
    if (studentIds.length) {
      await pool.query('DELETE FROM students WHERE id IN (?)', [studentIds]);
    }
    if (courseIds.length) {
      await pool.query('DELETE FROM courses WHERE id IN (?)', [courseIds]);
    }
    await pool.end();
  });

  describe('1. Đăng nhập và token', () => {
    it('đăng nhập đúng trả token JWT chứa role và hết hạn sau 2 giờ', async () => {
      const r = await call('POST', '/auth/login', {
        body: { username: 'admin', password: 'admin123' },
      });
      assert.equal(r.status, 200);
      assert.equal(r.json.success, true);
      const decoded = jwt.verify(r.json.data.token, process.env.JWT_SECRET);
      assert.equal(decoded.role, 'admin');
      assert.equal(decoded.exp - decoded.iat, 7200);
    });

    it('sai mật khẩu và sai tài khoản trả cùng một thông báo 401', async () => {
      const a = await call('POST', '/auth/login', {
        body: { username: 'admin', password: 'sai_mat_khau' },
      });
      const b = await call('POST', '/auth/login', {
        body: { username: 'khong_ton_tai_' + stamp, password: 'admin123' },
      });
      assert.equal(a.status, 401);
      assert.equal(b.status, 401);
      assert.equal(a.json.message, b.json.message);
    });

    it('thiếu tài khoản hoặc mật khẩu trả 400', async () => {
      const a = await call('POST', '/auth/login', { body: { username: 'admin' } });
      const b = await call('POST', '/auth/login');
      assert.equal(a.status, 400);
      assert.equal(b.status, 400);
    });

    it('mật khẩu trong database là hash bcrypt, không phải mật khẩu gốc', async () => {
      const user = await dbRow('SELECT password_hash FROM users WHERE username = ?', ['admin']);
      assert.notEqual(user.password_hash, 'admin123');
      assert.ok(user.password_hash.startsWith('$2'));
    });
  });

  describe('2. Bảo vệ route bằng token', () => {
    const protectedRoutes = [
      ['GET', '/students'],
      ['GET', '/students/classes'],
      ['POST', '/students'],
      ['PUT', '/students/1'],
      ['DELETE', '/students/1'],
      ['GET', '/courses'],
      ['POST', '/courses'],
      ['PUT', '/courses/1'],
      ['DELETE', '/courses/1'],
      ['GET', '/grades'],
      ['POST', '/grades'],
      ['GET', '/dashboard/overview'],
    ];

    it('mọi route được bảo vệ đều trả 401 khi không có token', async () => {
      for (const [method, path] of protectedRoutes) {
        const r = await call(method, path);
        assert.equal(r.status, 401, method + ' ' + path);
      }
    });

    it('token bịa, token ký sai khóa và token hết hạn đều trả 401', async () => {
      const fake = 'abc.def.ghi';
      const wrongKey = jwt.sign({ id: 1, role: 'admin' }, 'khoa_sai');
      const expired = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET, {
        expiresIn: -10,
      });
      for (const bad of [fake, wrongKey, expired]) {
        const r = await call('GET', '/students', { token: bad });
        assert.equal(r.status, 401);
      }
    });
  });

  describe('3. Sinh viên: thêm, sửa, xóa và đối chiếu database', () => {
    let id;
    let email;

    it('thêm sinh viên trả 201, tên được cắt khoảng trắng, dữ liệu nằm trong DB', async () => {
      email = `itest_${stamp}_a@example.com`;
      const r = await call('POST', '/students', {
        body: { name: `  Zitest${stamp}a  `, email, class_name: className },
        token,
      });
      assert.equal(r.status, 201);
      id = r.json.data.id;
      studentIds.push(id);
      const row = await dbRow('SELECT * FROM students WHERE id = ?', [id]);
      assert.equal(row.name, `Zitest${stamp}a`);
      assert.equal(row.email, email);
      assert.equal(row.class_name, className);
    });

    it('thiếu tên hoặc tên chỉ có khoảng trắng trả 400', async () => {
      const a = await call('POST', '/students', { body: { email: 'x@example.com' }, token });
      const b = await call('POST', '/students', { body: { name: '   ' }, token });
      assert.equal(a.status, 400);
      assert.equal(b.status, 400);
    });

    it('email trùng trả 409 và không tạo thêm dòng trong DB', async () => {
      const r = await call('POST', '/students', {
        body: { name: 'Trùng Email', email },
        token,
      });
      assert.equal(r.status, 409);
      const row = await dbRow('SELECT COUNT(*) AS total FROM students WHERE email = ?', [email]);
      assert.equal(row.total, 1);
    });

    it('nhiều sinh viên không có email vẫn thêm được, email lưu là NULL', async () => {
      const a = await createStudent({ email: '' });
      const b = await createStudent();
      const rows = await pool.query('SELECT email FROM students WHERE id IN (?)', [[a, b]]);
      assert.equal(rows[0].length, 2);
      assert.ok(rows[0].every((row) => row.email === null));
    });

    it('lưu và đọc lại đúng tiếng Việt có dấu', async () => {
      const name = `Nguyễn Thị Ánh Itest${stamp}`;
      const newId = await createStudent({ name });
      const row = await dbRow('SELECT name FROM students WHERE id = ?', [newId]);
      assert.equal(row.name, name);
      const r = await call('GET', '/students?search=' + encodeURIComponent(name), { token });
      assert.equal(r.status, 200);
      assert.equal(r.json.total, 1);
      assert.equal(r.json.data[0].name, name);
    });

    it('sửa sinh viên trả 200 và DB đổi theo', async () => {
      const r = await call('PUT', '/students/' + id, {
        body: { name: `Zitest${stamp}Sửa`, email, class_name: className + 'X' },
        token,
      });
      assert.equal(r.status, 200);
      const row = await dbRow('SELECT * FROM students WHERE id = ?', [id]);
      assert.equal(row.name, `Zitest${stamp}Sửa`);
      assert.equal(row.class_name, className + 'X');
    });

    it('sửa thiếu tên trả 400, sửa sinh viên không tồn tại trả 404', async () => {
      const a = await call('PUT', '/students/' + id, { body: { name: '' }, token });
      const b = await call('PUT', '/students/999999999', { body: { name: 'Không Có' }, token });
      assert.equal(a.status, 400);
      assert.equal(b.status, 404);
    });

    it('sửa sang email của người khác trả 409, dữ liệu cũ không đổi', async () => {
      const otherEmail = `itest_${stamp}_b@example.com`;
      await createStudent({ email: otherEmail });
      const r = await call('PUT', '/students/' + id, {
        body: { name: 'Tên Mới', email: otherEmail },
        token,
      });
      assert.equal(r.status, 409);
      const row = await dbRow('SELECT email FROM students WHERE id = ?', [id]);
      assert.equal(row.email, email);
    });

    it('xóa trả 200, xóa lại trả 404, DB không còn dòng đó', async () => {
      const a = await call('DELETE', '/students/' + id, { token });
      assert.equal(a.status, 200);
      const b = await call('DELETE', '/students/' + id, { token });
      assert.equal(b.status, 404);
      const row = await dbRow('SELECT id FROM students WHERE id = ?', [id]);
      assert.equal(row, undefined);
    });
  });

  describe('4. Khóa học: kiểm tra dữ liệu và đối chiếu database', () => {
    let id;

    it('thêm môn học trả 201 và dữ liệu nằm trong DB', async () => {
      const r = await call('POST', '/courses', {
        body: { course_name: `Môn itest ${stamp} gốc`, credit: 3, teacher: 'Thầy Test' },
        token,
      });
      assert.equal(r.status, 201);
      id = r.json.data.id;
      courseIds.push(id);
      const row = await dbRow('SELECT * FROM courses WHERE id = ?', [id]);
      assert.equal(row.credit, 3);
      assert.equal(row.teacher, 'Thầy Test');
    });

    it('thiếu tên hoặc tín chỉ ngoài khoảng, không nguyên, không phải số đều trả 400', async () => {
      const badCredits = [0, 11, 99, 2.5, 'abc'];
      const noName = await call('POST', '/courses', { body: { credit: 3 }, token });
      assert.equal(noName.status, 400);
      for (const credit of badCredits) {
        const r = await call('POST', '/courses', {
          body: { course_name: 'Môn Sai', credit },
          token,
        });
        assert.equal(r.status, 400, 'credit = ' + credit);
      }
    });

    it('tín chỉ để trống được chấp nhận và lưu là NULL', async () => {
      const newId = await createCourse({ credit: '' });
      const row = await dbRow('SELECT credit FROM courses WHERE id = ?', [newId]);
      assert.equal(row.credit, null);
    });

    it('sửa môn học trả 200, DB đổi theo, tín chỉ sai trả 400, không tồn tại trả 404', async () => {
      const ok = await call('PUT', '/courses/' + id, {
        body: { course_name: `Môn itest ${stamp} sửa`, credit: 4 },
        token,
      });
      assert.equal(ok.status, 200);
      const row = await dbRow('SELECT * FROM courses WHERE id = ?', [id]);
      assert.equal(row.credit, 4);
      const bad = await call('PUT', '/courses/' + id, {
        body: { course_name: 'Môn', credit: 99 },
        token,
      });
      assert.equal(bad.status, 400);
      const missing = await call('PUT', '/courses/999999999', {
        body: { course_name: 'Môn', credit: 3 },
        token,
      });
      assert.equal(missing.status, 404);
    });

    it('tìm kiếm môn học khớp ở giữa tên', async () => {
      const r = await call('GET', '/courses?search=' + encodeURIComponent('itest ' + stamp), {
        token,
      });
      assert.equal(r.status, 200);
      assert.ok(r.json.total >= 1);
    });

    it('xóa trả 200, xóa lại trả 404', async () => {
      const a = await call('DELETE', '/courses/' + id, { token });
      assert.equal(a.status, 200);
      const b = await call('DELETE', '/courses/' + id, { token });
      assert.equal(b.status, 404);
    });
  });

  describe('5. Điểm: kiểm tra, upsert và ràng buộc database', () => {
    let studentId;
    let courseId;
    let courseB;

    before(async () => {
      studentId = await createStudent();
      courseId = await createCourse();
      courseB = await createCourse();
    });

    it('lưu điểm mới trả 201 và nằm trong DB', async () => {
      const r = await call('POST', '/grades', {
        body: { student_id: studentId, course_id: courseId, grade: 8.5 },
        token,
      });
      assert.equal(r.status, 201);
      const row = await dbRow(
        'SELECT grade FROM grades WHERE student_id = ? AND course_id = ?',
        [studentId, courseId]
      );
      assert.equal(Number(row.grade), 8.5);
    });

    it('chấm lại cùng cặp sinh viên và môn học thì cập nhật, không tạo dòng thứ hai', async () => {
      const r = await call('POST', '/grades', {
        body: { student_id: studentId, course_id: courseId, grade: 9 },
        token,
      });
      assert.equal(r.status, 201);
      const [rows] = await pool.query(
        'SELECT grade FROM grades WHERE student_id = ? AND course_id = ?',
        [studentId, courseId]
      );
      assert.equal(rows.length, 1);
      assert.equal(Number(rows[0].grade), 9);
    });

    it('bảng điểm trả tên sinh viên và tên môn học nhờ JOIN', async () => {
      const row = await dbRow(
        'SELECT id FROM grades WHERE student_id = ? AND course_id = ?',
        [studentId, courseId]
      );
      const pos = await dbRow('SELECT COUNT(*) AS total FROM grades WHERE id <= ?', [row.id]);
      const page = Math.ceil(pos.total / 10);
      const r = await call('GET', `/grades?limit=10&page=${page}`, { token });
      assert.equal(r.status, 200);
      const found = r.json.data.find((g) => g.id === row.id);
      assert.ok(found, 'Không thấy dòng điểm vừa lưu trong bảng điểm');
      assert.equal(found.student_id, studentId);
      assert.equal(found.course_id, courseId);
      assert.ok(found.student_name.startsWith('Zitest'));
      assert.ok(found.course_name.startsWith('Môn itest'));
      assert.equal(Number(found.grade), 9);
    });

    it('điểm ngoài khoảng hoặc không phải số trả 400', async () => {
      const badGrades = [11, -1, 'abc', '', undefined];
      for (const grade of badGrades) {
        const r = await call('POST', '/grades', {
          body: { student_id: studentId, course_id: courseB, grade },
          token,
        });
        assert.equal(r.status, 400, 'grade = ' + grade);
      }
      const row = await dbRow(
        'SELECT id FROM grades WHERE student_id = ? AND course_id = ?',
        [studentId, courseB]
      );
      assert.equal(row, undefined);
    });

    it('điểm biên 0 và 10 được chấp nhận', async () => {
      const a = await call('POST', '/grades', {
        body: { student_id: studentId, course_id: courseB, grade: 0 },
        token,
      });
      const b = await call('POST', '/grades', {
        body: { student_id: studentId, course_id: courseB, grade: 10 },
        token,
      });
      assert.equal(a.status, 201);
      assert.equal(b.status, 201);
    });

    it('thiếu sinh viên hoặc môn học trả 400', async () => {
      const a = await call('POST', '/grades', { body: { course_id: courseId, grade: 5 }, token });
      const b = await call('POST', '/grades', { body: { student_id: studentId, grade: 5 }, token });
      assert.equal(a.status, 400);
      assert.equal(b.status, 400);
    });

    it('sinh viên hoặc môn học không tồn tại trả 400 nhờ khóa ngoại', async () => {
      const a = await call('POST', '/grades', {
        body: { student_id: 999999999, course_id: courseId, grade: 5 },
        token,
      });
      const b = await call('POST', '/grades', {
        body: { student_id: studentId, course_id: 999999999, grade: 5 },
        token,
      });
      assert.equal(a.status, 400);
      assert.equal(b.status, 400);
    });

    it('database tự chặn điểm 11 dù bỏ qua Backend (cần MySQL 8.0.16 trở lên)', async () => {
      const extra = await createCourse();
      await assert.rejects(
        pool.query('INSERT INTO grades (student_id, course_id, grade) VALUES (?, ?, ?)', [
          studentId,
          extra,
          11,
        ]),
        (err) => err.code === 'ER_CHECK_CONSTRAINT_VIOLATED'
      );
    });
  });

  describe('6. Xóa dây chuyền (ON DELETE CASCADE)', () => {
    it('xóa sinh viên thì điểm của sinh viên bị xóa, môn học còn nguyên', async () => {
      const studentId = await createStudent();
      const courseId = await createCourse();
      await call('POST', '/grades', {
        body: { student_id: studentId, course_id: courseId, grade: 7 },
        token,
      });
      const r = await call('DELETE', '/students/' + studentId, { token });
      assert.equal(r.status, 200);
      const grades = await dbRow('SELECT COUNT(*) AS total FROM grades WHERE student_id = ?', [
        studentId,
      ]);
      assert.equal(grades.total, 0);
      const course = await dbRow('SELECT id FROM courses WHERE id = ?', [courseId]);
      assert.ok(course);
    });

    it('xóa môn học thì điểm của môn bị xóa, sinh viên còn nguyên', async () => {
      const studentId = await createStudent();
      const courseId = await createCourse();
      await call('POST', '/grades', {
        body: { student_id: studentId, course_id: courseId, grade: 6 },
        token,
      });
      const r = await call('DELETE', '/courses/' + courseId, { token });
      assert.equal(r.status, 200);
      const grades = await dbRow('SELECT COUNT(*) AS total FROM grades WHERE course_id = ?', [
        courseId,
      ]);
      assert.equal(grades.total, 0);
      const student = await dbRow('SELECT id FROM students WHERE id = ?', [studentId]);
      assert.ok(student);
    });
  });

  describe('7. Dashboard khớp với database', () => {
    it('ba số liệu trùng với kết quả đếm trực tiếp trong DB', async () => {
      const r = await call('GET', '/dashboard/overview', { token });
      assert.equal(r.status, 200);
      const s = await dbRow('SELECT COUNT(*) AS total FROM students');
      const c = await dbRow('SELECT COUNT(*) AS total FROM courses');
      const g = await dbRow('SELECT ROUND(AVG(grade), 2) AS average FROM grades');
      assert.equal(r.json.data.totalStudents, s.total);
      assert.equal(r.json.data.totalCourses, c.total);
      if (g.average === null) {
        assert.equal(r.json.data.averageGrade, null);
      } else {
        assert.equal(Number(r.json.data.averageGrade), Number(g.average));
      }
    });

    it('thêm một sinh viên thì tổng sinh viên tăng đúng 1', async () => {
      const before = await call('GET', '/dashboard/overview', { token });
      await createStudent();
      const after = await call('GET', '/dashboard/overview', { token });
      assert.equal(after.json.data.totalStudents, before.json.data.totalStudents + 1);
    });
  });

  describe('8. Phân trang, tìm kiếm và lọc lớp', () => {
    const pageClass = className + 'P';
    const pagePrefix = 'Zpage' + stamp;
    const pageIds = [];

    before(async () => {
      for (let i = 1; i <= 3; i++) {
        pageIds.push(await createStudent({ name: pagePrefix + 'n' + i, class_name: pageClass }));
      }
    });

    it('lọc theo lớp với limit 2: trang 1 có 2 dòng, tổng 3 dòng, 2 trang', async () => {
      const r = await call('GET', `/students?class_name=${pageClass}&limit=2&page=1`, { token });
      assert.equal(r.status, 200);
      assert.equal(r.json.data.length, 2);
      assert.equal(r.json.total, 3);
      assert.equal(r.json.totalPages, 2);
      assert.equal(r.json.page, 1);
    });

    it('trang 2 còn đúng 1 dòng, trang quá lớn trả mảng rỗng', async () => {
      const a = await call('GET', `/students?class_name=${pageClass}&limit=2&page=2`, { token });
      assert.equal(a.json.data.length, 1);
      const b = await call('GET', `/students?class_name=${pageClass}&limit=2&page=99`, { token });
      assert.equal(b.status, 200);
      assert.equal(b.json.data.length, 0);
    });

    it('thứ tự các dòng giữa hai trang là tăng dần theo id, không lặp', async () => {
      const a = await call('GET', `/students?class_name=${pageClass}&limit=2&page=1`, { token });
      const b = await call('GET', `/students?class_name=${pageClass}&limit=2&page=2`, { token });
      const ids = [...a.json.data, ...b.json.data].map((s) => s.id);
      assert.deepEqual(ids, pageIds);
    });

    it('page âm và limit quá lớn được đưa về khoảng hợp lệ', async () => {
      const r = await call('GET', '/students?page=-5&limit=999999', { token });
      assert.equal(r.status, 200);
      assert.equal(r.json.page, 1);
      assert.ok(r.json.data.length <= 100);
    });

    it('tìm theo phần đầu tên, kết hợp với lọc lớp', async () => {
      const a = await call('GET', '/students?search=' + pagePrefix, { token });
      assert.equal(a.json.total, 3);
      const b = await call('GET', `/students?search=${pagePrefix}n1&class_name=${pageClass}`, {
        token,
      });
      assert.equal(b.json.total, 1);
    });

    it('tìm không có kết quả trả mảng rỗng, tổng 0 và 0 trang', async () => {
      const r = await call('GET', '/students?search=' + pagePrefix + 'khongco', { token });
      assert.equal(r.status, 200);
      assert.equal(r.json.data.length, 0);
      assert.equal(r.json.total, 0);
      assert.equal(r.json.totalPages, 0);
    });

    it('danh sách lớp có chứa lớp vừa tạo', async () => {
      const r = await call('GET', '/students/classes', { token });
      assert.equal(r.status, 200);
      assert.ok(r.json.data.includes(pageClass));
    });
  });

  describe('9. Xử lý lỗi chung của server', () => {
    it('đường dẫn không tồn tại trả 404 dạng JSON', async () => {
      const r = await call('GET', '/khong_co_duong_nay', { token });
      assert.equal(r.status, 404);
      assert.equal(r.json.success, false);
    });

    it('JSON gửi lên sai định dạng trả 400', async () => {
      const r = await call('POST', '/auth/login', { raw: '{ day khong phai json' });
      assert.equal(r.status, 400);
      assert.equal(r.json.success, false);
    });
  });
});
