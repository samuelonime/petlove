import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { FaShoppingCart, FaUser, FaStore, FaBars, FaTimes } from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAdmin, isSeller } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Add scroll event listener
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  const userLinks = user ? (
    <div className="user-section">
      {isAdmin && (
        <Link to="/admin" className="navbar-link admin-badge">
          <FaStore className="icon icon-small" /> Admin
        </Link>
      )}
      {isSeller && (
        <Link to="/seller" className="navbar-link seller-badge">
          <FaStore className="icon icon-small" /> Seller
        </Link>
      )}
      <Link to="/cart" className="navbar-cart">
        <FaShoppingCart className="icon icon-medium" />
        {itemCount > 0 && (
          <span className="cart-count">{itemCount}</span>
        )}
      </Link>
      <Link to="/orders" className="navbar-link">Orders</Link>
      <div className="user-menu">
        <button className="user-button">
          <FaUser className="icon icon-small" />
          <span>{user.name}</span>
        </button>
        <div className="user-dropdown">
          <Link to="/profile" className="dropdown-item">
            <FaUser className="icon icon-small" /> Profile
          </Link>
          <button 
            onClick={handleLogout} 
            className="dropdown-item logout"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className="auth-buttons">
      <Link to="/login" className="login-button">Login</Link>
      <Link to="/register" className="signup-button">Sign Up</Link>
    </div>
  );

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navbar-inner">
        <div className="navbar-content">
          <Link to="/" className="navbar-logo">
            <FaStore className="navbar-logo-icon" />
            PetHub
          </Link>

          {/* Desktop Menu */}
          <div className="navbar-desktop">
            <div className="navbar-links">
              <Link to="/" className="navbar-link">Home</Link>
              <Link to="/products" className="navbar-link">Products</Link>
              <Link to="/products?category=food" className="navbar-link">Food</Link>
              <Link to="/products?category=toys" className="navbar-link">Toys</Link>
              <Link to="/products?category=medicine" className="navbar-link">Medicine</Link>
            </div>
            {userLinks}
          </div>

          {/* Mobile menu button */}
          <button
            className="mobile-menu-button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <FaTimes className="icon icon-medium" /> : <FaBars className="icon icon-medium" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="mobile-menu">
            <div className="mobile-menu-content">
              <div className="mobile-links">
                <Link to="/" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
                  <FaStore className="icon icon-small" /> Home
                </Link>
                <Link to="/products" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
                  <FaStore className="icon icon-small" /> Products
                </Link>
                <div className="mobile-category-links">
                  <Link to="/products?category=food" className="mobile-category-link" onClick={() => setIsMenuOpen(false)}>Food</Link>
                  <Link to="/products?category=toys" className="mobile-category-link" onClick={() => setIsMenuOpen(false)}>Toys</Link>
                  <Link to="/products?category=medicine" className="mobile-category-link" onClick={() => setIsMenuOpen(false)}>Medicine</Link>
                </div>
                
                <div className="mobile-auth">
                  {user ? (
                    <div className="mobile-auth-links">
                      {isAdmin && (
                        <Link to="/admin" className="mobile-link admin-badge" onClick={() => setIsMenuOpen(false)}>
                          <FaStore className="icon icon-small" /> Admin Dashboard
                        </Link>
                      )}
                      {isSeller && (
                        <Link to="/seller" className="mobile-link seller-badge" onClick={() => setIsMenuOpen(false)}>
                          <FaStore className="icon icon-small" /> Seller Dashboard
                        </Link>
                      )}
                      <Link to="/cart" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
                        <FaShoppingCart className="icon icon-small" /> Cart ({itemCount})
                      </Link>
                      <Link to="/orders" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
                        <FaStore className="icon icon-small" /> Orders
                      </Link>
                      <Link to="/profile" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
                        <FaUser className="icon icon-small" /> Profile
                      </Link>
                      <button 
                        onClick={handleLogout} 
                        className="mobile-link logout"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <div className="mobile-auth-links">
                      <Link to="/login" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
                        <FaUser className="icon icon-small" /> Login
                      </Link>
                      <Link to="/register" className="signup-button" onClick={() => setIsMenuOpen(false)}>
                        Sign Up
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;