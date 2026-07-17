// config/sms.js
const twilio = require('twilio');
const logger = require('./logger');

class SMSService {
  constructor() {
    this.client = null;
    this.enabled = process.env.SMS_ENABLED === 'true';
    
    if (this.enabled) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.from = process.env.TWILIO_PHONE_NUMBER;
      logger.info('✅ Service SMS activé');
    } else {
      logger.info('ℹ️ Service SMS désactivé (mode simulation)');
    }
  }

  // Envoyer un SMS
  async sendSMS({ to, message, template, data }) {
    try {
      if (!this.enabled) {
        // Mode simulation
        logger.info(`📱 [SMS SIMULATION] À: ${to} | Message: ${message}`);
        return { success: true, sid: 'simulation_' + Date.now() };
      }

      // Utiliser un template si fourni
      let finalMessage = message;
      if (template) {
        const templateFn = this.loadTemplate(template);
        if (templateFn) {
          finalMessage = templateFn(data || {});
        }
      }

      const result = await this.client.messages.create({
        body: finalMessage,
        to: to.startsWith('+') ? to : `+225${to}`, // Format international
        from: this.from,
      });

      logger.info(`📱 SMS envoyé à ${to}: ${result.sid}`);
      return { success: true, sid: result.sid };
    } catch (error) {
      logger.error('Erreur envoi SMS:', error);
      return { success: false, error: error.message };
    }
  }

  // Envoyer en masse
  async sendBulkSMS(recipients, message) {
    const results = [];
    for (const recipient of recipients) {
      const result = await this.sendSMS({
        to: recipient,
        message,
      });
      results.push({ recipient, ...result });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Éviter le rate limiting
    }
    return results;
  }

  // Vérifier le solde (pour Twilio)
  async checkBalance() {
    if (!this.enabled) return { success: false, message: 'SMS désactivé' };
    
    try {
      const balance = await this.client.balance.fetch();
      return { success: true, balance: balance.balance };
    } catch (error) {
      logger.error('Erreur vérification solde:', error);
      return { success: false, error: error.message };
    }
  }
}

// Singleton
const smsService = new SMSService();
module.exports = smsService;