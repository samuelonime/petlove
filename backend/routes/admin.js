const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const {
  adminAuth,
  superAdminOnly,
  auditTrail,
  adminLimiter,
  ipWhitelist,
  require2FA,
  validateAdminSession
} = require('../middleware/admin');

// Apply admin middleware to all routes
router.use(adminAuth);
router.use(auditTrail);
router.use(adminLimiter);
router.use(ipWhitelist(process.env.ADMIN_IP_WHITELIST?.split(',')));

// Health Check (no auth required)
router.get('/health', AdminController.healthCheck);

// ==================== DASHBOARD ====================
router.get('/dashboard', AdminController.getDashboardStats);

// ==================== USER MANAGEMENT ====================
router.get('/users', AdminController.getUsers);
router.get('/users/:id', AdminController.getUserDetails);
router.put('/users/:id', require2FA, AdminController.updateUser);
router.delete('/users/:id', require2FA, AdminController.deleteUser);

// ==================== SELLER MANAGEMENT ====================
router.get('/sellers', AdminController.getSellers);
router.post('/sellers/:id/verify', require2FA, AdminController.verifySeller);
router.post('/sellers/:id/suspend', require2FA, AdminController.suspendSeller);

// ==================== ORDER MANAGEMENT ====================
router.get('/orders', AdminController.getOrders);
router.put('/orders/:id/status', AdminController.updateOrderStatus);

// ==================== DISPUTE MANAGEMENT ====================
router.get('/disputes', AdminController.getDisputes);
router.post('/disputes/:id/assign', AdminController.assignDispute);
router.post('/disputes/:id/resolve', require2FA, AdminController.resolveDispute);

// ==================== SECURITY & AUDIT ====================
router.get('/security-logs', AdminController.getSecurityLogs);
router.get('/audit-trail', AdminController.getAuditTrail);

// ==================== SYSTEM SETTINGS ====================
router.get('/settings', AdminController.getSettings);
router.put('/settings/:key', require2FA, AdminController.updateSetting);

// ==================== ADMIN MANAGEMENT ====================
router.get('/admins', superAdminOnly, AdminController.getAdmins);
router.post('/admins', superAdminOnly, require2FA, AdminController.createAdmin);

// ==================== PAYMENT & ESCROW ====================
router.post('/orders/:id/escrow/release', require2FA, AdminController.releaseEscrow);

// ==================== API DOCUMENTATION ====================
router.get('/docs', (req, res) => {
  res.json({
    message: 'Admin API Documentation',
    endpoints: router.stack
      .filter(r => r.route)
      .map(r => ({
        path: r.route.path,
        methods: Object.keys(r.route.methods),
        middleware: r.route.stack.map(m => m.name).filter(name => name !== '<anonymous>')
      }))
  });
});

module.exports = router;