const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');
const { auth, isBuyer, isSeller } = require('../middleware/auth');
const EscrowService = require('../services/escrowService.js');
const ShippingService = require('../services/shippingService.js');
const PaymentService = require('../services/paymentService.js');

// Buyer routes
router.post('/', auth, isBuyer, OrderController.createOrder);
router.get('/buyer/my-orders', auth, isBuyer, OrderController.getBuyerOrders);
router.get('/:id', auth, OrderController.getOrder);
router.post('/:id/confirm-delivery', auth, isBuyer, OrderController.confirmDelivery);
router.get('/:id/track', auth, OrderController.trackShipment);

// Seller routes
router.get('/seller/my-orders', auth, isSeller, OrderController.getSellerOrders);
router.put('/:id/shipping', auth, isSeller, OrderController.updateShipping);
router.post('/:id/delivery-proof', auth, isSeller, OrderController.uploadDeliveryProof);

module.exports = router;
