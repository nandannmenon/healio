const { Sequelize } = require('sequelize');
const databaseConfig = require('./database.js');

const env = process.env.NODE_ENV || 'development';
const config = databaseConfig[env];

let sequelize;

// Create Sequelize instance based on environment
if (config.use_env_variable) {
  // For production environments that use DATABASE_URL
  sequelize = new Sequelize(process.env[config.use_env_variable], {
    dialect: config.dialect,
    logging: config.logging,
    pool: config.pool,
    dialectOptions: config.dialectOptions,
    define: config.define
  });
} else {
  // For local development and test environments
  sequelize = new Sequelize(
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
}

// Test the connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    console.log(`   Database: ${config.dialect}://${config.host}:${config.port}/${config.database}`);
    console.log(`   User: ${config.username}`);
    console.log(`   Environment: ${env}`);
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    console.error(`   Failed to connect to: ${config.dialect}://${config.host}:${config.port}/${config.database}`);
    return false;
  }
};

// Sync database (create tables if they don't exist)
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

// Close database connection
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

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  closeConnection,
  getConfig,
  config: config
};
