const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user.model');

const SALT_ROUNDS = 10;

async function register(data) {
  const existing = await User.findOne({ where: { phone: data.phone } });
  if (existing) {
    const err = new Error('Ce numéro est déjà utilisé');
    err.status = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await User.create({
    phone: data.phone,
    password_hash,
    full_name: data.full_name,
    quartier: data.quartier,
    user_type: data.user_type,
    is_company: data.is_company,
    company_name: data.company_name,
  });

  return user; // password_hash exclu grâce au defaultScope
}

async function login({ phone, password }) {
  const user = await User.scope('withPassword').findOne({ where: { phone } });
  if (!user) {
    const err = new Error('Identifiants invalides');
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Identifiants invalides');
    err.status = 401;
    throw err;
  }

  if (!user.is_active) {
    const err = new Error('Compte désactivé');
    err.status = 403;
    throw err;
  }

  const token = jwt.sign(
    { id: user.id, user_type: user.user_type },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password_hash, ...safeUser } = user.toJSON();
  return { token, user: safeUser };
}

async function getProfile(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('Utilisateur introuvable');
    err.status = 404;
    throw err;
  }
  return user;
}

async function updateProfile(userId, data) {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('Utilisateur introuvable');
    err.status = 404;
    throw err;
  }
  await user.update(data);
  return user;
}

module.exports = { register, login, getProfile, updateProfile };