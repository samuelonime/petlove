const dotenv = require('dotenv');
dotenv.config();

const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function seedAdmin() {
  const name = process.env.ADMIN_NAME || 'Administrator';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const phone = process.env.ADMIN_PHONE || null;

  if (!email || !password) {
    console.error('ERROR: Please set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file.');
    process.exit(1);
  }

  try {
    const existing = await User.findByEmail(email);
    if (existing) {
      console.log(`Admin already exists with email ${email} (id=${existing.id}). Skipping creation.`);
      process.exit(0);
    }

    const hashed = await bcrypt.hash(password, 10);
    const userId = await User.create({
      name,
      email,
      phone,
      password: hashed,
      user_type: 'admin'
    });

    console.log(`Admin user created successfully. id=${userId} email=${email}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed admin user:', err);
    process.exit(2);
  }
}

seedAdmin();
