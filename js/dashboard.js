// Language: JavaScript (js/dashboard.js)
// Dashboard backed by the real API. Load js/api.js before this file.
// Classic script on purpose: the inline onclick and onchange in the
// generated HTML need these functions and variables in global scope.

// NAV giúp lưu trữ các trang trong dashboard, ROLE đổi các giá trị role trong database thành tên dễ đọc 
const NAV = [['overview', 'Overview'], ['students', 'Students'], ['courses', 'Courses'], ['grades', 'Grades']];
const ROLE = { admin: 'Administrator', viewer: 'Viewer' };

let me = null, page = 'overview', courseId = 0, search = '';// Lưu ttin ng dùng; trang,id khóa học hiện tại, từ khóa tìm kiếm 
//Các const đc tạo ra làm hàm tiện ích dùng nhiều lần trong frontend
const $ = id => document.getElementById(id); // tìm HTML theo id
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));//thoát HTML để giúp dữ liệu an toàn
const letter = n => n >= 8.5 ? 'A' : n >= 7 ? 'B' : n >= 5.5 ? 'C' : n >= 4 ? 'D' : 'F';// Đổi điểm số thành A,B,C,D,F
const isAdmin = () => me.role === 'admin';//check role admin
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }// Hiện thông báo
const stat = (n, l) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`;// Tạo 1 ô thống kê
const table = (head, rows, empty) => rows.length ? `<div class="panel"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : `<div class="panel empty">${empty}</div>`;//Tạo 1 bảng thống kê HTML


const num = v => v === null || v === undefined ? null : Number(v);//chuyển giá trị sang dạng number
const shown = v => num(v) === null ? 'none' : num(v).toFixed(2);// hiển thị số vs 2 chữ số thập phân


const V = { // Tạo 1 object V để lấy dữ liệu từ backend và tạo ra các trang HTML trong dashboard
  async overview() {
    const [o, c] = await Promise.all([api('GET', '/dashboard/overview'), api('GET', '/dashboard/charts')]);//Gọi 2 API lấy dữ liệu thống kê tổng quan
    const d = o.data;
    return `<div class="stats">`
      + stat(d.totalStudents.toLocaleString(), 'Students') //Tạo các ô thống kê sinh viên, khóa học, điểm số
      + stat(d.totalCourses.toLocaleString(), 'Courses')
      + stat(d.totalGrades.toLocaleString(), 'Grades recorded')
      + stat(shown(d.averageGrade), 'Average grade')
      + `</div><h2>Grade distribution</h2>`
      + table(['Band', 'Grades'], c.data.gradeDistribution.map(b => `<tr><td><b>${esc(b.label)}</b></td><td>${b.value}</td></tr>`), 'No grades yet.')
      + `<h2>Largest classes</h2>`
      + table(['Class', 'Students'], c.data.studentsByClass.map(b => `<tr><td><b>${esc(b.label)}</b></td><td>${b.value}</td></tr>`), 'No classes yet.');
  },

  async students() {// hàm students() lấy danh sách sinh viên từ backend rồi tạo HTML cho trang students(Nếu là admin thì có thể thêm, xóa sinh viên)
    const q = new URLSearchParams({ limit: 20 });
    if (search) q.set('search', search);
    const r = await api('GET', '/students?' + q);
    const add = isAdmin() ? `<h2>Add student</h2><div class="panel pad"><div class="form">`
      + `<label>Name<input class="f" id="sn"></label>`
      + `<label>Email<input class="f" id="se" type="email"></label>`
      + `<label>Class<input class="f" id="sc"></label>`
      + `<button class="btn" onclick="addStudent()">Add student</button></div></div>` : '';
    const tools = `<div class="tools">`
      + `<input class="f" id="q" placeholder="Search by name" value="${esc(search)}" onkeydown="if (event.key === 'Enter') findStudents()">`
      + `<button class="btn" onclick="findStudents()">Search</button>`
      + `<span class="muted">${r.total.toLocaleString()} found · search mode: ${esc(r.searchMode)}</span></div>`;
    const head = ['ID', 'Name', 'Email', 'Class'].concat(isAdmin() ? [''] : []);
    const rows = r.data.map(s => `<tr><td class="muted">${s.id}</td><td><b>${esc(s.name)}</b></td>`
      + `<td class="muted">${esc(s.email || '')}</td><td>${esc(s.class_name || '')}</td>`
      + (isAdmin() ? `<td><button class="link" onclick="delStudent(${s.id})">Delete</button></td>` : '') + `</tr>`);
    const more = r.total > r.data.length ? `<p class="muted">Showing the first ${r.data.length}. Narrow the search to find others.</p>` : '';
    return add + `<h2>Students</h2>` + tools + table(head, rows, 'No student matches.') + more;
  },

  async courses() {//hàm courses() lấy danh sách khóa học từ backend rồi tạo HTML cho trang courses(Nếu là admin thì có thể thêm, xóa khóa học)
    const r = await api('GET', '/courses?limit=100');
    const add = isAdmin() ? `<h2>Add course</h2><div class="panel pad"><div class="form">`
      + `<label>Course name<input class="f" id="cn"></label>`
      + `<label>Credit<input class="f score" id="cc" type="number" min="1" max="10"></label>`
      + `<label>Teacher<input class="f" id="ct"></label>`
      + `<button class="btn" onclick="addCourse()">Add course</button></div></div>` : '';
    const head = ['ID', 'Course', 'Credit', 'Teacher'].concat(isAdmin() ? [''] : []);
    const rows = r.data.map(c => `<tr><td class="muted">${c.id}</td><td><b>${esc(c.course_name)}</b></td>`
      + `<td>${c.credit ?? ''}</td><td>${esc(c.teacher || '')}</td>`
      + (isAdmin() ? `<td><button class="link" onclick="delCourse(${c.id})">Delete</button></td>` : '') + `</tr>`);
    return add + `<h2>All courses</h2>` + table(head, rows, 'No courses yet.');
  },

  async grades() {//Lấy dữ liệu điểm số các courses từ backend rồi tạo HTML cho trang grades(Nếu là admin thì có thể sửa, thêm, xóa điểm số)
    const list = (await api('GET', '/courses?limit=100')).data;
    if (!list.length) return '<div class="panel empty">Add a course first.</div>';
    if (!list.some(c => c.id === courseId)) courseId = list[0].id;
    const d = (await api('GET', '/courses/' + courseId)).data;

    const picker = `<div class="tools"><label for="cls" class="muted">Course</label>`
      + `<select class="f" id="cls" onchange="courseId = Number(this.value); render()">`
      + list.map(c => `<option value="${c.id}" ${c.id === courseId ? 'selected' : ''}>${esc(c.course_name)}</option>`).join('')
      + `</select></div>`;
    const stats = `<div class="stats">${stat(d.totalStudents, 'Students with a grade')}${stat(shown(d.averageGrade), 'Course average')}</div>`;
    const add = isAdmin() ? `<div class="panel pad"><div class="form">`
      + `<label>Student ID<input class="f score" id="gs" type="number" min="1"></label>`
      + `<label>Score (0 to 10)<input class="f score" id="gv" type="number" min="0" max="10" step="0.5"></label>`
      + `<button class="btn" onclick="addGrade()">Save grade</button></div></div>` : '';
    const head = ['Student', 'Class', 'Score', 'Letter'].concat(isAdmin() ? [''] : []);
    const rows = d.grades.map(g => {
      const n = num(g.grade);
      const score = isAdmin()
        ? `<input class="f score" type="number" min="0" max="10" step="0.5" value="${n}" aria-label="Score for ${esc(g.student_name)}" onchange="saveGrade(${g.student_id}, this)">`
        : n;
      return `<tr><td><b>${esc(g.student_name)}</b> <span class="muted">#${g.student_id}</span></td>`
        + `<td class="muted">${esc(g.class_name || '')}</td><td>${score}</td><td class="pill">${letter(n)}</td>`
        + (isAdmin() ? `<td><button class="link" onclick="delGrade(${g.student_id})">Delete</button></td>` : '') + `</tr>`;
    });
    return picker + stats + add + table(head, rows, 'No grades in this course yet.');
  },
};

/* ===== Actions. Only admins see the buttons, and the server checks the role again ===== */
async function run(task, done) {// Tạo hàm run() để thực hiện task và thông báo thành công
  try {
    await task();
    toast(done);
    render();
  } catch (err) {
    toast(err.message);
  }
}
function findStudents() { search = $('q').value.trim(); render(); }//tạo hàm để tìm kiếm sinh viên và lưu vào search

function addStudent() {// Gửi POST /students để thêm sinh viên
  run(() => api('POST', '/students', { name: $('sn').value, email: $('se').value, class_name: $('sc').value }), 'Student added');
}
function delStudent(id) {// hỏi xác nhận để xóa sinh viên
  if (!confirm('Delete student ' + id + '? Their grades are deleted too.')) return;
  run(() => api('DELETE', '/students/' + id), 'Student deleted');
}
function addCourse() {// Gửi POST /courses để thêm khóa học
  run(() => api('POST', '/courses', { course_name: $('cn').value, credit: $('cc').value, teacher: $('ct').value }), 'Course added');
}
function delCourse(id) {// hỏi xác nhận để xóa khóa học
  if (!confirm('Delete course ' + id + '? Every grade in it is deleted too.')) return;
  run(() => api('DELETE', '/courses/' + id), 'Course deleted');
}
function saveGrade(studentId, el) {// Lưu & cập nhật điểm của sinh viên
  run(() => api('POST', '/grades', { student_id: studentId, course_id: courseId, grade: el.value }), 'Grade saved');
}
function addGrade() {// thêm điểm số
  run(() => api('POST', '/grades', { student_id: $('gs').value, course_id: courseId, grade: $('gv').value }), 'Grade saved');
}
function delGrade(studentId) {// xóa điểm sinh viên
  run(() => api('DELETE', '/grades?student_id=' + studentId + '&course_id=' + courseId), 'Grade deleted');
}

/* ===== Shell ===== */
async function render() {// Tạo nút menu cho NAV, tìm tên trang hiện tại r gán vào tiêu đề, hiển thị username, hiển thị role 
  $('nav').innerHTML = NAV.map(([k, l]) => `<button class="${k === page ? 'on' : ''}" onclick="go('${k}')" ${k === page ? 'aria-current="page"' : ''}>${l}</button>`).join('');
  $('title').textContent = NAV.find(p => p[0] === page)[1];
  $('uname').textContent = me.username;
  $('ubadge').innerHTML = `<i class="dot ${esc(me.role)}"></i>${ROLE[me.role] || esc(me.role)}`;
  $('view').innerHTML = '<div class="panel empty">Loading...</div>';
  const asked = page;
  try {
    const html = await V[asked]();
   
    if (asked === page) $('view').innerHTML = html;// chỉ hiện kq nếu ng dùng vx đang ở trang đó để tránh TH request cũ ghi đè trang ms
  } catch (err) {
    if (asked === page) $('view').innerHTML = `<div class="panel empty">${esc(err.message)}</div>`;
  }
}
function go(p) { page = p; render(); }

async function start() {
  if (!session.token()) { location.replace('Overview.html'); return; }// Nếu ko có token thì coi như chưa đăng nhập
  me = (await api('GET', '/auth/me')).data;// Gọi backend để lấy thông tin user hiện tại
  $('apiInfo').textContent = 'Connected to ' + API_BASE;
  document.querySelector('.out').addEventListener('click', () => session.clear());
  render();
}
start().catch(err => { $('view').innerHTML = `<div class="panel empty">${esc(err.message)}</div>`; });
