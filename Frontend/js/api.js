// Language: JavaScript (js/api.js)
// The only file that talks to the backend. Every page loads it first.
const API_BASE = 'http://localhost:3000/api';

/*Tạo 1 session vs 3 chức năng chính: save(lưu login để lần sau ko phải đăng nhập lại),
 token(lấy token gửi cho backend để xác thực thông tin đăng nhập), clear(sau khi bâm "Đăng xuất" thì xóa token) */
const session = { 
  save(token, user, remember) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem('roster_token', token);
    store.setItem('roster_user', JSON.stringify(user));
  },
  token() {
    return localStorage.getItem('roster_token') || sessionStorage.getItem('roster_token');
  },
  clear() {
    for (const store of [localStorage, sessionStorage]) {
      store.removeItem('roster_token');
      store.removeItem('roster_user');
    }
  },
};

/* Tạo 1 hàm api nhận 3 tham số:method(phương thức gửi request), path(đường dẫn), body(nội dung gửi) */
async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }; // Tạo 1 header để gửi dữ liệu dưới dạng json
  const token = session.token();
  if (token) headers.Authorization = 'Bearer ' + token;// Nếu có token thì thêm vào header để xác thực thông tin đăng nhập

  let res;
  try {
    res = await fetch(API_BASE + path, {// Gửi request URL đến backend VD: http://localhost:3000/api/users/login
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { //nếu fetch() ko kết nối đc server thì ném ra và thông báo lỗi 
    throw new Error('Cannot reach the server. Is the backend running on port 3000?');
  }

  const json = await res.json().catch(() => ({})); // Nếu res.json() bên trên lõi trả về 1 object rỗng {}


  if (res.status === 401 && token) { //Nếu status = 401 và có token thì xóa token và chuyển hướng về overview.html
    session.clear();
    location.href = 'Overview.html';
  }
  if (!res.ok || json.success === false) { // Nếu request ko thành công thì ném và thông báo lỗi
    throw new Error(json.message || 'Request failed with status ' + res.status);
  }
  return json;
}
