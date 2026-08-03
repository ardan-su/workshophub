const notificationModel = require('../models/notification.model');
const { ok } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const unreadOnly = req.query.unreadOnly === 'true';

  const { rows, total } = await notificationModel.listByUser(req.user.id, { unreadOnly, page, limit });
  const unread = await notificationModel.unreadCount(req.user.id);
  ok(res, { items: rows, total, unread, page, limit, totalPages: Math.ceil(total / limit) });
});

const markRead = asyncHandler(async (req, res) => {
  const updated = await notificationModel.markRead(req.params.id, req.user.id);
  ok(res, updated, 'Notification marked as read.');
});

const markAllRead = asyncHandler(async (req, res) => {
  await notificationModel.markAllRead(req.user.id);
  ok(res, null, 'All notifications marked as read.');
});

module.exports = { list, markRead, markAllRead };
