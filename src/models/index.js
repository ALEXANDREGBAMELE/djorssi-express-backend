// src/models/index.js
const sequelize = require('../../config/database');
const User = require('./user.model');
const Mission = require('./mission.model');
const Candidature = require('./candidature.model');
const MissionDJ = require('./mission_dj.model');
const CategoryMission = require('./categorymission.model');
const Notification = require('./notification.model');
const Avis = require('./avis.model');
const Paiement = require('./paiement.model');
const IdentityDocument = require('./identity_document.model');
const Conversation = require('./conversation.model');
const Message = require('./message.model');

// ====================
// RELATIONS - UTILISATEURS & MISSIONS
// ====================

// User ↔ Mission (Employeur)
User.hasMany(Mission, { foreignKey: 'employer_id', as: 'missions_employeur' });
Mission.belongsTo(User, { foreignKey: 'employer_id', as: 'employer' });

// User ↔ MissionDJ (DJ sélectionné)
User.belongsToMany(Mission, {
  through: MissionDJ,
  foreignKey: 'dj_id',
  otherKey: 'mission_id',
  as: 'missions_selectionnees'
});
Mission.belongsToMany(User, {
  through: MissionDJ,
  foreignKey: 'mission_id',
  otherKey: 'dj_id',
  as: 'dj_selectionnes'
});

// ====================
// RELATIONS - CANDIDATURES
// ====================

// User ↔ Candidature (DJ)
User.hasMany(Candidature, { foreignKey: 'dj_id', as: 'candidatures' });
Candidature.belongsTo(User, { foreignKey: 'dj_id', as: 'dj' });

// Mission ↔ Candidature
Mission.hasMany(Candidature, { foreignKey: 'mission_id', as: 'candidatures' });
Candidature.belongsTo(Mission, { foreignKey: 'mission_id', as: 'mission' });

// ====================
// RELATIONS - CATEGORIES
// ====================

// CategoryMission ↔ CategoryMission (Parent-Enfant)
CategoryMission.belongsTo(CategoryMission, { as: 'parent', foreignKey: 'parent_id' });
CategoryMission.hasMany(CategoryMission, { as: 'children', foreignKey: 'parent_id' });

// Mission ↔ CategoryMission
Mission.belongsTo(CategoryMission, { foreignKey: 'category_id', as: 'category' });
CategoryMission.hasMany(Mission, { foreignKey: 'category_id', as: 'missions' });

// ====================
// RELATIONS - NOTIFICATIONS
// ====================

User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ====================
// RELATIONS - AVIS
// ====================

User.hasMany(Avis, { foreignKey: 'auteur_id', as: 'avis_donnes' });
User.hasMany(Avis, { foreignKey: 'cible_id', as: 'avis_recus' });
Avis.belongsTo(User, { foreignKey: 'auteur_id', as: 'auteur' });
Avis.belongsTo(User, { foreignKey: 'cible_id', as: 'cible' });
Avis.belongsTo(Mission, { foreignKey: 'mission_id', as: 'mission' });
Mission.hasMany(Avis, { foreignKey: 'mission_id', as: 'avis' });

// ====================
// RELATIONS - PAIEMENTS
// ====================

Candidature.hasMany(Paiement, { foreignKey: 'candidature_id', as: 'paiements' });
Paiement.belongsTo(Candidature, { foreignKey: 'candidature_id', as: 'candidature' });
User.hasMany(Paiement, { foreignKey: 'employeur_id', as: 'paiements_employeur' });
User.hasMany(Paiement, { foreignKey: 'dj_id', as: 'paiements_dj' });
Paiement.belongsTo(User, { foreignKey: 'employeur_id', as: 'employeur' });
Paiement.belongsTo(User, { foreignKey: 'dj_id', as: 'dj' });

// ====================
// RELATIONS - IDENTITY DOCUMENTS
// ====================

User.hasMany(IdentityDocument, {
  foreignKey: 'user_id',
  as: 'identity_documents'
});
IdentityDocument.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});
IdentityDocument.belongsTo(User, {
  foreignKey: 'reviewed_by',
  as: 'reviewer'
});

// ====================
// RELATIONS - MESSAGERIE
// ====================

// Conversation ↔ Participants
Conversation.belongsTo(User, {
  foreignKey: 'participant1_id',
  as: 'participant1'
});
Conversation.belongsTo(User, {
  foreignKey: 'participant2_id',
  as: 'participant2'
});
Conversation.belongsTo(Mission, {
  foreignKey: 'mission_id',
  as: 'mission'
});

// Conversation ↔ Messages
Conversation.hasMany(Message, {
  foreignKey: 'conversation_id',
  as: 'messages'
});
Message.belongsTo(Conversation, {
  foreignKey: 'conversation_id',
  as: 'conversation'
});

// Message ↔ Sender
Message.belongsTo(User, {
  foreignKey: 'sender_id',
  as: 'sender'
});

// User ↔ Conversations (participant)
User.hasMany(Conversation, {
  foreignKey: 'participant1_id',
  as: 'conversations_p1'
});
User.hasMany(Conversation, {
  foreignKey: 'participant2_id',
  as: 'conversations_p2'
});

// User ↔ Messages
User.hasMany(Message, {
  foreignKey: 'sender_id',
  as: 'messages_envoyes'
});

// ====================
// EXPORTS
// ====================
module.exports = {
  sequelize,
  User,
  Mission,
  Candidature,
  MissionDJ,
  CategoryMission,
  Notification,
  Avis,
  Paiement,
  IdentityDocument,
  Conversation,
  Message
};