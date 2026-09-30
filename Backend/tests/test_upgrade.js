// Tests for the upgraded features, needs Node 18 or newer.
// Start the server first, then run: node tests/test_upgrade.js
// Requires both accounts from database/seed_admin.js
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
  let json = null;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, json };
}

function check(name, condition, info) {
  console.log((condition ? 'PASS  ' : 'FAIL  ') + name + (condition ? '' : '   got: ' + info));
  if (condition) passed++;
  else failed++;
}

async function login(username, password) {
  const r = await call('POST', '/auth/login', { username, password });
  return r.json && r.json.data ? r.json.data.token : null;
}

async function main() {
  const adminToken = await login('admin', 'admin123');
  const viewerToken = await login('viewer', 'viewer123');

  if (!adminToken) {
    console.log('Cannot sign in as admin. Run: node database/seed_admin.js');
    return;
  }
  if (!viewerToken) {
    console.log('Cannot sign in as viewer. Run: node database/seed_admin.js');
    return;
  }

  console.log('\n1. Authorization');

  let r = await call('GET', '/auth/me', null, viewerToken);
  check('GET /auth/me returns the role', r.status === 200 && r.json.data.role === 'viewer', r.status);

  r = await call('GET', '/students?limit=5', null, viewerToken);
  check('Viewer can read students', r.status === 200, r.status);

  r = await call('POST', '/students', { name: 'Blocked Student' }, viewerToken);
  check('Viewer cannot add a student, 403', r.status === 403, r.status);

  r = await call('DELETE', '/students/1', null, viewerToken);
  check('Viewer cannot delete a student, 403', r.status === 403, r.status);

  r = await call('POST', '/courses', { course_name: 'Blocked Course' }, viewerToken);
  check('Viewer cannot add a course, 403', r.status === 403, r.status);

  r = await call('POST', '/grades', { student_id: 1, course_id: 1, grade: 5 }, viewerToken);
  check('Viewer cannot save a grade, 403', r.status === 403, r.status);

  console.log('\n2. Email validation');

  r = await call('POST', '/students', { name: 'Bad Email', email: 'not-an-email' }, adminToken);
  check('Rejects an email with no domain, 400', r.status === 400, r.status);

  r = await call('POST', '/students', { name: 'Bad Email', email: 'a@b' }, adminToken);
  check('Rejects an email with no top level domain, 400', r.status === 400, r.status);

  r = await call('POST', '/students', { name: 'Bad Email', email: 'a b@mail.com' }, adminToken);
  check('Rejects an email with a space, 400', r.status === 400, r.status);

  const email = 'upgrade' + Date.now() + '@example.com';
  r = await call('POST', '/students', { name: 'Upgrade Test', email, class_name: 'CNTT01' }, adminToken);
  check('Accepts a valid email, 201', r.status === 201, r.status);
  const studentId = r.json.data && r.json.data.id;

  r = await call('GET', '/students/abc', null, adminToken);
  check('Rejects a non numeric id, 400', r.status === 400, r.status);

  console.log('\n3. Detail endpoints');

  r = await call('GET', '/students/' + studentId, null, adminToken);
  check('GET /students/:id returns the student', r.status === 200 && Array.isArray(r.json.data.grades), r.status);

  r = await call('GET', '/students/999999999', null, adminToken);
  check('Missing student returns 404', r.status === 404, r.status);

  r = await call('POST', '/courses', { course_name: 'Upgrade Course', credit: 3 }, adminToken);
  const courseId = r.json.data && r.json.data.id;
  check('Add a course, 201', r.status === 201, r.status);

  r = await call('GET', '/courses/' + courseId, null, adminToken);
  check('GET /courses/:id returns the course', r.status === 200 && r.json.data.course_name === 'Upgrade Course', r.status);

  r = await call('POST', '/courses', { course_name: 'Bad Credit', credit: 99 }, adminToken);
  check('Rejects credit above 10, 400', r.status === 400, r.status);

  console.log('\n4. Delete a grade');

  r = await call('POST', '/grades', { student_id: studentId, course_id: courseId, grade: 8.5 }, adminToken);
  check('Save a grade, 201', r.status === 201, r.status);

  r = await call('POST', '/grades', { student_id: studentId, course_id: courseId, grade: 12 }, adminToken);
  check('Rejects a grade above 10, 400', r.status === 400, r.status);

  r = await call('POST', '/grades', { student_id: 999999999, course_id: courseId, grade: 5 }, adminToken);
  check('Missing student returns 404', r.status === 404, r.status);

  r = await call('DELETE', '/grades?student_id=' + studentId + '&course_id=' + courseId, null, adminToken);
  check('Delete a grade by the pair, 200', r.status === 200, r.status);

  r = await call('DELETE', '/grades?student_id=' + studentId + '&course_id=' + courseId, null, adminToken);
  check('Deleting the same pair again returns 404', r.status === 404, r.status);

  r = await call('POST', '/grades', { student_id: studentId, course_id: courseId, grade: 7 }, adminToken);
  r = await call('GET', '/grades?student_id=' + studentId, null, adminToken);
  const gradeId = r.json.data[0] && r.json.data[0].id;
  check('Filter grades by student', r.status === 200 && r.json.data.length === 1, r.status);

  r = await call('DELETE', '/grades/' + gradeId, null, adminToken);
  check('Delete a grade by id, 200', r.status === 200, r.status);

  r = await call('DELETE', '/grades/999999999', null, adminToken);
  check('Missing grade id returns 404', r.status === 404, r.status);

  console.log('\n5. Flexible search');

  r = await call('GET', '/students?search=Upgrade', null, adminToken);
  check('Finds a word at the start', r.status === 200 && r.json.total >= 1, r.json.total);

  r = await call('GET', '/students?search=Test', null, adminToken);
  check('Finds a word in the middle or at the end', r.status === 200 && r.json.total >= 1, r.json.total);
  console.log('      search strategy used: ' + (r.json.searchMode || 'unknown'));

  // Two letter syllables such as An, Ha, Le are common in Vietnamese names.
  // MySQL drops them from the fulltext index unless innodb_ft_min_token_size is 2.
  r = await call('POST', '/students', { name: 'Searchcheck Ob', class_name: 'CNTT01' }, adminToken);
  check('Create a student with a two letter word, 201', r.status === 201, r.status);
  const shortId = r.json && r.json.data && r.json.data.id;

  // True when the list in the response contains the test student
  const containsShort = (res) => res.status === 200 && Array.isArray(res.json.data)
    && res.json.data.some((s) => s.id === shortId);

  r = await call('GET', '/students?search=' + encodeURIComponent('Searchcheck Ob'), null, adminToken);
  check('Finds a name that contains a two letter word', containsShort(r), r.json && r.json.total);
  console.log('      search strategy used: ' + ((r.json && r.json.searchMode) || 'unknown'));

  r = await call('GET', '/students?search=Ob', null, adminToken);
  check('Finds a student by a two letter word alone', containsShort(r), r.json && r.json.total);

  r = await call('DELETE', '/students/' + shortId, null, adminToken);
  check('Delete the two letter test student, 200', r.status === 200, r.status);

  console.log('\n6. Clean up');

  r = await call('DELETE', '/students/' + studentId, null, adminToken);
  check('Delete the test student, 200', r.status === 200, r.status);

  r = await call('DELETE', '/courses/' + courseId, null, adminToken);
  check('Delete the test course, 200', r.status === 200, r.status);

  console.log('\nResult: ' + passed + ' passed, ' + failed + ' failed');
}

main().catch((err) => console.log('Cannot reach the server:', err.message));