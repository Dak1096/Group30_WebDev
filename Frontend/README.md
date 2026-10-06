# FrontEnd đã tách html / css / js

Tách từ `Overview.html` và `Dashboard.html`. Cấu trúc HTML, CSS, JS giữ
nguyên từ code gốc, chỉ chuyển sang file riêng.

```
FrontEnd/
├── Overview.html        trang chủ + popup đăng nhập
├── Dashboard.html       khung ứng dụng sau khi đăng nhập
├── css/
│   ├── style.css        dùng chung: biến màu, reset, body, chấm màu vai trò
│   ├── overview.css     riêng trang chủ
│   └── dashboard.css    riêng dashboard
├── js/
│   ├── overview.js      mở đóng popup, hiện mật khẩu, kiểm tra 2 ô nhập
│   └── dashboard.js     dữ liệu demo, phân quyền, các view và thao tác
└── images/
    ├── login-background.jpg    ảnh nền, tách từ base64 trong Overview.html
    └── LoginBackground.jpeg    ảnh trong zip, KHÔNG được dùng, xem mục 3
```

## Kiểm chứng

Chụp màn hình bản gốc và bản tách bằng Chromium rồi so từng pixel:

| Màn hình | Kết quả |
| --- | --- |
| Trang chủ | Giống hệt |
| Popup đăng nhập | Giống hệt |
| Dashboard, vai trò student | Giống hệt |
| Nhập điểm, vai trò teacher | Giống hệt |

Console không có lỗi JavaScript nào.

## Bốn điều cần biết

### 1. Ảnh nền đã tách khỏi base64

`Overview.html` gốc nhúng ảnh nền dạng base64 dài 337 nghìn ký tự, làm file
nặng 352 KB và gần như không mở nổi trong trình soạn thảo. Ảnh giờ nằm ở
`images/login-background.jpg`, và CSS trỏ tới nó:

```css
/* Language: CSS (css/overview.css) */
background: url("../images/login-background.jpg") center / cover no-repeat, var(--navy);
```

`Overview.html` từ 352 KB xuống còn 4 KB.

### 2. Thiếu images/usth-logo.png

`Overview.html` có dòng này:

```html
<img src="images/usth-logo.png" alt="USTH" class="logo-img" onerror="this.remove()">
```

File đó không có trong zip. Nhờ `onerror="this.remove()"` nên trang không vỡ,
nó tự bỏ thẻ ảnh và hiện logo chữ thay thế. Bổ sung file vào `images/` là
logo sẽ hiện.

### 3. LoginBackground.jpeg trong zip không được dùng

Ảnh nhúng trong HTML là 1920x1281. File `LoginBackground.jpeg` trong zip là
764x401, cùng tấm ảnh nhưng bị cắt nhỏ hơn. Trang không dùng tới nó. Giữ lại
phòng khi cần bản nhẹ cho điện thoại.

### 4. dashboard.js phải là script thường

Trong `dashboard.js`, HTML sinh ra có các thuộc tính gọi hàm trực tiếp:

```javascript
// Language: JavaScript (js/dashboard.js)
onclick="go('${k}')"
onchange="selClass=this.value;render()"
onclick="setGrade('${c.id}','${id}',this)"
```

Các hàm này phải nằm ở phạm vi toàn cục thì trình duyệt mới gọi được. Vì vậy
thẻ script viết như sau, **không** thêm `type="module"`:

```html
<script src="js/dashboard.js"></script>
```

Thêm `type="module"` sẽ làm mọi nút bấm trong dashboard ngừng hoạt động, và
lỗi chỉ xuất hiện lúc bấm chứ không báo ngay khi tải trang.

Cả hai thẻ script đặt ở cuối `<body>` vì code chạy `document.getElementById`
ngay khi tải, cần các thẻ HTML đã tồn tại.

## Đã nối với backend

### Chạy thử

1. Bật backend trước: `cd Backend` rồi `npm start`, chờ dòng `Server running on port 3000`.
2. Mở `FrontEnd/Overview.html` bằng Live Server (cổng 5500), hoặc bấm đúp mở thẳng file.
3. Đăng nhập `admin / admin123` hoặc `viewer / viewer123`.

Bật backend trước là quan trọng. VS Code Live Preview đôi khi tự chọn cổng 3000, trùng với backend, khi đó `npm start` báo `EADDRINUSE`.

### File nào làm gì

| File | Vai trò |
| --- | --- |
| `js/api.js` | File duy nhất gọi backend. Gắn token, đọc JSON, báo lỗi bằng message của server, token hết hạn thì về trang đăng nhập |
| `js/overview.js` | Form đăng nhập gọi `POST /api/auth/login`. Ô "Remember me" chọn giữa localStorage và sessionStorage |
| `js/dashboard.js` | 4 trang: Overview, Students, Courses, Grades, gọi các endpoint thật |

### So với bản demo của nhóm

Giữ nguyên toàn bộ CSS và khung HTML. Phần dữ liệu viết lại vì bản demo mô tả một hệ thống khác backend:

| Bản demo | Hiện tại | Lý do |
| --- | --- | --- |
| Vai trò student, teacher, admin | admin, viewer | Backend chỉ có hai vai trò |
| Lịch học (thứ, giờ, phòng) | Bỏ | Database không có cột lịch |
| "My classes" của từng sinh viên | Bỏ | Tài khoản không gắn với sinh viên |
| Trang quản lý tài khoản | Bỏ | Backend không có API tài khoản |
| Ô "Demo: view as" | Thay bằng dòng "Connected to" | Vai trò giờ lấy từ token |
| Nhập điểm theo lớp | Nhập điểm theo môn | Khớp `POST /api/grades` |

### Đã kiểm thử

Chạy trên trình duyệt với một server giả trả đúng hình dạng JSON của backend, 24/24 bước đạt:
đăng nhập sai và đúng, tìm kiếm có dấu, thêm và xóa sinh viên, lỗi validation từ server,
sửa điểm, điểm ngoài khoảng bị từ chối, đăng xuất, viewer không thấy nút sửa,
viewer gọi thẳng API xóa từ console bị 403, token hết hạn quay về trang đăng nhập,
tên chứa mã HTML hiện dưới dạng chữ. Chưa chạy với MySQL thật, cần thử lại trên máy có backend.
