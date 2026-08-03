const sparePartModel = require('../models/sparePart.model');
const { ok, created } = require('../utils/response.util');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { emitToAdmins } = require('../sockets');

const create = asyncHandler(async (req, res) => {
  const { name, sku, category, unitPrice, quantity, minStockThreshold } = req.body;
  if (!name || !sku || unitPrice === undefined) {
    throw new ApiError(422, 'name, sku and unitPrice are required.');
  }

  const part = await sparePartModel.create({
    name,
    sku,
    category,
    unitPrice: Number(unitPrice),
    quantity: quantity ? Number(quantity) : 0,
    minStockThreshold: minStockThreshold ? Number(minStockThreshold) : undefined,
  });

  emitToAdmins('sparepart:created', part);
  created(res, part, 'Spare part added to inventory.');
});

const listAll = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 10);
  const { search, lowStockOnly } = req.query;
  const { rows, total } = await sparePartModel.listAll({ search, lowStockOnly: lowStockOnly === 'true', page, limit });
  ok(res, { items: rows, page, limit, total, totalPages: Math.ceil(total / limit) });
});

const listSimple = asyncHandler(async (req, res) => {
  const parts = await sparePartModel.listAllSimple();
  ok(res, parts);
});

const getOne = asyncHandler(async (req, res) => {
  const part = await sparePartModel.findById(req.params.id);
  if (!part) throw new ApiError(404, 'Spare part not found.');
  ok(res, part);
});

const update = asyncHandler(async (req, res) => {
  const part = await sparePartModel.findById(req.params.id);
  if (!part) throw new ApiError(404, 'Spare part not found.');

  const { name, category, unitPrice, minStockThreshold } = req.body;
  const updated = await sparePartModel.update(req.params.id, {
    name,
    category,
    unitPrice: unitPrice !== undefined ? Number(unitPrice) : undefined,
    minStockThreshold: minStockThreshold !== undefined ? Number(minStockThreshold) : undefined,
  });

  emitToAdmins('sparepart:updated', updated);
  ok(res, updated, 'Spare part updated.');
});

const remove = asyncHandler(async (req, res) => {
  const part = await sparePartModel.findById(req.params.id);
  if (!part) throw new ApiError(404, 'Spare part not found.');

  await sparePartModel.remove(req.params.id);
  emitToAdmins('sparepart:deleted', { id: req.params.id });
  ok(res, null, 'Spare part deleted.');
});

const lowStock = asyncHandler(async (req, res) => {
  const parts = await sparePartModel.lowStockList();
  ok(res, parts);
});

module.exports = { create, listAll, listSimple, getOne, update, remove, lowStock };
