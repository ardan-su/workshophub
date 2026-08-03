/**
 * Runs schema.sql against the configured database.
 * Usage: npm run migrate
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'workshophub',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log(`Connecting to database "${process.env.DB_NAME || 'workshophub'}"...`);
  const client = await pool.connect();
  try {
    console.log('Running schema.sql ...');
    await client.query(sql);
    console.log('✔ Schema created successfully.');
    console.log('Next step: npm run seed  (creates the admin account)');
  } catch (err) {
    console.error('✘ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
