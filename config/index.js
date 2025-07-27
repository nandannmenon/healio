const path = require('path');
const config = require('./config.json');
const database = require('./database.js');
const connection = require('./connection.js');

const env = process.env.NODE_ENV || 'development';

// Main configuration object
const appConfig = {
  // Environment
  env,
  
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`
  },

  // Database configuration
  database: database[env],
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },

  // File upload configuration
  upload: {
    maxSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
    uploadPath: process.env.UPLOAD_PATH || path.join(__dirname, '../uploads')
  },

  // Email configuration (if needed)
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  },

  // Redis configuration (if needed)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.join(__dirname, '../logs/app.log')
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 100 // limit each IP to 100 requests per windowMs
  }
};

// Helper functions
const getConfig = (key) => {
  return key.split('.').reduce((obj, k) => obj && obj[k], appConfig);
};

const isDevelopment = () => env === 'development';
const isProduction = () => env === 'production';
const isTest = () => env === 'test';

// Get database configuration summary
const getDatabaseSummary = () => {
  const db = database[env];
  return {
    dialect: db.dialect,
    host: db.host,
    port: db.port,
    database: db.database,
    username: db.username,
    environment: env
  };
};

// Export everything
module.exports = {
  ...appConfig,
  getConfig,
  isDevelopment,
  isProduction,
  isTest,
  connection,
  database,
  getDatabaseSummary
};
