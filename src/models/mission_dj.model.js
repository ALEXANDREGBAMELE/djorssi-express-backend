// src/models/mission_dj.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const MissionDJ = sequelize.define('MissionDJ', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  
  mission_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'missions',
      key: 'id'
    }
  },
  
  dj_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Statut de sélection du DJ
  status: {
    type: DataTypes.ENUM('selectionne', 'confirme', 'annule'),
    defaultValue: 'selectionne',
    allowNull: false,
  },
  
  // Date de confirmation
  date_confirmation: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  
  // Rémunération spécifique pour ce DJ (si différente)
  remuneration_specifique: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: { min: 0 }
  },
  
  // Notes spécifiques pour ce DJ
  notes_specifiques: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  
}, {
  tableName: 'mission_djs',
  underscored: true,
  timestamps: true,
});

console.log('✅ MissionDJ model loaded successfully');

module.exports = MissionDJ;