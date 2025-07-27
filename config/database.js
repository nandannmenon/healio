const config = require('./config.json');

const env = process.env.NODE_ENV || 'development';

// Get base configuration from config.json
const baseConfig = config[env];

// Enhanced configuration with additional settings
const databaseConfig = {
  development: {
    username: baseConfig.username,
    password: baseConfig.password,
    database: baseConfig.database,
    host: baseConfig.host,
    dialect: baseConfig.dialect,
    port: process.env.DB_PORT || 3306,
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    }
  },
  test: {
    username: baseConfig.username,
    password: baseConfig.password,
    database: baseConfig.database,
    host: baseConfig.host,
    dialect: baseConfig.dialect,
    port: process.env.DB_PORT || 3306,
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    }
  },
  production: {
    // Use environment variables for production security
    username: process.env.DB_USERNAME || baseConfig.username,
    password: process.env.DB_PASSWORD || baseConfig.password,
    database: process.env.DB_NAME || baseConfig.database,
    host: process.env.DB_HOST || baseConfig.host,
    dialect: baseConfig.dialect,
    port: process.env.DB_PORT || 3306,
    logging: false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};

module.exports = databaseConfig;
