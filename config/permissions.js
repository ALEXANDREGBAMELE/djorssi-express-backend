// src/config/permissions.js

// Définition des rôles
const ROLES = {
  DJORSSI: 'djorssi',
  EMPLOYEUR: 'employeur',
  ADMIN: 'admin'
};

// Définition des permissions par rôle
const PERMISSIONS = {
  // ====================
  // Permissions du DJ (djorssi)
  // ====================
  [ROLES.DJORSSI]: {
    // Gestion du profil
    'profile.view': true,
    'profile.update': true,
    'profile.delete': true,
    
    // Gestion des missions
    'mission.view': true,
    'mission.apply': true,
    'mission.view_applications': true,
    
    // Gestion des disponibilités
    'availability.view': true,
    'availability.update': true,
    
    // Gestion des avis
    'review.view': true,
    'review.create': true,
    'review.respond': true,
    
    // Paiements
    'paiement.view': true,
    
    // Identité / Vérification
    'identity.submit': true,
    'identity.view': true,
    
    // Notifications
    'notification.view': true,
    'notification.read': true,
    'notification.delete': true,
    
    // Dashboard
    'dashboard.view': true,
    'dashboard.own_stats': true,
    
    // Catégories
    'category.view': true,
  },
  
  // ====================
  // Permissions de l'employeur
  // ====================
  [ROLES.EMPLOYEUR]: {
    // Gestion du profil
    'profile.view': true,
    'profile.update': true,
    'profile.delete': true,
    
    // Gestion des missions
    'mission.view': true,
    'mission.create': true,
    'mission.update': true,
    'mission.delete': true,
    'mission.publish': true,
    'mission.view_applications': true,
    'mission.manage_applications': true,
    'mission.select_djs': true,
    
    // Gestion des entreprises
    'company.view': true,
    'company.update': true,
    
    // Gestion des avis
    'review.view': true,
    'review.create': true,
    'review.respond': true,
    
    // Paiements
    'paiement.create': true,
    'paiement.view': true,
    
    // Identité / Vérification
    'identity.submit': true,
    'identity.view': true,
    
    // Notifications
    'notification.view': true,
    'notification.read': true,
    'notification.delete': true,
    
    // Dashboard
    'dashboard.view': true,
    'dashboard.employer_stats': true,
    
    // Catégories
    'category.view': true,
  },
  
  // ====================
  // Permissions de l'admin
  // ====================
  [ROLES.ADMIN]: {
    // Toutes les permissions
    '*': true,
    
    // Gestion des utilisateurs
    'user.view': true,
    'user.create': true,
    'user.update': true,
    'user.delete': true,
    'user.change_role': true,
    'user.ban': true,
    'user.verify': true,
    
    // Gestion des missions
    'mission.view': true,
    'mission.create': true,
    'mission.update': true,
    'mission.delete': true,
    'mission.manage_all': true,
    'mission.publish': true,
    'mission.validate': true,
    
    // Gestion des catégories
    'category.view': true,
    'category.create': true,
    'category.update': true,
    'category.delete': true,
    
    // Gestion des avis
    'review.view': true,
    'review.create': true,
    'review.delete': true,
    'review.moderate': true,
    
    // Gestion des paiements
    'paiement.view': true,
    'paiement.create': true,
    'paiement.validate': true,
    'paiement.refund': true,
    
    // Identité / Vérification
    'identity.view': true,
    'identity.view_all': true,
    'identity.approve': true,
    'identity.reject': true,
    'identity.delete': true,
    
    // Notifications
    'notification.view': true,
    'notification.send': true,
    'notification.delete': true,
    'notification.manage': true,
    
    // Gestion du système
    'system.view': true,
    'system.manage': true,
    'system.config': true,
    'system.logs': true,
    
    // Dashboard
    'dashboard.view': true,
    'dashboard.admin_stats': true,
    'dashboard.reports': true,
    'dashboard.analytics': true,
    
    // Statistiques
    'stats.view': true,
    'stats.export': true,
  }
};

// ====================
// FONCTIONS UTILITAIRES
// ====================

// Vérifier si un utilisateur a une permission
const hasPermission = (user, permission) => {
  if (!user || !user.user_type) return false;
  
  const userRole = user.user_type;
  const userPermissions = PERMISSIONS[userRole];
  
  if (!userPermissions) return false;
  
  // Si l'utilisateur a la permission '*', il a accès à tout
  if (userPermissions['*']) return true;
  
  return userPermissions[permission] === true;
};

// Obtenir toutes les permissions d'un utilisateur
const getUserPermissions = (user) => {
  if (!user || !user.user_type) return [];
  
  const userRole = user.user_type;
  const userPermissions = PERMISSIONS[userRole];
  
  if (!userPermissions) return [];
  
  // Si l'utilisateur a la permission '*', retourner toutes les permissions
  if (userPermissions['*']) {
    const allPermissions = new Set();
    Object.values(PERMISSIONS).forEach(perms => {
      Object.keys(perms).forEach(key => {
        if (key !== '*') allPermissions.add(key);
      });
    });
    return Array.from(allPermissions);
  }
  
  return Object.keys(userPermissions).filter(key => userPermissions[key] === true);
};

// Obtenir le rôle d'un utilisateur
const getUserRole = (user) => {
  if (!user || !user.user_type) return null;
  return user.user_type;
};

// Vérifier si un utilisateur a un rôle spécifique
const hasRole = (user, role) => {
  if (!user || !user.user_type) return false;
  return user.user_type === role;
};

// Vérifier si un utilisateur a un des rôles spécifiés
const hasAnyRole = (user, roles) => {
  if (!user || !user.user_type) return false;
  return roles.includes(user.user_type);
};

// Vérifier si l'utilisateur est admin
const isAdmin = (user) => {
  return hasRole(user, ROLES.ADMIN);
};

// Vérifier si l'utilisateur est employeur
const isEmployeur = (user) => {
  return hasRole(user, ROLES.EMPLOYEUR);
};

// Vérifier si l'utilisateur est DJ
const isDjorssi = (user) => {
  return hasRole(user, ROLES.DJORSSI);
};

// ====================
// MIDDLEWARES
// ====================

// Middleware pour vérifier les permissions
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
    }
    
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission '${permission}' requise`
      });
    }
    
    next();
  };
};

// Middleware pour vérifier le rôle
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
    }
    
    const userRole = req.user.user_type;
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Rôle '${roles.join(', ')}' requis`
      });
    }
    
    next();
  };
};

// Middleware pour vérifier si l'utilisateur est le propriétaire d'une ressource
const requireOwnership = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Non authentifié'
        });
      }

      // Si admin, on laisse passer
      if (isAdmin(req.user)) {
        return next();
      }

      const ownerId = await getResourceOwnerId(req);
      if (ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas le propriétaire de cette ressource'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification de propriété'
      });
    }
  };
};

// ====================
// EXPORTS
// ====================

module.exports = {
  // Constantes
  ROLES,
  PERMISSIONS,
  
  // Fonctions de vérification
  hasPermission,
  getUserPermissions,
  getUserRole,
  hasRole,
  hasAnyRole,
  isAdmin,
  isEmployeur,
  isDjorssi,
  
  // Middlewares
  requirePermission,
  requireRole,
  requireOwnership
};