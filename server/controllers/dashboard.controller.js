const userModel = require('../models/user.model');
const vehicleModel = require('../models/vehicle.model');
const serviceModel = require('../models/service.model');
const bookingModel = require('../models/booking.model');
const sparePartModel = require('../models/sparePart.model');
const transactionModel = require('../models/transaction.model');
const { ok } = require('../utils/response.util');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const adminOverview = asyncHandler(async (req, res) => {
  const [
    totalCustomers,
    totalVehicles,
    vehiclesInQueue,
    vehiclesUnderRepair,
    completedToday,
    totalRevenue,
    revenueToday,
    lowStockCount,
    pendingBookings,
    statusBreakdown,
    revenueTrend,
  ] = await Promise.all([
    userModel.countByRole('customer'),
    vehicleModel.count(),
    serviceModel.countInQueue(),
    serviceModel.countUnderRepair(),
    serviceModel.countCompletedToday(),
    transactionModel.revenueTotal(),
    transactionModel.revenueToday(),
    sparePartModel.lowStockCount(),
    bookingModel.countByStatus('pending'),
    serviceModel.statusBreakdown(),
    transactionModel.revenueByDay(14),
  ]);

  ok(res, {
    totalCustomers,
    totalVehicles,
    vehiclesInQueue,
    vehiclesUnderRepair,
    completedServicesToday: completedToday,
    totalRevenue,
    revenueToday,
    lowStockSpareParts: lowStockCount,
    pendingBookings,
    statusBreakdown,
    revenueTrend,
  });
});

const customerOverview = asyncHandler(async (req, res) => {
  if (!req.user.customer_id) throw new ApiError(403, 'Only customers have a customer dashboard.');
  const customerId = req.user.customer_id;

  const [vehicles, activeServices, bookings, transactions] = await Promise.all([
    vehicleModel.listByCustomer(customerId),
    serviceModel.listActiveByCustomer(customerId),
    bookingModel.listByCustomer(customerId),
    transactionModel.listByCustomer(customerId),
  ]);

  const upcomingBooking = bookings.find((b) => b.status === 'pending' || b.status === 'accepted') || null;
  const recentTransactions = transactions.slice(0, 5);

  ok(res, {
    myVehicles: vehicles,
    vehicleCount: vehicles.length,
    upcomingBooking,
    currentServices: activeServices,
    recentTransactions,
  });
});

module.exports = { adminOverview, customerOverview };
