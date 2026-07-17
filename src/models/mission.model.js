// src/models/mission.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

if (!sequelize) {
  console.error('❌ sequelize is not loaded!');
  process.exit(1);
}

const Mission = sequelize.define('Mission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  
  // Informations principales
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { len: [3, 100] }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: { len: [10, 2000] }
  },
  
  // Type de mission
  mission_type: {
    type: DataTypes.ENUM('concert', 'soiree', 'mariage', 'anniversaire', 'corporate', 'autre'),
    allowNull: false,
    defaultValue: 'autre'
  },
  
  // Localisation
  lieu: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ville: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  quartier: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  adresse_complete: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  
  // Dates
  date_mission: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  date_fin_mission: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  date_limite_candidature: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  
  // Durée
  duree_estimee: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIn: [['1h', '2h', '3h', '4h', '5h', '6h+']]
    }
  },
  
  // Budget / Rémunération
  budget: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: { min: 0 }
  },
  budget_negociable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  remuneration_details: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  
  // Statut de la mission
  status: {
    type: DataTypes.ENUM('brouillon', 'publiee', 'en_cours', 'terminee', 'annulee', 'expiree'),
    defaultValue: 'brouillon',
    allowNull: false,
  },
  
  // ✅ MODIFICATION : Nombre de DJs requis (peut être multiple)
  nb_djs_requis: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 20  // Augmenté pour permettre plusieurs DJs
    }
  },
  
  // ✅ NOUVEAU : Nombre de DJs sélectionnés actuellement
  nb_djs_selectionnes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  
  // ✅ NOUVEAU : Nombre minimum de DJs requis (pour validation)
  nb_djs_minimum: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  
  // Exigences spécifiques
  exigences: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
  },
  equipement_fourni: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  equipement_requis: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  
  // Contact
  contact_nom: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contact_telephone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contact_email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: { isEmail: true }
  },
  
  // Informations supplémentaires
  instructions_speciales: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  
  // Relations
  employer_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // ✅ MODIFICATION : Plus de dj_selectionne_id (remplacé par la table de liaison)
  // On garde un champ pour stocker les IDs des DJs sélectionnés (pour faciliter les requêtes)
  dj_selectionnes_ids: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
  },
  
  // Statistiques
  nb_candidatures: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  note_moyenne: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
  },
  
  // Visibilité
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

   // ✅ Ajout de la catégorie (relation Many-to-One)
  category_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'categories_missions',
      key: 'id'
    }
  },
  
}, {
  tableName: 'missions',
  underscored: true,
  paranoid: true,
  timestamps: true,
  
  scopes: {
    publiees: {
      where: { status: 'publiee' }
    },
    en_cours: {
      where: { status: 'en_cours' }
    },
    terminees: {
      where: { status: 'terminee' }
    },
    withEmployer: {
      include: ['employer']
    },
    withDetails: {
      include: ['employer', 'dj_selectionnes', 'candidatures']
    }
  }
});
console.log('✅ Mission model loaded successfully');

module.exports = Mission;