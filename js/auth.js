        import apiRequest from './api.js'; //lấy hàm apiRequest từ api.js
    if (localStorage.getItem('token')) {
        window.location.href = 'index.html'; //Check xem đã đăng nhập chưa, nếu r thì chuyển hướng đến index.html   
    }
    const loginForm = document.getElementById('loginForm');// Lấy form login từ login.html
    const loginError = document.getElementById('loginError');
    loginForm.addEventListener('submit', async (event) => { // Check xem form login đã submit chưa
        event.preventDefault();//ngăn hành vị mặc định load lại trang khi submit form
        loginError.textContent = ''; // Xóa thông báo lỗi trước khi gửi request
        const formData = new FormData(loginForm);// Lấy dữ liệu từ form login
        const username = formData.get('username'); // Lấy giá trị username từ form login
        const password = formData.get('password');
    
        try {// đề phòng lỗi khi gửi request đến backend
            const res = await apiRequest('/auth/login', { // Gửi request đến backend với endpoint = /auth/login 
                method: 'POST', // options của apiRequest = method: 'POST', body:...x sx
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
            localStorage.setItem('token', res.data.token); // Nếu đang nhập thành công, lưu token vào localStorage
            window.location.href = 'index.html';
        } catch (error) { // Nếu có lỗi xảy ra khi gửi request đến backend, hiển thị thông báo lỗi
            if (error.status === 401) {
                loginError.textContent = 'Sai tài khoản hoặc mật khẩu';
            } else {
                loginError.textContent = error.message;
            }
        }
    });