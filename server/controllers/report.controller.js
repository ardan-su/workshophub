const reportModel = require('../models/report.model');
const transactionModel = require('../models/transaction.model');
const { ok } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');

const services = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const report = await reportModel.serviceReport({ from, to });
  ok(res, report);
});

const bookings = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const report = await reportModel.bookingReport({ from, to });
  ok(res, report);
});

const revenue = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const report = await reportModel.revenueReport({ from, to });
  const trend = await transactionModel.revenueByDay(14);
  ok(res, { ...report, trend });
});

const inventory = asyncHandler(async (req, res) => {
  const report = await reportModel.inventoryReport();
  ok(res, report);
});

module.exports = { services, bookings, revenue, inventory };
