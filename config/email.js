// config/email.js
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      pool: true,
      maxConnections: 5,
      rateLimit: 2,
    });

    this.defaultFrom = process.env.EMAIL_FROM || 'noreply@djorssi-express.com';
    this.templatesPath = path.join(__dirname, '../src/templates/emails');
  }

  // Charger un template
  loadTemplate(name) {
    try {
      const templatePath = path.join(this.templatesPath, `${name}.html`);
      const source = fs.readFileSync(templatePath, 'utf8');
      return handlebars.compile(source);
    } catch (error) {
      logger.error(`Erreur chargement template ${name}:`, error);
      return null;
    }
  }

  // Envoyer un email
  async sendEmail({ to, subject, template, data, html, text, attachments = [] }) {
    try {
      let htmlContent = html;

      // Si template est fourni, le compiler
      if (template) {
        const compiledTemplate = this.loadTemplate(template);
        if (compiledTemplate) {
          htmlContent = compiledTemplate(data || {});
        }
      }

      const mailOptions = {
        from: this.defaultFrom,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html: htmlContent,
        text: text || undefined,
        attachments,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
        },
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email envoyé à ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Erreur envoi email:', error);
      return { success: false, error: error.message };
    }
  }

  // Envoyer en masse
  async sendBulkEmails(recipients, subject, template, data = {}) {
    const results = [];
    for (const recipient of recipients) {
      const result = await this.sendEmail({
        to: recipient,
        subject,
        template,
        data: { ...data, recipient },
      });
      results.push({ recipient, ...result });
      // Pause pour éviter le rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return results;
  }

  // Vérifier la connexion
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('✅ Connexion email établie');
      return true;
    } catch (error) {
      logger.error('❌ Erreur connexion email:', error);
      return false;
    }
  }
}

// Singleton
const emailService = new EmailService();
module.exports = emailService;