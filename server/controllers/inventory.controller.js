const inventoryModel = require('../models/inventory.model');
const { ok, created } = require('../utils/response.util');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { emitToAdmins } = require('../sockets');

const stockIn = asyncHandler(async (req, res) => {
  const { sparePartId, quantity, reference } = req.body;
  if (!sparePartId || !quantity || Number(quantity) <= 0) {
    throw new ApiError(422, 'sparePartId and a positive quantity are required.');
  }

  const entry = await inventoryModel.stockIn({
    sparePartId,
    quantity: Number(quantity),
    reference,
    userId: req.user.id,
  });

  emitToAdmins('inventory:updated', { sparePartId });
  created(res, entry, 'Stock added successfully.');
});

const stockOut = asyncHandler(async (req, res) => {
  const { sparePartId, quantity, reference } = req.body;
  if (!sparePartId || !quantity || Number(quantity) <= 0) {
    throw new ApiError(422, 'sparePartId and a positive quantity are required.');
  }

  const entry = await inventoryModel.stockOut({
    sparePartId,
    quantity: Number(quantity),
    reference,
    userId: req.user.id,
  });

  emitToAdmins('inventory:updated', { sparePartId });
  created(res, entry, 'Stock removed successfully.');
});

const history = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const { sparePartId } = req.query;
  const { rows, total } = await inventoryModel.history({ sparePartId, page, limit });
  ok(res, { items: rows, page, limit, total, totalPages: Math.ceil(total / limit) });
});

module.exports = { stockIn, stockOut, history };
