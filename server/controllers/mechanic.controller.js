const mechanicModel = require('../models/mechanic.model');
const { ok, created } = require('../utils/response.util');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const { fullName, specialization, phone, email } = req.body;
  if (!fullName) throw new ApiError(422, 'Mechanic full name is required.');

  const avatarUrl = req.file ? `/uploads/avatars/${req.file.filename}` : null;
  const mechanic = await mechanicModel.create({ fullName, specialization, phone, email, avatarUrl });
  created(res, mechanic, 'Mechanic added successfully.');
});

const listAll = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 10);
  const { search, status } = req.query;
  const { rows, total } = await mechanicModel.listAll({ search, status, page, limit });
  ok(res, { items: rows, page, limit, total, totalPages: Math.ceil(total / limit) });
});

const listActive = asyncHandler(async (req, res) => {
  const mechanics = await mechanicModel.listActive();
  ok(res, mechanics);
});

const getOne = asyncHandler(async (req, res) => {
  const mechanic = await mechanicModel.findById(req.params.id);
  if (!mechanic) throw new ApiError(404, 'Mechanic not found.');
  ok(res, mechanic);
});

const update = asyncHandler(async (req, res) => {
  const mechanic = await mechanicModel.findById(req.params.id);
  if (!mechanic) throw new ApiError(404, 'Mechanic not found.');

  const { fullName, specialization, phone, email, status } = req.body;
  const avatarUrl = req.file ? `/uploads/avatars/${req.file.filename}` : undefined;

  const updated = await mechanicModel.update(req.params.id, { fullName, specialization, phone, email, status, avatarUrl });
  ok(res, updated, 'Mechanic updated.');
});

const remove = asyncHandler(async (req, res) => {
  const mechanic = await mechanicModel.findById(req.params.id);
  if (!mechanic) throw new ApiError(404, 'Mechanic not found.');

  await mechanicModel.remove(req.params.id);
  ok(res, null, 'Mechanic deleted.');
});

module.exports = { create, listAll, listActive, getOne, update, remove };
