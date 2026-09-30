# Migration for the upgrade. Run once on an existing sms_db.
# A fresh install can run schema.sql instead, it already contains everything.
USE sms_db;

# 1. Roles. Restrict the column to known values and make viewer the safe default,
#    so a new account cannot delete data unless someone grants admin on purpose.
ALTER TABLE users
  MODIFY COLUMN role ENUM('admin', 'viewer') NOT NULL DEFAULT 'viewer';

# 2. Fulltext index for flexible student search.
#    It matches a word anywhere in the name, not only at the start.
#    Re run of this line reports a duplicate key error, that is safe to ignore.
ALTER TABLE students
  ADD FULLTEXT INDEX ft_students_name (name);

# 3. Index for the class filter and for the dashboard chart GROUP BY.
CREATE INDEX idx_students_class_name ON students (class_name);

# 4. Check the result.
SHOW INDEX FROM students;
