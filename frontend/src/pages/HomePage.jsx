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
    { id: 'food', name: 'Pet Food', image: '/food.jpg', count: 45, icon: '🍖' },
    { id: 'toys', name: 'Toys', image: '/toys.jpg', count: 32, icon: '🎾' },
    { id: 'accessories', name: 'Accessories', image: '/accessories.jpg', count: 28, icon: '🦴' },
    { id: 'medicine', name: 'Medicine', image: '/medicine.jpg', count: 19, icon: '💊' },
  ];

  // Auto slide functionality
  useEffect(() => {
    let slideInterval;
    
    if (isAutoPlaying && !isHovering) {
      slideInterval = setInterval(() => {
        goToNextSlide();
      }, 6000); // Change slide every 6 seconds
    }
    
    return () => {
      if (slideInterval) {
        clearInterval(slideInterval);
      }
    };
  }, [isAutoPlaying, isHovering, currentSlide]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000); // Resume auto-play after 10 seconds
  };

  const goToNextSlide = () => {
    setCurrentSlide((prevSlide) => (prevSlide + 1) % totalSlides);
  };

  const goToPrevSlide = () => {
    setCurrentSlide((prevSlide) => (prevSlide - 1 + totalSlides) % totalSlides);
  };

  const handleSlideClick = (index) => {
    goToSlide(index);
  };

  const handlePrevClick = () => {
    goToPrevSlide();
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const handleNextClick = () => {
    goToNextSlide();
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <div className="homepage-container">
      {/* Hero Section with Slideshow */}
      <section 
        className="hero-section"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Slideshow Background */}
        <div className="hero-slideshow">
          <div className={`slide slide-1 ${currentSlide === 0 ? 'active' : ''}`}></div>
          <div className={`slide slide-2 ${currentSlide === 1 ? 'active' : ''}`}></div>
          <div className={`slide slide-3 ${currentSlide === 2 ? 'active' : ''}`}></div>
          <div className={`slide slide-4 ${currentSlide === 3 ? 'active' : ''}`}></div>
        </div>

        {/* Slideshow Controls */}
        <button 
          className="slideshow-prev" 
          onClick={handlePrevClick}
          aria-label="Previous slide"
        >
          <FaChevronLeft />
        </button>
        <button 
          className="slideshow-next" 
          onClick={handleNextClick}
          aria-label="Next slide"
        >
          <FaChevronRight />
        </button>
        
        <div className="slideshow-controls">
          {[0, 1, 2, 3].map((index) => (
            <button 
              key={index}
              className={`slideshow-dot ${currentSlide === index ? 'active' : ''}`}
              onClick={() => handleSlideClick(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={currentSlide === index ? 'true' : 'false'}
            />
          ))}
        </div>

        <div className="container mx-auto px-4">
          <div className="hero-content">
            <h1 className="hero-title">
              Everything Your Pet Needs, Delivered
            </h1>
            <p className="hero-subtitle">
              Nigeria's trusted marketplace for quality pet supplies. 
              food, toys, medicine, and more - all with secure escrow protection.
            </p>
            <div className="hero-buttons">
              <Link
                to="/products"
                className="primary-cta"
              >
                Shop Now
              </Link>
              <Link
                to="/seller"
                className="secondary-cta"
              >
                Become a Seller
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container mx-auto px-4">
          <h2 className="section-title">
            Why Choose PetHub?
          </h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaShieldAlt />
              </div>
              <h3 className="feature-title">Secure Escrow</h3>
              <p className="feature-description">
                Payment held securely until you receive and confirm delivery
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaShippingFast />
              </div>
              <h3 className="feature-title">Flexible Delivery</h3>
              <p className="feature-description">
                Choose from courier, local delivery, or express options
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaCreditCard />
              </div>
              <h3 className="feature-title">Easy Payments</h3>
              <p className="feature-description">
                Pay with card, bank transfer, or other local payment methods
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaPaw />
              </div>
              <h3 className="feature-title">Quality Products</h3>
              <p className="feature-description">
                Vetted sellers offering premium pet supplies
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories-section">
        <div className="container mx-auto px-4">
          <h2 className="categories-title">Shop by Category</h2>
          <div className="categories-grid">
            {categories.map(category => (
              <Link
                key={category.id}
                to={`/products?category=${category.id}`}
                className="category-card"
              >
                <div className="category-image">
                  <span className="category-text">
                    {category.name.split(' ')[0]}
                  </span>
                </div>
                <div className="category-overlay">
                  <h3 className="category-name">
                    {category.name}
                  </h3>
                  <p className="category-count">
                    {category.count} products
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-section">
        <div className="container mx-auto px-4">
          <div className="section-header">
            <h2 className="section-title">Featured Products</h2>
            <Link
              to="/products"
              className="view-all-link"
            >
              View All <FaArrowRight />
            </Link>
          </div>
          
          {featuredLoading ? (
            <div className="loading-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="loading-card">
                  <div className="loading-image"></div>
                  <div className="loading-text"></div>
                  <div className="loading-text loading-text-short"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="products-grid">
              {featuredProducts?.slice(0, 4).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Best Sellers Section */}
      <section className="best-sellers-section">
        <div className="container mx-auto px-4">
          <div className="section-header">
            <div className="section-title-wrapper">
              <FaFire className="fire-icon" />
              <h2 className="section-title">Best Sellers</h2>
            </div>
            <Link
              to="/products?sort=sales"
              className="view-all-link"
            >
              View All <FaArrowRight />
            </Link>
          </div>
          
          {bestSellersLoading ? (
            <div className="loading-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="loading-card">
                  <div className="loading-image"></div>
                  <div className="loading-text"></div>
                  <div className="loading-text loading-text-short"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="products-grid-6">
              {bestSellers?.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New Arrivals Section */}
      <section className="new-arrivals-section">
        <div className="container mx-auto px-4">
          <div className="section-header">
            <div className="section-title-wrapper">
              <FaStar className="star-icon" />
              <h2 className="section-title">New Arrivals</h2>
            </div>
            <Link
              to="/products?sort=newest"
              className="view-all-link"
            >
              View All <FaArrowRight />
            </Link>
          </div>
          
          {newArrivalsLoading ? (
            <div className="loading-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="loading-card">
                  <div className="loading-image"></div>
                  <div className="loading-text"></div>
                  <div className="loading-text loading-text-short"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="products-grid-6">
              {newArrivals?.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container mx-auto px-4">
          <div className="cta-content">
            <h2 className="cta-title">
              Ready to Sell on PetHub?
            </h2>
            <p className="cta-description">
              Join thousands of sellers reaching pet owners across Nigeria. 
              We handle payments and provide shipping support.
            </p>
            <Link
              to="/register?type=seller"
              className="cta-button"
            >
              Start Selling Today
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;