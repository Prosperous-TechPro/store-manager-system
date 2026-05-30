#!/usr/bin/env node
require('dotenv').config();
const readline = require('readline');
const db = require('../src/models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const question = (q, hidden = false) => new Promise((resolve) => {
  if (!hidden) return rl.question(q, ans => resolve(ans));
  // hidden input (password)
  const stdin = process.openStdin();
  process.stdin.on('data', char => {
    char = char + '';
    switch (char) {
      case '\n':
      case '\r':
      case '\u0004':
        stdin.pause();
        break;
      default:
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(q + Array(rl.line.length + 1).join('*'));
        break;
    }
  });
  rl.question(q, (value) => {
    process.stdout.write('\n');
    resolve(value);
  });
});

(async () => {
  try {
    console.log('Interactive user creation script');
    const name = (await question('Full name: ')).trim();
    const email = (await question('Email: ')).trim();
    const phone = (await question('Phone (e.g. 0241234567 or +233241234567): ')).trim();
    const password = (await question('Password (will be hidden): ', true)).trim();
    const role = (await question('Role (casher/manager/ceo/saler/admin) [casher]: ')).trim() || 'casher';

    if (!name || !email || !phone || !password) {
      console.error('All fields are required. Aborting.');
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, 10);

    // check existing
    const exist = await db.query('SELECT id FROM users WHERE lower(email)=lower($1) OR phone=$2', [email, phone]);
    if (exist.rows.length) {
      const id = exist.rows[0].id;
      await db.query(`UPDATE users SET name=$1, password=$2, role=$3, phone=$4, phone_verified=true, approved=true, deleted_at=null WHERE id=$5`, [name, hash, role, phone, id]);
      console.log(`Updated existing user id=${id}`);
    } else {
      const res = await db.query(`INSERT INTO users(name,email,password,role,phone,phone_verified,approved,created_at) VALUES($1,$2,$3,$4,$5,true,true,NOW()) RETURNING id`, [name, email, hash, role, phone]);
      console.log(`Created user id=${res.rows[0].id}`);
    }

    const r = await db.query('SELECT id,name,email,role,phone FROM users WHERE lower(email)=lower($1)', [email]);
    const user = r.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '8h' });

    console.log('\n---- Account created ----');
    console.log('Email:', email);
    console.log('Phone:', phone);
    console.log('Role:', role);
    console.log('Name:', name);
    console.log('JWT: ', token);
    console.log('-------------------------');

    rl.close();
    process.exit(0);
  } catch (e) {
    console.error('Failed to create user:', e && e.message ? e.message : e);
    rl.close();
    process.exit(1);
  }
})();
