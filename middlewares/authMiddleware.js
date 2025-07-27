const jwt = require('jsonwebtoken');
const { User } = require('../models');
const JWT_SECRET = process.env.JWT_SECRET;

// Authenticate user token
async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token not provided or invalid' });
        }
        
        const token = authHeader.split(' ')[1];
        
        // Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        // Check if token has userId (user token)
        if (!decoded.userId) {
            return res.status(401).json({ error: 'Invalid token type' });
        }
        
        // Verify token against user's stored token
        const user = await User.findOne({
            where: { 
                id: decoded.userId,
                token: token,
                status: 1 // Only active users
            }
        });
        
        if (!user) {
            return res.status(401).json({ error: 'Token not found or user inactive' });
        }
        
        req.token = decoded;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
}

// Authenticate admin token
function authenticateAdminToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('Auth header missing or malformed:', req.headers);
        return res.status(401).json({ error: 'Token not provided or invalid' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('JWT verification error:', err);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        if (!decoded.adminId) {
            console.error('Decoded token missing adminId:', decoded);
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.token = decoded;
        next();
    });
}

// Authenticate superadmin token
function authenticateSuperAdminToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token not provided or invalid' });
    }
    
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        if (!decoded.adminId || decoded.type !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Super admin access required' });
        }
        req.token = decoded;
        next();
    });
}

// Authenticate user or admin token (for legacy routes)
function authenticateUserOrAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token not provided or invalid' });
    }
    
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        // Check if it's a user token
        if (decoded.userId) {
            req.token = decoded;
            return next();
        }
        
        // Check if it's an admin token
        if (decoded.adminId) {
            req.token = decoded;
            return next();
        }
        
        // Neither user nor admin token
        return res.status(401).json({ error: 'Unauthorized - Invalid token type' });
    });
}

// Authorize roles
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.token) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Check if user has required role
        const userRole = req.token.role || 'user';
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}

module.exports = {
    authenticateToken,
    authenticateAdminToken,
    authenticateSuperAdminToken,
    authenticateUserOrAdmin,
    authorizeRoles
}; 