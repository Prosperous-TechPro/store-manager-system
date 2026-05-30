require('dotenv').config();
const db = require('../src/models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

(async () => {
  try {
    const name = process.env.DEMO_NAME || 'Demo Cashier';
    const email = process.env.DEMO_EMAIL || 'autouser+cashier@example.com';
    const phone = process.env.DEMO_PHONE || '0249999001';
    const password = process.env.DEMO_PASSWORD || 'Password123!';
    const role = 'casher';

    console.log('Using DB connection from env. Creating/updating demo user...');

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

    // fetch user and issue JWT
    const r = await db.query('SELECT id,name,email,role,phone FROM users WHERE lower(email)=lower($1)', [email]);
    const user = r.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '8h' });

    console.log('---- Demo account credentials ----');
    console.log('Email:', email);
    console.log('Phone:', phone);
    console.log('Password:', password);
    console.log('Role:', role);
    console.log('Name:', name);
    console.log('JWT (use as Authorization: Bearer <token>):');
    console.log(token);
    console.log('---- Done ----');
    process.exit(0);
  } catch (e) {
    console.error('Failed to create demo user', e);
    process.exit(1);
  }
})();
