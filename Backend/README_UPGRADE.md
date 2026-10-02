# Backend Upgrade Notes

Architecture is unchanged: Models, Controllers, Routes, plus shared helpers in
`utils/` and `middleware/`. No new dependency was added. No existing route was
removed or renamed.

---

## 1. How to apply the upgrade

```bash
# 1. Run the database migration (existing database)
mysql -u root -p < database/upgrade.sql

# 2. Add the new setting to your .env
#    FT_MIN_TOKEN_SIZE=2

# 3. Let MySQL index two letter words, needed for Vietnamese names.
#    Add this to my.ini under [mysqld], then restart MySQL:
#       innodb_ft_min_token_size = 2
#    After the restart, rebuild the index:
#       ALTER TABLE students DROP INDEX ft_students_name;
#       ALTER TABLE students ADD FULLTEXT INDEX ft_students_name (name);

# 4. Create the accounts (adds a read only account next to admin)
node database/seed_admin.js

# 5. Start and test
node app.js
node tests/test_api.js       # existing tests, still pass
node tests/test_upgrade.js   # new tests for everything below
```

If you skip step 3, search still works. `models/Student.js` detects that the
fulltext index cannot serve the term and falls back to `LIKE '%term%'`, which is
correct but slower. The `searchMode` field in the response tells you which one ran.

---

## 2. Files changed

### New files

| File | Purpose |
|---|---|
| `middleware/roleMiddleware.js` | `requireRole('admin')` guard, returns 403 |
| `utils/validators.js` | Shared field checks, one message per rule |
| `database/upgrade.sql` | Migration for an existing database |
| `tests/test_upgrade.js` | 27 tests covering every new behaviour |
| `README_UPGRADE.md` | This file |

### Modified files

| File | What changed |
|---|---|
| `app.js` | One error handler for JSON parse, oversized body and server errors |
| `middleware/authMiddleware.js` | English messages, comment explaining the payload |
| `utils/handleError.js` | English message |
| `utils/paging.js` | English comment only, logic untouched |
| `models/User.js` | Added `findById` that never selects `password_hash` |
| `models/Student.js` | Fulltext search with a LIKE fallback, added `findDetail` |
| `models/Course.js` | Added `findDetail` with average grade and enrolled students |
| `models/Grade.js` | Added `findById`, `findByPair`, `removeById`, `removeByPair`, optional filters on `findAll` |
| `models/Dashboard.js` | Chart labels changed to English (see section 6) |
| `controllers/authController.js` | Returns `user` next to `token`, added `me` |
| `controllers/studentController.js` | Uses validators, added `getStudentById` |
| `controllers/courseController.js` | Uses validators, added `getCourseById` |
| `controllers/gradeController.js` | Added two delete handlers, stricter checks, 404 names the missing row |
| `routes/*.js` | `requireRole('admin')` on every write route, new read routes |
| `database/schema.sql` | `role` is now `ENUM('admin','viewer')`, default `viewer` |
| `database/indexes.sql` | Added the fulltext index and a class index |
| `database/seed_admin.js` | Creates a `viewer` account as well as `admin` |
| `.env.example` | Added `FT_MIN_TOKEN_SIZE` |

---

## 3. New API endpoints

| Method | Path | Role | Purpose |
|---|---|---|---|
| `GET` | `/api/auth/me` | any | Current account, restores the session after a refresh |
| `GET` | `/api/students/:id` | any | One student plus every grade |
| `GET` | `/api/courses/:id` | any | One course plus enrolled students and the average |
| `DELETE` | `/api/grades/:id` | admin | Delete one grade by row id |
| `DELETE` | `/api/grades?student_id=1&course_id=2` | admin | Delete by the pair, no id needed |

Existing endpoints also gained optional query parameters:

- `GET /api/grades?student_id=1` filters by student
- `GET /api/grades?course_id=2` filters by course
- `GET /api/students` now returns an extra `searchMode` field

---

## 4. Authorization

`role` was already in the schema and already inside the JWT, but nothing read it.
Now `roleMiddleware` sits between `authMiddleware` and the controller.

```text
Request -> authMiddleware -> requireRole('admin') -> Controller
             401 no token      403 wrong role
```

| Area | Read | Write |
|---|---|---|
| Students | admin, viewer | admin |
| Courses | admin, viewer | admin |
| Grades | admin, viewer | admin |
| Dashboard | admin, viewer | n/a |

401 means the token is missing or expired. 403 means the token is valid but the
role is too low. Keeping them apart matters: the front end should send the user
back to the login page on 401, but only show a message on 403.

The default role for a new account is now `viewer`, not `admin`. A new account
cannot delete anything until someone grants admin on purpose.

The login response now carries `user`, so the front end can hide buttons a viewer
cannot use:

```json
{ "success": true, "data": { "token": "...", "user": { "id": 1, "username": "admin", "role": "admin" } } }
```

---

## 5. Search: why fulltext, not LIKE

`LIKE 'abc%'` uses `idx_students_name` and is fast, but it only matches the start
of the whole name. Searching `Ha` never finds `Nguyen Van Ha`.

`LIKE '%abc%'` matches anywhere, but a leading wildcard makes the index useless.
On the 100000 rows from `seed_bulk.js` that is a full table scan on every keystroke.

The fix is a fulltext index. `MATCH(name) AGAINST ('+ha*' IN BOOLEAN MODE)` uses
an inverted index of the words in each name, so it matches a word anywhere while
still being indexed. Vietnamese names are written as separate syllables, so every
syllable is its own token and this works well.

`models/Student.js` picks the strategy per request:

| Condition | Strategy used |
|---|---|
| Index exists and every word is long enough | `MATCH AGAINST` (indexed) |
| Index missing, or a word is too short | `LIKE '%term%'` (correct, slower) |

The one caveat is `innodb_ft_min_token_size`, default 3. Two letter syllables such
as `Ha`, `Le` and `An` are extremely common in Vietnamese names and would be
dropped, so step 3 above lowers it to 2.

To measure the difference for the report:

```sql
EXPLAIN SELECT * FROM students WHERE name LIKE '%Ha%';
EXPLAIN SELECT * FROM students WHERE MATCH(name) AGAINST ('+ha*' IN BOOLEAN MODE);
```

The first shows `type: ALL` with `rows` close to the full table. The second shows
`type: fulltext`. Put both plans plus a before and after run of `tests/loadtest.js`
in the benchmark section of your report.

---

## 6. One response change to be aware of

`GET /api/dashboard/charts` previously returned Vietnamese labels
(`Giỏi`, `Khá`, `Trung bình`, `Yếu`). They are now `Excellent`, `Good`,
`Average`, `Weak`, so the whole API speaks one language.

If your front end prints these labels directly, either update the front end or
revert the four label strings in `models/Dashboard.js`. Nothing else in any
response changed shape.

---

## 7. Soft delete: deliberately not added

It was considered and left out, because on this schema it costs more than it gives:

- `students.email` is `UNIQUE`. A soft deleted student keeps holding its email,
  so a real student with that address can never be added afterwards.
- `grades` uses `ON DELETE CASCADE`. A soft delete never fires the cascade, so
  orphan grades would stay and quietly distort every dashboard average.
- Every existing query, every `COUNT(*)` and both dashboard charts would need
  `WHERE deleted_at IS NULL`. A single missed spot is a silent data bug.

If the committee asks for it, the honest answer is that an audit log table is the
better fit here: it records who deleted what and when, without touching the
constraints that keep the data correct.

---

## 8. Validation rules now enforced

| Field | Rule | Status on failure |
|---|---|---|
| `name` | required, 100 characters or fewer, spaces collapsed | 400 |
| `email` | optional, must match `name@example.com`, 100 characters or fewer, lowercased | 400 |
| `email` | must be unique | 409 |
| `class_name` | optional, 50 characters or fewer | 400 |
| `course_name` | required, 100 characters or fewer | 400 |
| `credit` | optional, whole number 1 to 10 | 400 |
| `teacher` | optional, 100 characters or fewer | 400 |
| `grade` | required, number 0 to 10, rounded to 2 decimals | 400 |
| `student_id`, `course_id`, `:id` | positive whole number | 400 |
| referenced student or course | must exist | 404 |

Every empty optional field is stored as `NULL`, never as an empty string, so the
`UNIQUE` constraint on email does not collide across students with no email.

---

## 9. Unit tests

Two kinds of test now live side by side. They answer different questions.

| Folder | Kind | Needs a server | Needs MySQL |
|---|---|---|---|
| `tests/unit/` | Unit, jest, models are mocked | no | no |
| `tests/test_api.js`, `tests/test_upgrade.js` | Integration, real HTTP | yes | yes |
| `tests/loadtest.js` | Benchmark and stress | yes | yes |

Run the unit tests:

```bash
npm install
npm test               # 62 tests, a few seconds, no database
npm run test:coverage  # adds a coverage table
```

Files under `tests/unit/`:

| File | Tests | Covers |
|---|---|---|
| `utils/paging.test.js` | 4 | Defaults and the min and max caps |
| `utils/validators.test.js` | 27 | Email regex, id, name, grade, credit rules |
| `middleware/authMiddleware.test.js` | 2 | Missing token, valid token |
| `middleware/roleMiddleware.test.js` | 5 | 401 vs 403, allowed list, unknown role |
| `controllers/studentController.test.js` | 11 | List, add, validate, detail, delete |
| `controllers/gradeController.test.js` | 13 | Save, both delete routes, filters |

`jest.mock` replaces each model, so no controller test opens a connection.
That is why these run on a laptop with no MySQL installed.

### Why the old student controller tests were edited

Four of them compared against the Vietnamese messages that this upgrade replaced:

```text
'Thiếu tên sinh viên'        ->  'Student name is required'
'Email đã tồn tại'           ->  'Email already exists'
'Không tìm thấy sinh viên'   ->  'Student not found'
'Đã xóa sinh viên'           ->  'Student deleted'
```

The other two still passed unchanged. Nothing about the logic broke, only the
text the tests were pinned to. The test descriptions are plain strings, so change
them back to Vietnamese if that reads better during the defence.
