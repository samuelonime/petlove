import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { FaStar, FaShoppingCart, FaHeart, FaEye, FaTruck } from 'react-icons/fa';
import { formatCurrency } from '../../utils/formatters';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const [wishlisted, setWishlisted] = useState(false);
  const [quickView, setQuickView] = useState(false);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
  };

  const toggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlisted(!wishlisted);
  };

  const getStockLevel = (stock) => {
    if (stock === 0) return { level: 'out', text: 'Out of Stock', dotClass: 'low' };
    if (stock <= 10) return { level: 'low', text: `Low Stock (${stock})`, dotClass: 'low' };
    if (stock <= 30) return { level: 'medium', text: `In Stock (${stock})`, dotClass: 'medium' };
    return { level: 'high', text: `In Stock (${stock})`, dotClass: 'high' };
  };

  const getRatingStars = (rating = 3) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<FaStar key={i} className="rating-star filled" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<FaStar key={i} className="rating-star half-filled" />);
      } else {
        stars.push(<FaStar key={i} className="rating-star" />);
      }
    }
    return stars;
  };

  const stockInfo = getStockLevel(product.stock);
  const discountPercentage = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <div className="product-card-modern">
      {/* Image Container */}
      <div className="product-image-container">
        <Link to={`/products/${product.id}`} className="block h-full">
          <img
            src={product.images?.[0] || '/placeholder.jpg'}
            alt={product.name}
            className="product-image"
          />
        </Link>

        {/* Badges */}
        <div className="product-badge-container">
          {product.isNew && <span className="product-badge badge-new">New</span>}
          {discountPercentage && <span className="product-badge badge-sale">{discountPercentage}% OFF</span>}
          {product.isHot && <span className="product-badge badge-hot">Hot</span>}
          {product.express_shipping && <span className="product-badge badge-express">Express</span>}
        </div>

        {/* Quick Actions */}
        <div className="product-quick-actions">
          <button
            onClick={toggleWishlist}
            className={`quick-action-btn wishlist ${wishlisted ? 'active' : ''}`}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <FaHeart />
          </button>
          <button
            onClick={() => setQuickView(true)}
            className="quick-action-btn"
            aria-label="Quick view"
          >
            <FaEye />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="product-content">
        {/* Title */}
        <Link to={`/products/${product.id}`} className="product-title-link">
          <h3 className="product-title">{product.name}</h3>
        </Link>

        {/* Rating */}
        <div className="product-rating">
          <div className="rating-stars">
            {getRatingStars(product.rating)}
          </div>
          <span className="rating-count">({product.review_count || 0})</span>
        </div>

        {/* Description */}
        <p className="product-description">{product.description}</p>

        {/* Price & Stock */}
        <div className="product-price-stock">
          <div className="product-price">
            <span className="price-current">{formatCurrency(product.price)}</span>
            {product.originalPrice && (
              <>
                <span className="price-original">{formatCurrency(product.originalPrice)}</span>
                {discountPercentage && (
                  <span className="price-discount">Save {discountPercentage}%</span>
                )}
              </>
            )}
          </div>
          
          <div className="product-stock">
            <div className="stock-indicator">
              <span className={`stock-dot ${stockInfo.dotClass}`}></span>
              <span className={`stock-text ${stockInfo.level}`}>{stockInfo.text}</span>
            </div>
          </div>
        </div>

        {/* Cart Button */}
        <div className="product-actions">
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="add-to-cart-btn"
            aria-label={`Add ${product.name} to cart`}
          >
            <FaShoppingCart className="cart-icon" />
            <span className="btn-text">
              {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </span>
          </button>
        </div>

        {/* Express Shipping */}
        {product.express_shipping && (
          <div className="express-shipping">
            <FaTruck className="express-icon" />
            <span>Express Delivery Available</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;