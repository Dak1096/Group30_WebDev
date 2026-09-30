const BASE_URL = 'http://localhost:3000/api';
export default async function apiRequest(endpoint, options = {}) { //Tạo hàm apiRequest để gửi request đến backend
    const token = localStorage.getItem('token'); //lấy token từ localStorage sau khi đăng nhập thành công
    try {
        const response = await fetch(BASE_URL + endpoint, { // fetch để gửi request đến backend với endpoint & options
            ...options, // "..." là spread operator để lấy tất cả các thuộc tính của options cho vào object
            headers: {
                'Content-Type': 'application/json', // Đặt header content-type dưới dạng json
                ...(token && { Authorization: `Bearer ${token}` }),/* Nếu token tồn tại thì thêm header
                 Authorization với giá trị Bearer + token */
                ...options.headers
            }
        });
        let data = {};
        try {
            data = await response.json();
        } catch {
        }
        if (!response.ok) { //Check xem HTTP response có thành công hay không, nếu không thì ném ra lỗi
            if (response.status === 401 && endpoint !== '/auth/login') { /* Nếu status = 401 và endpoint không phải 
                là '/auth/login' thì xóa token và chuyển hướng đến trang login */
                localStorage.removeItem('token');
                window.location.href = 'login.html';
            }
            const error = new Error(
                data.message || 'An error occurred' //Nếu backend ko trả message thì hiển thị 'An error occurred'
            );
            error.status = response.status;
            throw error; //Đẩy lỗi ra ngoài để nơi gọi apiRequest xử lý
        }
        return data;
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error('Unable to connect to the server');
        }
        throw error;
    }
}