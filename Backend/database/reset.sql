# Xóa sạch dữ liệu, giữ nguyên cấu trúc bảng và tài khoản đăng nhập
USE sms_db;

SET FOREIGN_KEY_CHECKS = 0;    # tạm tắt để TRUNCATE được bảng có khóa ngoại
TRUNCATE TABLE grades;
TRUNCATE TABLE students;
TRUNCATE TABLE courses;
SET FOREIGN_KEY_CHECKS = 1;
