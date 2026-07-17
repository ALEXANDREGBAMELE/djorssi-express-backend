// src/routes/message.route.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { authenticate } = require('../middleware/auth');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');
const { rateLimiters } = require('../middleware/rateLimiter');

// Toutes les routes sont protégées
router.use(authenticate);

// ====================
// CONVERSATIONS
// ====================

// GET /conversations - Liste des conversations
router.get('/', 
  rateLimiters.authenticated,
  cacheMiddleware(60), // 1 minute
  messageController.getConversations
);

// POST /conversations - Créer une conversation
router.post('/',
  rateLimiters.authenticated,
  invalidateCache('cache:conversations:*'),
  messageController.createConversation
);

// ====================
// MESSAGES
// ====================

// GET /conversations/:id/messages - Historique des messages
router.get('/:id/messages',
  rateLimiters.authenticated,
  cacheMiddleware(30), // 30 secondes
  messageController.getMessages
);

// POST /conversations/:id/messages - Envoyer un message
router.post('/:id/messages',
  rateLimiters.authenticated,
  invalidateCache('cache:messages:*'),
  invalidateCache('cache:conversations:*'),
  messageController.sendMessage
);

// PATCH /conversations/:id/messages/read - Marquer comme lus
router.patch('/:id/messages/read',
  rateLimiters.authenticated,
  invalidateCache('cache:messages:*'),
  invalidateCache('cache:conversations:*'),
  messageController.markAsRead
);

// GET /messages/unread-count - Compter les non-lus
router.get('/messages/unread-count',
  rateLimiters.authenticated,
  cacheMiddleware(15), // 15 secondes
  messageController.getUnreadCount
);

module.exports = router;