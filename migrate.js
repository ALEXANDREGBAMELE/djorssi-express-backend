// migrate.js
const sequelize = require('./config/database');
const logger = require('./config/logger');

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Synchroniser les modèles (créer les tables)
    await sequelize.sync({ alter: true });
    console.log('✅ Tables created/updated');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

run();