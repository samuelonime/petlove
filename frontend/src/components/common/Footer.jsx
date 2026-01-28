import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaPhone, 
  FaEnvelope, 
  FaMapMarker,
  FaLinkedin,
  FaYoutube,
  FaTiktok,
  FaArrowUp,
  FaHeart
} from 'react-icons/fa';
import { SiWhatsapp } from 'react-icons/si';
import './Footer.css';

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      {/* Decorative elements */}
      <div className="footer__accent-bar"></div>
      
      {/* Floating dots */}
      <div className="footer__decorative-dots">
        <div className="dot"></div>
      </div>

      <div className="footer__container">
        <div className="footer__grid">
          
          {/* Brand Section */}
          <div className="footer__brand">
            <div className="footer__logo-wrapper">
              <div className="footer__logo-icon">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <h3 className="footer__logo-text">
                PetHub
              </h3>
            </div>
            <p className="footer__description">
              Nigeria's premier marketplace connecting pet lovers with quality supplies, trusted sellers, 
              and expert care for your beloved companions.
            </p>
            
            {/* Newsletter Subscription */}
            <div className="footer__newsletter">
              <label className="footer__newsletter-label">Subscribe to our newsletter</label>
              <div className="footer__newsletter-form">
                <input 
                  type="email" 
                  placeholder="Your email"
                  className="footer__newsletter-input"
                />
                <button className="footer__newsletter-button">
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer__section">
            <h4 className="footer__section-title footer__section-title--shop">
              Shop Categories
            </h4>
            <ul className="footer__links">
              {[
                { to: "/products", label: "All Products", icon: "🐾" },
                { to: "/products?category=food", label: "Pet Food & Treats", icon: "🍖" },
                { to: "/products?category=toys", label: "Toys & Accessories", icon: "🎾" },
                { to: "/products?category=medicine", label: "Health & Wellness", icon: "💊" },
                { to: "/products?category=grooming", label: "Grooming Supplies", icon: "🛁" },
                { to: "/seller", label: "Become a Seller", icon: "🚀" }
              ].map((item) => (
                <li key={item.label} className="footer__link-item">
                  <Link 
                    to={item.to} 
                    className="footer__link"
                  >
                    <span className="footer__link-icon">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div className="footer__section">
            <h4 className="footer__section-title footer__section-title--support">
              Support & Resources
            </h4>
            <ul className="footer__links">
              {[
                { to: "/help", label: "Help Center & FAQ" },
                { to: "/shipping", label: "Shipping Information" },
                { to: "/returns", label: "Returns & Refunds" },
                { to: "/safety", label: "Safety Guidelines" },
                { to: "/blog", label: "Pet Care Blog" },
                { to: "/contact", label: "Contact Support" }
              ].map((item) => (
                <li key={item.label} className="footer__link-item">
                  <Link 
                    to={item.to} 
                    className="footer__link"
                  >
                    <span className="footer__link-bullet"></span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact, Social & App Links */}
          <div className="footer__section">
            <h4 className="footer__section-title footer__section-title--connect">
              Connect With Us
            </h4>
            
            {/* Contact Info */}
            <div className="footer__contact">
              <div className="footer__contact-item">
                <div className="footer__contact-icon footer__contact-icon--phone">
                  <FaPhone />
                </div>
                <div>
                  <span className="footer__contact-label">Call Us</span>
                  <span className="footer__contact-value">+234 801 234 5678</span>
                </div>
              </div>
              
              <div className="footer__contact-item">
                <div className="footer__contact-icon footer__contact-icon--email">
                  <FaEnvelope />
                </div>
                <div>
                  <span className="footer__contact-label">Email Us</span>
                  <span className="footer__contact-value">support@pethub.ng</span>
                </div>
              </div>
              
              <div className="footer__contact-item">
                <div className="footer__contact-icon footer__contact-icon--location">
                  <FaMapMarker />
                </div>
                <div>
                  <span className="footer__contact-label">Visit Us</span>
                  <span className="footer__contact-value">Lagos, Nigeria</span>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="footer__social-section">
              <span className="footer__social-title">Follow Us</span>
              <div className="footer__social-icons">
                <a href="#" className="footer__social-link footer__social-link--facebook">
                  <FaFacebook />
                </a>
                <a href="#" className="footer__social-link footer__social-link--twitter">
                  <FaTwitter />
                </a>
                <a href="#" className="footer__social-link footer__social-link--instagram">
                  <FaInstagram />
                </a>
                <a href="#" className="footer__social-link footer__social-link--linkedin">
                  <FaLinkedin />
                </a>
                <a href="#" className="footer__social-link footer__social-link--youtube">
                  <FaYoutube />
                </a>
                <a href="#" className="footer__social-link footer__social-link--whatsapp">
                  <SiWhatsapp />
                </a>
              </div>
            </div>

            {/* Mobile App Downloads - Now under Follow Us */}
            <div className="footer__app-downloads">
              <span className="footer__app-downloads-title">Download Our App</span>
              <p className="footer__app-downloads-description">
                Shop on the go with our mobile app
              </p>
              <div className="footer__app-buttons">
                <button className="footer__app-button footer__app-button--appstore">
                  {/* Apple App Store Logo */}
                  <svg className="footer__app-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M17.05 20.28C16.07 21.23 15 21.08 13.97 20.63C12.88 20.17 11.88 20.15 10.73 20.63C9.29 21.25 8.53 21.07 7.66 20.28C2.86 15.25 3.71 7.08 9.92 6.79C11.22 6.83 12.11 7.45 12.9 7.52C13.99 7.26 15.05 6.66 16.2 6.73C17.63 6.83 18.67 7.33 19.42 8.37C15.82 10.53 16.72 15.05 20.1 16.2C19.45 17.78 18.62 19.33 17.04 20.29L17.05 20.28ZM12.03 6.75C11.85 4.05 14.08 1.85 16.63 2C17.02 4.44 14.37 6.3 12.03 6.75Z" 
                          fill="currentColor"/>
                  </svg>
                  <span>App Store</span>
                </button>
                <button className="footer__app-button footer__app-button--playstore">
                  {/* Google Play Store Logo */}
                  <svg className="footer__app-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 20.4V3.6C3 3.26863 3.26863 3 3.6 3H20.4C20.7314 3 21 3.26863 21 3.6V20.4C21 20.7314 20.7314 21 20.4 21H3.6C3.26863 21 3 20.7314 3 20.4Z" 
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15.2 12L9 8V16L15.2 12Z" 
                          fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                  <span>Play Store</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="footer__bottom">
          <div className="footer__bottom-content">
            <div>
              <p className="footer__copyright">
                &copy; {currentYear} PetHub Nigeria. All rights reserved.
                <span className="footer__separator">•</span>
                <Link to="/privacy" className="footer__legal-link">
                  Privacy Policy
                </Link>
                <span className="footer__separator">•</span>
                <Link to="/terms" className="footer__legal-link">
                  Terms of Service
                </Link>
              </p>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="footer__made-with">
                <span>Made with</span>
                <FaHeart className="footer__heart-icon" />
                <span>for pet lovers</span>
              </div>
              
              {/* Back to top button */}
              <button
                onClick={scrollToTop}
                className="footer__back-to-top"
                aria-label="Back to top"
              >
                <FaArrowUp />
              </button>
            </div>
          </div>
          
          {/* Trust badges */}
          <div className="footer__trust-badges">
            <div className="footer__trust-badge">
              <div className="footer__trust-icon footer__trust-icon--secure">✓</div>
              <div className="footer__trust-label">Secure Payments</div>
            </div>
            <div className="footer__trust-badge">
              <div className="footer__trust-icon footer__trust-icon--escrow">✓</div>
              <div className="footer__trust-label">Escrow Protected</div>
            </div>
            <div className="footer__trust-badge">
              <div className="footer__trust-icon footer__trust-icon--verified">★</div>
              <div className="footer__trust-label">Verified Sellers</div>
            </div>
            <div className="footer__trust-badge">
              <div className="footer__trust-icon footer__trust-icon--delivery">✓</div>
              <div className="footer__trust-label">Fast Delivery</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;