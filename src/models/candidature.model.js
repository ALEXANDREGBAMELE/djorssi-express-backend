// src/models/candidature.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Candidature = sequelize.define('Candidature', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  
  // Relations
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
  
  // Message de motivation
  message_motivation: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [10, 1000]
    }
  },
  
  // Prix proposé par le DJ
  prix_propose: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  
  // Statut de la candidature
  status: {
    type: DataTypes.ENUM('en_attente', 'acceptee', 'refusee', 'annulee'),
    defaultValue: 'en_attente',
    allowNull: false,
  },
  
  // Date de réponse
  date_reponse: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  
  // Commentaire de l'employeur
  commentaire_employeur: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  
  // Note donnée par l'employeur (après la mission)
  note_employeur: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 5
    }
  },
  
  // Commentaire du DJ (après la mission)
  commentaire_dj: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  
  // Évaluation du DJ par l'employeur
  evaluation: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      ponctualite: null,
      professionnalisme: null,
      qualite_prestation: null,
      communication: null,
      commentaire: null
    }
  },
  
  // Statut de paiement
  paiement_status: {
    type: DataTypes.ENUM('non_paye', 'en_attente', 'paye', 'rembourse'),
    defaultValue: 'non_paye',
    allowNull: false,
  },
  
  // Montant payé
  montant_paye: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  
  // Date de paiement
  date_paiement: {
    type: DataTypes.DATE,
    allowNull: true,
  },

   // ✅ Pré-sélection
  preselected: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  preselected_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  preselected_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },

  // ✅ Entretien
  entretien_programme: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  entretien_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  entretien_lieu: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  entretien_type: {
    type: DataTypes.ENUM('presentiel', 'visio', 'telephone', 'chat'),
    defaultValue: 'chat',
  },
  entretien_conversation_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'conversations',
      key: 'id'
    }
  },
  entretien_status: {
    type: DataTypes.ENUM('a_planifier', 'planifie', 'confirme', 'termine', 'annule'),
    defaultValue: 'a_planifier',
  },
  entretien_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // ✅ Date de confirmation finale
  confirmed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  
}, {
  tableName: 'candidatures',
  underscored: true,
  paranoid: true,
  timestamps: true,
  
  // Scopes
  scopes: {
    en_attente: {
      where: { status: 'en_attente' }
    },
    acceptees: {
      where: { status: 'acceptee' }
    },
    refusees: {
      where: { status: 'refusee' }
    },
    avec_mission: {
      include: ['mission']
    },
    avec_dj: {
      include: ['dj']
    },
    avec_details: {
      include: ['mission', 'dj']
    }
  }
});

console.log('✅ Candidature model loaded successfully');

module.exports = Candidature;