import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/formatters';
import { FaTrash, FaPlus, FaMinus, FaArrowRight } from 'react-icons/fa';
import './CartPage.css';

const CartPage = () => {
  const { cartItems, cartTotal, itemCount, updateQuantity, removeFromCart, clearCart } = useCart();

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-empty">
          <span className="cart-empty-icon">🛒</span>
          <h1>Your cart is empty</h1>
          <p>Looks like you haven't added any items to your cart yet.</p>
          <Link to="/products" className="cart-shop-btn">
            Start Shopping
            <FaArrowRight />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-page-inner">

        {/* Header */}
        <div className="cart-header">
          <h1>Shopping Cart</h1>
          <span className="cart-item-badge">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        </div>

        <div className="cart-layout">

          {/* ── Items Column ── */}
          <div className="cart-card cart-items-card">
            <div className="cart-items-header">
              <h2>Your Items</h2>
              <button className="cart-clear-btn" onClick={clearCart}>
                <FaTrash /> Clear all
              </button>
            </div>

            <ul className="cart-items-list">
              {cartItems.map(item => (
                <li key={item.id} className="cart-item">

                  {/* Image */}
                  <div className="cart-item-image">
                    <img
                      src={item.images?.[0] || '/placeholder.jpg'}
                      alt={item.name}
                    />
                  </div>

                  {/* Body */}
                  <div className="cart-item-body">
                    <div className="cart-item-top">
                      <Link to={`/products/${item.id}`} className="cart-item-name">
                        {item.name}
                      </Link>
                      <span className="cart-item-unit-price">
                        {formatCurrency(item.price)}
                      </span>
                    </div>

                    <div className="cart-item-meta">
                      {item.category && (
                        <span className="cart-item-category">{item.category}</span>
                      )}
                      {item.stock <= 10 && item.stock > 0 && (
                        <span className="cart-item-stock-warning">
                          ⚡ Only {item.stock} left
                        </span>
                      )}
                    </div>

                    <div className="cart-item-bottom">
                      {/* Quantity controls */}
                      <div className="cart-item-controls">
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <FaMinus />
                        </button>
                        <span className="qty-value">{item.quantity}</span>
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          aria-label="Increase quantity"
                        >
                          <FaPlus />
                        </button>
                      </div>

                      <div className="cart-item-right">
                        <span className="cart-item-subtotal">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                        <button
                          className="cart-item-remove"
                          onClick={() => removeFromCart(item.id)}
                          aria-label="Remove item"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>

                </li>
              ))}
            </ul>

            <div className="cart-items-footer">
              <Link to="/products" className="cart-continue-link">
                ← Continue Shopping
              </Link>
            </div>
          </div>

          {/* ── Summary Column ── */}
          <div className="cart-card cart-summary-card">
            <h2>Order Summary</h2>

            <div className="summary-rows">
              <div className="summary-row">
                <span className="label">Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                <span className="value">{formatCurrency(cartTotal)}</span>
              </div>
              <div className="summary-row shipping">
                <span className="label">Shipping</span>
                <span className="value">Calculated at checkout</span>
              </div>
            </div>

            <div className="summary-divider" />

            <div className="summary-rows">
              <div className="summary-row total">
                <span className="label">Total</span>
                <span className="value">{formatCurrency(cartTotal)}</span>
              </div>
            </div>
            <p className="summary-vat-note">* VAT included where applicable</p>

            <Link to="/checkout" className="checkout-btn">
              Proceed to Checkout
              <FaArrowRight className="checkout-btn-arrow" />
            </Link>

            <div className="cart-trust-badges">
              <div className="trust-badge">
                <span className="trust-badge-dot" />
                Secure checkout with escrow protection
              </div>
              <div className="trust-badge">
                <span className="trust-badge-dot" />
                Multiple shipping options available
              </div>
              <div className="trust-badge">
                <span className="trust-badge-dot" />
                Payment released only after delivery confirmation
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CartPage;