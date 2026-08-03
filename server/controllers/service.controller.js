const serviceModel = require('../models/service.model');
const vehicleModel = require('../models/vehicle.model');
const inventoryModel = require('../models/inventory.model');
const notificationModel = require('../models/notification.model');
const userModel = require('../models/user.model');
const customerModel = require('../models/customer.model');
const { ok, created } = require('../utils/response.util');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { emitToAdmins, emitToCustomer } = require('../sockets');

async function notifyCustomerUser(customerId, payload) {
  const profile = await customerModel.findById(customerId);
  if (!profile) return;
  const user = await userModel.findByEmailOrUsername(profile.email);
  if (user) await notificationModel.create({ userId: user.id, ...payload });
}

/** Admin creates a walk-in service directly (no prior booking). */
const create = asyncHandler(async (req, res) => {
  const { customerId, vehicleId, serviceType, estimatedCost } = req.body;
  if (!customerId || !vehicleId || !serviceType) {
    throw new ApiError(422, 'customerId, vehicleId and serviceType are required.');
  }

  const vehicle = await vehicleModel.findById(vehicleId);
  if (!vehicle) throw new ApiError(404, 'Vehicle not found.');
  if (String(vehicle.customer_id) !== String(customerId)) {
    throw new ApiError(422, 'This vehicle does not belong to the selected customer.');
  }

  const service = await serviceModel.create({ customerId, vehicleId, serviceType, estimatedCost });

  emitToAdmins('service:created', service);
  emitToCustomer(customerId, 'service:created', service);
  created(res, service, 'Walk-in service created and added to the queue.');
});

const listAll = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 10);
  const { status, mechanicId, search } = req.query;
  const { rows, total } = await serviceModel.listAll({ status, mechanicId, search, page, limit });
  ok(res, { items: rows, page, limit, total, totalPages: Math.ceil(total / limit) });
});

const listMine = asyncHandler(async (req, res) => {
  if (!req.user.customer_id) throw new ApiError(403, 'Only customers have services.');
  const services = await serviceModel.listByCustomer(req.user.customer_id);
  ok(res, services);
});

const listMineActive = asyncHandler(async (req, res) => {
  if (!req.user.customer_id) throw new ApiError(403, 'Only customers have services.');
  const services = await serviceModel.listActiveByCustomer(req.user.customer_id);
  ok(res, services);
});

const getOne = asyncHandler(async (req, res) => {
  const service = await serviceModel.findById(req.params.id);
  if (!service) throw new ApiError(404, 'Service not found.');
  if (req.user.role !== 'admin' && service.customer_id !== req.user.customer_id) {
    throw new ApiError(403, 'You do not have access to this service.');
  }
  const partsUsed = await inventoryModel.partsUsedByService(service.id);
  ok(res, { ...service, partsUsed });
});

const getStatuses = asyncHandler(async (req, res) => {
  const statuses = await serviceModel.getAllStatuses();
  ok(res, statuses);
});

const assignMechanic = asyncHandler(async (req, res) => {
  const { mechanicId } = req.body;
  if (!mechanicId) throw new ApiError(422, 'mechanicId is required.');

  const service = await serviceModel.findById(req.params.id);
  if (!service) throw new ApiError(404, 'Service not found.');

  await serviceModel.assignMechanic(req.params.id, mechanicId);
  const fullService = await serviceModel.findById(req.params.id);

  await notifyCustomerUser(service.customer_id, {
    title: 'Mechanic assigned',
    message: `${fullService.mechanic_name || 'A mechanic'} has been assigned to your ${service.brand} ${service.model}.`,
    type: 'info',
  });

  emitToAdmins('service:updated', fullService);
  emitToCustomer(service.customer_id, 'service:updated', fullService);
  ok(res, fullService, 'Mechanic assigned.');
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validCodes = (await serviceModel.getAllStatuses()).map((s) => s.code);
  if (!validCodes.includes(status)) throw new ApiError(422, `status must be one of: ${validCodes.join(', ')}`);

  const service = await serviceModel.findById(req.params.id);
  if (!service) throw new ApiError(404, 'Service not found.');

  const updated = await serviceModel.updateStatus(req.params.id, status);

  await notifyCustomerUser(service.customer_id, {
    title: 'Service status updated',
    message: `Your ${service.brand} ${service.model} is now: ${updated.status_label}.`,
    type: status === 'completed' ? 'success' : 'info',
  });

  emitToAdmins('service:updated', updated);
  emitToCustomer(service.customer_id, 'service:updated', updated);
  emitToAdmins('queue:changed', await serviceModel.statusBreakdown());
  ok(res, updated, `Status changed to "${updated.status_label}".`);
});

const updateDetails = asyncHandler(async (req, res) => {
  const service = await serviceModel.findById(req.params.id);
  if (!service) throw new ApiError(404, 'Service not found.');

  const { repairNotes, estimatedCost, finalCost, estimatedCompletion } = req.body;
  const updated = await serviceModel.updateNotes(req.params.id, {
    repairNotes,
    estimatedCost: estimatedCost !== undefined ? Number(estimatedCost) : undefined,
    finalCost: finalCost !== undefined ? Number(finalCost) : undefined,
    estimatedCompletion,
  });

  const fullService = await serviceModel.findById(req.params.id);
  emitToAdmins('service:updated', fullService);
  emitToCustomer(service.customer_id, 'service:updated', fullService);
  ok(res, fullService, 'Service details updated.');
});

const addPart = asyncHandler(async (req, res) => {
  const { sparePartId, quantity } = req.body;
  if (!sparePartId || !quantity || Number(quantity) <= 0) {
    throw new ApiError(422, 'sparePartId and a positive quantity are required.');
  }

  const service = await serviceModel.findById(req.params.id);
  if (!service) throw new ApiError(404, 'Service not found.');

  const partsUsed = await inventoryModel.usePartForService({
    serviceId: req.params.id,
    sparePartId,
    quantity: Number(quantity),
    userId: req.user.id,
  });

  const fullService = await serviceModel.findById(req.params.id);
  emitToAdmins('service:updated', fullService);
  emitToAdmins('inventory:updated', { sparePartId });
  emitToCustomer(service.customer_id, 'service:updated', fullService);

  ok(res, { service: fullService, partsUsed }, 'Spare part added and stock reduced automatically.');
});

module.exports = {
  create,
  listAll,
  listMine,
  listMineActive,
  getOne,
  getStatuses,
  assignMechanic,
  updateStatus,
  updateDetails,
  addPart,
};
