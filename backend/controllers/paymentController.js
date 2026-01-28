const Order = require('../models/Order');
const PaymentService = require('../services/paymentService');
const EscrowService = require('../services/escrowService');
const db = require('../config/database');

class PaymentController {
  static async verifyPayment(req, res) {
    try {
      const { reference } = req.body;
      
      if (!reference) {
        return res.status(400).json({ error: 'Payment reference required' });
      }

      const paymentService = new PaymentService();
      const verification = await paymentService.verifyPayment(reference);

      if (verification.status === 'success' || verification.data.status === 'successful') {
        // Update order status
        const [orderRows] = await db.execute(
          'SELECT id FROM orders WHERE payment_reference = ?',
          [reference]
        );

        if (orderRows.length > 0) {
          const orderId = orderRows[0].id;
          await Order.updateStatus(orderId, 'paid');
          
          return res.json({
            success: true,
            message: 'Payment verified successfully',
            orderId: orderId
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Order not found for this payment reference'
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({ error: 'Payment verification failed' });
    }
  }

  static async releaseEscrow(req, res) {
    try {
      const { order_id } = req.body;
      
      if (!order_id) {
        return res.status(400).json({ error: 'Order ID required' });
      }

      const escrowService = new EscrowService();
      const result = await escrowService.releasePaymentToSeller(order_id);

      res.json(result);
    } catch (error) {
      console.error('Escrow release error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async autoReleaseCron(req, res) {
    try {
      // This endpoint should be protected and called by a cron job
      const escrowService = new EscrowService();
      const results = await escrowService.autoReleasePayments();

      res.json({
        message: 'Auto-release completed',
        results
      });
    } catch (error) {
      console.error('Auto-release cron error:', error);
      res.status(500).json({ error: 'Auto-release failed' });
    }
  }
}

module.exports = PaymentController;