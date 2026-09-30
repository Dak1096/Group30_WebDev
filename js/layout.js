const MENU = [ // Tạo array MENU vs các object key, label, href để hiển thị menu
    { key: 'dashboard', label: 'Dashboard', href: 'index.html' },
    { key: 'students', label: 'Sinh viên', href: 'students.html' },
    { key: 'courses', label: 'Khóa học', href: 'courses.html' },
    { key: 'grades', label: 'Chấm điểm', href: 'grades.html' },
];

export function renderLayout(activeKey) {// Hàm renderlayout vs value activeKey để biết menu nào đang active

    const links = MENU.map((item) => {// map() duyệt từng phần tử trong MENU

        const active = item.key === activeKey ? 'active' : '';//Toán tử đk: Nếu item.key =activeKey thì active = 'active', còn ko thì active = rỗng

        return `<a href="${item.href}" class="${active}"> 
            ${item.label}
        </a>`;
 //Tạo 1 html mới href = item.href, class = active, nội dung hiển thị = item.label
    }).join(''); //join() nối tất cả các phần tử trong mảng links thành 1 chuỗi html duy nhất
//Lấy sidebar từ index.html, dùng innerHTML để hiển thị html mới phía dưới
    document.getElementById('sidebar').innerHTML = `
        <div class="sidebar">
            <div class="logo">EduAdmin</div>
            ${links} //
            <button class="light logout" id="logoutBtn">
                Đăng xuất
            </button>
        </div>
    `;
// ${links} Hiển thị link đã tạo và join() ở trên MENU.map()
    document.getElementById('logoutBtn').onclick = () => {// Lấy logoutBtn từ index.html và chờ sự kiện onclick
        localStorage.removeItem('token');// Xóa token khỏi localStorage khi click vào logoutBtn

        window.location.href = 'login.html';//Chuyển hướng đến trang login
    };
}