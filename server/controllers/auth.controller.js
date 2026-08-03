const bcrypt = require('bcrypt');
const userModel = require('../models/user.model');
const customerModel = require('../models/customer.model');
const { query } = require('../config/db');
const { signToken } = require('../utils/jwt.util');
const { ok, created } = require('../utils/response.util');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    role: user.role,
    customerId: user.customer_id || null,
    address: user.address || null,
    city: user.city || null,
  };
}

const register = asyncHandler(async (req, res) => {
  const { username, email, password, fullName, phone, address, city } = req.body;

  if (!username || !email || !password || !fullName) {
    throw new ApiError(422, 'Username, email, password and full name are required.');
  }
  if (password.length < 6) {
    throw new ApiError(422, 'Password must be at least 6 characters.');
  }

  const taken = await userModel.emailOrUsernameTaken(email, username);
  if (taken) throw new ApiError(409, 'Email or username is already registered.');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Resolve the customer role id dynamically rather than assuming a fixed id.
  const { rows: roleRows } = await query("SELECT id FROM roles WHERE name = 'customer'");
  if (roleRows.length === 0) throw new ApiError(500, 'Customer role missing. Run database migration.');

  const user = await userModel.createUser({
    roleId: roleRows[0].id,
    username,
    email,
    passwordHash,
    fullName,
    phone,
  });
  await customerModel.createProfile(user.id, { address, city });

  const fullUser = await userModel.findById(user.id);
  const token = signToken({ id: fullUser.id, role: fullUser.role });

  created(res, { token, user: sanitizeUser(fullUser) }, 'Account created successfully.');
});

const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    throw new ApiError(422, 'Username/email and password are required.');
  }

  const user = await userModel.findByEmailOrUsername(identifier);
  if (!user || !user.is_active) {
    throw new ApiError(401, 'Invalid credentials.');
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new ApiError(401, 'Invalid credentials.');

  const fullUser = await userModel.findById(user.id);
  const token = signToken({ id: fullUser.id, role: fullUser.role });

  ok(res, { token, user: sanitizeUser(fullUser) }, 'Logged in successfully.');
});

const me = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);
  ok(res, sanitizeUser(user));
});

const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, address, city } = req.body;
  const avatarUrl = req.file ? `/uploads/avatars/${req.file.filename}` : undefined;

  const updated = await userModel.updateProfile(req.user.id, { fullName, phone, avatarUrl });

  if (req.user.customer_id && (address !== undefined || city !== undefined)) {
    await customerModel.updateProfile(req.user.customer_id, { address, city });
  }

  const fullUser = await userModel.findById(req.user.id);
  ok(res, sanitizeUser(fullUser), 'Profile updated.');
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new ApiError(422, 'Both current and new password are required.');
  if (newPassword.length < 6) throw new ApiError(422, 'New password must be at least 6 characters.');

  const user = await userModel.findByEmailOrUsername(req.user.email);
  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) throw new ApiError(401, 'Current password is incorrect.');

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userModel.updatePassword(req.user.id, newHash);

  ok(res, null, 'Password changed successfully.');
});

module.exports = { register, login, me, updateProfile, changePassword, sanitizeUser };
