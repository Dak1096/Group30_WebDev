import apiRequest from './api.js'; // Lấy hàm apiRequest từ file api.js để gọi API
import { renderLayout } from './layout.js'; //Lấy hàm renderLayout từ file Layout.js để hiển thị layout
renderLayout('dashboard'); 
async function loadOverview() { 
 try {
 const res = await apiRequest('/dashboard/overview'); // Gửi request đến dashboard/overview để lấy data backend
 document.getElementById('totalStudents').textContent = res.data.totalStudents; // Hiển thị số lượng sinh viên từ data backend
 document.getElementById('totalCourses').textContent = res.data.totalCourses;
 document.getElementById('averageGrade').textContent = res.data.averageGrade ?? 'No data available'; /*Nếu res.data.averageGrae
  ko có giá trị thì hiển thị 'No data available' */
 } catch (err) {
 document.getElementById('dashError').textContent = 'Error: ' + err.message; // Hiển thị lỗi nếu có
 }
}
loadOverview();