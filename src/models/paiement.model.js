// src/models/paiement.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Paiement = sequelize.define('Paiement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  candidature_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'candidatures', key: 'id' }
  },
  employeur_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  dj_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  montant: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 }
  },
  frais: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  commission: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  mode_paiement: {
    type: DataTypes.ENUM('especes', 'virement', 'mobile_money', 'cheque', 'carte'),
    allowNull: false,
  },
  reference: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('en_attente', 'confirme', 'echoue', 'rembourse'),
    defaultValue: 'en_attente',
  },
  date_paiement: DataTypes.DATE,
  date_validation: DataTypes.DATE,
  details: DataTypes.JSONB,
}, {
  tableName: 'paiements',
  underscored: true,
  timestamps: true,
  paranoid: true,
});

module.exports = Paiement;