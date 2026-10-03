// Integration test cho khóa học: thêm, sửa, xóa, kiểm tra tín chỉ và tìm kiếm
// Chạy riêng: node tests/integration/course.test.js

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { runSuite } = require('./helpers');

function registerCourseTests(ctx) {
  const { call, dbRow, stamp, createCourse } = ctx;

  describe('4. Khóa học: kiểm tra dữ liệu và đối chiếu database', () => {
    let id;

    it('thêm môn học trả 201 và dữ liệu nằm trong DB', async () => {
      const r = await call('POST', '/courses', {
        body: { course_name: `Môn itest ${stamp} gốc`, credit: 3, teacher: 'Thầy Test' },
        token: ctx.token,
      });
      assert.equal(r.status, 201);
      id = r.json.data.id;
      ctx.courseIds.push(id);
      const row = await dbRow('SELECT * FROM courses WHERE id = ?', [id]);
      assert.equal(row.credit, 3);
      assert.equal(row.teacher, 'Thầy Test');
    });

    it('thiếu tên hoặc tín chỉ ngoài khoảng, không nguyên, không phải số đều trả 400', async () => {
      const badCredits = [0, 11, 99, 2.5, 'abc'];
      const noName = await call('POST', '/courses', {
        body: { credit: 3 },
        token: ctx.token,
      });
      assert.equal(noName.status, 400);
      for (const credit of badCredits) {
        const r = await call('POST', '/courses', {
          body: { course_name: 'Môn Sai', credit },
          token: ctx.token,
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
        token: ctx.token,
      });
      assert.equal(ok.status, 200);
      const row = await dbRow('SELECT * FROM courses WHERE id = ?', [id]);
      assert.equal(row.credit, 4);
      const bad = await call('PUT', '/courses/' + id, {
        body: { course_name: 'Môn', credit: 99 },
        token: ctx.token,
      });
      assert.equal(bad.status, 400);
      const missing = await call('PUT', '/courses/999999999', {
        body: { course_name: 'Môn', credit: 3 },
        token: ctx.token,
      });
      assert.equal(missing.status, 404);
    });

    it('tìm kiếm môn học khớp ở giữa tên', async () => {
      const r = await call('GET', '/courses?search=' + encodeURIComponent('itest ' + stamp), {
        token: ctx.token,
      });
      assert.equal(r.status, 200);
      assert.ok(r.json.total >= 1);
    });

    it('xóa trả 200, xóa lại trả 404', async () => {
      const a = await call('DELETE', '/courses/' + id, { token: ctx.token });
      assert.equal(a.status, 200);
      const b = await call('DELETE', '/courses/' + id, { token: ctx.token });
      assert.equal(b.status, 404);
    });
  });
}

module.exports = registerCourseTests;

// Chạy trực tiếp file này thì tự dựng bộ test riêng
if (require.main === module) runSuite('Integration test: khóa học', [registerCourseTests]);
