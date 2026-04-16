import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaShoppingCart, FaHeart, FaStar, FaTruck, FaShieldAlt, FaRedo, FaMinus, FaPlus } from 'react-icons/fa';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { toast } from 'react-toastify';
import './ProductDetailPage.css';

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/api/products/${id}`);
        setProduct(res.data);
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleQuantityChange = (type) => {
    if (type === 'increment') {
      setQuantity(prev => prev + 1);
    } else if (type === 'decrement' && quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleAddToCart = () => {
    if (product && product.stock > 0) {
      addToCart(product, quantity);
      toast.success(`${product.name} added to cart!`);
    }
  };

  const handleWishlist = () => {
    toast.info('Added to wishlist! (Feature coming soon)');
  };

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
    </div>
  );
  
  if (!product) return (
    <div className="not-found">
      <h2>Product Not Found</h2>
      <p>The product you're looking for doesn't exist or has been removed.</p>
    </div>
  );

  return (
    <div className="product-detail-page">
      <div className="product-container">
        <div className="product-detail-wrapper">
          {/* Product Images Section */}
          <div className="product-images">
            <div className="main-image-container">
              <img 
                src={product.images?.[selectedImage] || '/default-product.jpg'} 
                alt={product.name}
                className="main-image"
              />
              <div className="image-navigation">
                {product.images?.map((_, idx) => (
                  <button
                    key={idx}
                    className={`nav-dot ${selectedImage === idx ? 'active' : ''}`}
                    onClick={() => setSelectedImage(idx)}
                    aria-label={`View image ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
            
            {product.images && product.images.length > 1 && (
              <div className="thumbnail-container">
                {product.images.map((img, idx) => (
                  <div 
                    key={idx}
                    className={`thumbnail ${selectedImage === idx ? 'active' : ''}`}
                    onClick={() => setSelectedImage(idx)}
                  >
                    <img src={img} alt={`${product.name} thumbnail ${idx + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info Section */}
          <div className="product-info">
            <span className="category-badge">
              {product.category || 'Pet Supplies'}
            </span>
            
            <h1 className="product-title">{product.name}</h1>
            
            <p className="product-description">
              {product.description || 'No description available.'}
            </p>

            {/* Price Section */}
            <div className="price-section">
              <span className="current-price">${product.price?.toFixed(2)}</span>
              {product.originalPrice && (
                <>
                  <span className="original-price">${product.originalPrice.toFixed(2)}</span>
                  {product.discountPercentage && (
                    <span className="discount-badge">
                      Save {product.discountPercentage}%
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Stock & Rating */}
            <div className="stock-rating">
              <div className={`stock-status ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                <div className={`stock-dot ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}></div>
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </div>
              
              {product.rating && (
                <div className="product-rating">
                  <div className="stars">
                    {[...Array(5)].map((_, i) => (
                      <FaStar 
                        key={i} 
                        className="star"
                        style={{ opacity: i < Math.floor(product.rating) ? 1 : 0.3 }}
                      />
                    ))}
                  </div>
                  <span className="rating-count">({product.reviewCount || 0} reviews)</span>
                </div>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="quantity-section">
              <label className="quantity-label">Quantity</label>
              <div className="quantity-selector">
                <button 
                  className="quantity-btn"
                  onClick={() => handleQuantityChange('decrement')}
                  disabled={quantity <= 1}
                >
                  <FaMinus />
                </button>
                <input 
                  type="number" 
                  value={quantity}
                  readOnly
                  className="quantity-input"
                  min="1"
                  max={product.stock || 10}
                />
                <button 
                  className="quantity-btn"
                  onClick={() => handleQuantityChange('increment')}
                  disabled={quantity >= (product.stock || 10)}
                >
                  <FaPlus />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button 
                className="primary-button"
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
              >
                <FaShoppingCart />
                {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
              </button>
              
              <button 
                className="secondary-button"
                onClick={handleWishlist}
              >
                <FaHeart />
                Add to Wishlist
              </button>
            </div>

            {/* Additional Info */}
            <div className="additional-info">
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">
                    <FaTruck />
                  </div>
                  <div className="info-text">
                    <span className="info-label">Delivery</span>
                    <span className="info-value">Free shipping over $50</span>
                  </div>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <FaShieldAlt />
                  </div>
                  <div className="info-text">
                    <span className="info-label">Warranty</span>
                    <span className="info-value">30-day return policy</span>
                  </div>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <FaRedo />
                  </div>
                  <div className="info-text">
                    <span className="info-label">Returns</span>
                    <span className="info-value">Easy returns</span>
                  </div>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <FaTruck />
                  </div>
                  <div className="info-text">
                    <span className="info-label">Estimated Delivery</span>
                    <span className="info-value">2-5 business days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
