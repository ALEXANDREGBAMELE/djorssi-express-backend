const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Créer le dossier logs s'il n'existe pas
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Définir les formats personnalisés
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        
        // Ajouter les métadonnées si elles existent
        if (Object.keys(meta).length > 0) {
            logMessage += ` ${JSON.stringify(meta)}`;
        }
        
        // Ajouter la stack trace si elle existe (pour les erreurs)
        if (stack) {
            logMessage += `\n${stack}`;
        }
        
        return logMessage;
    })
);

// Configuration du logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        // Écrire tous les logs dans un fichier
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Écrire les logs de la base de données dans un fichier séparé
        new winston.transports.File({
            filename: path.join(logDir, 'database.log'),
            level: 'info',
            maxsize: 5242880, // 5MB
            maxFiles: 3,
        }),
        // Écrire les logs des requêtes HTTP dans un fichier séparé
        new winston.transports.File({
            filename: path.join(logDir, 'http.log'),
            level: 'http',
            maxsize: 5242880, // 5MB
            maxFiles: 3,
        })
    ]
});

// Ajouter la console en mode développement
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
                let logMessage = `${timestamp} ${level}: ${message}`;
                
                if (Object.keys(meta).length > 0 && !meta.res) {
                    logMessage += ` ${JSON.stringify(meta)}`;
                }
                
                if (stack) {
                    logMessage += `\n${stack}`;
                }
                
                return logMessage;
            })
        )
    }));
}

// Fonction pour logger les requêtes HTTP
logger.logRequest = (req, res, next) => {
    const start = Date.now();
    
    // Log la requête entrante
    logger.http(`Requête entrante: ${req.method} ${req.url}`, {
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent')
    });

    // Capturer la réponse pour logger le temps de traitement
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - start;
        
        // Log la réponse
        logger.http(`Réponse: ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`, {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress
        });

        // Si c'est une erreur, logger plus en détail
        if (res.statusCode >= 400) {
            logger.error(`Erreur HTTP: ${req.method} ${req.url} - ${res.statusCode}`, {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                responseBody: data
            });
        }

        originalSend.call(this, data);
    };

    next();
};

// Fonction pour logger les opérations base de données
logger.logDB = (operation, collection, query, duration) => {
    logger.info(`DB ${operation}: ${collection}`, {
        operation,
        collection,
        query,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
    });
};

// Fonction pour logger les erreurs de base de données
logger.logDBError = (operation, collection, error) => {
    logger.error(`DB Error ${operation}: ${collection}`, {
        operation,
        collection,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
    });
};

// Fonction pour logger les événements métier
logger.logBusiness = (event, data) => {
    logger.info(`BUSINESS: ${event}`, {
        event,
        data,
        timestamp: new Date().toISOString()
    });
};

// Fonction pour logger les tentatives de connexion
logger.logAuth = (email, status, ip) => {
    logger.info(`AUTH: ${status} - ${email}`, {
        email,
        status,
        ip,
        timestamp: new Date().toISOString()
    });
};

module.exports = logger;