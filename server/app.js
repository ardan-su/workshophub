const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const customerRoutes = require('./routes/customer.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const mechanicRoutes = require('./routes/mechanic.routes');
const bookingRoutes = require('./routes/booking.routes');
const serviceRoutes = require('./routes/service.routes');
const sparePartRoutes = require('./routes/sparePart.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const transactionRoutes = require('./routes/transaction.routes');
const reportRoutes = require('./routes/report.routes');
const searchRoutes = require('./routes/search.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Serve uploaded files (avatars, vehicle photos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- REST API ----
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/mechanics', mechanicRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/spare-parts', sparePartRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => res.json({ success: true, message: 'WorkshopHub API is running.' }));

// ---- Static frontend (vanilla HTML/CSS/JS) ----
const clientDir = path.join(__dirname, '..', 'client', 'public');
app.use(express.static(clientDir));

// Any unmatched /api/* request gets a clean JSON 404 instead of falling
// through to the static file handler (which would otherwise return HTML).
app.get('/api/*', notFoundHandler);

app.use(errorHandler);

module.exports = app;
