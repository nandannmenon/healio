require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// Import routes
const routes = require('./routes/index');

// Import database
const db = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= GLOBAL ERROR HANDLING =================
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  console.error('Stack trace:', error.stack);
  // Don't exit immediately, give time for cleanup
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED PROMISE REJECTION:', reason);
  console.error('Promise:', promise);
  // Don't exit immediately, give time for cleanup
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle SIGTERM 
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  process.exit(0);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  process.exit(0);
});

// ================= MIDDLEWARE =================
// Middleware for parsing JSON and urlencoded data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (after body parsing)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Session middleware setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  
}));

// ================= ROUTES =================
// API Routes
app.use('/', routes);

// API info endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Healio API Server',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/auth',
      users: '/users',
      admin: '/admin',
      products: '/products',
      cart: '/cart',
      orders: '/orders',
      payments: '/payments',
      otp: '/otp',
      addresses: '/addresses',
      health: '/health'
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ================= SERVER STARTUP =================
// Database sync and server start
const startServer = async () => {
  try {
    console.log('Starting server...');
    
    // Test database connection
    await db.sequelize.authenticate();
    console.log('Database connection established successfully');
    
    // Sync database based on models (no migrations required)
    await db.sequelize.sync({ 
      force: false, // Don't drop tables
      alter: false  // Don't alter existing tables to avoid index conflicts
    });
    console.log('Database synced successfully from models');
    
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API Base URL: http://localhost:${PORT}`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      console.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('Server crashed:', error);
        process.exit(1);
      }
    });
    
    // Shutdown function
    const shutdown = () => {
      console.log('Shutting down...');
      server.close(() => {
        console.log('Server closed');
        db.sequelize.close().then(() => {
          console.log('Database connection closed');
          process.exit(0);
        }).catch((error) => {
          console.error('Error closing database:', error);
          process.exit(1);
        });
      });
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

// Start the server
startServer(); 
console.log('hello world')