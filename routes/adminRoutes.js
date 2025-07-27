const express = require('express');
const router = express.Router();

// Controllers 
const adminController = require('../controllers/admin/adminController');
const adminProductController = require('../controllers/admin/productController');
const adminOrderController = require('../controllers/admin/orderController');
const adminUserController = require('../controllers/admin/userController');
const adminAddressController = require('../controllers/admin/addressController');

// Middleware
const { authenticateAdminToken, authenticateSuperAdminToken } = require('../middlewares/authMiddleware');

// ================= ADMIN ROUTES =================
// Admin authentication routes (Public)
router.post('/admin/login', adminController.login);

// Admin profile management (requires authentication)
router.get('/admin/profile', authenticateAdminToken, adminController.getProfile);
router.put('/admin/profile', authenticateAdminToken, adminController.updateProfile);

// Superadmin routes (Admin management)
router.post('/admin/register', authenticateSuperAdminToken, adminController.register);
router.get('/admin', authenticateSuperAdminToken, adminController.list);
router.get('/admins/:id', authenticateSuperAdminToken, adminController.get)
router.put('/admin/:id/status', authenticateSuperAdminToken, adminController.setStatus);
router.delete('/admin/:id', authenticateSuperAdminToken, adminController.remove);

// Admin address management 
router.get('/admin/addresses', authenticateAdminToken, adminAddressController.listAll);
router.post('/admin/addresses', authenticateAdminToken, adminAddressController.addForUser);
router.get('/admin/addresses/:id', authenticateAdminToken, adminAddressController.getByUserId);
router.get('/admin/addresses/detail/:id', authenticateAdminToken, adminAddressController.getById);
router.put('/admin/addresses/:id', authenticateAdminToken, adminAddressController.update);
router.delete('/admin/addresses/:id', authenticateAdminToken, adminAddressController.remove);

// Admin user management
router.get('/admin/users', authenticateAdminToken, adminUserController.list);
router.get('/admin/users/:id', authenticateAdminToken, adminUserController.get);
router.post('/admin/users', authenticateAdminToken, adminUserController.addUser);
router.put('/admin/users/:id', authenticateAdminToken, adminUserController.updateUser);
router.put('/admin/users/:id/status', authenticateAdminToken, adminUserController.setStatus);
router.delete('/admin/users/:id', authenticateAdminToken, adminUserController.removeUser);
router.get('/admin/users/:id/orders', authenticateAdminToken, adminUserController.getUserOrders);

// Admin product management
router.post('/admin/products', authenticateAdminToken, adminProductController.add);
router.put('/admin/products/:id', authenticateAdminToken, adminProductController.update);
router.delete('/admin/products/:id', authenticateAdminToken, adminProductController.remove);
router.put('/admin/products/:id/stock', authenticateAdminToken, adminProductController.updateStock);
router.get('/admin/products', authenticateAdminToken, adminProductController.listAll);
router.get('/admin/products/:id', authenticateAdminToken, adminProductController.getById);

// Admin order management
router.get('/admin/orders', authenticateAdminToken, adminOrderController.listAll);
router.put('/admin/orders/:id/status', authenticateAdminToken, adminOrderController.setStatus);
router.get('/admin/orders/payments', authenticateAdminToken, adminOrderController.listPayments);
router.post('/admin/orders/place_for_user', authenticateAdminToken, adminOrderController.placeForUser);
router.get('/admin/orders/:id', authenticateAdminToken, adminOrderController.getById);

// Generic admin routes (must come after specific routes)
router.get('/admin/:id', authenticateSuperAdminToken, adminController.get);
router.put('/admin/:id', authenticateSuperAdminToken, adminController.update);

// Legacy admin product routes
router.post('/products', authenticateAdminToken, adminProductController.add);
router.put('/products/:id', authenticateAdminToken, adminProductController.update);
router.delete('/products/:id', authenticateAdminToken, adminProductController.remove);
router.put('/products/:id/stock', authenticateAdminToken, adminProductController.updateStock);

// Legacy admin order routes
router.get('/admin/orders', authenticateAdminToken, adminOrderController.listAll);
router.put('/admin/orders/:id/status', authenticateAdminToken, adminOrderController.setStatus);
router.post('/admin/orders/place', authenticateAdminToken, adminOrderController.placeForUser);

// Legacy admin user routes
router.get('/users', authenticateAdminToken, adminUserController.list);
router.post('/users', authenticateAdminToken, adminUserController.addUser);
router.get('/users/:id', authenticateAdminToken, adminUserController.get);
router.put('/users/:id/status', authenticateAdminToken, adminUserController.setStatus);

module.exports = router;
