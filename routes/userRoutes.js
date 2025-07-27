const express = require('express');
const router = express.Router();

// Controllers 
const commonUserController = require('../controllers/user/commonUserController');
const commonOtpController = require('../controllers/user/commonOtpController');
const commonProductController = require('../controllers/user/commonProductController');
const adminController = require('../controllers/admin/adminController');

const userController = require('../controllers/user/userController');
const userAddressController = require('../controllers/user/addressController');
const userProductController = require('../controllers/user/productController');
const userOrderController = require('../controllers/user/orderController');
const userPaymentController = require('../controllers/user/paymentController');
const adminUserController = require('../controllers/admin/userController');

// Middleware
const { authenticateToken, authenticateUserOrAdmin } = require('../middlewares/authMiddleware');

// ================= COMMON ROUTES (Public) =================
// Authentication routes
router.post('/auth/register', commonUserController.register);
router.post('/auth/verify-otp', commonUserController.verifyRegistrationOtp);
router.post('/auth/set-password', commonUserController.setPassword);
router.post('/auth/login', commonUserController.login);
router.post('/auth/logout', authenticateToken, commonUserController.logout);

// Admin authentication routes (Public)
router.post('/admin/login', adminController.login);

// OTP routes
router.post('/otp/send', commonOtpController.send);
router.post('/otp/verify', commonOtpController.verify);
router.post('/otp/reset_password', commonOtpController.resetPassword);
router.get('/otp/status/:userId', commonOtpController.getStatus);
router.get('/otp/history/:userId', commonOtpController.getHistory);
router.delete('/otp/clear/:userId', commonOtpController.clear);

// Public product routes
router.get('/products', commonProductController.list);
router.get('/products/:id', commonProductController.get);

// ================= USER ROUTES (Require User Token) =================
// User profile
router.get('/user/profile', authenticateToken, userController.getProfile);
router.put('/user/profile', authenticateToken, userController.updateProfile);

// User addresses
router.post('/user/addresses', authenticateToken, userAddressController.add);
router.get('/user/addresses', authenticateToken, userAddressController.list);
router.get('/user/addresses/:id', authenticateToken, userAddressController.get);
router.put('/user/addresses/:id', authenticateToken, userAddressController.update);
router.delete('/user/addresses/:id', authenticateToken, userAddressController.remove);

// User products and cart
router.post('/user/products/:id/add-to-cart', authenticateToken, userProductController.addToCart);
router.get('/user/cart', authenticateToken, userProductController.getCart);
router.delete('/user/cart/:id', authenticateToken, userProductController.removeCartItem);
router.put('/user/cart/:id', authenticateToken, userProductController.updateCartItem);
router.post('/user/cart/checkout', authenticateToken, userProductController.checkout);

// User orders
router.get('/user/orders', authenticateToken, userOrderController.list);
router.get('/user/orders/:id', authenticateToken, userOrderController.get);

// User payments
router.post('/user/payments', authenticateToken, userPaymentController.process);
router.get('/user/payments', authenticateToken, userPaymentController.list);
router.get('/user/payments/:id', authenticateToken, userPaymentController.get);

// ================= LEGACY ROUTES (For backward compatibility) =================
// Legacy cart routes 
router.post('/cart/add', authenticateToken, userProductController.addToCart);
router.get('/cart', authenticateToken, userProductController.getCart);
router.delete('/cart/:id', authenticateToken, userProductController.removeCartItem);
router.post('/cart/checkout', authenticateToken, userProductController.checkout);

// Legacy order routes
router.get('/orders', authenticateToken, userOrderController.list);
router.get('/orders/:id', authenticateToken, userOrderController.get);

// Legacy address routes
router.post('/addresses', authenticateToken, userAddressController.add);
router.get('/addresses', authenticateToken, userAddressController.list);
router.get('/addresses/:id', authenticateToken, userAddressController.get);
router.put('/addresses/:id', authenticateToken, userAddressController.update);
router.delete('/addresses/:id', authenticateToken, userAddressController.remove);

// Admin user management route
router.put('/users/:id', authenticateUserOrAdmin, adminUserController.updateUser);

module.exports = router;
