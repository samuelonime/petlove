import api from './api';

const orderService = {
  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  getOrders: async () => {
    const response = await api.get('/orders/buyer/my-orders');
    return response.data.orders;
  },

  getOrder: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  getSellerOrders: async () => {
    const response = await api.get('/orders/seller/my-orders');
    return response.data.orders;
  },

  updateShipping: async (orderId, shippingData) => {
    const response = await api.put(`/orders/${orderId}/shipping`, shippingData);
    return response.data;
  },

  uploadDeliveryProof: async (orderId, proofData) => {
    const response = await api.post(`/orders/${orderId}/delivery-proof`, proofData);
    return response.data;
  },

  confirmDelivery: async (orderId) => {
    const response = await api.post(`/orders/${orderId}/confirm-delivery`);
    return response.data;
  },

  trackShipment: async (orderId) => {
    const response = await api.get(`/orders/${orderId}/track`);
    return response.data;
  },
};

export default orderService;