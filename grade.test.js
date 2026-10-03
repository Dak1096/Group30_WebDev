// Integration test cho điểm: kiểm tra, upsert, ràng buộc database và xóa dây chuyền
// Chạy riêng: node tests/integration/grade.test.js

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { runSuite } = require('./helpers');

function registerGradeTests(ctx) {
  const { call, dbRow, pool, createStudent, createCourse } = ctx;

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
        token: ctx.token,
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
        token: ctx.token,
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
      const r = await call('GET', `/grades?limit=10&page=${page}`, { token: ctx.token });
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
          token: ctx.token,
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
        token: ctx.token,
      });
      const b = await call('POST', '/grades', {
        body: { student_id: studentId, course_id: courseB, grade: 10 },
        token: ctx.token,
      });
      assert.equal(a.status, 201);
      assert.equal(b.status, 201);
    });

    it('thiếu sinh viên hoặc môn học trả 400', async () => {
      const a = await call('POST', '/grades', {
        body: { course_id: courseId, grade: 5 },
        token: ctx.token,
      });
      const b = await call('POST', '/grades', {
        body: { student_id: studentId, grade: 5 },
        token: ctx.token,
      });
      assert.equal(a.status, 400);
      assert.equal(b.status, 400);
    });

    it('sinh viên hoặc môn học không tồn tại trả 400 nhờ khóa ngoại', async () => {
      const a = await call('POST', '/grades', {
        body: { student_id: 999999999, course_id: courseId, grade: 5 },
        token: ctx.token,
      });
      const b = await call('POST', '/grades', {
        body: { student_id: studentId, course_id: 999999999, grade: 5 },
        token: ctx.token,
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
        token: ctx.token,
      });
      const r = await call('DELETE', '/students/' + studentId, { token: ctx.token });
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
        token: ctx.token,
      });
      const r = await call('DELETE', '/courses/' + courseId, { token: ctx.token });
      assert.equal(r.status, 200);
      const grades = await dbRow('SELECT COUNT(*) AS total FROM grades WHERE course_id = ?', [
        courseId,
      ]);
      assert.equal(grades.total, 0);
      const student = await dbRow('SELECT id FROM students WHERE id = ?', [studentId]);
      assert.ok(student);
    });
  });
}

module.exports = registerGradeTests;

// Chạy trực tiếp file này thì tự dựng bộ test riêng
if (require.main === module) runSuite('Integration test: điểm', [registerGradeTests]);
