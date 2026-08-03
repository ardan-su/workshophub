const bookingModel = require('../models/booking.model');
const vehicleModel = require('../models/vehicle.model');
const serviceModel = require('../models/service.model');
const notificationModel = require('../models/notification.model');
const userModel = require('../models/user.model');
const customerModel = require('../models/customer.model');
const { ok, created } = require('../utils/response.util');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { emitToAdmins, emitToCustomer } = require('../sockets');

const create = asyncHandler(async (req, res) => {
  if (!req.user.customer_id) throw new ApiError(403, 'Only customers can create bookings.');

  const { vehicleId, serviceType, requestedDate, requestedTime, notes } = req.body;
  if (!vehicleId || !serviceType || !requestedDate || !requestedTime) {
    throw new ApiError(422, 'vehicleId, serviceType, requestedDate and requestedTime are required.');
  }

  const owns = await vehicleModel.belongsToCustomer(vehicleId, req.user.customer_id);
  if (!owns) throw new ApiError(403, 'This vehicle does not belong to your account.');

  const booking = await bookingModel.create({
    customerId: req.user.customer_id,
    vehicleId,
    serviceType,
    requestedDate,
    requestedTime,
    notes,
  });

  await notificationModel.createForAllAdmins({
    title: 'New booking request',
    message: `${req.user.username} requested "${serviceType}" on ${requestedDate}.`,
    type: 'info',
  });

  emitToAdmins('booking:created', booking);
  created(res, booking, 'Booking submitted. We will confirm it shortly.');
});

const listMine = asyncHandler(async (req, res) => {
  if (!req.user.customer_id) throw new ApiError(403, 'Only customers have bookings.');
  const bookings = await bookingModel.listByCustomer(req.user.customer_id);
  ok(res, bookings);
});

const listAll = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 10);
  const { status, search } = req.query;
  const { rows, total } = await bookingModel.listAll({ status, search, page, limit });
  ok(res, { items: rows, page, limit, total, totalPages: Math.ceil(total / limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const booking = await bookingModel.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (req.user.role !== 'admin' && booking.customer_id !== req.user.customer_id) {
    throw new ApiError(403, 'You do not have access to this booking.');
  }
  ok(res, booking);
});

/**
 * Accepting a booking creates the corresponding Service (job card) and
 * puts it into the live queue - this is what powers realtime tracking.
 */
const accept = asyncHandler(async (req, res) => {
  const booking = await bookingModel.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (booking.status !== 'pending') throw new ApiError(400, 'Only pending bookings can be accepted.');

  const updated = await bookingModel.updateStatus(booking.id, 'accepted');
  const service = await serviceModel.create({
    bookingId: booking.id,
    customerId: booking.customer_id,
    vehicleId: booking.vehicle_id,
    serviceType: booking.service_type,
  });

  const customerProfile = await customerModel.findById(booking.customer_id);
  if (customerProfile) {
    const customerUser = await userModel.findByEmailOrUsername(customerProfile.email);
    if (customerUser) {
      await notificationModel.create({
        userId: customerUser.id,
        title: 'Booking accepted',
        message: `Your booking for "${booking.service_type}" was accepted and added to the queue.`,
        type: 'success',
      });
    }
  }

  emitToAdmins('booking:updated', updated);
  emitToCustomer(booking.customer_id, 'booking:updated', updated);
  emitToCustomer(booking.customer_id, 'service:created', service);
  emitToAdmins('service:created', service);

  ok(res, { booking: updated, service }, 'Booking accepted and added to the service queue.');
});

const reject = asyncHandler(async (req, res) => {
  const booking = await bookingModel.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (booking.status !== 'pending') throw new ApiError(400, 'Only pending bookings can be rejected.');

  const updated = await bookingModel.updateStatus(booking.id, 'rejected');

  emitToAdmins('booking:updated', updated);
  emitToCustomer(booking.customer_id, 'booking:updated', updated);
  ok(res, updated, 'Booking rejected.');
});

const reschedule = asyncHandler(async (req, res) => {
  const booking = await bookingModel.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found.');

  const { requestedDate, requestedTime } = req.body;
  if (!requestedDate || !requestedTime) throw new ApiError(422, 'requestedDate and requestedTime are required.');

  const updated = await bookingModel.reschedule(booking.id, { requestedDate, requestedTime });

  emitToAdmins('booking:updated', updated);
  emitToCustomer(booking.customer_id, 'booking:updated', updated);
  ok(res, updated, 'Booking rescheduled.');
});

module.exports = { create, listMine, listAll, getOne, accept, reject, reschedule };
