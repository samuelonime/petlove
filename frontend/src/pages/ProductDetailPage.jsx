import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  FaShoppingCart, FaHeart, FaStar, FaStarHalfAlt, FaRegStar,
  FaShieldAlt, FaTruck, FaUndo, FaHeadset,
  FaChevronLeft, FaChevronRight, FaMinus, FaPlus, FaShare
} from 'react-icons/fa';
import './ProductDetailPage.css';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [product,    setProduct]    = useState(null);
  const [reviews,    setReviews]    = useState([]);
  const [rating,     setRating]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [activeImg,  setActiveImg]  = useState(0);
  const [quantity,   setQuantity]   = useState(1);
  const [activeTab,  setActiveTab]  = useState('description');
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/products/${id}`);
        setProduct(res.data.product || res.data);
        setReviews(res.data.reviews || []);
        setRating(res.data.rating  || null);
      } catch {
        toast.error('Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const images = product?.images?.length ? product.images : [];

  const handleAddToCart = () => {
    if (!user) { toast.info('Please login to add items to cart'); navigate('/login'); return; }
    addToCart({ ...product, quantity });
    toast.success(`${product.name} added to cart!`);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  const formatPrice = (n) => `₦${Number(n).toLocaleString('en-NG')}`;

  const renderStars = (score) => {
    const full = Math.floor(score || 0);
    const half = (score || 0) - full >= 0.5;
    return [1,2,3,4,5].map(i =>
      i <= full ? <FaStar key={i} className="star star-full" /> :
      i === full + 1 && half ? <FaStarHalfAlt key={i} className="star star-half" /> :
      <FaRegStar key={i} className="star star-empty" />
    );
  };

  const prevImg = () => setActiveImg(i => (i - 1 + images.length) % images.length);
  const nextImg = () => setActiveImg(i => (i + 1) % images.length);

  if (loading) return (
    <div className="pdp-loading">
      <div className="pdp-spinner" />
    </div>
  );

  if (!product) return (
    <div className="pdp-not-found">
      <h2>Product not found</h2>
      <button onClick={() => navigate('/products')}>Back to Products</button>
    </div>
  );

  return (
    <div className="pdp-page">
      {/* Breadcrumb */}
      <div className="pdp-breadcrumb">
        <span onClick={() => navigate('/')}>Home</span> /
        <span onClick={() => navigate('/products')}>Products</span> /
        <span onClick={() => navigate(`/products?category=${product.category}`)}>{product.category}</span> /
        <span className="pdp-breadcrumb-current">{product.name}</span>
      </div>

      <div className="pdp-main">

        {/* ── Images ── */}
        <div className="pdp-gallery">
          <div className="pdp-main-img-wrap">
            {images.length > 0 ? (
              <>
                <img src={images[activeImg]} alt={product.name} className="pdp-main-img" />
                {images.length > 1 && (
                  <>
                    <button className="pdp-img-nav pdp-img-prev" onClick={prevImg}><FaChevronLeft /></button>
                    <button className="pdp-img-nav pdp-img-next" onClick={nextImg}><FaChevronRight /></button>
                  </>
                )}
              </>
            ) : (
              <div className="pdp-no-image">🐾<p>No image</p></div>
            )}
            <button className="pdp-wishlist-btn" onClick={() => setWishlisted(w => !w)}>
              <FaHeart className={wishlisted ? 'wishlisted' : ''} />
            </button>
          </div>

          {images.length > 1 && (
            <div className="pdp-thumbs">
              {images.map((img, i) => (
                <div key={i} className={`pdp-thumb ${activeImg === i ? 'active' : ''}`}
                  onClick={() => setActiveImg(i)}>
                  <img src={img} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="pdp-info">

          {/* Category badge */}
          <span className="pdp-category">{product.category}</span>

          {/* Title */}
          <h1 className="pdp-title">{product.name}</h1>

          {/* Rating */}
          <div className="pdp-rating-row">
            <div className="pdp-stars">{renderStars(rating?.average)}</div>
            <span className="pdp-rating-score">{Number(rating?.average || 0).toFixed(1)}</span>
            <span className="pdp-rating-count">({reviews.length} reviews)</span>
            {product.seller_name && (
              <span className="pdp-seller">By <strong>{product.seller_name}</strong></span>
            )}
          </div>

          {/* Price */}
          <div className="pdp-price-row">
            <span className="pdp-price">{formatPrice(product.price)}</span>
            <span className="pdp-vat">VAT inclusive</span>
          </div>

          {/* Stock indicator */}
          <div className={`pdp-stock ${product.stock > 0 ? 'in-stock' : 'out-stock'}`}>
            <span className="pdp-stock-dot" />
            {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
          </div>

          {/* Divider */}
          <div className="pdp-divider" />

          {/* Quantity */}
          <div className="pdp-qty-row">
            <span className="pdp-qty-label">Quantity</span>
            <div className="pdp-qty-selector">
              <button className="pdp-qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>
                <FaMinus />
              </button>
              <span className="pdp-qty-val">{quantity}</span>
              <button className="pdp-qty-btn" onClick={() => setQuantity(q => Math.min(product.stock || 99, q + 1))} disabled={quantity >= (product.stock || 99)}>
                <FaPlus />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pdp-actions">
            <button className="pdp-btn-cart" onClick={handleAddToCart} disabled={!product.stock}>
              <FaShoppingCart /> Add to Cart
            </button>
            <button className="pdp-btn-buy" onClick={handleBuyNow} disabled={!product.stock}>
              Buy Now
            </button>
          </div>

          <button className="pdp-share-btn" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied!'); }}>
            <FaShare /> Share
          </button>

          {/* Guarantees */}
          <div className="pdp-guarantees">
            {[
              { icon: <FaShieldAlt />, title: 'Secure Payment',   sub: 'Escrow protection' },
              { icon: <FaTruck />,     title: 'Fast Delivery',     sub: 'Nationwide' },
              { icon: <FaUndo />,      title: 'Easy Returns',      sub: '7-day policy' },
              { icon: <FaHeadset />,   title: '24/7 Support',      sub: 'Always here' },
            ].map(g => (
              <div key={g.title} className="pdp-guarantee">
                <span className="pdp-guarantee-icon">{g.icon}</span>
                <div>
                  <p className="pdp-guarantee-title">{g.title}</p>
                  <p className="pdp-guarantee-sub">{g.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="pdp-tabs-section">
        <div className="pdp-tabs">
          {['description', 'reviews', 'shipping'].map(tab => (
            <button key={tab} className={`pdp-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'reviews' && ` (${reviews.length})`}
            </button>
          ))}
        </div>

        <div className="pdp-tab-content">
          {activeTab === 'description' && (
            <div className="pdp-description">
              {product.description
                ? <p>{product.description}</p>
                : <p className="pdp-no-content">No description available.</p>
              }
              <div className="pdp-specs">
                <h3>Product Details</h3>
                <table className="pdp-specs-table">
                  <tbody>
                    <tr><td>Category</td><td>{product.category}</td></tr>
                    <tr><td>Price</td><td>{formatPrice(product.price)}</td></tr>
                    {product.seller_name && <tr><td>Seller</td><td>{product.seller_name}</td></tr>}
                    <tr><td>Listed</td><td>{new Date(product.created_at).toLocaleDateString('en-NG', { year:'numeric', month:'long', day:'numeric' })}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="pdp-reviews">
              {reviews.length > 0 ? (
                <>
                  <div className="pdp-review-summary">
                    <div className="pdp-review-big-score">{Number(rating?.average || 0).toFixed(1)}</div>
                    <div>
                      <div className="pdp-stars">{renderStars(rating?.average)}</div>
                      <p className="pdp-review-total">{reviews.length} verified review{reviews.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="pdp-review-list">
                    {reviews.map((r, i) => (
                      <div key={i} className="pdp-review-card">
                        <div className="pdp-review-header">
                          <div className="pdp-reviewer-avatar">{(r.user_name || r.name || 'U').charAt(0).toUpperCase()}</div>
                          <div>
                            <p className="pdp-reviewer-name">{r.user_name || r.name || 'Anonymous'}</p>
                            <div className="pdp-stars pdp-stars-sm">{renderStars(r.rating)}</div>
                          </div>
                          <span className="pdp-review-date">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="pdp-review-text">{r.comment || r.review}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="pdp-no-content">No reviews yet. Be the first to review this product!</p>
              )}
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="pdp-shipping-info">
              {[
                { icon: '🚚', title: 'Standard Delivery', detail: 'Delivered within 3-7 business days nationwide' },
                { icon: '⚡', title: 'Express Delivery',  detail: 'Same day or next day delivery (extra ₦2,000)' },
                { icon: '🔒', title: 'Escrow Protection', detail: 'Payment held safely until you confirm delivery' },
                { icon: '↩️', title: 'Return Policy',     detail: 'Return within 7 days if item is not as described' },
              ].map(s => (
                <div key={s.title} className="pdp-shipping-card">
                  <span className="pdp-shipping-icon">{s.icon}</span>
                  <div>
                    <p className="pdp-shipping-title">{s.title}</p>
                    <p className="pdp-shipping-detail">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
