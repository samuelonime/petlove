import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FaLock, FaShoppingBag, FaArrowLeft, FaTruck, FaMoneyBillWave } from 'react-icons/fa';
import './CheckoutPage.css';

const CheckoutPage = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name:    user?.name  || '',
    email:   user?.email || '',
    phone:   user?.phone || '',
    address: '',
    city:    '',
    state:   '',
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = 'Full name is required';
    if (!form.email.trim())   e.email   = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.phone.trim())   e.phone   = 'Phone number is required';
    if (!form.address.trim()) e.address = 'Address is required';
    if (!form.city.trim())    e.city    = 'City is required';
    if (!form.state.trim())   e.state   = 'State is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      setLoading(true);

      const items = cartItems.map(item => ({
        product_id: item.id,
        quantity:   item.quantity,
      }));

      const res = await api.post('/api/orders', {
        items,
        delivery_option:    'standard',
        express_shipping:   false,
        shipping_address:   `${form.address}, ${form.city}, ${form.state}`,
        recipient_name:     form.name,
        recipient_email:    form.email,
        recipient_phone:    form.phone,
      });

      const paymentUrl = res.data.payment_url || res.data.paymentUrl;

      clearCart();

      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        toast.success('Order placed successfully!');
        navigate(`/orders/${res.data.order?.id}`);
      }

    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(err.response?.data?.error || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (n) => `₦${Number(n).toLocaleString('en-NG')}`;

  if (!cartItems?.length) {
    return (
      <div className="checkout-empty">
        <FaShoppingBag />
        <p>Your cart is empty</p>
        <button onClick={() => navigate('/products')}>Browse Products</button>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">

        {/* Left — Form */}
        <div className="checkout-form-col">
          <button className="checkout-back" onClick={() => navigate('/cart')}>
            <FaArrowLeft /> Back to Cart
          </button>
          <h1 className="checkout-title">Checkout</h1>

          <form onSubmit={handleSubmit} noValidate className="checkout-form">

            {/* Contact */}
            <div className="checkout-section">
              <h2 className="checkout-section-title">Contact Information</h2>

              <div className="cf-group">
                <label className="cf-label">Full Name *</label>
                <input name="name" value={form.name} onChange={handleChange}
                  placeholder="e.g. Chidi Okonkwo"
                  className={`cf-input ${errors.name ? 'cf-error' : ''}`} disabled={loading} />
                {errors.name && <p className="cf-err-msg">{errors.name}</p>}
              </div>

              <div className="cf-row">
                <div className="cf-group">
                  <label className="cf-label">Email Address *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange}
                    placeholder="you@example.com"
                    className={`cf-input ${errors.email ? 'cf-error' : ''}`} disabled={loading} />
                  {errors.email && <p className="cf-err-msg">{errors.email}</p>}
                </div>
                <div className="cf-group">
                  <label className="cf-label">Phone Number *</label>
                  <input name="phone" type="tel" value={form.phone} onChange={handleChange}
                    placeholder="e.g. 08012345678"
                    className={`cf-input ${errors.phone ? 'cf-error' : ''}`} disabled={loading} />
                  {errors.phone && <p className="cf-err-msg">{errors.phone}</p>}
                </div>
              </div>
            </div>

            {/* Delivery */}
            <div className="checkout-section">
              <h2 className="checkout-section-title">Delivery Address</h2>

              <div className="cf-group">
                <label className="cf-label">Street Address *</label>
                <input name="address" value={form.address} onChange={handleChange}
                  placeholder="e.g. 12 Wuse Zone 5"
                  className={`cf-input ${errors.address ? 'cf-error' : ''}`} disabled={loading} />
                {errors.address && <p className="cf-err-msg">{errors.address}</p>}
              </div>

              <div className="cf-row">
                <div className="cf-group">
                  <label className="cf-label">City *</label>
                  <input name="city" value={form.city} onChange={handleChange}
                    placeholder="e.g. Abuja"
                    className={`cf-input ${errors.city ? 'cf-error' : ''}`} disabled={loading} />
                  {errors.city && <p className="cf-err-msg">{errors.city}</p>}
                </div>
                <div className="cf-group">
                  <label className="cf-label">State *</label>
                  <input name="state" value={form.state} onChange={handleChange}
                    placeholder="e.g. FCT"
                    className={`cf-input ${errors.state ? 'cf-error' : ''}`} disabled={loading} />
                  {errors.state && <p className="cf-err-msg">{errors.state}</p>}
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="checkout-section">
              <h2 className="checkout-section-title">Payment Method</h2>
              <div className="payment-method-card">
                <FaMoneyBillWave className="pm-icon" />
                <div>
                  <p className="pm-title">Paystack (Card / Bank / USSD)</p>
                  <p className="pm-sub">Secure payment via Paystack gateway</p>
                </div>
                <span className="pm-check">✓</span>
              </div>
            </div>

            <button type="submit" className="checkout-submit" disabled={loading}>
              {loading ? (
                <><span className="checkout-spinner" /> Processing…</>
              ) : (
                <><FaLock /> Proceed to Payment — {formatPrice(cartTotal)}</>
              )}
            </button>

            <p className="checkout-secure">
              <FaLock /> Your payment is secured by Paystack
            </p>

          </form>
        </div>

        {/* Right — Order summary */}
        <div className="checkout-summary-col">
          <div className="order-summary-card">
            <h2 className="summary-title">Order Summary</h2>

            <div className="summary-items">
              {cartItems.map(item => (
                <div key={item.id} className="summary-item">
                  <div className="summary-item-img">
                    {item.images?.[0]
                      ? <img src={item.images[0]} alt={item.name} />
                      : <div className="summary-item-placeholder">🐾</div>
                    }
                    <span className="summary-item-qty">{item.quantity}</span>
                  </div>
                  <div className="summary-item-info">
                    <p className="summary-item-name">{item.name}</p>
                    <p className="summary-item-price">{formatPrice(item.price)}</p>
                  </div>
                  <p className="summary-item-total">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="summary-totals">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <div className="summary-row">
                <span><FaTruck /> Delivery</span>
                <span className="free-delivery">Free</span>
              </div>
              <div className="summary-row summary-total">
                <span>Total</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
            </div>

            <div className="summary-escrow">
              🔒 Payment held in escrow until delivery confirmed
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CheckoutPage;
