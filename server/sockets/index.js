const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt.util');
const { query } = require('../config/db');

let io = null;

function initSockets(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  // Authenticate every socket connection using the same JWT used for REST calls.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token provided'));
      const payload = verifyToken(token);

      const { rows } = await query(
        `SELECT u.id, r.name AS role, c.id AS customer_id
           FROM users u JOIN roles r ON r.id = u.role_id
           LEFT JOIN customers c ON c.user_id = u.id
          WHERE u.id = $1`,
        [payload.id]
      );
      if (rows.length === 0) return next(new Error('User not found'));

      socket.user = rows[0];
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role, customer_id: customerId } = socket.user;

    socket.join(`user:${id}`);
    if (role === 'admin') socket.join('admins');
    if (role === 'customer' && customerId) socket.join(`customer:${customerId}`);

    socket.on('disconnect', () => {
      // no-op, room membership is cleaned up automatically
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized yet. Call initSockets(server) first.');
  return io;
}

// ---- Emit helpers used by controllers after a state-changing action ----

function emitToAdmins(event, payload) {
  if (!io) return;
  io.to('admins').emit(event, payload);
}

function emitToCustomer(customerId, event, payload) {
  if (!io) return;
  io.to(`customer:${customerId}`).emit(event, payload);
}

function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

function emitGlobal(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

module.exports = { initSockets, getIO, emitToAdmins, emitToCustomer, emitToUser, emitGlobal };
