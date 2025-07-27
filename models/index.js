const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';

// Use the new database configuration
const databaseConfig = require('../config/database.js')[env];

const db = {};

let sequelize;

// Create Sequelize instance using the new configuration
if (databaseConfig.use_env_variable) {
  sequelize = new Sequelize(process.env[databaseConfig.use_env_variable], databaseConfig);
} else {
  sequelize = new Sequelize(
    databaseConfig.database,
    databaseConfig.username,
    databaseConfig.password,
    databaseConfig
  );
}

// Load all models
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js'
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Set up associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Export sequelize instance and Sequelize class
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Add utility functions
db.testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
};

db.syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('Database synchronized successfully.');
    return true;
  } catch (error) {
    console.error('Database synchronization failed:', error);
    return false;
  }
};

db.closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('Database connection closed successfully.');
    return true;
  } catch (error) {
    console.error('Error closing database connection:', error);
    return false;
  }
};

module.exports = db; 