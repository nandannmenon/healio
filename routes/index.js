const express = require('express');
const router = express.Router();

// Import separated route files
const adminRoutes = require('./adminRoutes');
const userRoutes = require('./userRoutes');

// Use the separated routes
router.use('/', userRoutes);
router.use('/', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: uptime,
        memory: memory,
        pid: process.pid
    });
});

module.exports = router; 