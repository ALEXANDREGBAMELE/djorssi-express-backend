// ✅ Import direct du modèle
const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize'); // ✅ IMPORTANT: Ajouter cette ligne
const env = require('../../config/env');
const logger = require('../../config/logger');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

// Vérification que User est bien chargé
console.log('🔍 User in auth.controller:', typeof User);
console.log('🔍 User.findOne:', typeof User.findOne);

// Inscription
const register = async (req, res, next) => {
  try {
    // Validation avec Zod
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        success: false,
        errors: result.error.flatten().fieldErrors 
      });
    }

    const data = result.data;
    
    const {
      username,
      email,
      phone,
      password,
      first_name,
      last_name,
      quartier,
      ville,
      pays,
      user_type,
      is_company,
      company_name,
      company_siret,
      bio,
      profile_photo
    } = data;

    // ✅ Correction: Utiliser Op.or au lieu de User.sequelize.Op.or
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { phone },
          { username }
        ]
      }
    });

    if (existingUser) {
      let message = 'Ces informations sont déjà utilisées';
      if (existingUser.email === email) message = 'Cet email est déjà utilisé';
      else if (existingUser.phone === phone) message = 'Ce numéro de téléphone est déjà utilisé';
      else if (existingUser.username === username) message = 'Ce nom d\'utilisateur est déjà pris';
      
      return res.status(400).json({
        success: false,
        message
      });
    }

    // Hacher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Créer l'utilisateur
    const user = await User.create({
      username,
      email,
      phone,
      password_hash: hashedPassword,
      first_name,
      last_name,
      quartier: quartier || null,
      ville: ville || null,
      pays: pays || 'Côte d\'Ivoire',
      user_type,
      is_company: is_company || false,
      company_name: company_name || null,
      company_siret: company_siret || null,
      bio: bio || null,
      profile_photo: profile_photo || null,
      is_active: true,
      is_verified: false
    });

    // Générer le token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        username: user.username,
        user_type: user.user_type 
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn || '7d' }
    );

    // Générer le refresh token
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      env.jwtSecret,
      { expiresIn: '30d' }
    );

    // Mettre à jour last_login
    await user.update({ last_login: new Date() });

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          quartier: user.quartier,
          ville: user.ville,
          pays: user.pays,
          user_type: user.user_type,
          is_company: user.is_company,
          company_name: user.company_name,
          bio: user.bio,
          profile_photo: user.profile_photo,
          is_active: user.is_active,
          is_verified: user.is_verified
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Erreur lors de l\'inscription:', error);
    next(error);
  }
};

// Connexion (avec email ou username)
const login = async (req, res, next) => {
  try {
    // Validation avec Zod
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        success: false,
        errors: result.error.flatten().fieldErrors 
      });
    }

    const { email, password } = result.data;

    // ✅ Correction: Utiliser Op.or au lieu de User.sequelize.Op.or
    const user = await User.scope('withPassword').findOne({
      where: {
        [Op.or]: [
          { email },
          { username: email } // Permet de se connecter avec username aussi
        ]
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email/Username ou mot de passe incorrect'
      });
    }

    // Vérifier si le compte est actif
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Compte désactivé. Contactez le support.'
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email/Username ou mot de passe incorrect'
      });
    }

    // Mettre à jour last_login
    await user.update({ last_login: new Date() });

    // Générer le token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        username: user.username,
        user_type: user.user_type 
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn || '7d' }
    );

    // Générer le refresh token
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      env.jwtSecret,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          quartier: user.quartier,
          ville: user.ville,
          pays: user.pays,
          user_type: user.user_type,
          is_company: user.is_company,
          company_name: user.company_name,
          bio: user.bio,
          profile_photo: user.profile_photo,
          is_active: user.is_active,
          is_verified: user.is_verified
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la connexion:', error);
    next(error);
  }
};

// Rafraîchir le token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token requis'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Refresh token expiré'
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Refresh token invalide'
        });
      }
      throw error;
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const newToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        username: user.username,
        user_type: user.user_type 
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn || '7d' }
    );

    const newRefreshToken = jwt.sign(
      { id: user.id, email: user.email },
      env.jwtSecret,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    logger.error('Erreur lors du rafraîchissement du token:', error);
    next(error);
  }
};

// Déconnexion
const logout = async (req, res, next) => {
  try {
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    next(error);
  }
};

// Profil
const profile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  profile
};