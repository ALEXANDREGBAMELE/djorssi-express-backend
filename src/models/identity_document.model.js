// src/models/identity_document.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const IdentityDocument = sequelize.define('IdentityDocument', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  document_type: {
    type: DataTypes.ENUM(
      'cni',           // Carte Nationale d'Identité
      'passeport',      // Passeport
      'permis_conduire', // Permis de conduire
      'carte_sejour',   // Carte de séjour
      'autre'
    ),
    allowNull: false,
  },
  document_number: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  document_front_url: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  document_back_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  selfie_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  expiry_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  reviewed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'identity_documents',
  underscored: true,
  timestamps: true,
  paranoid: true,
});

module.exports = IdentityDocument;