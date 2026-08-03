require('dotenv').config();
const http = require('http');
const app = require('./app');
const { pool } = require('./config/db');
const { initSockets } = require('./sockets');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSockets(server);

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('✔ Connected to PostgreSQL.');
  } catch (err) {
    console.error('✘ Could not connect to PostgreSQL. Check your .env settings.');
    console.error(err.message);
    console.error('  Did you run "npm run migrate" and "npm run seed"?');
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`🚀 WorkshopHub server running at http://localhost:${PORT}`);
    console.log(`   Socket.IO realtime is live on the same port.`);
  });
}

start();

process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});
