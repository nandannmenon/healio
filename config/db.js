const { Sequelize } = require('sequelize');
const databaseConfig = require('./database.js');

const env = process.env.NODE_ENV || 'development';
const config = databaseConfig[env];

// Create Sequelize instance with proper credentials
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    pool: config.pool,
    dialectOptions: config.dialectOptions,
    define: config.define
  }
);

// Test connection function
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    console.log(`   Database: ${config.dialect}://${config.host}:${config.port}/${config.database}`);
    console.log(`   User: ${config.username}`);
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    return false;
  }
};

// Sync database function
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('✅ Database synchronized successfully.');
    return true;
  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
    return false;
  }
};

// Close connection function
const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('✅ Database connection closed successfully.');
    return true;
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    return false;
  }
};

// Get current configuration
const getConfig = () => {
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    dialect: config.dialect,
    environment: env
  };
};

// Export the sequelize instance and utility functions
module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  syncDatabase,
  closeConnection,
  getConfig,
  transaction: () => sequelize.transaction()
}; 