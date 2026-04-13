const Order = require('../models/Order');

class ShippingService {
  static async updateShippingInfo(orderId, shippingData, deliveryOption) {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'paid' && order.status !== 'processing') {
      throw new Error('Order not ready for shipping');
    }

    // Update based on delivery option
    switch (deliveryOption) {
      case 'courier':
        if (!shippingData.courier_name || !shippingData.tracking_number) {
          throw new Error('Courier name and tracking number required');
        }
        await Order.updateShippingInfo(orderId, shippingData);
        await Order.updateStatus(orderId, 'shipped');
        break;

      case 'seller_local':
        // For local delivery, we don't need courier info
        await Order.updateStatus(orderId, 'shipped');
        break;

      case 'express':
        if (!shippingData.courier_name || !shippingData.tracking_number) {
          throw new Error('Courier name and tracking number required for express delivery');
        }
        await Order.updateShippingInfo(orderId, {
          ...shippingData,
          estimated_delivery: this.calculateExpressDeliveryDate()
        });
        await Order.updateStatus(orderId, 'shipped');
        break;

      default:
        throw new Error('Invalid delivery option');
    }

    return { success: true, message: 'Shipping info updated successfully' };
  }

  static async uploadDeliveryProof(orderId, proofType, proofData) {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'shipped') {
      throw new Error('Order not shipped yet');
    }

    let deliveryProof;
    
    switch (proofType) {
      case 'photo':
        deliveryProof = JSON.stringify({
          type: 'photo',
          url: proofData.url,
          timestamp: new Date().toISOString()
        });
        break;

      case 'signature':
        deliveryProof = JSON.stringify({
          type: 'signature',
          data: proofData.signature,
          recipient_name: proofData.recipientName,
          timestamp: new Date().toISOString()
        });
        break;

      case 'receipt':
        deliveryProof = JSON.stringify({
          type: 'receipt',
          receipt_number: proofData.receiptNumber,
          timestamp: new Date().toISOString()
        });
        break;

      default:
        throw new Error('Invalid proof type');
    }

    await Order.updateDeliveryProof(orderId, deliveryProof);
    await Order.confirmDelivery(orderId);

    return { success: true, message: 'Delivery proof uploaded successfully' };
  }

  static calculateExpressDeliveryDate() {
    const date = new Date();
    date.setDate(date.getDate() + 2); // Express delivery in 2 days
    return date.toISOString().split('T')[0];
  }

  static async trackShipment(courierName, trackingNumber) {
    // This is a mock implementation
    // In production, integrate with actual courier APIs
    
    const courierApis = {
      'GIG Logistics': 'https://api.giglogistics.com/track',
      'DHL': 'https://api.dhl.com/track',
      'UPS': 'https://api.ups.com/track'
    };

    // Mock tracking response
    const mockStatuses = [
      'Package received at facility',
      'In transit',
      'Out for delivery',
      'Delivered'
    ];

    const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];

    return {
      courier: courierName,
      trackingNumber,
      status: randomStatus,
      lastUpdate: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    };
  }
}

module.exports = ShippingService;
