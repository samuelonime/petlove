const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const EscrowService = require('../services/escrowService');
const ShippingService = require('../services/shippingService');
const PaymentService = require('../services/paymentService');

class OrderController {
  static async createOrder(req, res) {
    try {
      const { items, delivery_option, express_shipping } = req.body;
      
      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No items in cart' });
      }

      // Calculate total amount
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await Product.findById(item.product_id);
        
        if (!product) {
          return res.status(404).json({ error: `Product ${item.product_id} not found` });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          price: product.price
        });
      }

      // Add express shipping fee if selected
      if (express_shipping) {
        totalAmount += 2000; // ₦2,000 express shipping fee
      }

      // Create order
      const orderId = await Order.create({
        buyer_id: req.user.id,
        total_amount: totalAmount,
        delivery_option,
        express_shipping: express_shipping || false
      });

      // Add commission and seller amount calculation
      const escrowService = new EscrowService();
      const amounts = await escrowService.calculateOrderAmounts(totalAmount);
      
      await db.execute(
        'UPDATE orders SET commission = ?, seller_amount = ? WHERE id = ?',
        [amounts.commission, amounts.seller_amount, orderId]
      );

      // Create order items
      const itemsWithOrderId = orderItems.map(item => ({
        order_id: orderId,
        ...item
      }));
      await OrderItem.createBatch(itemsWithOrderId);

      // Update product stock
      for (const item of items) {
        await Product.updateStock(item.product_id, item.quantity);
      }

      // Initialize payment
      const paymentService = new PaymentService();
      const reference = `PET-${orderId}-${Date.now()}`;
      
      const paymentData = await paymentService.initializePayment(
        totalAmount,
        req.user.email,
        reference,
        {
          order_id: orderId,
          buyer_id: req.user.id,
          items_count: items.length
        }
      );

      // Update order with payment reference
      await db.execute(
        'UPDATE orders SET payment_reference = ? WHERE id = ?',
        [reference, orderId]
      );

      const order = await Order.findById(orderId);
      res.status(201).json({
        message: 'Order created successfully',
        order,
        payment_url: paymentData.data.authorization_url || paymentData.data.link
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  }

  static async getOrder(req, res) {
    try {
      const { id } = req.params;
      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check if user is authorized to view this order
      if (order.buyer_id !== req.user.id && req.user.user_type !== 'admin') {
        // Check if user is the seller
        const orderItems = await OrderItem.findByOrder(id);
        const isSeller = orderItems.some(item => item.seller_id === req.user.id);
        
        if (!isSeller) {
          return res.status(403).json({ error: 'Not authorized to view this order' });
        }
      }

      const items = await OrderItem.findByOrder(id);
      
      res.json({
        order,
        items
      });
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
      console.error('Get buyer orders error:', error);
      res.status(500).json({ error: 'Failed to get orders' });
    }
  }

  static async getSellerOrders(req, res) {
    try {
      const orders = await Order.findBySeller(req.user.id);
      res.json({ orders });
    } catch (error) {
      console.error('Get seller orders error:', error);
      res.status(500).json({ error: 'Failed to get orders' });
    }
  }

  static async updateShipping(req, res) {
    try {
      const { id } = req.params;
      const { courier_name, tracking_number, delivery_option } = req.body;
      
      const result = await ShippingService.updateShippingInfo(
        id,
        { courier_name, tracking_number },
        delivery_option
      );

      res.json(result);
    } catch (error) {
      console.error('Update shipping error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async uploadDeliveryProof(req, res) {
    try {
      const { id } = req.params;
      const { proof_type, proof_data } = req.body;

      const result = await ShippingService.uploadDeliveryProof(
        id,
        proof_type,
        proof_data
      );

      res.json(result);
    } catch (error) {
      console.error('Upload delivery proof error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async confirmDelivery(req, res) {
    try {
      const { id } = req.params;
      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.buyer_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      if (order.status !== 'delivered') {
        return res.status(400).json({ error: 'Order not delivered yet' });
      }

      await Order.confirmDelivery(id);
      
      // Auto-release payment after 7 days
      setTimeout(async () => {
        try {
          const escrowService = new EscrowService();
          await escrowService.releasePaymentToSeller(id);
        } catch (error) {
          console.error('Auto-release error:', error);
        }
      }, 7 * 24 * 60 * 60 * 1000);

      res.json({ message: 'Delivery confirmed successfully' });
    } catch (error) {
      console.error('Confirm delivery error:', error);
      res.status(500).json({ error: 'Failed to confirm delivery' });
    }
  }

  static async trackShipment(req, res) {
    try {
      const { id } = req.params;
      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (!order.courier_name || !order.tracking_number) {
        return res.status(400).json({ error: 'No tracking information available' });
      }

      const trackingInfo = await ShippingService.trackShipment(
        order.courier_name,
        order.tracking_number
      );

      res.json(trackingInfo);
    } catch (error) {
      console.error('Track shipment error:', error);
      res.status(500).json({ error: 'Failed to track shipment' });
    }
  }
}

module.exports = OrderController;