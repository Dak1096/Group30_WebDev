// Đo hiệu năng bằng Node.js thuần, cần Node 18 trở lên
// Chạy: node tests/loadtest.js benchmark   hoặc   node tests/loadtest.js stress
const BASE = 'http://localhost:3000/api';
const PATH = '/students?search=Nguyễn Văn An&limit=20';   // endpoint cần đo

async function login() {
  const res = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error('Đăng nhập thất bại, hãy chạy seed_admin.js');
  return json.data.token;
}

// Gửi total request, users người dùng ảo cùng chạy một lúc
async function runLoad(token, users, total) {
  const latencies = [];
  let sent = 0;
  let failed = 0;

  async function worker() {
    while (sent < total) {
      sent++;
      const start = performance.now();
      try {
        const res = await fetch(BASE + PATH, {
          headers: { Authorization: 'Bearer ' + token },
        });
        await res.arrayBuffer();            // đọc hết dữ liệu trả về
        latencies.push(performance.now() - start);
        if (res.status !== 200) failed++;
      } catch {
        failed++;
      }
    }
  }

  const begin = performance.now();
  await Promise.all(Array.from({ length: users }, worker));
  const seconds = (performance.now() - begin) / 1000;

  latencies.sort((a, b) => a - b);
  const count = latencies.length;
  const sum = latencies.reduce((a, b) => a + b, 0);
  return {
    'Người dùng ảo': users,
    'Tổng request': total,
    'Lỗi': failed,
    'Trung bình (ms)': count ? (sum / count).toFixed(1) : 'n/a',
    'p95 (ms)': count ? latencies[Math.floor(count * 0.95)].toFixed(1) : 'n/a',
    'Lớn nhất (ms)': count ? Math.max(...latencies).toFixed(1) : 'n/a',
    'Request/giây': (count / seconds).toFixed(1),
  };
}

async function main() {
  const mode = process.argv[2] || 'benchmark';
  const token = await login();
  const results = [];

  if (mode === 'stress') {
    // Tăng dần số người dùng ảo để tìm điểm hệ thống bắt đầu chậm hoặc lỗi
    for (const users of [10, 50, 100, 200, 400]) {
      results.push(await runLoad(token, users, users * 20));
    }
  } else {
    results.push(await runLoad(token, 20, 500));
  }
  console.table(results);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
