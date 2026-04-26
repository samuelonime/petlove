import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useQuery } from 'react-query';
import orderService from '../services/orderService';
import productService from '../services/productService';
import {
  FaShoppingBag, FaBox, FaCreditCard, FaArrowRight,
  FaStar, FaShoppingCart, FaUser, FaChevronRight, FaPlus
} from 'react-icons/fa';
import { formatCurrency } from '../utils/formatters';
import './BuyerDashboard.css';

const BuyerDashboard = () => {
  const { user } = useAuth();
  const { itemCount } = useCart();

  const { data: orders = [], isLoading: ordersLoading } = useQuery(
    'buyer-orders',
    orderService.getOrders,
    { enabled: !!user }
  );

  const { data: featuredProducts = [] } = useQuery(
    'featured-products',
    () => productService.getProducts({ limit: 6 })
  );

  const LoadingSkeleton = () => (
    <div className="loading-grid">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="loading-card">
          <div className="skeleton-icon" />
          <div className="skeleton-text" />
          <div className="skeleton-text" style={{ width: '40%' }} />
        </div>
      ))}
    </div>
  );

  if (ordersLoading) {
    return (
      <div className="buyer-dashboard">
        <div className="dashboard-header">
          <div className="header-inner">
            <div className="header-greeting">
              <div className="header-eyebrow"><span className="eyebrow-dot" /> Pet Hub Dashboard</div>
              <h1>Loading…</h1>
            </div>
          </div>
        </div>
        <div className="dashboard-body"><LoadingSkeleton /></div>
      </div>
    );
  }

  const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const activeOrders = orders.filter(o => ['pending', 'processing'].includes(o.status)).length;
  const recentOrders = orders.slice(0, 4);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="buyer-dashboard">
      {/* ── Hero Header ── */}
      <div className="dashboard-header">
        <div className="header-inner">
          <div className="header-greeting">
            <div className="header-eyebrow">
              <span className="eyebrow-dot" />
              Pet Hub · Buyer Dashboard
            </div>
            <h1>{greeting}, {firstName}! 🐾</h1>
            <p className="header-subtitle">
              Everything your pets need, right at your fingertips.
            </p>
          </div>
          <div className="header-badge">
            <FaStar style={{ color: '#fbbf24' }} />
            {orders.length} orders placed
          </div>
        </div>
      </div>

      <div className="dashboard-body">

        {/* ── Stats ── */}
        <section>
          <div className="stats-grid">
            <div className="stat-card spent">
              <div className="stat-top">
                <div className="stat-icon spent"><FaCreditCard /></div>
                <span className="stat-trend">All time</span>
              </div>
              <div>
                <div className="stat-value">{formatCurrency(totalSpent)}</div>
                <div className="stat-label">Total Spent</div>
                <div className="stat-meta">{orders.length} orders placed</div>
              </div>
            </div>

            <div className="stat-card active">
              <div className="stat-top">
                <div className="stat-icon active"><FaBox /></div>
              </div>
              <div>
                <div className="stat-value">{activeOrders}</div>
                <div className="stat-label">Active Orders</div>
                <div className="stat-meta">Being processed</div>
              </div>
            </div>

            <div className="stat-card completed">
              <div className="stat-top">
                <div className="stat-icon completed"><FaShoppingBag /></div>
              </div>
              <div>
                <div className="stat-value">{completedOrders}</div>
                <div className="stat-label">Completed</div>
                <div className="stat-meta">Successfully delivered</div>
              </div>
            </div>

            <div className="stat-card cart">
              <div className="stat-top">
                <div className="stat-icon cart"><FaShoppingCart /></div>
              </div>
              <div>
                <div className="stat-value">{itemCount}</div>
                <div className="stat-label">Cart Items</div>
                <div className="stat-meta">Ready to checkout</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Quick Actions ── */}
        <section>
          <div className="section-title-row">
            <div className="section-title">
              <span className="section-title-icon"><FaArrowRight /></span>
              Quick Actions
            </div>
          </div>
          <div className="quick-actions-grid">
            <Link to="/products" className="action-card">
              <div className="action-icon-wrap"><FaShoppingBag /></div>
              <h3>Shop Products</h3>
              <p>Browse pet supplies and essentials</p>
              <div className="action-footer">
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>Explore →</span>
                <div className="action-arrow"><FaArrowRight /></div>
              </div>
            </Link>

            <Link to="/cart" className="action-card">
              <div className="action-icon-wrap"><FaShoppingCart /></div>
              <h3>View Cart</h3>
              <p>{itemCount > 0 ? `${itemCount} item${itemCount > 1 ? 's' : ''} waiting` : 'Your cart is empty'}</p>
              <div className="action-footer">
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>Checkout →</span>
                <div className="action-arrow"><FaArrowRight /></div>
              </div>
            </Link>

            <Link to="/orders" className="action-card">
              <div className="action-icon-wrap"><FaBox /></div>
              <h3>My Orders</h3>
              <p>Track and manage your purchases</p>
              <div className="action-footer">
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>Track →</span>
                <div className="action-arrow"><FaArrowRight /></div>
              </div>
            </Link>

            <Link to="/profile" className="action-card">
              <div className="action-icon-wrap"><FaUser /></div>
              <h3>My Account</h3>
              <p>Update profile and preferences</p>
              <div className="action-footer">
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>Manage →</span>
                <div className="action-arrow"><FaArrowRight /></div>
              </div>
            </Link>
          </div>
        </section>

        {/* ── Recent Orders ── */}
        {recentOrders.length > 0 && (
          <section>
            <div className="section-title-row">
              <div className="section-title">
                <span className="section-title-icon"><FaBox /></span>
                Recent Orders
              </div>
              <Link to="/orders" className="view-all">View All <FaArrowRight /></Link>
            </div>
            <div className="orders-container">
              {recentOrders.map((order) => (
                <Link key={order.id} to={`/orders/${order.id}`} className="order-preview-card">
                  <div className="order-info">
                    <p className="order-id">Order #{order.id}</p>
                    <p className="order-date">{new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="order-status-badge" data-status={order.status}>
                    {order.status}
                  </div>
                  <div className="order-total">
                    <p className="total-label">Total</p>
                    <p className="total-value">{formatCurrency(order.total)}</p>
                  </div>
                  <FaChevronRight className="order-chevron" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Recommended Products ── */}
        {featuredProducts.length > 0 && (
          <section>
            <div className="section-title-row">
              <div className="section-title">
                <span className="section-title-icon"><FaStar /></span>
                Recommended For You
              </div>
              <Link to="/products" className="view-all">View All <FaArrowRight /></Link>
            </div>
            <div className="products-grid">
              {featuredProducts.map((product, i) => (
                <Link key={product.id} to={`/products/${product.id}`} className="product-preview">
                  <div className="product-image">
                    <img
                      src={product.images?.[0] || '/placeholder.jpg'}
                      alt={product.name}
                    />
                    {i === 0 && <span className="product-tag">Featured</span>}
                  </div>
                  <div className="product-info">
                    <p className="product-name">{product.name}</p>
                    <div className="product-rating">
                      <FaStar className="star" />
                      <span>{product.rating || '4.5'} rating</span>
                    </div>
                    <div className="product-price-row">
                      <span className="product-price">{formatCurrency(product.price)}</span>
                      <button
                        className="product-add-btn"
                        onClick={(e) => { e.preventDefault(); }}
                        aria-label="Add to cart"
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Empty State ── */}
        {orders.length === 0 && (
          <section className="empty-state">
            <div className="empty-icon-wrap"><FaShoppingBag /></div>
            <h2>No orders yet</h2>
            <p>Start shopping to see your orders here. Your pets deserve the best!</p>
            <Link to="/products" className="btn-primary">
              <FaShoppingBag /> Shop Now
            </Link>
          </section>
        )}

      </div>
    </div>
  );
};

export default BuyerDashboard;
        
