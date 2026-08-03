/**
 * Single shared Socket.IO connection, authenticated with the same JWT
 * used for REST calls. Pages register listeners via WSocket.on(event, cb).
 * Requires the Socket.IO client script (loaded from the server at /socket.io/socket.io.js)
 * to be included on the page BEFORE this file.
 */
const WSocket = (() => {
  let socket = null;

  function connect() {
    const token = Session.getToken();
    if (!token || socket) return socket;

    socket = io({ auth: { token } });

    socket.on('connect_error', (err) => {
      // eslint-disable-next-line no-console
      console.warn('Realtime connection issue:', err.message);
    });

    return socket;
  }

  function on(event, callback) {
    connect();
    if (!socket) return;
    socket.on(event, callback);
  }

  function off(event, callback) {
    if (!socket) return;
    socket.off(event, callback);
  }

  return { connect, on, off };
})();
