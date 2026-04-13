import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaEye, FaEyeSlash,
  FaUser, FaEnvelope, FaLock, FaUserTag, FaCheckCircle
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './RegisterPage.css';

const RegisterPage = () => {
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    user_type: 'buyer',
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading]                         = useState(false);
  const [error, setError]                             = useState('');
  const [passwordStrength, setPasswordStrength]       = useState({ score: 0, text: 'Very weak', level: 'weak' });

  const calculatePasswordStrength = (password) => {
    let score = 0;
    if (password.length >= 8)           score++;
    if (password.length >= 12)          score++;
    if (/[A-Z]/.test(password))         score++;
    if (/[a-z]/.test(password))         score++;
    if (/[0-9]/.test(password))         score++;
    if (/[^A-Za-z0-9]/.test(password))  score++;
    const map = [
      { score: 0, text: 'Very weak',   level: 'weak' },
      { score: 1, text: 'Weak',        level: 'weak' },
      { score: 2, text: 'Fair',        level: 'medium' },
      { score: 3, text: 'Good',        level: 'strong' },
      { score: 4, text: 'Strong',      level: 'strong' },
      { score: 5, text: 'Very strong', level: 'very-strong' },
      { score: 6, text: 'Excellent',   level: 'very-strong' },
    ];
    return map[Math.min(score, 6)];
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'password') setPasswordStrength(calculatePasswordStrength(value));
    setError('');
  };

  const handleUserTypeSelect = (type) => setFormData(prev => ({ ...prev, user_type: type }));

  const validateForm = () => {
    if (!formData.name.trim())                               { setError('Name is required'); return false; }
    if (!formData.email.trim())                              { setError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError('Invalid email format'); return false; }
    if (!formData.password)                                  { setError('Password is required'); return false; }
    if (formData.password.length < 6)                       { setError('Password must be at least 6 characters'); return false; }
    if (passwordStrength.score < 2)                         { setError('Please use a stronger password'); return false; }
    if (formData.password !== formData.confirmPassword)     { setError('Passwords do not match'); return false; }
    if (!formData.agreeToTerms)                             { setError('Please agree to the Terms of Service'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        user_type: formData.user_type,
      });
      if (!result.success) setError(result.error || 'Registration failed');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">

        {/* ── LEFT: Form ───────────────────────────────────── */}
        <div className="register-card">
          <div className="register-header">
            <h1>Join <span>PetHub</span></h1>
            <p>Create your account — takes less than 2 minutes</p>
          </div>

          {error && <div className="error-alert">{error}</div>}

          <form onSubmit={handleSubmit} className="register-form" noValidate>

            {/* Name */}
            <div className="form-group">
              <label htmlFor="name" className="form-label"><FaUser /> Full Name</label>
              <input
                type="text" id="name" name="name"
                value={formData.name} onChange={handleChange}
                placeholder="e.g. Chidi Okonkwo"
                className="form-input" disabled={loading} autoComplete="name"
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email" className="form-label"><FaEnvelope /> Email Address</label>
              <input
                type="email" id="email" name="email"
                value={formData.email} onChange={handleChange}
                placeholder="you@example.com"
                className="form-input" disabled={loading} autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password" className="form-label"><FaLock /> Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'} id="password" name="password"
                  value={formData.password} onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  className="form-input" disabled={loading} autoComplete="new-password"
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(p => !p)}
                  disabled={loading} aria-label={showPassword ? 'Hide' : 'Show'}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {formData.password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div className={`strength-fill strength-${passwordStrength.level}`} />
                  </div>
                  <span className="strength-text">{passwordStrength.text}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label"><FaLock /> Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" name="confirmPassword"
                  value={formData.confirmPassword} onChange={handleChange}
                  placeholder="Re-enter your password"
                  className="form-input" disabled={loading} autoComplete="new-password"
                />
                <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(p => !p)}
                  disabled={loading} aria-label={showConfirmPassword ? 'Hide' : 'Show'}>
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Account Type */}
            <div className="form-group">
              <label className="form-label"><FaUserTag /> Account Type</label>
              <div className="user-type-options">
                {[
                  { value: 'buyer',  icon: '🛒', label: 'Buyer',  desc: 'Shop pet products' },
                  { value: 'seller', icon: '🏪', label: 'Seller', desc: 'Sell pet products' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    className={`user-type-option ${formData.user_type === opt.value ? 'active' : ''}`}
                    onClick={() => handleUserTypeSelect(opt.value)}
                  >
                    <div className="type-icon">{opt.icon}</div>
                    <div className="type-label">{opt.label}</div>
                    <div className="type-description">{opt.desc}</div>
                    <input type="radio" name="user_type" value={opt.value}
                      checked={formData.user_type === opt.value} onChange={handleChange} />
                  </div>
                ))}
              </div>
            </div>

            {/* Terms */}
            <div className="terms-group">
              <input type="checkbox" id="agreeToTerms" name="agreeToTerms"
                checked={formData.agreeToTerms} onChange={handleChange}
                className="terms-checkbox" disabled={loading} />
              <label htmlFor="agreeToTerms" className="terms-label">
                I agree to the{' '}
                <Link to="/terms" className="terms-link">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="terms-link">Privacy Policy</Link>
              </label>
            </div>

            {/* Submit */}
            <button type="submit" className="register-button" disabled={loading}>
              {loading
                ? <><span className="loading-spinner" /> Creating Account…</>
                : 'Create Account'
              }
            </button>
          </form>

          <div className="register-footer">
            <p>Already have an account? <Link to="/login" className="login-link">Sign In</Link></p>
          </div>
        </div>

        {/* ── RIGHT: Brand Panel ───────────────────────────── */}
        <div className="register-info">
          <div className="register-info-grid" />
          <div className="info-card">

            <div className="info-logo-mark">
              <div className="info-logo-icon">🐾</div>
              <span className="info-logo-text">PetHub</span>
            </div>

            <h3>Nigeria's #1 Pet Marketplace</h3>
            <p className="info-card-sub">Join thousands of pet lovers across Nigeria</p>

            <ul>
              {[
                'Secure escrow payment protection',
                'Quality vetted sellers only',
                'Fast & flexible delivery options',
                '24/7 customer support',
                'Pet health experts on call',
                'Active community forums',
              ].map(item => (
                <li key={item}>
                  <span className="info-check"><FaCheckCircle /></span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="info-divider" />

            <div className="info-stat-row">
              <div className="info-stat">
                <span className="info-stat-value">10k+</span>
                <span className="info-stat-label">Buyers</span>
              </div>
              <div className="info-stat">
                <span className="info-stat-value">500+</span>
                <span className="info-stat-label">Sellers</span>
              </div>
              <div className="info-stat">
                <span className="info-stat-value">99%</span>
                <span className="info-stat-label">Satisfaction</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default RegisterPage;