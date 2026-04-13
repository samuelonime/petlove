const Order = require('../models/Order');
const PaymentService = require('./paymentService');
const db = require('../config/database');

class EscrowService {
  constructor() {
    this.commissionRate = parseFloat(process.env.COMMISSION_RATE) || 0.10;
    this.paymentService = new PaymentService('paystack');
  }

  async calculateOrderAmounts(totalAmount) {
    const commission = totalAmount * this.commissionRate;
    const sellerAmount = totalAmount - commission;
    
    return {
      commission: parseFloat(commission.toFixed(2)),
      sellerAmount: parseFloat(sellerAmount.toFixed(2))
    };
  }

  async releasePaymentToSeller(orderId) {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.payment_released) {
        throw new Error('Payment already released');
      }

      if (order.status !== 'delivered' && order.status !== 'completed') {
        throw new Error('Order not delivered yet');
      }

      // Get seller's bank details (in real app, store this in users table)
      const [sellerRows] = await db.execute(
        `SELECT u.id, u.name, b.account_number, b.bank_code, b.account_name
         FROM users u
         LEFT JOIN seller_bank_details b ON u.id = b.seller_id
         WHERE u.id = (
           SELECT p.seller_id 
           FROM order_items oi
           JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = ?
           LIMIT 1
         )`,
        [orderId]
      );

      if (!sellerRows[0] || !sellerRows[0].account_number) {
        throw new Error('Seller bank details not found');
      }

      const seller = sellerRows[0];

      // Initiate transfer to seller
      const transferResult = await this.paymentService.transferToSeller(
        {
          accountName: seller.account_name,
          accountNumber: seller.account_number,
          bankCode: seller.bank_code
        },
        order.seller_amount
      );

      if (transferResult.status) {
        // Mark payment as released
        await db.execute(
          'UPDATE orders SET payment_released = true, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [orderId]
        );

        // Update order status to completed
        await Order.completeOrder(orderId);

        return {
          success: true,
          message: 'Payment released to seller successfully',
          transferReference: transferResult.data.reference
        };
      } else {
        throw new Error('Transfer failed: ' + transferResult.message);
      }
    } catch (error) {
      console.error('Escrow release error:', error);
      throw error;
    }
  }

  async autoReleasePayments() {
    try {
      const orders = await Order.getOrdersForEscrowRelease();
      const results = [];

      for (const order of orders) {
        try {
          const result = await this.releasePaymentToSeller(order.id);
          results.push({
            orderId: order.id,
            success: true,
            message: result.message
          });
        } catch (error) {
          results.push({
            orderId: order.id,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Auto-release error:', error);
      throw error;
    }
  }
}

module.exports = EscrowService;
