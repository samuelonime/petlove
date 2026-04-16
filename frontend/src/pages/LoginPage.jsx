import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaPaw } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) setError(result.error || 'Login failed');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Google OAuth placeholder — wire to your backend OAuth endpoint
    window.location.href = `${import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000'}/auth/google`;
  };

  return (
    <div className="login-page">
      <div className="login-split">

        {/* ── Left panel ── */}
        <div className="login-panel">
          <div className="login-panel-inner">
            <div className="login-logo">
              <FaPaw />
              <span>PetHub</span>
            </div>
            <h2 className="login-panel-title">Nigeria's #1<br/>Pet Marketplace</h2>
            <p className="login-panel-sub">Thousands of happy pet owners trust PetHub every day.</p>
            <ul className="login-panel-list">
              {['Secure escrow protection','Verified quality sellers','Fast Nigeria-wide delivery','24/7 support'].map(t => (
                <li key={t}><span className="login-panel-check">✓</span>{t}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Right form ── */}
        <div className="login-form-col">
          <div className="login-form-wrap">
            <div className="login-header">
              <h1>Welcome back</h1>
              <p>Sign in to your PetHub account</p>
            </div>

            {error && <div className="login-error">{error}</div>}

            {/* Google button */}
            <button type="button" className="google-btn" onClick={handleGoogleLogin}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>

            <div className="login-divider"><span>or sign in with email</span></div>

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <div className="lf-group">
                <label className="lf-label"><FaEnvelope /> Email Address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" className="lf-input"
                  disabled={loading} autoComplete="email" required
                />
              </div>

              <div className="lf-group">
                <div className="lf-label-row">
                  <label className="lf-label"><FaLock /> Password</label>
                  <Link to="/forgot-password" className="lf-forgot">Forgot password?</Link>
                </div>
                <div className="lf-pw-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password" className="lf-input"
                    disabled={loading} autoComplete="current-password" required
                  />
                  <button type="button" className="lf-pw-toggle" onClick={() => setShowPassword(p => !p)} aria-label="Toggle password">
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? <><span className="lf-spinner" /> Signing in…</> : 'Sign In'}
              </button>
            </form>

            <p className="login-footer">
              Don't have an account?{' '}
              <Link to="/register" className="login-register-link">Create one free</Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
