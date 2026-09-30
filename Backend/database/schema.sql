# Create the database, utf8mb4 so Vietnamese text is stored correctly
CREATE DATABASE IF NOT EXISTS sms_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sms_db;

# Login accounts
# admin can read and write, viewer can only read
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,          # only the hashed password is stored
  role ENUM('admin', 'viewer') NOT NULL DEFAULT 'viewer'
);

# Students
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,                    # may be empty, but must be unique
  class_name VARCHAR(50)
);

# Courses
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_name VARCHAR(100) NOT NULL,
  credit INT,
  teacher VARCHAR(100)
);

# Grades, links students and courses through foreign keys
CREATE TABLE IF NOT EXISTS grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  grade DECIMAL(4,2) NOT NULL,
  CHECK (grade BETWEEN 0 AND 10),               # enforced from MySQL 8.0.16
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student_course (student_id, course_id)
);
