// src/models/conversation.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Participants
  participant1_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  participant2_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // Dernier message (pour prévisualisation)
  last_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  last_message_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_message_sender_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // Compteurs de non-lus
  unread_count_p1: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  unread_count_p2: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Statut
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // Contexte (mission associée)
  mission_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'missions',
      key: 'id'
    }
  },
}, {
  tableName: 'conversations',
  underscored: true,
  timestamps: true,
  paranoid: true,
});

module.exports = Conversation;