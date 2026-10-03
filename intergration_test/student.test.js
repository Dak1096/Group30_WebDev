// Integration test cho sinh viên: thêm, sửa, xóa, phân trang, tìm kiếm và lọc lớp
// Chạy riêng: node tests/integration/student.test.js

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { runSuite } = require('./helpers');

function registerStudentTests(ctx) {
  const { call, dbRow, pool, stamp, className, createStudent } = ctx;

  describe('3. Sinh viên: thêm, sửa, xóa và đối chiếu database', () => {
    let id;
    let email;

    it('thêm sinh viên trả 201, tên được cắt khoảng trắng, dữ liệu nằm trong DB', async () => {
      email = `itest_${stamp}_a@example.com`;
      const r = await call('POST', '/students', {
        body: { name: `  Zitest${stamp}a  `, email, class_name: className },
        token: ctx.token,
      });
      assert.equal(r.status, 201);
      id = r.json.data.id;
      ctx.studentIds.push(id);
      const row = await dbRow('SELECT * FROM students WHERE id = ?', [id]);
      assert.equal(row.name, `Zitest${stamp}a`);
      assert.equal(row.email, email);
      assert.equal(row.class_name, className);
    });

    it('thiếu tên hoặc tên chỉ có khoảng trắng trả 400', async () => {
      const a = await call('POST', '/students', {
        body: { email: 'x@example.com' },
        token: ctx.token,
      });
      const b = await call('POST', '/students', {
        body: { name: '   ' },
        token: ctx.token,
      });
      assert.equal(a.status, 400);
      assert.equal(b.status, 400);
    });

    it('email trùng trả 409 và không tạo thêm dòng trong DB', async () => {
      const r = await call('POST', '/students', {
        body: { name: 'Trùng Email', email },
        token: ctx.token,
      });
      assert.equal(r.status, 409);
      const row = await dbRow('SELECT COUNT(*) AS total FROM students WHERE email = ?', [email]);
      assert.equal(row.total, 1);
    });

    it('nhiều sinh viên không có email vẫn thêm được, email lưu là NULL', async () => {
      const a = await createStudent({ email: '' });
      const b = await createStudent();
      const [rows] = await pool.query('SELECT email FROM students WHERE id IN (?)', [[a, b]]);
      assert.equal(rows.length, 2);
      assert.ok(rows.every((row) => row.email === null));
    });

    it('lưu và đọc lại đúng tiếng Việt có dấu', async () => {
      const name = `Nguyễn Thị Ánh Itest${stamp}`;
      const newId = await createStudent({ name });
      const row = await dbRow('SELECT name FROM students WHERE id = ?', [newId]);
      assert.equal(row.name, name);
      const r = await call('GET', '/students?search=' + encodeURIComponent(name), {
        token: ctx.token,
      });
      assert.equal(r.status, 200);
      assert.equal(r.json.total, 1);
      assert.equal(r.json.data[0].name, name);
    });

    it('sửa sinh viên trả 200 và DB đổi theo', async () => {
      const r = await call('PUT', '/students/' + id, {
        body: { name: `Zitest${stamp}Sửa`, email, class_name: className + 'X' },
        token: ctx.token,
      });
      assert.equal(r.status, 200);
      const row = await dbRow('SELECT * FROM students WHERE id = ?', [id]);
      assert.equal(row.name, `Zitest${stamp}Sửa`);
      assert.equal(row.class_name, className + 'X');
    });

    it('sửa thiếu tên trả 400, sửa sinh viên không tồn tại trả 404', async () => {
      const a = await call('PUT', '/students/' + id, {
        body: { name: '' },
        token: ctx.token,
      });
      const b = await call('PUT', '/students/999999999', {
        body: { name: 'Không Có' },
        token: ctx.token,
      });
      assert.equal(a.status, 400);
      assert.equal(b.status, 404);
    });

    it('sửa sang email của người khác trả 409, dữ liệu cũ không đổi', async () => {
      const otherEmail = `itest_${stamp}_b@example.com`;
      await createStudent({ email: otherEmail });
      const r = await call('PUT', '/students/' + id, {
        body: { name: 'Tên Mới', email: otherEmail },
        token: ctx.token,
      });
      assert.equal(r.status, 409);
      const row = await dbRow('SELECT email FROM students WHERE id = ?', [id]);
      assert.equal(row.email, email);
    });

    it('xóa trả 200, xóa lại trả 404, DB không còn dòng đó', async () => {
      const a = await call('DELETE', '/students/' + id, { token: ctx.token });
      assert.equal(a.status, 200);
      const b = await call('DELETE', '/students/' + id, { token: ctx.token });
      assert.equal(b.status, 404);
      const row = await dbRow('SELECT id FROM students WHERE id = ?', [id]);
      assert.equal(row, undefined);
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
      const r = await call('GET', `/students?class_name=${pageClass}&limit=2&page=1`, {
        token: ctx.token,
      });
      assert.equal(r.status, 200);
      assert.equal(r.json.data.length, 2);
      assert.equal(r.json.total, 3);
      assert.equal(r.json.totalPages, 2);
      assert.equal(r.json.page, 1);
    });

    it('trang 2 còn đúng 1 dòng, trang quá lớn trả mảng rỗng', async () => {
      const a = await call('GET', `/students?class_name=${pageClass}&limit=2&page=2`, {
        token: ctx.token,
      });
      assert.equal(a.json.data.length, 1);
      const b = await call('GET', `/students?class_name=${pageClass}&limit=2&page=99`, {
        token: ctx.token,
      });
      assert.equal(b.status, 200);
      assert.equal(b.json.data.length, 0);
    });

    it('thứ tự các dòng giữa hai trang là tăng dần theo id, không lặp', async () => {
      const a = await call('GET', `/students?class_name=${pageClass}&limit=2&page=1`, {
        token: ctx.token,
      });
      const b = await call('GET', `/students?class_name=${pageClass}&limit=2&page=2`, {
        token: ctx.token,
      });
      const ids = [...a.json.data, ...b.json.data].map((s) => s.id);
      assert.deepEqual(ids, pageIds);
    });

    it('page âm và limit quá lớn được đưa về khoảng hợp lệ', async () => {
      const r = await call('GET', '/students?page=-5&limit=999999', { token: ctx.token });
      assert.equal(r.status, 200);
      assert.equal(r.json.page, 1);
      assert.ok(r.json.data.length <= 100);
    });

    it('tìm theo phần đầu tên, kết hợp với lọc lớp', async () => {
      const a = await call('GET', '/students?search=' + pagePrefix, { token: ctx.token });
      assert.equal(a.json.total, 3);
      const b = await call('GET', `/students?search=${pagePrefix}n1&class_name=${pageClass}`, {
        token: ctx.token,
      });
      assert.equal(b.json.total, 1);
    });

    it('tìm không có kết quả trả mảng rỗng, tổng 0 và 0 trang', async () => {
      const r = await call('GET', '/students?search=' + pagePrefix + 'khongco', {
        token: ctx.token,
      });
      assert.equal(r.status, 200);
      assert.equal(r.json.data.length, 0);
      assert.equal(r.json.total, 0);
      assert.equal(r.json.totalPages, 0);
    });

    it('danh sách lớp có chứa lớp vừa tạo', async () => {
      const r = await call('GET', '/students/classes', { token: ctx.token });
      assert.equal(r.status, 200);
      assert.ok(r.json.data.includes(pageClass));
    });
  });
}

module.exports = registerStudentTests;

// Chạy trực tiếp file này thì tự dựng bộ test riêng
if (require.main === module) runSuite('Integration test: sinh viên', [registerStudentTests]);
