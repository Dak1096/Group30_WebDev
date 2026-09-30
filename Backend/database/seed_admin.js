// Create the first accounts, run from the Backend folder:
//   node database/seed_admin.js
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const pool = require('../config/db');

// admin can write, viewer is read only and exists to demo the role guard
const ACCOUNTS = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'viewer', password: 'viewer123', role: 'viewer' },
];

async function main() {
  for (const account of ACCOUNTS) {
    const existing = await User.findByUsername(account.username);
    if (existing) {
      console.log('Account already exists:', account.username);
      continue;
    }
    const hash = await bcrypt.hash(account.password, 10);
    await User.create({
      username: account.username,
      password_hash: hash,
      role: account.role,
    });
    console.log('Created', account.role, 'account:', account.username, '/', account.password);
  }
  await pool.end();         // close the pool so the script exits on its own
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
