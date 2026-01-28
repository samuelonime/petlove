import React, { useState } from 'react';
import { useQuery } from 'react-query';
import productService from '../services/productService';
import orderService from '../services/orderService';
import ProductForm from '../components/products/ProductForm';
import ShippingForm from '../components/orders/ShippingForm';
import { formatCurrency } from '../utils/formatters';
import { format } from 'date-fns';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaTruck,
  FaBox,
  FaMoneyBillWave,
  FaChartLine,
  FaShoppingCart,
} from 'react-icons/fa';
import './SellerPage.css';

const SellerPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);

  const { data: products, refetch: refetchProducts } = useQuery(
    'seller-products',
    productService.getSellerProducts,
    { enabled: activeTab === 'products' }
  );

  const { data: orders, refetch: refetchOrders } = useQuery(
    'seller-orders',
    orderService.getSellerOrders,
    { enabled: activeTab === 'orders' }
  );

  // Calculate dashboard stats
  const totalProducts = products?.length || 0;
  const totalOrders = orders?.length || 0;
  const pendingOrders = orders?.filter(o => o.status === 'paid' || o.status === 'processing').length || 0;
  const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
  const totalRevenue = orders
    ?.filter(o => o.status === 'completed')
    .reduce((sum, order) => sum + (order.seller_amount || 0), 0) || 0;

  const handleProductSuccess = () => {
    refetchProducts();
    setShowProductForm(false);
    setSelectedProduct(null);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productService.deleteProduct(id);
        refetchProducts();
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending_payment: 'order-status-yellow',
      paid: 'order-status-blue',
      processing: 'order-status-purple',
      shipped: 'order-status-indigo',
      delivered: 'order-status-green',
      completed: 'order-status-green',
      cancelled: 'order-status-red',
      disputed: 'order-status-red',
    };
    return colors[status] || 'order-status-gray';
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FaChartLine },
    { id: 'products', label: 'Products', icon: FaBox },
    { id: 'orders', label: 'Orders', icon: FaShoppingCart },
  ];

  return (
    <div className="seller-page-container">
      <div className="seller-page-header">
        <h1 className="seller-page-title">Seller Dashboard</h1>
        <p className="seller-page-subtitle">Manage your products and orders</p>
      </div>

      {/* Tabs */}
      <div className="seller-tabs-container">
        <div className="seller-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`seller-tab ${activeTab === tab.id ? 'seller-tab-active' : ''}`}
            >
              <tab.icon className="seller-tab-icon" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="seller-dashboard">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-content">
                <div className="stat-icon-container stat-icon-blue">
                  <FaBox className="stat-icon" />
                </div>
                <div>
                  <p className="stat-label">Total Products</p>
                  <p className="stat-value">{totalProducts}</p>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-content">
                <div className="stat-icon-container stat-icon-green">
                  <FaShoppingCart className="stat-icon" />
                </div>
                <div>
                  <p className="stat-label">Total Orders</p>
                  <p className="stat-value">{totalOrders}</p>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-content">
                <div className="stat-icon-container stat-icon-yellow">
                  <FaTruck className="stat-icon" />
                </div>
                <div>
                  <p className="stat-label">Pending Orders</p>
                  <p className="stat-value">{pendingOrders}</p>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-content">
                <div className="stat-icon-container stat-icon-purple">
                  <FaMoneyBillWave className="stat-icon" />
                </div>
                <div>
                  <p className="stat-label">Total Revenue</p>
                  <p className="stat-value">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">Recent Orders</h2>
            </div>
            <div className="section-content">
              {orders?.length > 0 ? (
                <div className="orders-table-container">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map(order => (
                        <tr key={order.id}>
                          <td className="order-id">#{order.id}</td>
                          <td className="order-date">
                            {format(new Date(order.created_at), 'MMM dd, yyyy')}
                          </td>
                          <td className="order-amount">
                            {formatCurrency(order.total_amount)}
                          </td>
                          <td>
                            <span className={`order-status-badge ${getStatusColor(order.status)}`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => setActiveTab('orders')}
                              className="view-order-button"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <h3 className="empty-state-title">No orders yet</h3>
                  <p className="empty-state-description">
                    When customers buy your products, orders will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Products Management */}
      {activeTab === 'products' && (
        <div className="products-management">
          <div className="section-header">
            <h2 className="section-title">My Products</h2>
            <button
              onClick={() => setShowProductForm(true)}
              className="add-product-button"
            >
              <FaPlus className="button-icon" />
              Add Product
            </button>
          </div>

          {showProductForm ? (
            <div className="product-form-container">
              <ProductForm
                product={selectedProduct}
                onSuccess={handleProductSuccess}
              />
            </div>
          ) : products?.length > 0 ? (
            <div className="products-grid">
              {products.map(product => (
                <div key={product.id} className="product-card">
                  <div className="product-image-container">
                    <img
                      src={product.images?.[0] || '/placeholder.jpg'}
                      alt={product.name}
                      className="product-image"
                    />
                  </div>
                  <div className="product-card-content">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-description">{product.description}</p>
                    <div className="product-meta">
                      <span className="product-price">
                        {formatCurrency(product.price)}
                      </span>
                      <span className={`stock-badge ${
                        product.stock > 10
                          ? 'stock-high'
                          : product.stock > 0
                          ? 'stock-medium'
                          : 'stock-low'
                      }`}>
                        {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                      </span>
                    </div>
                    <div className="product-actions">
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowProductForm(true);
                        }}
                        className="edit-product-button"
                      >
                        <FaEdit className="action-icon" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="delete-product-button"
                      >
                        <FaTrash className="action-icon" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <h3 className="empty-state-title">No products yet</h3>
              <p className="empty-state-description">
                Start by adding your first product to sell on PetHub
              </p>
              <button
                onClick={() => setShowProductForm(true)}
                className="primary-button"
              >
                <FaPlus className="button-icon" />
                Add First Product
              </button>
            </div>
          )}
        </div>
      )}

      {/* Orders Management */}
      {activeTab === 'orders' && (
        <div className="orders-management">
          <div className="section-header">
            <h2 className="section-title">Order Management</h2>
            <p className="section-subtitle">
              Manage and update the status of your orders
            </p>
          </div>

          {orders?.length > 0 ? (
            <div className="orders-table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Buyer</th>
                    <th>Amount</th>
                    <th>Delivery</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td className="order-id">#{order.id}</td>
                      <td className="order-date">
                        {format(new Date(order.created_at), 'MMM dd, yyyy')}
                      </td>
                      <td className="order-buyer">{order.buyer_name}</td>
                      <td className="order-amount">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td className="order-delivery">
                        {order.delivery_option?.replace('_', ' ')}
                      </td>
                      <td>
                        <span className={`order-status-badge ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="order-actions">
                        {order.status === 'paid' || order.status === 'processing' ? (
                          <ShippingForm
                            order={order}
                            onSuccess={refetchOrders}
                          />
                        ) : order.status === 'shipped' && order.delivery_option === 'seller_local' ? (
                          <ShippingForm
                            order={order}
                            onSuccess={refetchOrders}
                          />
                        ) : (
                          <span className="no-action-text">No actions available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3 className="empty-state-title">No orders yet</h3>
              <p className="empty-state-description">
                When customers buy your products, orders will appear here
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SellerPage;