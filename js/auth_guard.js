const DEV_MODE = true;
if (!localStorage.getItem('token')) { // Nếu ko nhận đc token đăng nhập thì chuyển hướng đến trang login
    window.location.href = 'login.html';
}