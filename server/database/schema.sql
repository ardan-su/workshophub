-- ==========================================================
-- WorkshopHub Database Schema (PostgreSQL)
-- Run this once against an empty database:
--   psql -U <user> -d workshophub -f server/database/schema.sql
-- Or simply: npm run migrate
-- ==========================================================

-- Clean slate (safe to run repeatedly during development)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS service_spare_parts CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS spare_parts CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS service_status CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS mechanics CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ----------------------------------------------------------
-- roles
-- ----------------------------------------------------------
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(30) UNIQUE NOT NULL -- 'admin' | 'customer'
);

-- ----------------------------------------------------------
-- users  (both admins and customers live here; auth root)
-- ----------------------------------------------------------
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  avatar_url VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- customers  (extra profile info for users with role=customer)
-- ----------------------------------------------------------
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address VARCHAR(255),
  city VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- vehicles
-- ----------------------------------------------------------
CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  brand VARCHAR(80) NOT NULL,
  model VARCHAR(80) NOT NULL,
  year INTEGER NOT NULL,
  license_plate VARCHAR(30) UNIQUE NOT NULL,
  color VARCHAR(40),
  mileage INTEGER DEFAULT 0,
  photo_url VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- mechanics
-- ----------------------------------------------------------
CREATE TABLE mechanics (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  specialization VARCHAR(100),
  phone VARCHAR(30),
  email VARCHAR(150),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active | inactive
  avatar_url VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- bookings  (customer-initiated requests, pending admin action)
-- ----------------------------------------------------------
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  service_type VARCHAR(120) NOT NULL,
  requested_date DATE NOT NULL,
  requested_time TIME NOT NULL,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | accepted | rejected | rescheduled
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- service_status  (lookup / ordered pipeline)
-- ----------------------------------------------------------
CREATE TABLE service_status (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  label VARCHAR(60) NOT NULL,
  sort_order INTEGER NOT NULL
);

-- ----------------------------------------------------------
-- services  (the actual work order / job card)
-- ----------------------------------------------------------
CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  mechanic_id INTEGER REFERENCES mechanics(id) ON DELETE SET NULL,
  status_id INTEGER NOT NULL REFERENCES service_status(id),
  service_type VARCHAR(120) NOT NULL,
  queue_position INTEGER,
  estimated_completion TIMESTAMPTZ,
  repair_notes TEXT,
  estimated_cost NUMERIC(12,2) DEFAULT 0,
  final_cost NUMERIC(12,2),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- spare_parts
-- ----------------------------------------------------------
CREATE TABLE spare_parts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  sku VARCHAR(60) UNIQUE NOT NULL,
  category VARCHAR(80),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_threshold INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- service_spare_parts  (parts consumed by a service -> drives auto stock reduction)
-- ----------------------------------------------------------
CREATE TABLE service_spare_parts (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  spare_part_id INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- inventory  (stock ledger: every in/out movement)
-- ----------------------------------------------------------
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  spare_part_id INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL, -- 'in' | 'out'
  quantity INTEGER NOT NULL,
  reference VARCHAR(255),
  service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- transactions  (invoices / payments tied to a service)
-- ----------------------------------------------------------
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_number VARCHAR(40) UNIQUE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(30) DEFAULT 'cash',
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid', -- unpaid | paid
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- notifications
-- ----------------------------------------------------------
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(30) DEFAULT 'info', -- info | success | warning | danger
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- Indexes for common lookups
-- ----------------------------------------------------------
CREATE INDEX idx_vehicles_customer ON vehicles(customer_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_services_status ON services(status_id);
CREATE INDEX idx_services_customer ON services(customer_id);
CREATE INDEX idx_services_mechanic ON services(mechanic_id);
CREATE INDEX idx_inventory_part ON inventory(spare_part_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);

-- ----------------------------------------------------------
-- Static lookup data (roles + service pipeline)
-- ----------------------------------------------------------
INSERT INTO roles (name) VALUES ('admin'), ('customer');

INSERT INTO service_status (code, label, sort_order) VALUES
  ('waiting',            'Waiting',               1),
  ('checked_in',         'Vehicle Checked In',    2),
  ('inspection',         'Inspection',            3),
  ('repairing',          'Repairing',             4),
  ('waiting_parts',      'Waiting for Spare Parts', 5),
  ('quality_check',      'Quality Check',         6),
  ('ready_pickup',       'Ready for Pickup',      7),
  ('completed',          'Completed',             8);
