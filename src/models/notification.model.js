// src/models/notification.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  type: {
    type: DataTypes.ENUM(
      'nouvelle_candidature',
      'candidature_acceptee',
      'candidature_refusee',
      'mission_publiee',
      'mission_terminee',
      'selection_dj',
      'paiement_recu',
      'nouvel_avis'
    ),
    allowNull: false,
  },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  link: DataTypes.STRING,
  data: DataTypes.JSONB,
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  read_at: DataTypes.DATE,
}, {
  tableName: 'notifications',
  underscored: true,
  timestamps: true,
});

module.exports = Notification;