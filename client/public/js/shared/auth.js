/**
 * Session helpers. Token + user profile are cached in localStorage so page
 * refreshes and Socket.IO reconnects don't require re-authenticating.
 */
const Session = {
  setSession(token, user) {
    localStorage.setItem('wh_token', token);
    localStorage.setItem('wh_user', JSON.stringify(user));
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem('wh_user') || 'null');
    } catch (e) {
      return null;
    }
  },
  getToken() {
    return localStorage.getItem('wh_token');
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  logout() {
    localStorage.removeItem('wh_token');
    localStorage.removeItem('wh_user');
    location.href = '/login.html';
  },
  /** Redirect away from this page if not logged in, or logged in as the wrong role. */
  requireRole(role) {
    if (!this.isLoggedIn()) {
      location.href = '/login.html';
      return null;
    }
    const user = this.getUser();
    if (!user || user.role !== role) {
      location.href = user && user.role === 'admin' ? '/admin/dashboard.html' : '/customer/dashboard.html';
      return null;
    }
    return user;
  },
  initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  },
};
