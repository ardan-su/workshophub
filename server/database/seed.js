/**
 * Seeds the one required account: the Administrator.
 * Safe to re-run - it upserts on the unique email/username.
 * Usage: npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'workshophub',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@workshophub.local';
  const plainPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

  const client = await pool.connect();
  try {
    const { rows: roleRows } = await client.query(
      "SELECT id FROM roles WHERE name = 'admin'"
    );
    if (roleRows.length === 0) {
      throw new Error('Role "admin" not found. Run "npm run migrate" first.');
    }
    const adminRoleId = roleRows[0].id;

    const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE users SET password_hash = $1, role_id = $2, is_active = TRUE, updated_at = NOW()
         WHERE id = $3`,
        [passwordHash, adminRoleId, existing.rows[0].id]
      );
      console.log(`✔ Admin account already existed - password/role refreshed (${email}).`);
    } else {
      await client.query(
        `INSERT INTO users (role_id, username, email, password_hash, full_name, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [adminRoleId, username, email, passwordHash, 'Workshop Administrator']
      );
      console.log(`✔ Admin account created: ${email} / ${plainPassword}`);
    }

    console.log('Seeding complete. You can now log in with the admin credentials from your .env file.');
  } catch (err) {
    console.error('✘ Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
