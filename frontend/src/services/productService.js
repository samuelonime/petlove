import api from './api';

const productService = {
  getProducts: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/api/products?${params}`);
    return response.data.products;
  },

  getProduct: async (id) => {
    const response = await api.get(`/api/products/${id}`);
    return response.data;
  },

  // Accepts a FormData object directly from ProductForm
  createProduct: async (formData) => {
    const response = await api.post('/api/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Accepts a FormData object directly from ProductForm
  updateProduct: async (id, formData) => {
    const response = await api.put(`/api/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await api.delete(`/api/products/${id}`);
    return response.data;
  },

  getSellerProducts: async () => {
    const response = await api.get('/api/products/seller/my-products');
    return response.data.products;
  },

  createReview: async (productId, reviewData) => {
    const response = await api.post(`/api/products/${productId}/reviews`, reviewData);
    return response.data;
  },
};

export default productService;
