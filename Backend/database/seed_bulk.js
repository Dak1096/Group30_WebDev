// Sinh 100000 sinh viên giả để đo hiệu năng, chạy trong thư mục sms_backend
const pool = require('../config/db');

const TOTAL = 100000;
const BATCH = 1000;         // mỗi lần thêm 1000 dòng cho nhanh

const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi'];
const middleNames = ['Văn', 'Thị', 'Minh', 'Quốc', 'Ngọc'];
const firstNames = ['An', 'Bình', 'Châu', 'Dũng', 'Hà', 'Khoa', 'Lan', 'Nam', 'Phúc', 'Trang'];
const classes = ['CNTT01', 'CNTT02', 'CNTT03', 'KT01', 'KT02'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

async function main() {
  for (let start = 0; start < TOTAL; start += BATCH) {
    const rows = [];
    for (let i = start; i < start + BATCH; i++) {
      const name = pick(lastNames) + ' ' + pick(middleNames) + ' ' + pick(firstNames);
      rows.push([name, 'bulk' + i + '@example.com', pick(classes)]);
    }
    await pool.query('INSERT INTO students (name, email, class_name) VALUES ?', [rows]);
    console.log('Đã thêm', start + BATCH, 'sinh viên');
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
