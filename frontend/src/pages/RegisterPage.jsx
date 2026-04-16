import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaEye, FaEyeSlash,
  FaUser, FaEnvelope, FaLock, FaUserTag, FaPhone, FaCheckCircle
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './RegisterPage.css';

const RegisterPage = () => {
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '',
    password: '', confirmPassword: '',
    user_type: 'buyer', agreeToTerms: false,
  });
  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading]                         = useState(false);
  const [error, setError]                             = useState('');
  const [passwordStrength, setPasswordStrength]       = useState({ score: 0, text: 'Very weak', level: 'weak' });

  const calculatePasswordStrength = (pw) => {
    let s = 0;
    if (pw.length >= 8) s++; if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw)) s++; if (/[a-z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
    return [
      { score:0, text:'Very weak',   level:'weak' },
      { score:1, text:'Weak',        level:'weak' },
      { score:2, text:'Fair',        level:'medium' },
      { score:3, text:'Good',        level:'strong' },
      { score:4, text:'Strong',      level:'strong' },
      { score:5, text:'Very strong', level:'very-strong' },
      { score:6, text:'Excellent',   level:'very-strong' },
    ][Math.min(s, 6)];
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
    if (!formData.phone.trim())                              { setError('Phone number is required'); return false; }
    if (!/^(\+?234|0)[789]\d{9}$/.test(formData.phone.replace(/\s+/g, ''))) { setError('Enter a valid Nigerian phone number (e.g. 08012345678)'); return false; }
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
      const result = await register({ name: formData.name, email: formData.email, phone: formData.phone, password: formData.password, user_type: formData.user_type });
      if (!result.success) setError(result.error || 'Registration failed');
    } catch { setError('An unexpected error occurred'); }
    finally { setLoading(false); }
  };

  const handleGoogleSignup = () => {
    window.location.href = `${import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000'}/auth/google`;
  };

  return (
    <div className="register-page">
      <div className="register-container">

        {/* ── Form column ── */}
        <div className="register-card">
          <div className="register-header">
            <h1>Join <span>PetHub</span></h1>
            <p>Create your free account in under 2 minutes</p>
          </div>

          {error && <div className="error-alert">{error}</div>}

          {/* Google signup */}
          <button type="button" className="google-signup-btn" onClick={handleGoogleSignup}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign up with Google
          </button>

          <div className="register-divider"><span>or sign up with email</span></div>

          <form onSubmit={handleSubmit} className="register-form" noValidate>

            <div className="form-group">
              <label htmlFor="name" className="form-label"><FaUser /> Full Name</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Chidi Okonkwo" className="form-input" disabled={loading} autoComplete="name" />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label"><FaEnvelope /> Email Address</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" className="form-input" disabled={loading} autoComplete="email" />
            </div>

            <div className="form-group">
              <label htmlFor="phone" className="form-label"><FaPhone /> Phone Number</label>
              <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="e.g. 08012345678" className="form-input" disabled={loading} autoComplete="tel" />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label"><FaLock /> Password</label>
              <div className="password-input-wrapper">
                <input type={showPassword ? 'text' : 'password'} id="password" name="password" value={formData.password} onChange={handleChange} placeholder="Minimum 6 characters" className="form-input" disabled={loading} autoComplete="new-password" />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(p => !p)} disabled={loading}>{showPassword ? <FaEyeSlash /> : <FaEye />}</button>
              </div>
              {formData.password && (
                <div className="password-strength">
                  <div className="strength-bar"><div className={`strength-fill strength-${passwordStrength.level}`} /></div>
                  <span className="strength-text">{passwordStrength.text}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label"><FaLock /> Confirm Password</label>
              <div className="password-input-wrapper">
                <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter your password" className="form-input" disabled={loading} autoComplete="new-password" />
                <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(p => !p)} disabled={loading}>{showConfirmPassword ? <FaEyeSlash /> : <FaEye />}</button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label"><FaUserTag /> Account Type</label>
              <div className="user-type-options">
                {[{value:'buyer',icon:'🛒',label:'Buyer',desc:'Shop pet products'},{value:'seller',icon:'🏪',label:'Seller',desc:'Sell pet products'}].map(opt => (
                  <div key={opt.value} className={`user-type-option ${formData.user_type === opt.value ? 'active' : ''}`} onClick={() => handleUserTypeSelect(opt.value)}>
                    <div className="type-icon">{opt.icon}</div>
                    <div className="type-label">{opt.label}</div>
                    <div className="type-description">{opt.desc}</div>
                    <input type="radio" name="user_type" value={opt.value} checked={formData.user_type === opt.value} onChange={handleChange} />
                  </div>
                ))}
              </div>
            </div>

            <div className="terms-group">
              <input type="checkbox" id="agreeToTerms" name="agreeToTerms" checked={formData.agreeToTerms} onChange={handleChange} className="terms-checkbox" disabled={loading} />
              <label htmlFor="agreeToTerms" className="terms-label">
                I agree to the <Link to="/terms" className="terms-link">Terms of Service</Link> and <Link to="/privacy" className="terms-link">Privacy Policy</Link>
              </label>
            </div>

            <button type="submit" className="register-button" disabled={loading}>
              {loading ? <><span className="loading-spinner" /> Creating Account…</> : 'Create Account'}
            </button>
          </form>

          <div className="register-footer">
            <p>Already have an account? <Link to="/login" className="login-link">Sign In</Link></p>
          </div>
        </div>

        {/* ── Brand panel ── */}
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
              {['Secure escrow payment protection','Quality vetted sellers only','Fast & flexible delivery options','24/7 customer support','Pet health experts on call','Active community forums'].map(item => (
                <li key={item}><span className="info-check"><FaCheckCircle /></span>{item}</li>
              ))}
            </ul>
            <div className="info-divider" />
            <div className="info-stat-row">
              {[['10k+','Buyers'],['500+','Sellers'],['99%','Satisfaction']].map(([v,l]) => (
                <div key={l} className="info-stat">
                  <span className="info-stat-value">{v}</span>
                  <span className="info-stat-label">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RegisterPage;
