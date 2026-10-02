# Indexes for the student search box
USE sms_db;

# Prefix search and ORDER BY name
CREATE INDEX idx_students_name ON students (name);

# Word anywhere in the name, used by MATCH AGAINST in models/Student.js
ALTER TABLE students ADD FULLTEXT INDEX ft_students_name (name);

# Class filter and dashboard GROUP BY class_name
CREATE INDEX idx_students_class_name ON students (class_name);
