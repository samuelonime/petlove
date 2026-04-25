const db          = require('../config/database');
const Order       = require('../models/Order');
const OrderItem   = require('../models/OrderItem');
const Product     = require('../models/Product');

class OrderController {

  static async createOrder(req, res) {
    try {
      const { items, delivery_option, express_shipping, shipping_address, recipient_name, recipient_email, recipient_phone } = req.body;

      if (!items || !items.length) {
        return res.status(400).json({ error: 'No items in order' });
      }

      // Validate items and calculate total
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await Product.findById(item.product_id);
        if (!product) {
          return res.status(404).json({ error: `Product not found` });
        }
        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;
        orderItems.push({ product_id: item.product_id, quantity: item.quantity, price: product.price });
      }

      if (express_shipping) totalAmount += 2000;

      // Commission calculation
      const commissionRate = parseFloat(process.env.COMMISSION_RATE) || 0.10;
      const commission    = parseFloat((totalAmount * commissionRate).toFixed(2));
      const sellerAmount  = parseFloat((totalAmount - commission).toFixed(2));

      // Create order
      const orderId = await Order.create({
        buyer_id: req.user.id,
        total_amount: totalAmount,
        delivery_option: delivery_option || 'standard',
        express_shipping: express_shipping || false,
      });

      // Update commission + shipping info
      await db.execute(
        `UPDATE orders SET commission = ?, seller_amount = ?,
         shipping_address = ?, recipient_name = ?, recipient_email = ?, recipient_phone = ?
         WHERE id = ?`,
        [commission, sellerAmount, shipping_address || null, recipient_name || null, recipient_email || null, recipient_phone || null, orderId]
      );

      // Create order items
      await OrderItem.createBatch(orderItems.map(item => ({ order_id: orderId, ...item })));

      // Update product stock
      for (const item of items) {
        await Product.updateStock(item.product_id, item.quantity);
      }

      // Try Paystack payment — gracefully skip if not configured
      const reference = `PET-${orderId}-${Date.now()}`;
      let paymentUrl  = null;

      const paystackKey = process.env.PAYSTACK_SECRET_KEY;
      if (paystackKey) {
        try {
          const axios    = require('axios');
          const email    = recipient_email || req.user.email;
          const paystackRes = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
              amount:       Math.round(totalAmount * 100),
              email,
              reference,
              callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
              metadata:     { order_id: orderId, buyer_id: req.user.id },
            },
            { headers: { Authorization: `Bearer ${paystackKey}` } }
          );
          paymentUrl = paystackRes.data?.data?.authorization_url;
        } catch (payErr) {
          console.error('Paystack init failed:', payErr.message);
          // Don't crash — fall through to cash on delivery
        }
      }

      // Save payment reference
      await db.execute('UPDATE orders SET payment_reference = ? WHERE id = ?', [reference, orderId]);

      const order = await Order.findById(orderId);

      res.status(201).json({
        message:     'Order created successfully',
        order,
        payment_url: paymentUrl,
        reference,
      });

    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ error: error.message || 'Failed to create order' });
    }
  }

  static async getOrder(req, res) {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      if (order.buyer_id !== req.user.id && req.user.user_type !== 'admin') {
        const items    = await OrderItem.findByOrder(req.params.id);
        const isSeller = items.some(item => item.seller_id === req.user.id);
        if (!isSeller) return res.status(403).json({ error: 'Not authorized' });
      }

      const items = await OrderItem.findByOrder(req.params.id);
      res.json({ order, items });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ error: 'Failed to get order' });
    }
  }

  static async getBuyerOrders(req, res) {
    try {
      const orders = await Order.findByBuyer(req.user.id);
      res.json({ orders });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get orders' });
    }
  }

  static async getSellerOrders(req, res) {
    try {
      const orders = await Order.findBySeller(req.user.id);
      res.json({ orders });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get orders' });
    }
  }

  static async updateShipping(req, res) {
    try {
      const { courier_name, tracking_number, delivery_option } = req.body;
      await db.execute(
        'UPDATE orders SET courier_name = ?, tracking_number = ?, delivery_option = ? WHERE id = ?',
        [courier_name, tracking_number, delivery_option, req.params.id]
      );
      res.json({ message: 'Shipping updated' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update shipping' });
    }
  }

  static async uploadDeliveryProof(req, res) {
    try {
      const { proof_type, proof_data } = req.body;
      await db.execute(
        'UPDATE orders SET proof_type = ?, proof_data = ? WHERE id = ?',
        [proof_type, proof_data, req.params.id]
      );
      res.json({ message: 'Delivery proof uploaded' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to upload proof' });
    }
  }

  static async confirmDelivery(req, res) {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.buyer_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

      await db.execute("UPDATE orders SET status = 'completed' WHERE id = ?", [req.params.id]);
      res.json({ message: 'Delivery confirmed' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to confirm delivery' });
    }
  }

  static async trackShipment(req, res) {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json({ courier_name: order.courier_name, tracking_number: order.tracking_number, status: order.status });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to track shipment' });
    }
  }
}

module.exports = OrderController;
