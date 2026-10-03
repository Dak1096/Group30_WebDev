// Phần dùng chung cho mọi file integration test
// Chứa: gọi API, đọc database, tạo và dọn dữ liệu test, dựng bộ test
// Nơi duy nhất đăng nhập lấy token và nơi duy nhất đóng pool MySQL

const { describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const pool = require('../../config/db');

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

// Tạo ngữ cảnh dùng chung: token, hàm tiện ích, danh sách id cần dọn
function createContext() {
  const ctx = {
    token: null, // được gán ở hook before sau khi đăng nhập
    stamp,
    className,
    pool,
    call,
    dbRow,
    studentIds: [],
    courseIds: [],
  };
  let counter = 0;

  // Tạo sinh viên qua API và ghi nhớ id để dọn
  ctx.createStudent = async (fields = {}) => {
    counter++;
    const r = await call('POST', '/students', {
      body: { name: `Zitest${stamp}n${counter}`, ...fields },
      token: ctx.token,
    });
    assert.equal(r.status, 201);
    ctx.studentIds.push(r.json.data.id);
    return r.json.data.id;
  };

  // Tạo môn học qua API và ghi nhớ id để dọn
  ctx.createCourse = async (fields = {}) => {
    counter++;
    const r = await call('POST', '/courses', {
      body: { course_name: `Môn itest ${stamp} ${counter}`, credit: 3, ...fields },
      token: ctx.token,
    });
    assert.equal(r.status, 201);
    ctx.courseIds.push(r.json.data.id);
    return r.json.data.id;
  };

  return ctx;
}

// Dựng một bộ test: đăng nhập trước, chạy các nhóm test, dọn dữ liệu và đóng pool sau
// registers là danh sách hàm, mỗi hàm nhận ctx rồi khai báo các nhóm describe
function runSuite(title, registers) {
  const ctx = createContext();

  describe(title, () => {
    before(async () => {
      const r = await call('POST', '/auth/login', {
        body: { username: 'admin', password: 'admin123' },
      });
      assert.equal(r.status, 200, 'Không đăng nhập được, hãy chạy seed_admin.js');
      ctx.token = r.json.data.token;
    });

    after(async () => {
      // Xóa dữ liệu test, điểm liên quan bị xóa theo nhờ CASCADE
      if (ctx.studentIds.length) {
        await pool.query('DELETE FROM students WHERE id IN (?)', [ctx.studentIds]);
      }
      if (ctx.courseIds.length) {
        await pool.query('DELETE FROM courses WHERE id IN (?)', [ctx.courseIds]);
      }
      await pool.end();
    });

    for (const register of registers) register(ctx);
  });
}

module.exports = { runSuite };
