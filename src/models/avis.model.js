// src/models/avis.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Avis = sequelize.define('Avis', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  mission_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'missions', key: 'id' }
  },
  auteur_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  cible_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  note: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    validate: { min: 0, max: 5 }
  },
  commentaire: { type: DataTypes.TEXT },
  evaluation_details: {
    type: DataTypes.JSONB,
    defaultValue: {
      ponctualite: null,
      professionnalisme: null,
      qualite: null,
      communication: null
    }
  },
  reponse: DataTypes.TEXT,
  reponse_date: DataTypes.DATE,
  is_verified: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_public: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'avis',
  underscored: true,
  timestamps: true,
  paranoid: true,
});

module.exports = Avis;