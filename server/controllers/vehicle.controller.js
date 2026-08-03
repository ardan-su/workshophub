const vehicleModel = require('../models/vehicle.model');
const { ok, created } = require('../utils/response.util');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { emitToAdmins } = require('../sockets');

const create = asyncHandler(async (req, res) => {
  const { brand, model, year, licensePlate, color, mileage, customerId } = req.body;
  if (!brand || !model || !year || !licensePlate) {
    throw new ApiError(422, 'Brand, model, year and license plate are required.');
  }

  // Admins can register a vehicle for any customer; customers only for themselves.
  const targetCustomerId = req.user.role === 'admin' ? customerId : req.user.customer_id;
  if (!targetCustomerId) throw new ApiError(422, 'customerId is required.');

  const photoUrl = req.file ? `/uploads/vehicles/${req.file.filename}` : null;

  const vehicle = await vehicleModel.create({
    customerId: targetCustomerId,
    brand,
    model,
    year: Number(year),
    licensePlate,
    color,
    mileage: mileage ? Number(mileage) : 0,
    photoUrl,
  });

  emitToAdmins('vehicle:created', vehicle);
  created(res, vehicle, 'Vehicle registered successfully.');
});

const listMine = asyncHandler(async (req, res) => {
  if (!req.user.customer_id) throw new ApiError(403, 'Only customers have vehicles.');
  const vehicles = await vehicleModel.listByCustomer(req.user.customer_id);
  ok(res, vehicles);
});

const listAll = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 10);
  const { search } = req.query;
  const { rows, total } = await vehicleModel.listAll({ search, page, limit });
  ok(res, { items: rows, page, limit, total, totalPages: Math.ceil(total / limit) });
});

async function assertOwnershipOrAdmin(req, vehicle) {
  if (req.user.role === 'admin') return;
  if (!vehicle || vehicle.customer_id !== req.user.customer_id) {
    throw new ApiError(403, 'You do not have access to this vehicle.');
  }
}

const getOne = asyncHandler(async (req, res) => {
  const vehicle = await vehicleModel.findById(req.params.id);
  if (!vehicle) throw new ApiError(404, 'Vehicle not found.');
  await assertOwnershipOrAdmin(req, vehicle);
  ok(res, vehicle);
});

const update = asyncHandler(async (req, res) => {
  const vehicle = await vehicleModel.findById(req.params.id);
  if (!vehicle) throw new ApiError(404, 'Vehicle not found.');
  await assertOwnershipOrAdmin(req, vehicle);

  const { brand, model, year, licensePlate, color, mileage } = req.body;
  const photoUrl = req.file ? `/uploads/vehicles/${req.file.filename}` : undefined;

  const updated = await vehicleModel.update(req.params.id, {
    brand,
    model,
    year: year ? Number(year) : undefined,
    licensePlate,
    color,
    mileage: mileage !== undefined ? Number(mileage) : undefined,
    photoUrl,
  });

  ok(res, updated, 'Vehicle updated.');
});

const remove = asyncHandler(async (req, res) => {
  const vehicle = await vehicleModel.findById(req.params.id);
  if (!vehicle) throw new ApiError(404, 'Vehicle not found.');
  await assertOwnershipOrAdmin(req, vehicle);

  await vehicleModel.remove(req.params.id);
  ok(res, null, 'Vehicle deleted.');
});

const history = asyncHandler(async (req, res) => {
  const vehicle = await vehicleModel.findById(req.params.id);
  if (!vehicle) throw new ApiError(404, 'Vehicle not found.');
  await assertOwnershipOrAdmin(req, vehicle);

  const records = await vehicleModel.history(req.params.id);
  ok(res, records);
});

module.exports = { create, listMine, listAll, getOne, update, remove, history };
