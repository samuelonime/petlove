import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useQuery } from 'react-query';
import orderService from '../services/orderService';
import productService from '../services/productService';
import { FaShoppingBag, FaBox, FaHeart, FaCreditCard, FaArrowRight, FaStar, FaShoppingCart } from 'react-icons/fa';
import { formatCurrency } from '../utils/formatters';
import './BuyerDashboard.css';

const BuyerDashboard = () => {
  const { user } = useAuth();
  const { itemCount } = useCart();

  // Add loading states
  const [isLoading, setIsLoading] = useState(true);
  
  
  // Fetch orders
  const { data: orders = [] } = useQuery(
    'buyer-orders',
    orderService.getOrders,
    { enabled: !!user }
  );

  // Fetch featured products for recommendations
  const { data: featuredProducts = [] } = useQuery(
    'featured-products',
    () => productService.getProducts({ limit: 6 })
  );

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="loading-grid">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="loading-card">
          <div className="skeleton-icon"></div>
          <div className="skeleton-text"></div>
        </div>
      ))}
    </div>
  );

  // Add this check
  if (isLoading || ordersLoading) {
    return (
      <div className="buyer-dashboard">
        <LoadingSkeleton />
      </div>
    );
  }


  // Calculate stats
  const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const recentOrders = orders.slice(0, 3);

  return (
    <div className="buyer-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
            <p className="header-subtitle">Manage your orders, cart, and account all in one place</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <section className="stats-section">
        <div className="stats-grid">
          {/* Total Spent */}
          <div className="stat-card">
            <div className="stat-icon spent">
              <FaCreditCard />
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Spent</p>
              <p className="stat-value">{formatCurrency(totalSpent)}</p>
              <p className="stat-meta">{orders.length} orders</p>
            </div>
          </div>

          {/* Active Orders */}
          <div className="stat-card">
            <div className="stat-icon active">
              <FaBox />
            </div>
            <div className="stat-content">
              <p className="stat-label">Active Orders</p>
              <p className="stat-value">{activeOrders}</p>
              <p className="stat-meta">Being processed</p>
            </div>
          </div>

          {/* Completed Orders */}
          <div className="stat-card">
            <div className="stat-icon completed">
              <FaShoppingBag />
            </div>
            <div className="stat-content">
              <p className="stat-label">Completed Orders</p>
              <p className="stat-value">{completedOrders}</p>
              <p className="stat-meta">Successfully delivered</p>
            </div>
          </div>

          {/* Cart Items */}
          <div className="stat-card">
            <div className="stat-icon cart">
              <FaShoppingCart />
            </div>
            <div className="stat-content">
              <p className="stat-label">Cart Items</p>
              <p className="stat-value">{itemCount}</p>
              <p className="stat-meta">Ready to checkout</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions-grid">
          <Link to="/products" className="action-card">
            <FaShoppingBag className="action-icon" />
            <h3>Shop Products</h3>
            <p>Browse pet supplies</p>
            <FaArrowRight className="action-arrow" />
          </Link>
          <Link to="/cart" className="action-card">
            <FaShoppingCart className="action-icon" />
            <h3>View Cart</h3>
            <p>{itemCount} items waiting</p>
            <FaArrowRight className="action-arrow" />
          </Link>
          <Link to="/orders" className="action-card">
            <FaBox className="action-icon" />
            <h3>My Orders</h3>
            <p>Track your purchases</p>
            <FaArrowRight className="action-arrow" />
          </Link>
          <Link to="/profile" className="action-card">
            <FaStar className="action-icon" />
            <h3>My Account</h3>
            <p>Manage profile</p>
            <FaArrowRight className="action-arrow" />
          </Link>
        </div>
      </section>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <section className="recent-orders-section">
          <div className="section-header">
            <h2>Recent Orders</h2>
            <Link to="/orders" className="view-all">View All Orders →</Link>
          </div>
          <div className="orders-container">
            {recentOrders.map((order) => (
              <Link key={order.id} to={`/orders/${order.id}`} className="order-preview-card">
                <div className="order-info">
                  <p className="order-id">Order #{order.id}</p>
                  <p className="order-date">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="order-status-badge" data-status={order.status}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </div>
                <div className="order-total">
                  <p className="total-label">Total</p>
                  <p className="total-value">{formatCurrency(order.total)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recommended Products */}
      {featuredProducts.length > 0 && (
        <section className="recommended-section">
          <div className="section-header">
            <h2>Recommended For You</h2>
            <Link to="/products" className="view-all">View All Products →</Link>
          </div>
          <div className="products-grid">
            {featuredProducts.map((product) => (
              <Link key={product.id} to={`/products/${product.id}`} className="product-preview">
                <div className="product-image">
                  <img 
                    src={product.images?.[0] || '/placeholder.jpg'} 
                    alt={product.name}
                  />
                </div>
                <div className="product-info">
                  <p className="product-name">{product.name}</p>
                  <div className="product-rating">
                    <FaStar className="star" />
                    <span>{product.rating || 4.5}</span>
                  </div>
                  <p className="product-price">{formatCurrency(product.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {orders.length === 0 && (
        <section className="empty-state">
          <FaShoppingBag className="empty-icon" />
          <h2>No orders yet</h2>
          <p>Start shopping to see your orders here</p>
          <Link to="/products" className="btn-primary">
            Shop Now
          </Link>
        </section>
      )}
    </div>
  );
};

export default BuyerDashboard;
