// Kiểm tra nhanh các API chính, cần Node 18 trở lên
// Chạy khi server đang bật: node tests/test_api.js
const BASE = 'http://localhost:3000/api';
let passed = 0;
let failed = 0;

async function call(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

function check(name, condition) {
  console.log((condition ? 'ĐẠT  ' : 'LỖI  ') + name);
  if (condition) passed++;
  else failed++;
}

async function main() {
  let r = await call('POST', '/auth/login', { username: 'admin', password: 'sai' });
  check('Đăng nhập sai trả 401', r.status === 401);

  r = await call('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  check('Đăng nhập đúng có token', r.status === 200 && Boolean(r.json.data.token));
  const token = r.json.data.token;

  r = await call('GET', '/students');
  check('Không có token trả 401', r.status === 401);

  r = await call('GET', '/students?limit=5', null, token);
  check('Có token lấy được danh sách', r.status === 200 && Array.isArray(r.json.data));

  const email = 'test' + Date.now() + '@example.com';
  r = await call('POST', '/students', { name: 'Sinh Viên Test', email }, token);
  check('Thêm sinh viên trả 201', r.status === 201);
  const newId = r.json.data && r.json.data.id;

  r = await call('POST', '/students', { name: 'Trùng Email', email }, token);
  check('Email trùng trả 409', r.status === 409);

  // Sửa sinh viên
  r = await call('PUT', '/students/' + newId, { name: 'Tên Đã Sửa', email }, token);
  check('Sửa sinh viên trả 200', r.status === 200);

  r = await call('PUT', '/students/' + newId, { name: '' }, token);
  check('Sửa thiếu tên trả 400', r.status === 400);

  r = await call('PUT', '/students/999999999', { name: 'Không Có' }, token);
  check('Sửa sinh viên không tồn tại trả 404', r.status === 404);

  const email2 = 'test2' + Date.now() + '@example.com';
  r = await call('POST', '/students', { name: 'Sinh Viên Hai', email: email2 }, token);
  const secondId = r.json.data && r.json.data.id;
  r = await call('PUT', '/students/' + newId, { name: 'Tên Đã Sửa', email: email2 }, token);
  check('Sửa sang email đã có trả 409', r.status === 409);
  await call('DELETE', '/students/' + secondId, null, token);

  r = await call('POST', '/grades', { student_id: newId, course_id: 1, grade: 11 }, token);
  check('Điểm 11 bị từ chối, trả 400', r.status === 400);

  r = await call('DELETE', '/students/' + newId, null, token);
  check('Xóa sinh viên thành công', r.status === 200);

  r = await call('DELETE', '/students/' + newId, null, token);
  check('Xóa lại trả 404', r.status === 404);

  // Thêm, sửa, xóa môn học
  r = await call('POST', '/courses', { course_name: 'Môn Test', credit: 3 }, token);
  check('Thêm môn học trả 201', r.status === 201);
  const courseId = r.json.data && r.json.data.id;

  const path = '/courses/' + courseId;
  r = await call('PUT', path, { course_name: 'Môn Đã Sửa', credit: 4 }, token);
  check('Sửa môn học trả 200', r.status === 200);

  r = await call('PUT', path, { course_name: 'Môn Đã Sửa', credit: 99 }, token);
  check('Sửa tín chỉ 99 bị từ chối, trả 400', r.status === 400);

  r = await call('DELETE', path, null, token);
  check('Xóa môn học thành công', r.status === 200);

  console.log('Tổng kết: ' + passed + ' đạt, ' + failed + ' lỗi');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Không kết nối được server:', err.message);
  process.exit(1);
});
