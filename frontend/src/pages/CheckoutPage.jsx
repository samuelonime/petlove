import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/formatters';
import api from '../services/api';
import { FaArrowRight, FaLock } from 'react-icons/fa';
import './CheckoutPage.css';

const CheckoutPage = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    address: '',
    city: '',
    postalCode: '',
  });

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems.length, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Map cart items to backend expected shape
      const items = cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
      }));

      const res = await api.post('/api/orders', {
        items,
        delivery_option: 'standard',
        express_shipping: false,
        shipping_address: `${shippingInfo.address}, ${shippingInfo.city} ${shippingInfo.postalCode}`,
        recipient_name: shippingInfo.name,
      });

      // Backend returns { order, payment } or { order, paymentUrl }
      const paymentUrl = res.data.paymentUrl || res.data.payment?.authorization_url;

      if (paymentUrl) {
        clearCart();
        window.location.href = paymentUrl;
      } else {
        // No payment gateway configured — treat as cash on delivery
        clearCart();
        navigate(`/orders/${res.data.order?.id || res.data.orderId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed. Please try again.');
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) return null;

  return (
    <div className="checkout-page">
      <div className="checkout-inner">

        {/* Header */}
        <div className="checkout-header">
          <h1>Checkout</h1>
          <div className="checkout-breadcrumb">
            <Link to="/products">Shop</Link>
            <span className="checkout-breadcrumb-sep">›</span>
            <Link to="/cart">Cart</Link>
            <span className="checkout-breadcrumb-sep">›</span>
            <span>Checkout</span>
          </div>
        </div>

        <div className="checkout-layout">

          {/* ── Left: Shipping Form ── */}
          <div>
            {error && (
              <div className="checkout-error">
                <span className="checkout-error-icon">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <div className="co-card shipping-card">
              <div className="shipping-card-header">
                <span className="shipping-step-badge">1</span>
                <h2>Shipping Information</h2>
              </div>

              <div className="shipping-form-body">
                <form onSubmit={handleSubmit}>

                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      className="form-input"
                      placeholder="e.g. Chidi Okonkwo"
                      value={shippingInfo.name}
                      onChange={handleChange}
                      required
                      autoComplete="name"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Street Address</label>
                    <input
                      type="text"
                      name="address"
                      className="form-input"
                      placeholder="e.g. 14 Adeola Odeku Street"
                      value={shippingInfo.address}
                      onChange={handleChange}
                      required
                      autoComplete="street-address"
                    />
                  </div>

                  <div className="form-row">
                    <div>
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        name="city"
                        className="form-input"
                        placeholder="e.g. Lagos"
                        value={shippingInfo.city}
                        onChange={handleChange}
                        required
                        autoComplete="address-level2"
                      />
                    </div>
                    <div>
                      <label className="form-label">Postal Code</label>
                      <input
                        type="text"
                        name="postalCode"
                        className="form-input"
                        placeholder="e.g. 101001"
                        value={shippingInfo.postalCode}
                        onChange={handleChange}
                        required
                        autoComplete="postal-code"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="checkout-submit-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="btn-spinner" />
                        Processing…
                      </>
                    ) : (
                      <>
                        Proceed to Payment
                        <FaArrowRight className="btn-arrow" />
                      </>
                    )}
                  </button>

                  <div className="secure-strip">
                    <FaLock className="secure-strip-icon" />
                    Payments secured with 256-bit SSL encryption
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="co-card summary-card">
            <div className="summary-card-header">
              <span className="summary-step-badge">2</span>
              <h2>Order Summary</h2>
            </div>

            {/* Item list */}
            <div className="summary-items">
              {cartItems.map(item => (
                <div key={item.id} className="summary-item">
                  <span className="summary-item-name">
                    {item.name}
                    <span className="summary-item-qty">×{item.quantity}</span>
                  </span>
                  <span className="summary-item-price">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="summary-totals">
              <div className="summary-row">
                <span className="row-label">Subtotal</span>
                <span className="row-value">{formatCurrency(cartTotal)}</span>
              </div>
              <div className="summary-row shipping">
                <span className="row-label">Shipping</span>
                <span className="row-value">Calculated at delivery</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-row total-row">
                <span className="row-label">Total</span>
                <span className="row-value">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="summary-trust">
              <div className="trust-row">
                <span className="trust-dot" />
                Secure payment with escrow protection
              </div>
              <div className="trust-row">
                <span className="trust-dot" />
                Money released only after confirmed delivery
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
