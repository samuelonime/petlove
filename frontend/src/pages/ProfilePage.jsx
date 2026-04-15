import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';
import { FaSync, FaUser, FaEnvelope, FaUserTag, FaCalendarAlt, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRetry = () => {
    if (!user) {
      setError('User information not available. Please log in again.');
      return;
    }
    setError(null);
  };

  useEffect(() => {
    if (!user) {
      setError('Unable to load user profile.');
    }
  }, [user]);

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading your profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h2 className="error-title">Unable to Load Profile</h2>
        <p className="error-message">{error}</p>
        <button onClick={handleRetry} className="retry-button">
          <FaSync /> Try Again
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="empty-container">
        <div className="empty-icon">👤</div>
        <h2 className="empty-title">No Profile Found</h2>
        <p className="empty-message">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <h1>My Profile</h1>
      
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-info">
            {/* Header with Avatar */}
            <div className="profile-header">
              <div className="profile-avatar">
                {getInitials(user.name)}
              </div>
              <div className="profile-basic-info">
                <h2 className="profile-name">{user.name || 'Anonymous User'}</h2>
                <p className="profile-email">
                  <FaEnvelope className="icon" />
                  {user.email}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="profile-details-grid">
              <div className="profile-detail-item">
                <span className="profile-detail-label">
                  <FaUser className="icon" /> Full Name
                </span>
                <span className="profile-detail-value">{user.name || 'Not set'}</span>
              </div>

              <div className="profile-detail-item">
                <span className="profile-detail-label">
                  <FaEnvelope className="icon" /> Email Address
                </span>
                <span className="profile-detail-value">{user.email}</span>
              </div>

              <div className="profile-detail-item">
                <span className="profile-detail-label">
                  <FaUserTag className="icon" /> Role
                </span>
                <span className="profile-detail-value role">{user.user_type || 'User'}</span>
              </div>

              {/* Additional details you might want to add */}
              {user.phone && (
                <div className="profile-detail-item">
                  <span className="profile-detail-label">
                    <FaPhone className="icon" /> Phone
                  </span>
                  <span className="profile-detail-value">{user.phone}</span>
                </div>
              )}
            </div>

            {/* Stats Section */}
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-value">{user.totalOrders || 0}</span>
                <span className="stat-label">Total Orders</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{user.completedOrders || 0}</span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{user.reviews || 0}</span>
                <span className="stat-label">Reviews</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{user.rating || '5.0'}</span>
                <span className="stat-label">Avg. Rating</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
