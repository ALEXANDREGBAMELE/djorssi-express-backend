const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user.model'); // Adaptez selon votre modèle
const env = require('../../config/env');
const logger = require('../../config/logger');

// Inscription
const register = async (data) => {
  try {
    const { email, password, name, phone } = data;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      const error = new Error('Cet email est déjà utilisé');
      error.statusCode = 400;
      throw error;
    }

    // Hacher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Créer l'utilisateur
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      phone
    });

    // Générer le token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn || '7d' }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone
      },
      token
    };
  } catch (error) {
    logger.error('Erreur register service:', error);
    throw error;
  }
};

// Connexion
const login = async (data) => {
  try {
    const { email, password } = data;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ where: { email } });
    if (!user) {
      const error = new Error('Email ou mot de passe incorrect');
      error.statusCode = 401;
      throw error;
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      const error = new Error('Email ou mot de passe incorrect');
      error.statusCode = 401;
      throw error;
    }

    // Générer le token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn || '7d' }
    );

    // Générer le refresh token
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      env.jwtSecret,
      { expiresIn: '30d' }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone
      },
      token,
      refreshToken
    };
  } catch (error) {
    logger.error('Erreur login service:', error);
    throw error;
  }
};

// Rafraîchir le token
const refreshToken = async (refreshToken) => {
  try {
    // Vérifier le refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expiré');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Refresh token invalide');
      }
      throw error;
    }

    // Vérifier que l'utilisateur existe toujours
    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Générer un nouveau token d'accès
    const newToken = jwt.sign(
      { id: user.id, email: user.email },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn || '7d' }
    );

    // Générer un nouveau refresh token
    const newRefreshToken = jwt.sign(
      { id: user.id, email: user.email },
      env.jwtSecret,
      { expiresIn: '30d' }
    );

    return {
      token: newToken,
      refreshToken: newRefreshToken
    };
  } catch (error) {
    logger.error('Erreur refreshToken service:', error);
    throw error;
  }
};

module.exports = {
  register,
  login,
  refreshToken
};