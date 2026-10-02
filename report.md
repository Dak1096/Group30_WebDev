# Project Report

## Student Management System (SMS)

Collaborators:
| Name | Student ID |
|---|---|
| Dương Anh Khôi | 2410480 |
| Dương Minh Khôi | 2410479 |
| Lê Đức Minh | 2410588 |
| Nguyễn Đức Minh | 2410616 |
| Nguyễn Anh Tuấn | 2411001 |
| Phùng Đức Thắng | 2411171 |

# I. Frontend

## 1. Overview

The frontend of this system is developed using HTML, CSS, and JavaScript. It follows a simple client-side architecture and communicates with the backend through HTTP requests.

The goal of this frontend module is to provide an admin-style interface that lets a user log in, view summary statistics on a Dashboard, manage the list of students, manage courses, and grade students for each course.

## 2. Technologies used
| Component | Technology | Role |
|---|---|---|
|Page structure| HTML5 | Builds the page skeleton for each feature |
| Styling | CSS3 | Creates the sidebar layout, tables, cards, badges, dialogs, toasts |
| Logic | JavaScript (ES Modules) | Calls the API, renders data dynamically, handles events, pagination |
| Runtime environment | Live Server | Temporarily serves the static pages during development |

## 3. Architecture & design principles

The frontend follows a multi-pages application model, where each business feature corresponds to its own HTML file. Several key parts are:

- **Shared sidebar**: rather than repeating the same sidebar HTML across all five pages, the sidebar is rendered dynamically by `layout.js` and injected into the `<div id="sidebar">` element on each page. This means adding or changing a menu item only needs to happen in one place.
- **Auth guard**: all business pages (`index.html`, `students.html`, `courses.html`, `grades.html`) load `auth_guard.js` in the `<head>`, which runs before the page content is shown, redirecting unauthenticated users back to `login.html`.
- **Separation of structure, presentation, and behavior**: HTML only holds the page skeleton, CSS handles all styling, and JavaScript (loaded as modules via `<script type="module">`) handles data fetching and interaction logic.
- **One JS file per page** (`auth.js`, `dashboard.js`, `student.js`, `course.js`, `grade.js`), which keeps the codebase easy to maintain and extend feature by feature.

## 4. Folder Structure

```
sms_frontend/
├── login.html              
├── index.html               
├── students.html            
├── courses.html             
├── grades.html               
├── css/
│   └── style.css             
└── js/
    ├── layout.js             
    ├── auth.js               
    ├── auth_guard.js          
    ├── dashboard.js           
    ├── student.js             
    ├── course.js              
    └── grade.js                
```

## 5. Detailed pages

### 5.1 Login: `login.html`

The login page shows a form with two inputs (Username, Password) and a "Login" button, centered on screen via the `.login` CSS class. On submit, the form (`#loginForm`) is handled by `auth.js`; if login fails, an error message is shown in the `<p id="loginError">` element.

### 5.2 Dashboard: `index.html`

The home page shows three summary stat cards: "Total students", "Total courses", and "Average grade". Each card has a muted label (`.muted`) and a large number (`.statNumber`) updated dynamically by `dashboard.js`. If fetching the data fails, an error is shown at `#dashError`.

### 5.3 Students: `students.html`

The student management page provides full CRUD functionality:

- A toolbar (`.toolbar`) with a search-by-name input, a class filter (`#classFilter`), and a "+ Add student" button that toggles the input form.
- An add/edit form (`#studentForm`) with "Name", "Email", and "Class" fields, hidden by default (`.hidden` class) and revealed when the add button is clicked.
- A table listing "ID", "Name", "Email", "Class", and an actions column (edit/delete), with data rendered into `tbody#studentBody` by `student.js`.
- A pagination area (`#pagination`) and a "Loading..." state (`#loading`) shown while waiting on the server.

### 5.4 Courses: `courses.html`

Structured similarly to the "Students" page: search by course name, an add/edit form with "Course name", "Credits" (1–10), and "Teacher" fields, a listing table, and pagination, all managed by `course.js`.

### 5.5 Grades: `grades.html`

This page lets a user pick a "Student" and a "Course" from two dropdowns (`#studentSelect`, `#courseSelect`), enter a grade (0–10), and save it. The grade table shows "Student", "Course", "Grade", and "Classification" (calculated and color-coded with CSS badges). All logic is handled by `grade.js`.

## 6. Interface Design (CSS)

The entire interface is built from a single CSS file (`style.css`), using camelCase class names to avoid hyphens. The main groups are:

| Group | Representative classes | Description |
|---|---|---|
| Overall layout | `.sidebar`, `.main` | Fixed 220px-wide sidebar on the left; main content area offset to match |
| Stat cards | `.stats`, `.card`, `.statNumber` | Displays dashboard summary numbers in horizontal cards |
| Toolbar & forms | `.toolbar`, `.formRow` | Lays out search inputs, filters, and form fields horizontally with flexbox |
| Data tables | `table`, `th`, `td` | Lists data rows with a light-gray header row |
| Status labels | `.badge` (`.green`, `.blue`, `.yellow`, `.red`) | Shows grade classification or status with visual color coding |
| Buttons | `button`, `.light`, `.danger`, `.current` | Primary action (blue), secondary action (gray), delete (red), current-page button |
| Pagination | `.pagination` | Row of page-navigation buttons laid out with flexbox |
| Dialogs & toasts | `.overlay`, `.dialog`, `.toast` | Confirmation dialogs (e.g. confirming a delete) and floating success/error notifications |
| Login page | `.login` | Centered 340px-wide login form |

Colors are used consistently from a small palette: blue (`#2563eb`) for primary actions, red (`#dc2626`) for warnings/deletions, plus light green/blue/yellow/red for classification badges -> giving the interface a clear, easily recognizable sense of state.

## 7. Overall user flow

Generally, a user flow through the frontend would look like this:

1. The user opens `login.html` and enters a username/password; `auth.js` sends the login request and stores the session on success.
2. When navigating to a business page, `auth_guard.js` checks the session before the page is shown; if not logged in, the user is redirected back to `login.html`.
3. `layout.js` renders the navigation sidebar on every page and marks the active menu item.
4. Each page's own script (`dashboard.js`, `student.js`, `course.js`, `grade.js`) calls the back-end API for data, shows a "Loading..." state, then renders the result for the user.
5. Add/edit/delete actions are sent to the server through the corresponding API calls; the interface then refreshes the data table and shows a toast notification with the result.

## 8. Limitations

Despite all of its strength, no system can come without limitations:

- Repeated form/table structure between pages (`students.html`, `courses.html`) can lead to duplicated JS logic if not abstracted further.
- Access control (auth guard) is enforced client-side only; the back-end must also enforce authorization to avoid security risks.

## 9. Possible upgrades

- Add interface-level role permissions (e.g., a teacher only sees the Grading page, while an admin sees all pages).
- Add charts to the Dashboard to visualize grade distribution and student counts per class.
- Standardize the repeated forms/tables into shared JavaScript UI-building functions to reduce code duplication.
- Add responsive support for small screens (the sidebar is currently fixed at 220px and not yet optimized for mobile devices).

# II. Backend

## 1. Overview

A REST API for managing students, courses and grades, built with Node.js, Express and MySQL (mysql2, no ORM). This part of the report covers the features, the test suite, and performance measurements.

Every number in this report comes from a command that was run on the demo machine and can be run again. Section 6 lists those commands.

| Item | Result |
|---|---|
| Endpoints | 19, across 5 route files |
| Unit tests | 62 passed, 0 failed |
| Integration checks | 32 passed, 0 failed |
| Search on 100,000 rows, SQL only | Fulltext 42.66 ms vs LIKE 59.70 ms (1.4x faster) |
| Load test, 20 users, 100,000 rows | 642.0 ms average, 30.7 requests per second, 0 errors |

## 2. Features

### 2.1 Authentication

Login returns a JWT. Passwords are stored as bcrypt hashes. `GET /api/auth/me` returns the current user from the token, so the frontend can restore a session after a page refresh.

### 2.2 Role based access control

Two roles: `admin` can read and write, `viewer` can only read. New accounts default to `viewer`, so nobody can delete data unless an admin role is granted on purpose.

Every protected request passes through two middleware functions in order:

| Step | Middleware | Fails with |
|---|---|---|
| 1 | `authMiddleware`: is there a valid token? | 401 Unauthorized |
| 2 | `requireRole('admin')`: is the role allowed? | 403 Forbidden |

401 means "we do not know who you are". 403 means "we know who you are, and you are not allowed". Keeping them separate lets the frontend react correctly: redirect to login on 401, hide the button on 403.

### 2.3 Endpoints

| Resource | Method and path | Role |
|---|---|---|
| Auth | `POST /api/auth/login` | public |
| | `GET /api/auth/me` | any |
| Students | `GET /api/students` (search, class filter, paging) | any |
| | `GET /api/students/classes` | any |
| | `GET /api/students/:id` (with grades) | any |
| | `POST`, `PUT /:id`, `DELETE /:id` | admin |
| Courses | `GET /api/courses`, `GET /api/courses/:id` | any |
| | `POST`, `PUT /:id`, `DELETE /:id` | admin |
| Grades | `GET /api/grades` (filter by student or course) | any |
| | `POST /api/grades` (insert or update) | admin |
| | `DELETE /api/grades/:id` | admin |
| | `DELETE /api/grades?student_id=&course_id=` | admin |
| Dashboard | `GET /api/dashboard/overview`, `GET /api/dashboard/charts` | any |

### 2.4 Validation

All rules live in one file, `utils/validators.js`, so every controller applies the same checks.

| Field | Rule |
|---|---|
| Email | Optional. Regex `name@domain.tld`, at most 100 characters, stored in lowercase |
| Grade | Required, a number from 0 to 10, rounded to 2 decimals |
| Credit | Optional, a whole number from 1 to 10 |
| Name | Required, trimmed, length limit |
| Route id | Positive integer, otherwise 400 |

The database enforces the same limits a second time: `UNIQUE` on email, `CHECK` on grade, foreign keys with `ON DELETE CASCADE` on grades.

### 2.5 Student search

The old search used `LIKE 'term%'`, which only matched the start of a name. Searching "Hà" did not find "Nguyễn Văn Hà".

The new search matches a word anywhere in the name and picks one of two strategies per request:

| Strategy | SQL | Used when |
|---|---|---|
| Fulltext | `MATCH(name) AGAINST ('+word*' IN BOOLEAN MODE)` | Fulltext index exists and every word is long enough to be indexed |
| LIKE | `name LIKE '%term%'` | Otherwise |

The response includes a `searchMode` field that states which strategy ran, so the choice can be checked from outside.

## 3. Testing

### 3.1 Two kinds of test

| Kind | Command | Needs MySQL | What it proves |
|---|---|---|---|
| Unit (jest) | `npm test` | No | Controller, middleware and validator logic is correct |
| Integration | `node tests/test_upgrade.js` | Yes | The real API, database and configuration work together |

Unit tests replace the models with `jest.mock`, so they never touch the database. That makes them fast and runnable anywhere, but it also means they cannot detect problems in MySQL itself. Section 5 shows a real example of exactly that.

### 3.2 Unit tests: 62 passed

| File | Tests |
|---|---|
| `utils/validators.test.js` | 27 |
| `controllers/gradeController.test.js` | 13 |
| `controllers/studentController.test.js` | 11 |
| `middleware/roleMiddleware.test.js` | 5 |
| `utils/paging.test.js` | 4 |
| `middleware/authMiddleware.test.js` | 2 |
| **Total** | **62** |

Run time on the demo machine: 2.6 seconds.

### 3.3 Integration checks: 32 passed

| Section | Covers |
|---|---|
| Authorization | `/auth/me`, viewer can read, viewer gets 403 on every write |
| Email validation | Three invalid formats rejected, a valid one accepted |
| Detail endpoints | Student and course detail, 404 for missing ids, credit limit |
| Grades | Save, grade limit, delete by pair, delete by id, filter, 404 cases |
| Search | Word at the start, word in the middle, names with two letter words |
| Clean up | Test data removed |

## 4. Performance

### 4.1 Test conditions

| Item | Value |
|---|---|
| Machine | Dell Latitude E6330 laptop |
| Setup | API server, MySQL and load generator on the same machine (localhost) |
| Software | Node.js 24, MySQL 8 |
| Data | 100,000 synthetic students from `database/seed_bulk.js` |
| Endpoint | `GET /api/students?search=Nguyễn Văn An&limit=20` |
| Connection pool | 10 connections |

The synthetic names are built from 8 family names, 5 middle names and 10 given names. Real data is far more varied, so every search term here matches many more rows than it would in practice. This makes the results a pessimistic case for search.

### 4.2 Fulltext vs LIKE, measured in SQL

Measured with `SET profiling = 1` and `SHOW PROFILES`, precise to the microsecond. The term is `Nguyễn Văn`, which both strategies handle correctly.

| Run | LIKE (ms) | Fulltext (ms) |
|---|---|---|
| 1 | 59.47 | 31.24 |
| 2 | 64.30 | 48.63 |
| 3 | 55.33 | 48.11 |
| **Average** | **59.70** | **42.66** |
| Rows counted | 2,404 | 2,404 |

Both strategies return the same 2,404 rows, so the comparison is fair. Fulltext is 1.4 times faster (28.5% less time). The slowest fulltext run (48.63 ms) is still faster than the fastest LIKE run (55.33 ms), so the difference is not measurement noise.

The gain is modest because both words are very common in this data set, so the index still has to combine long lists of matching rows. The advantage of an index grows as the table grows and as search terms become more selective. That is expected behaviour for fulltext indexes, not something measured here.

### 4.3 Load test on 100,000 rows

Command: `node tests/loadtest.js`, 20 concurrent users, 500 requests. The search term contains "An", which is too short for the index on this machine (Section 5), so these requests use LIKE.

| Run | Average (ms) | p95 (ms) | Max (ms) | Requests per second | Errors |
|---|---|---|---|---|---|
| 1 | 632.8 | 940.6 | 1224.4 | 31.0 | 0 |
| 2 | 642.0 | 994.0 | 1416.9 | 30.7 | 0 |

The two runs differ by under 2%, so the measurement is repeatable.

Each request runs two queries: one for the page of 20 rows and one `COUNT(*)` for the total used by paging. With 20 users sharing 10 database connections, part of the response time is spent waiting for a free connection.

### 4.4 Stress test on a near empty table

Command: `node tests/loadtest.js stress`. This run happened before the 100,000 rows were loaded, so it measures the Node.js and Express layer under concurrency, not database performance.

| Users | Requests | Average (ms) | p95 (ms) | Max (ms) | Requests per second | Errors |
|---|---|---|---|---|---|---|
| 10 | 200 | 30.0 | 50.5 | 78.5 | 327.5 | 0 |
| 50 | 1,000 | 81.3 | 125.0 | 595.7 | 604.7 | 0 |
| 100 | 2,000 | 105.3 | 136.7 | 260.8 | 938.6 | 0 |
| 200 | 4,000 | 255.6 | 350.7 | 650.3 | 771.4 | 0 |
| 400 | 8,000 | 708.8 | 1062.9 | 3634.4 | 554.1 | 0 |

No request failed at any level. Throughput peaks at 100 users and falls after that, which marks where the server stops gaining from extra concurrency on this machine.

## 5. A bug found by measuring

While measuring search, the two strategies disagreed on the same term:

| Query | Rows found |
|---|---|
| `LIKE '%Nguyễn Văn An%'` | 231 |
| `MATCH ... '+Nguyễn* +Văn* +An*'` | 0 |

**Cause.** MySQL leaves words shorter than `innodb_ft_min_token_size` out of the fulltext index, and the default is 3. Vietnamese names are full of two letter syllables such as An, Hà and Lê. The code already skips fulltext for words that are too short, but it read the limit from `.env` (set to 2) while MySQL was really using 3. Because the two values disagreed, the code chose fulltext for "An" and received nothing.

**Why 90 passing tests missed it.** Unit tests mock the database, so they cannot see MySQL settings. The integration test searched for "Upgrade" and "Test", both long enough to be indexed. No test covered a two letter word, which is the most common case for Vietnamese names.

**Fix.** Four checks were added to `tests/test_upgrade.js`. They create a student named "Searchcheck Ob" and search for it by the full name and by "Ob" alone.

| Stage | Result |
|---|---|
| Before the fix | 30 passed, 2 failed (both new search checks returned 0 rows) |
| After setting `FT_MIN_TOKEN_SIZE=3` to match MySQL | 32 passed, 0 failed, search falls back to LIKE |

The new checks failed first and passed after the fix, which shows they detect the problem rather than passing by default.

**Trade off.** On this machine, names containing a two letter word are now searched with LIKE: always correct, somewhat slower. Where the MySQL configuration can be edited, setting `innodb_ft_min_token_size = 2` and rebuilding the index lets fulltext serve those names as well.

## 6. How to reproduce

```bash
npm install
npm test                          # unit tests, no database needed

mysql -u root -p < database/schema.sql
node database/seed_admin.js       # admin / admin123, viewer / viewer123
node database/seed_bulk.js        # 100,000 students
mysql -u root -p < database/indexes.sql

npm start                         # separate terminal
node tests/test_upgrade.js        # integration checks
node tests/loadtest.js            # load test
node tests/loadtest.js stress     # stress test
```

## 7. Limitations

All measurements were taken on one laptop, with the server, database and load generator competing for the same CPU. A real deployment would separate them and add network latency.

The test data is synthetic and repetitive. Search timings on real names would differ.

The load test exercises one endpoint only. Write endpoints were covered by the integration checks for correctness, not measured under load.

## 8. Possible upgrades

Read `innodb_ft_min_token_size` from MySQL at startup instead of from `.env`, so the two values can never disagree again.

Add an audit log table that records who changed what, rather than soft delete. Soft delete would conflict with the unique email column and with the cascade on grades.

# III. Conclusion

- The frontend of the Student Management System fully covers its core features: login, summary statistics, student management, course management, and grading. Building it with plain HTML/CSS/JavaScript keeps the project simple, lightweight, and easy to understand
- The backend covers all of the functions above, allowing teachers to handle the most important things a Student Management System can allow. Using Node.js, Express and MySQL keeps the project simple but effective for dealing with table-based data.
- Although there is room for improvements, this system can run and execute its functions efficiently as it is right now.
