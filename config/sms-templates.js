// config/sms-templates.js
const smsTemplates = {
  // Notification de nouvelle mission
  newMission: (data) => {
    return `🎵 Nouvelle mission disponible : ${data.title} à ${data.city}. Postulez vite !`;
  },

  // Candidature acceptée
  candidatureAcceptee: (data) => {
    return `🎵 Félicitations ! Vous avez été accepté pour la mission "${data.missionTitle}". Contactez l'employeur pour les détails.`;
  },

  // Candidature refusée
  candidatureRefusee: (data) => {
    return `ℹ️ Votre candidature pour la mission "${data.missionTitle}" a été refusée. Continuez à postuler !`;
  },

  // Paiement reçu
  paiementRecu: (data) => {
    return `💰 Vous avez reçu ${data.amount} FCFA pour la mission "${data.missionTitle}".`;
  },

  // Rappel de mission
  rappelMission: (data) => {
    return `🔔 Rappel : Votre mission "${data.missionTitle}" aura lieu demain à ${data.time}.`;
  },

  // Vérification d'identité
  identityVerified: (data) => {
    return `✅ Votre identité a été vérifiée avec succès sur Djorssi Express.`;
  },

  // Code de vérification (2FA)
  verificationCode: (data) => {
    return `🔐 Votre code de vérification Djorssi Express est : ${data.code}. Valable 5 minutes.`;
  },

  // Nouveau message
  newMessage: (data) => {
    return `💬 Vous avez reçu un nouveau message de ${data.senderName} sur Djorssi Express. Connectez-vous pour le lire.`;
  },
};

module.exports = smsTemplates;