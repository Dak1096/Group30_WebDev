// Language: JavaScript (js/overview.js)
// Sign in popup: open, close, show password, send the form to the backend.
// Loaded at the end of body, so every element already exists.

// Lấy các phần tử loginModal, username, password,.. từ HTML 
const modal   = document.getElementById('loginModal');
const userIn  = document.getElementById('username');
const pw      = document.getElementById('password');
const toggle  = document.querySelector('.password-toggle');
const form    = document.querySelector('.login-form');
const errorEl = document.getElementById('formError');
const submitBtn = form.querySelector('button[type="submit"]');
let lastFocus = null;

function openModal() {// Tạo 1 hàm để mở modal đăng nhập(Phần cửa sổ login): focus vào ô username và lưu phần tử đang focus trước đó vào lastFocus
    lastFocus = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => userIn.focus(), 300);   // chờ cho animation mở modal rồi focus vào ô username
}

function closeModal() {//Hàm đóng modal đăng nhập: ẩn modal, xóa thông báo lỗi đăng nhập và quay về phần tử focus cũ
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    errorEl.textContent = '';
    if (lastFocus) lastFocus.focus();
}

document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', openModal));//Khi bấm vào button có data-open -> gọi hàm openModal
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));//bấm button data-close -> gọi hàm closeModal
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();//Nếu nhấn phím Escape trong khi modal mở thì gọi hàm closeModal
});

toggle.addEventListener('click', () => {//Bấm nút "Show" thì hiện password, còn "Hide" thì ẩn đi
    const show = pw.type === 'password';
    pw.type = show ? 'text' : 'password';
    toggle.textContent = show ? 'Hide' : 'Show';
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});

form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!userIn.value.trim()) {//Ktra xem username có rỗng ko, nếu rỗng thì báo lỗi r focus vào ô username
        errorEl.textContent = 'Enter your username.';
        userIn.focus();
        return;
    }
    if (!pw.value) {//Ktra password có rỗng ko, nêu rỗng thì báo lỗi r focus vào ô password
        errorEl.textContent = 'Enter your password.';
        pw.focus();
        return;
    }
    errorEl.textContent = '';//Xóa thông báo lỗi cũ 
    submitBtn.disabled = true;//Khóa nút submit để tránh bấm request nhiều lần

    try {
        session.clear();//Xóa token cũ trc khi đăng nhập mới

        const r = await api('POST', '/auth/login', {//Gửi username và password lên backend
            username: userIn.value.trim(),
            password: pw.value,
        });
        session.save(r.data.token, r.data.user, document.getElementById('remember').checked);//Bấm vào "remember me" thì lưu thông tin ng dùng
        location.href = 'Dashboard.html';
    } catch (err) {
        errorEl.textContent = err.message;
    } finally {
        submitBtn.disabled = false;
    }
});
