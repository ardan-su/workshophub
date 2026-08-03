const transactionModel = require('../models/transaction.model');
const serviceModel = require('../models/service.model');
const notificationModel = require('../models/notification.model');
const userModel = require('../models/user.model');
const customerModel = require('../models/customer.model');
const { ok, created } = require('../utils/response.util');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { emitToAdmins, emitToCustomer } = require('../sockets');

const create = asyncHandler(async (req, res) => {
  const { serviceId, amount, paymentMethod } = req.body;
  if (!serviceId || amount === undefined) throw new ApiError(422, 'serviceId and amount are required.');

  const service = await serviceModel.findById(serviceId);
  if (!service) throw new ApiError(404, 'Service not found.');

  const transaction = await transactionModel.create({
    serviceId,
    customerId: service.customer_id,
    amount: Number(amount),
    paymentMethod,
  });

  emitToAdmins('transaction:created', transaction);
  emitToCustomer(service.customer_id, 'transaction:created', transaction);
  created(res, transaction, `Invoice ${transaction.invoice_number} created.`);
});

const markPaid = asyncHandler(async (req, res) => {
  const transaction = await transactionModel.findById(req.params.id);
  if (!transaction) throw new ApiError(404, 'Transaction not found.');

  const updated = await transactionModel.markPaid(req.params.id);

  const profile = await customerModel.findById(transaction.customer_id);
  if (profile) {
    const user = await userModel.findByEmailOrUsername(profile.email);
    if (user) {
      await notificationModel.create({
        userId: user.id,
        title: 'Payment received',
        message: `Payment of ${Number(updated.amount).toLocaleString()} for invoice ${updated.invoice_number} was recorded.`,
        type: 'success',
      });
    }
  }

  emitToAdmins('transaction:updated', updated);
  emitToCustomer(transaction.customer_id, 'transaction:updated', updated);
  ok(res, updated, 'Marked as paid.');
});

const listMine = asyncHandler(async (req, res) => {
  if (!req.user.customer_id) throw new ApiError(403, 'Only customers have transactions.');
  const transactions = await transactionModel.listByCustomer(req.user.customer_id);
  ok(res, transactions);
});

const listAll = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 10);
  const { status } = req.query;
  const { rows, total } = await transactionModel.listAll({ status, page, limit });
  ok(res, { items: rows, page, limit, total, totalPages: Math.ceil(total / limit) });
});

module.exports = { create, markPaid, listMine, listAll };
