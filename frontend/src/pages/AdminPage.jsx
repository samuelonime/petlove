import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/common/ConfirmModal';
import { toast } from 'react-toastify';
import { FaSearch, FaSync, FaArrowLeft, FaTrash, FaCheck, FaEye, FaStar } from 'react-icons/fa';
import './AdminPage.css';

const TABS = {
  USERS: 'users',
  PRODUCTS: 'products',
  REVIEWS: 'reviews'
};

/* ── Helpers ──────────────────────────────────────────── */
const roleClass = (role) => {
  if (!role) return 'status-unknown';
  const r = role.toLowerCase();
  if (r === 'admin')  return 'status-admin';
  if (r === 'seller') return 'status-seller';
  if (r === 'buyer')  return 'status-buyer';
  return 'status-unknown';
};

const statusClass = (status) => {
  if (!status) return 'status-unknown';
  const s = status.toLowerCase();
  if (s === 'approved' || s === 'active') return 'status-approved';
  if (s === 'pending')  return 'status-pending';
  if (s === 'inactive' || s === 'rejected') return 'status-inactive';
  return 'status-unknown';
};

/* ── AdminPage ────────────────────────────────────────── */
const AdminPage = () => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState(TABS.USERS);

  const [users, setUsers]               = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError]     = useState(null);
  const [userQuery, setUserQuery]       = useState('');

  const [products, setProducts]               = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError]     = useState(null);
  const [productQuery, setProductQuery]       = useState('');

  const [reviews, setReviews]               = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError]     = useState(null);

  const [confirm, setConfirm] = useState({
    open: false, title: '', message: '', onConfirm: null
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/');
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (tab === TABS.USERS)    fetchUsers();
    if (tab === TABS.PRODUCTS) fetchProducts();
  }, [tab]);

  async function fetchUsers() {
    setUsersLoading(true); setUsersError(null);
    try {
      const res  = await api.get('/api/users');
      const data = res.data?.data?.users || res.data?.users || res.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setUsersError(err.response?.data?.error || err.message || 'Failed to load users');
    } finally { setUsersLoading(false); }
  }

  async function fetchProducts() {
    setProductsLoading(true); setProductsError(null);
    try {
      const res  = await api.get('/api/products');
      const data = res.data?.data || res.data || [];
      setProducts(Array.isArray(data) ? data : data.products || []);
    } catch (err) {
      setProductsError(err.response?.data?.error || err.message || 'Failed to load products');
    } finally { setProductsLoading(false); }
  }

  async function deleteUser(id) {
    setConfirm({
      open: true,
      title: 'Remove User',
      message: 'This will permanently delete the user and all their data. This action cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`/api/users/${id}`);
          setUsers(prev => prev.filter(u => u.id !== id && u._id !== id));
          toast.success('User removed');
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to delete user');
        } finally { setConfirm(prev => ({ ...prev, open: false })); }
      }
    });
  }

  async function deleteProduct(id) {
    setConfirm({
      open: true,
      title: 'Delete Product',
      message: 'Delete this product permanently? Buyers will no longer be able to find or purchase it.',
      onConfirm: async () => {
        try {
          await api.delete(`/api/products/${id}`);
          setProducts(prev => prev.filter(p => p.id !== id && p._id !== id));
          toast.success('Product deleted');
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to delete product');
        } finally { setConfirm(prev => ({ ...prev, open: false })); }
      }
    });
  }

  async function approveProduct(id) {
    setConfirm({
      open: true,
      title: 'Approve Product',
      message: 'Make this product visible to all buyers on PetHub?',
      onConfirm: async () => {
        try {
          await api.post(`/admin/products/${id}/approve`);
          setProducts(prev =>
            prev.map(p => (p.id === id || p._id === id ? { ...p, status: 'approved' } : p))
          );
          toast.success('Product approved');
        } catch (err) {
          toast.error(err.response?.data?.error || 'Approve failed');
        } finally { setConfirm(prev => ({ ...prev, open: false })); }
      }
    });
  }

  async function fetchReviewsForProduct(productId) {
    setReviewsLoading(true); setReviewsError(null);
    try {
      const res  = await api.get(`/products/${productId}/reviews`);
      const data = res.data?.data || res.data || [];
      setReviews(Array.isArray(data) ? data : data.reviews || []);
      setTab(TABS.REVIEWS);
    } catch (err) {
      setReviewsError(err.response?.data?.error || 'Failed to load reviews');
    } finally { setReviewsLoading(false); }
  }

  async function deleteReview(reviewId) {
    setConfirm({
      open: true,
      title: 'Delete Review',
      message: 'Permanently remove this review from the platform?',
      onConfirm: async () => {
        try {
          await api.delete(`/reviews/${reviewId}`);
          setReviews(prev => prev.filter(r => r.id !== reviewId && r._id !== reviewId));
          toast.success('Review deleted');
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to delete review');
        } finally { setConfirm(prev => ({ ...prev, open: false })); }
      }
    });
  }

  const filteredUsers = useMemo(() => {
    if (!userQuery) return users;
    const q = userQuery.toLowerCase();
    return users.filter(u =>
      (u.name || `${u.firstName||''} ${u.lastName||''}`).toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }, [users, userQuery]);

  const filteredProducts = useMemo(() => {
    if (!productQuery) return products;
    const q = productQuery.toLowerCase();
    return products.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }, [products, productQuery]);

  return (
    <div className="admin-page">
      <div className="admin-inner">

        {/* ── Header ── */}
        <div className="admin-header">
          <div className="admin-header-left">
            <h1>Admin Dashboard</h1>
            <p>Manage users, products, and reviews across PetHub</p>
          </div>
          <span className="admin-badge-role">Administrator</span>
        </div>

        {/* ── Tabs ── */}
        <div className="admin-tabs">
          <button
            onClick={() => setTab(TABS.USERS)}
            className={tab === TABS.USERS ? 'active' : ''}
          >
            Users
            {users.length > 0 && <span className="tab-count">{users.length}</span>}
          </button>
          <button
            onClick={() => setTab(TABS.PRODUCTS)}
            className={tab === TABS.PRODUCTS ? 'active' : ''}
          >
            Products
            {products.length > 0 && <span className="tab-count">{products.length}</span>}
          </button>
          <button
            onClick={() => setTab(TABS.REVIEWS)}
            className={tab === TABS.REVIEWS ? 'active' : ''}
          >
            Reviews
            {reviews.length > 0 && <span className="tab-count">{reviews.length}</span>}
          </button>
        </div>

        {/* ── Confirm Modal ── */}
        <ConfirmModal
          open={confirm.open}
          title={confirm.title}
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(prev => ({ ...prev, open: false }))}
        />

        {/* ══════════════ USERS TAB ══════════════ */}
        {tab === TABS.USERS && (
          <div className="admin-section">
            <div className="admin-controls">
              <div className="admin-search-wrap">
                <FaSearch className="admin-search-icon" />
                <input
                  className="admin-search"
                  placeholder="Search by name or email…"
                  value={userQuery}
                  onChange={e => setUserQuery(e.target.value)}
                />
              </div>
              <button className="admin-btn admin-btn-ghost" onClick={fetchUsers}>
                <FaSync /> Refresh
              </button>
            </div>

            {usersLoading ? (
              <div className="admin-loading">
                <span className="admin-spinner" /> Loading users…
              </div>
            ) : usersError ? (
              <div className="admin-error">⚠ {usersError}</div>
            ) : filteredUsers.length === 0 ? (
              <div className="admin-table-card">
                <div className="admin-state">
                  <span className="admin-state-icon">👤</span>
                  <p className="admin-state-title">No users found</p>
                  <p className="admin-state-desc">
                    {userQuery ? 'Try a different search term' : 'No users registered yet'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="admin-table-card">
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id || u._id}>
                          <td className="td-id">{u.id || u._id}</td>
                          <td className="td-name">
                            {u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim()}
                          </td>
                          <td className="td-email">{u.email}</td>
                          <td>
                            <span className={`status-badge ${roleClass(u.user_type || u.role)}`}>
                              {u.user_type || u.role || '—'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="act-btn act-btn-details"
                                onClick={() => navigate(`/api/admin/users/${u.id || u._id}`)}
                              >
                                <FaEye /> Details
                              </button>
                              <button
                                className="act-btn act-btn-delete"
                                onClick={() => deleteUser(u.id || u._id)}
                              >
                                <FaTrash /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ PRODUCTS TAB ══════════════ */}
        {tab === TABS.PRODUCTS && (
          <div className="admin-section">
            <div className="admin-controls">
              <div className="admin-search-wrap">
                <FaSearch className="admin-search-icon" />
                <input
                  className="admin-search"
                  placeholder="Search products…"
                  value={productQuery}
                  onChange={e => setProductQuery(e.target.value)}
                />
              </div>
              <button className="admin-btn admin-btn-ghost" onClick={fetchProducts}>
                <FaSync /> Refresh
              </button>
            </div>

            {productsLoading ? (
              <div className="admin-loading">
                <span className="admin-spinner" /> Loading products…
              </div>
            ) : productsError ? (
              <div className="admin-error">⚠ {productsError}</div>
            ) : filteredProducts.length === 0 ? (
              <div className="admin-table-card">
                <div className="admin-state">
                  <span className="admin-state-icon">📦</span>
                  <p className="admin-state-title">No products found</p>
                  <p className="admin-state-desc">
                    {productQuery ? 'Try a different search term' : 'No products listed yet'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="admin-table-card">
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Seller</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(p => (
                        <tr key={p.id || p._id}>
                          <td className="td-id">{p.id || p._id}</td>
                          <td className="td-name">{p.name}</td>
                          <td className="td-email">{p.seller?.email || p.seller || '—'}</td>
                          <td>
                            <span className={`status-badge ${statusClass(p.status || p.condition)}`}>
                              {p.status || p.condition || 'unknown'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="act-btn act-btn-reviews"
                                onClick={() => fetchReviewsForProduct(p.id || p._id)}
                              >
                                <FaStar /> Reviews
                              </button>
                              <button
                                className="act-btn act-btn-approve"
                                onClick={() => approveProduct(p.id || p._id)}
                              >
                                <FaCheck /> Approve
                              </button>
                              <button
                                className="act-btn act-btn-delete"
                                onClick={() => deleteProduct(p.id || p._id)}
                              >
                                <FaTrash /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ REVIEWS TAB ══════════════ */}
        {tab === TABS.REVIEWS && (
          <div className="admin-section">
            <div className="admin-controls">
              <button
                className="admin-btn admin-btn-back"
                onClick={() => { setReviews([]); setTab(TABS.PRODUCTS); }}
              >
                <FaArrowLeft /> Back to Products
              </button>
            </div>

            {reviewsLoading ? (
              <div className="admin-loading">
                <span className="admin-spinner" /> Loading reviews…
              </div>
            ) : reviewsError ? (
              <div className="admin-error">⚠ {reviewsError}</div>
            ) : reviews.length === 0 ? (
              <div className="admin-table-card">
                <div className="admin-state">
                  <span className="admin-state-icon">💬</span>
                  <p className="admin-state-title">No reviews</p>
                  <p className="admin-state-desc">Select a product from the Products tab to view its reviews</p>
                </div>
              </div>
            ) : (
              <div className="admin-table-card">
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Product</th>
                        <th>Rating</th>
                        <th>Comment</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.map(r => (
                        <tr key={r.id || r._id}>
                          <td className="td-id">{r.id || r._id}</td>
                          <td className="td-email">{r.user?.email || r.userId || '—'}</td>
                          <td className="td-name">{r.product?.name || r.productId?.name || '—'}</td>
                          <td className="td-rating">{'★'.repeat(r.rating || 0)}{'☆'.repeat(5 - (r.rating || 0))}</td>
                          <td className="td-comment" title={r.comment}>{r.comment || '—'}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="act-btn act-btn-delete"
                                onClick={() => deleteReview(r.id || r._id)}
                              >
                                <FaTrash /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPage;
