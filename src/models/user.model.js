const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

// Vérifier que sequelize est bien chargé
if (!sequelize) {
  console.error('❌ sequelize is not loaded!');
  process.exit(1);
}

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Identifiants
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      len: [3, 30]
    }
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  // Identité
  first_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Sécurité
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Localisation
  quartier: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ville: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pays: {
    type: DataTypes.STRING,
    defaultValue: 'Côte d\'Ivoire',
  },
  // Type d'utilisateur
  user_type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isIn: [['djorssi', 'employeur','admin']] },
  },
  // Entreprise
  is_company: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  company_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  company_siret: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Profil
  profile_photo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Statut
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
  },
   // ✅ Vérification d'identité
  identity_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  identity_verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  identity_verified_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  identity_verification_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'not_submitted'),
    defaultValue: 'not_submitted',
  },
  identity_verification_rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'users',
  underscored: true,
  paranoid: true,
  defaultScope: {
    attributes: { 
      exclude: ['password_hash'] 
    },
  },
  scopes: {
    withPassword: { 
      attributes: {} 
    },
  },
});

// ✅ Getter pour full_name (champ virtuel)
Object.defineProperty(User.prototype, 'full_name', {
  get: function() {
    return `${this.first_name} ${this.last_name}`.trim();
  },
  enumerable: true,
  configurable: true,
});

// ✅ Méthode pour obtenir le nom complet
User.prototype.getFullName = function() {
  return `${this.first_name} ${this.last_name}`.trim();
};

// ✅ Méthode statique pour obtenir le nom complet dans les requêtes
User.getFullNameAttribute = function() {
  return sequelize.literal(`"first_name" || ' ' || "last_name"`);
};

console.log('✅ User model loaded successfully');
console.log('✅ User.findOne:', typeof User.findOne);

module.exports = User;