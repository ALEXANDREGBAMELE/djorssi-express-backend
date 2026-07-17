// src/controllers/profile.controller.js
const User = require('../models/user.model');
const { hasPermission, getUserPermissions } = require('../../config/permissions');
const logger = require('../../config/logger');

// Récupérer les informations du profil avec les permissions
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Récupérer l'utilisateur
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Récupérer les permissions de l'utilisateur
    const permissions = getUserPermissions(req.user);
    
    // Construction du profil adapté au rôle
    const profile = {
      // Informations de base (toujours visibles)
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        profile_photo: user.profile_photo,
        user_type: user.user_type,
        is_active: user.is_active,
        is_verified: user.is_verified,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      },
      
      // Informations spécifiques au rôle
      role_data: {},
      
      // Permissions de l'utilisateur
      permissions: permissions,
      
      // Fonctionnalités disponibles
      features: {
        // Features disponibles selon le rôle
        ...getFeaturesByRole(user.user_type)
      }
    };
    
    // Ajouter les données spécifiques au rôle
    switch (user.user_type) {
      case 'djorssi':
        profile.role_data = {
          quartier: user.quartier,
          ville: user.ville,
          pays: user.pays,
          bio: user.bio,
          // Autres champs spécifiques au DJ
        };
        break;
        
      case 'employeur':
        profile.role_data = {
          company_name: user.company_name,
          company_siret: user.company_siret,
          quartier: user.quartier,
          ville: user.ville,
          pays: user.pays,
          bio: user.bio,
          // Autres champs spécifiques à l'employeur
        };
        break;
        
      case 'admin':
        profile.role_data = {
          // Données spécifiques à l'admin
          is_super_admin: user.is_super_admin || false,
        };
        break;
    }
    
    res.json({
      success: true,
      data: profile
    });
    
  } catch (error) {
    logger.error('Erreur getProfile:', error);
    next(error);
  }
};

// Fonction pour obtenir les fonctionnalités selon le rôle
const getFeaturesByRole = (role) => {
  const features = {
    djorssi: {
      // Navigation
      navigation: [
        { name: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
        { name: 'Missions disponibles', icon: 'search', path: '/missions' },
        { name: 'Mes candidatures', icon: 'applications', path: '/applications' },
        { name: 'Mon profil', icon: 'profile', path: '/profile' },
        { name: 'Mes disponibilités', icon: 'calendar', path: '/availability' },
        { name: 'Mes avis', icon: 'reviews', path: '/reviews' },
      ],
      
      // Actions disponibles
      actions: [
        'Voir les missions disponibles',
        'Postuler à une mission',
        'Voir mes candidatures',
        'Gérer mes disponibilités',
        'Voir mes avis',
        'Modifier mon profil',
      ],
      
      // Statistiques visibles
      stats: [
        'Nombre de candidatures',
        'Candidatures acceptées',
        'Nombre d\'avis reçus',
        'Note moyenne'
      ]
    },
    
    employeur: {
      navigation: [
        { name: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
        { name: 'Mes missions', icon: 'missions', path: '/my-missions' },
        { name: 'Créer une mission', icon: 'add', path: '/missions/create' },
        { name: 'Candidatures reçues', icon: 'applications', path: '/applications' },
        { name: 'Mon profil', icon: 'profile', path: '/profile' },
        { name: 'Mon entreprise', icon: 'company', path: '/company' },
      ],
      
      actions: [
        'Créer une mission',
        'Modifier une mission',
        'Supprimer une mission',
        'Voir les candidatures',
        'Gérer les candidatures',
        'Modifier mon profil',
        'Modifier les informations de l\'entreprise',
      ],
      
      stats: [
        'Nombre de missions publiées',
        'Nombre de candidatures reçues',
        'Candidatures acceptées',
        'Note moyenne',
      ]
    },
    
    admin: {
      navigation: [
        { name: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
        { name: 'Utilisateurs', icon: 'users', path: '/users' },
        { name: 'Missions', icon: 'missions', path: '/missions' },
        { name: 'Statistiques', icon: 'stats', path: '/stats' },
        { name: 'Paramètres', icon: 'settings', path: '/settings' },
        { name: 'Rapports', icon: 'reports', path: '/reports' },
      ],
      
      actions: [
        'Gérer les utilisateurs',
        'Gérer les missions',
        'Modifier les rôles',
        'Voir les statistiques globales',
        'Générer des rapports',
        'Modifier les paramètres système',
      ],
      
      stats: [
        'Nombre total d\'utilisateurs',
        'Nombre de missions',
        'Candidatures totales',
        'Taux de conversion',
        'Revenus générés',
      ]
    }
  };
  
  return features[role] || features.djorssi;
};

// Mettre à jour le profil
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Vérifier si l'utilisateur a la permission de mettre à jour son profil
    if (!hasPermission(req.user, 'profile.update')) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de modifier votre profil'
      });
    }
    
    // Champs autorisés selon le rôle
    const allowedFields = getEditableFields(req.user.user_type);
    const updateData = {};
    
    // Filtrer les champs autorisés
    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateData[key] = value;
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun champ valide à mettre à jour'
      });
    }
    
    // Récupérer l'utilisateur
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Mettre à jour
    await user.update(updateData);
    
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] }
    });
    
    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: { user: updatedUser }
    });
    
  } catch (error) {
    logger.error('Erreur updateProfile:', error);
    next(error);
  }
};

// Fonction pour obtenir les champs modifiables selon le rôle
const getEditableFields = (role) => {
  // Champs de base modifiables par tous
  const baseFields = [
    'first_name', 'last_name', 'phone', 
    'profile_photo', 'quartier', 'ville', 'pays', 'bio'
  ];
  
  // Champs spécifiques selon le rôle
  const roleFields = {
    djorssi: [
      // Les DJs ne peuvent pas modifier leur user_type ni company_name
    ],
    employeur: [
      'company_name', 'company_siret'
    ],
    admin: [
      'is_active', 'is_verified', 'user_type'
    ]
  };
  
  return [...baseFields, ...(roleFields[role] || [])];
};

// Obtenir le dashboard adapté au rôle
const getDashboard = async (req, res, next) => {
  try {
    const user = req.user;
    const role = user.user_type;
    
    // Données du dashboard selon le rôle
    let dashboardData = {
      role: role,
      user: {
        id: user.id,
        username: user.username,
        full_name: `${user.first_name} ${user.last_name}`,
        profile_photo: user.profile_photo
      },
      navigation: [],
      stats: [],
      recent_activity: [],
      quick_actions: []
    };
    
    switch (role) {
      case 'djorssi':
        dashboardData = {
          ...dashboardData,
          navigation: [
            { name: 'Missions disponibles', path: '/missions', icon: 'search' },
            { name: 'Mes candidatures', path: '/applications', icon: 'file' },
            { name: 'Mes disponibilités', path: '/availability', icon: 'calendar' },
          ],
          stats: [
            { label: 'Candidatures', value: 0, icon: 'file' },
            { label: 'Acceptées', value: 0, icon: 'check' },
            { label: 'Avis reçus', value: 0, icon: 'star' },
          ],
          quick_actions: [
            { label: 'Voir les missions', path: '/missions', icon: 'search' },
            { label: 'Mettre à jour mes disponibilités', path: '/availability', icon: 'calendar' },
          ]
        };
        break;
        
      case 'employeur':
        dashboardData = {
          ...dashboardData,
          navigation: [
            { name: 'Mes missions', path: '/my-missions', icon: 'list' },
            { name: 'Créer une mission', path: '/missions/create', icon: 'add' },
            { name: 'Candidatures reçues', path: '/applications', icon: 'users' },
          ],
          stats: [
            { label: 'Missions publiées', value: 0, icon: 'list' },
            { label: 'Candidatures reçues', value: 0, icon: 'users' },
            { label: 'Acceptées', value: 0, icon: 'check' },
          ],
          quick_actions: [
            { label: 'Créer une mission', path: '/missions/create', icon: 'add' },
            { label: 'Voir les candidatures', path: '/applications', icon: 'users' },
          ]
        };
        break;
        
      case 'admin':
        dashboardData = {
          ...dashboardData,
          navigation: [
            { name: 'Utilisateurs', path: '/users', icon: 'users' },
            { name: 'Missions', path: '/missions', icon: 'list' },
            { name: 'Statistiques', path: '/stats', icon: 'chart' },
            { name: 'Paramètres', path: '/settings', icon: 'settings' },
          ],
          stats: [
            { label: 'Utilisateurs', value: 0, icon: 'users' },
            { label: 'Missions', value: 0, icon: 'list' },
            { label: 'Candidatures', value: 0, icon: 'file' },
            { label: 'Revenus', value: '0 FCFA', icon: 'money' },
          ],
          quick_actions: [
            { label: 'Gérer les utilisateurs', path: '/users', icon: 'users' },
            { label: 'Voir les rapports', path: '/reports', icon: 'file' },
          ]
        };
        break;
    }
    
    res.json({
      success: true,
      data: dashboardData
    });
    
  } catch (error) {
    logger.error('Erreur getDashboard:', error);
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getDashboard,
  getFeaturesByRole,
  getEditableFields
};