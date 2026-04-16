import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import productService from '../services/productService';
import ProductCard from '../components/products/ProductCard';
import { FaPaw, FaShippingFast, FaShieldAlt, FaCreditCard, FaChevronLeft, FaChevronRight, FaFire, FaStar, FaArrowRight } from 'react-icons/fa';
import './HomePage.css';

const HomePage = () => {
  const { data: featuredProducts, isLoading: featuredLoading } = useQuery(
    'featured-products',
    () => productService.getProducts({ limit: 8 })
  );
  const { data: bestSellers, isLoading: bestSellersLoading } = useQuery(
    'best-sellers',
    () => productService.getProducts({ limit: 6, sort: 'sales' })
  );
  const { data: newArrivals, isLoading: newArrivalsLoading } = useQuery(
    'new-arrivals',
    () => productService.getProducts({ limit: 6, sort: 'newest' })
  );

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const totalSlides = 4;

  const categories = [
    { id: 'food',      name: 'Pet Food',    count: 45, icon: '🍖' },
    { id: 'toys',      name: 'Toys',        count: 32, icon: '🎾' },
    { id: 'accessories', name: 'Accessories', count: 28, icon: '🦴' },
    { id: 'medicine',  name: 'Medicine',    count: 19, icon: '💊' },
  ];

  useEffect(() => {
    let slideInterval;
    if (isAutoPlaying && !isHovering) {
      slideInterval = setInterval(() => setCurrentSlide(p => (p + 1) % totalSlides), 6000);
    }
    return () => clearInterval(slideInterval);
  }, [isAutoPlaying, isHovering, currentSlide]);

  const goToSlide = (i) => { setCurrentSlide(i); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 10000); };
  const handlePrev = () => { setCurrentSlide(p => (p - 1 + totalSlides) % totalSlides); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 10000); };
  const handleNext = () => { setCurrentSlide(p => (p + 1) % totalSlides); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 10000); };

  return (
    <div className="homepage-container">

      {/* ── Hero ── */}
      <section className="hero-section" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
        <div className="hero-slideshow">
          {[0,1,2,3].map(i => <div key={i} className={`slide slide-${i+1} ${currentSlide === i ? 'active' : ''}`} />)}
        </div>

        <button className="slideshow-prev" onClick={handlePrev} aria-label="Previous slide"><FaChevronLeft /></button>
        <button className="slideshow-next" onClick={handleNext} aria-label="Next slide"><FaChevronRight /></button>

        <div className="slideshow-controls">
          {[0,1,2,3].map(i => (
            <button key={i} className={`slideshow-dot ${currentSlide === i ? 'active' : ''}`}
              onClick={() => goToSlide(i)} aria-label={`Slide ${i+1}`} />
          ))}
        </div>

        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-eyebrow">🐾 Nigeria's #1 Pet Marketplace</div>
            <h1 className="hero-title">Everything Your Pet Needs, Delivered</h1>
            <p className="hero-subtitle">
              Quality pet supplies, food, toys, medicine and more — all with secure escrow protection.
            </p>
            <div className="hero-buttons">
              <Link to="/login" className="primary-cta">
                Get Started <FaArrowRight className="cta-arrow" />
              </Link>
              <Link to="/seller" className="secondary-cta">Become a Seller</Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><span className="hero-stat-num">10k+</span><span className="hero-stat-lbl">Happy Buyers</span></div>
              <div className="hero-stat-divider" />
              <div className="hero-stat"><span className="hero-stat-num">500+</span><span className="hero-stat-lbl">Verified Sellers</span></div>
              <div className="hero-stat-divider" />
              <div className="hero-stat"><span className="hero-stat-num">99%</span><span className="hero-stat-lbl">Satisfaction</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features-section">
        <div className="section-container">
          <div className="section-label">Why PetHub?</div>
          <h2 className="section-title">Shop with Confidence</h2>
          <div className="features-grid">
            {[
              { icon: <FaShieldAlt />, title: 'Secure Escrow', desc: 'Payment held safely until you confirm delivery' },
              { icon: <FaShippingFast />, title: 'Flexible Delivery', desc: 'Courier, local delivery, or express options' },
              { icon: <FaCreditCard />, title: 'Easy Payments', desc: 'Card, bank transfer, and local payment methods' },
              { icon: <FaPaw />, title: 'Quality Products', desc: 'Vetted sellers offering premium pet supplies' },
            ].map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-description">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="categories-section">
        <div className="section-container">
          <div className="section-label">Browse</div>
          <h2 className="categories-title">Shop by Category</h2>
          <div className="categories-grid">
            {categories.map(cat => (
              <Link key={cat.id} to={`/products?category=${cat.id}`} className="category-card">
                <div className="category-image">
                  <span className="category-emoji">{cat.icon}</span>
                </div>
                <div className="category-overlay">
                  <h3 className="category-name">{cat.name}</h3>
                  <p className="category-count">{cat.count} products</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="featured-section">
        <div className="section-container">
          <div className="section-header">
            <div>
              <div className="section-label">Hand-picked</div>
              <h2 className="section-title">Featured Products</h2>
            </div>
            <Link to="/products" className="view-all-link">View All <FaArrowRight /></Link>
          </div>
          {featuredLoading ? (
            <div className="loading-grid">{[...Array(4)].map((_, i) => <div key={i} className="loading-card"><div className="loading-image"/><div className="loading-text"/><div className="loading-text loading-text-short"/></div>)}</div>
          ) : (
            <div className="products-grid">{featuredProducts?.slice(0,4).map(p => <ProductCard key={p.id} product={p} />)}</div>
          )}
        </div>
      </section>

      {/* ── Best Sellers ── */}
      <section className="best-sellers-section">
        <div className="section-container">
          <div className="section-header">
            <div className="section-title-wrapper">
              <FaFire className="fire-icon" />
              <div>
                <div className="section-label">Trending Now</div>
                <h2 className="section-title">Best Sellers</h2>
              </div>
            </div>
            <Link to="/products?sort=sales" className="view-all-link">View All <FaArrowRight /></Link>
          </div>
          {bestSellersLoading ? (
            <div className="loading-grid">{[...Array(6)].map((_, i) => <div key={i} className="loading-card"><div className="loading-image"/><div className="loading-text"/><div className="loading-text loading-text-short"/></div>)}</div>
          ) : (
            <div className="products-grid-6">{bestSellers?.map(p => <ProductCard key={p.id} product={p} />)}</div>
          )}
        </div>
      </section>

      {/* ── New Arrivals ── */}
      <section className="new-arrivals-section">
        <div className="section-container">
          <div className="section-header">
            <div className="section-title-wrapper">
              <FaStar className="star-icon" />
              <div>
                <div className="section-label">Just In</div>
                <h2 className="section-title">New Arrivals</h2>
              </div>
            </div>
            <Link to="/products?sort=newest" className="view-all-link">View All <FaArrowRight /></Link>
          </div>
          {newArrivalsLoading ? (
            <div className="loading-grid">{[...Array(6)].map((_, i) => <div key={i} className="loading-card"><div className="loading-image"/><div className="loading-text"/><div className="loading-text loading-text-short"/></div>)}</div>
          ) : (
            <div className="products-grid-6">{newArrivals?.map(p => <ProductCard key={p.id} product={p} />)}</div>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="section-container">
          <div className="cta-content">
            <div className="cta-badge">🚀 Sellers Wanted</div>
            <h2 className="cta-title">Ready to Sell on PetHub?</h2>
            <p className="cta-description">
              Join thousands of sellers reaching pet owners across Nigeria. We handle payments and provide shipping support.
            </p>
            <Link to="/register?type=seller" className="cta-button">Start Selling Today</Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
