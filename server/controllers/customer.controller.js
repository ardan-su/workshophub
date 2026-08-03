const userModel = require('../models/user.model');
const customerModel = require('../models/customer.model');
const vehicleModel = require('../models/vehicle.model');
const { ok } = require('../utils/response.util');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 10);
  const { search } = req.query;

  const { rows, total } = await userModel.listCustomers({ search, page, limit });
  ok(res, { items: rows, page, limit, total, totalPages: Math.ceil(total / limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.params.id);
  if (!user || user.role !== 'customer') throw new ApiError(404, 'Customer not found.');

  const customer = await customerModel.findByUserId(user.id);
  const vehicles = customer ? await vehicleModel.listByCustomer(customer.id) : [];

  ok(res, { ...user, address: customer?.address, city: customer?.city, notes: customer?.notes, vehicles });
});

const update = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.params.id);
  if (!user || user.role !== 'customer') throw new ApiError(404, 'Customer not found.');

  const { fullName, phone, address, city, notes } = req.body;
  await userModel.updateProfile(user.id, { fullName, phone });
  if (user.customer_id) {
    await customerModel.updateProfile(user.customer_id, { address, city, notes });
  }

  const updated = await userModel.findById(user.id);
  ok(res, updated, 'Customer updated.');
});

const setActive = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const user = await userModel.findById(req.params.id);
  if (!user || user.role !== 'customer') throw new ApiError(404, 'Customer not found.');

  const result = await userModel.setActive(req.params.id, !!isActive);
  ok(res, result, isActive ? 'Customer activated.' : 'Customer deactivated.');
});

const remove = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.params.id);
  if (!user || user.role !== 'customer') throw new ApiError(404, 'Customer not found.');

  await userModel.deleteUser(req.params.id);
  ok(res, null, 'Customer deleted.');
});

module.exports = { list, getOne, update, setActive, remove };
