# Dữ liệu demo, chạy sau schema.sql trên database còn trống
USE sms_db;

INSERT INTO students (name, email, class_name) VALUES
  ('Nguyễn Văn A', 'a@gmail.com', 'CNTT01'),
  ('Trần Thị B', 'b@gmail.com', 'CNTT02'),
  ('Lê Minh C', 'c@gmail.com', 'CNTT01');

INSERT INTO courses (course_name, credit, teacher) VALUES
  ('Lập trình Web', 3, 'Thầy Hùng'),
  ('Cơ sở dữ liệu', 4, 'Cô Lan');

# Số 1, 2, 3 là id của sinh viên và môn học vừa thêm ở trên
INSERT INTO grades (student_id, course_id, grade) VALUES
  (1, 1, 8.5),
  (1, 2, 7.0),
  (2, 1, 9.0),
  (3, 2, 6.5);
