import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import productService from '../services/productService';
import ProductCard from '../components/products/ProductCard';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';
import './ProductsPage.css';

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || 'newest',
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data: products, isLoading } = useQuery(
    ['products', filters, searchTerm],
    () => productService.getProducts({ ...filters, search: searchTerm })
  );

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filters.category) params.set('category', filters.category);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.sort) params.set('sort', filters.sort);
    setSearchParams(params);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      minPrice: '',
      maxPrice: '',
      sort: 'newest',
    });
    setSearchTerm('');
    setSearchParams({});
  };

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'food', label: 'Pet Food' },
    { value: 'toys', label: 'Toys' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'medicine', label: 'Medicine' },
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'popular', label: 'Most Popular' },
  ];

  return (
    <div className="products-page-container">
      <div className="products-page-header">
        <h1 className="products-page-title">Shop Pet Supplies</h1>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-wrapper">
            <div className="search-input-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for products..."
                className="search-input"
              />
            </div>
            <button
              type="submit"
              className="search-button"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="filter-toggle-button"
            >
              <FaFilter className="filter-icon" />
              Filters
            </button>
          </div>
        </form>

        {/* Filters Panel */}
        {showFilters && (
          <div className="filters-panel">
            <div className="filters-header">
              <h3 className="filters-title">Filters</h3>
              <button
                onClick={clearFilters}
                className="clear-filters-button"
              >
                Clear all
              </button>
            </div>
            
            <div className="filters-grid">
              <div className="filter-group">
                <label className="filter-label">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="filter-select"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">
                  Min Price (₦)
                </label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="filter-input"
                  placeholder="Min"
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">
                  Max Price (₦)
                </label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="filter-input"
                  placeholder="Max"
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">
                  Sort By
                </label>
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  className="filter-select"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters */}
        {(searchTerm || filters.category || filters.minPrice || filters.maxPrice) && (
          <div className="active-filters">
            {searchTerm && (
              <span className="active-filter-tag search-tag">
                Search: {searchTerm}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    handleFilterChange('search', '');
                  }}
                  className="remove-filter-button"
                >
                  <FaTimes />
                </button>
              </span>
            )}
            {filters.category && (
              <span className="active-filter-tag category-tag">
                Category: {categories.find(c => c.value === filters.category)?.label}
                <button
                  onClick={() => handleFilterChange('category', '')}
                  className="remove-filter-button"
                >
                  <FaTimes />
                </button>
              </span>
            )}
            {filters.minPrice && (
              <span className="active-filter-tag price-tag">
                Min: ₦{filters.minPrice}
                <button
                  onClick={() => handleFilterChange('minPrice', '')}
                  className="remove-filter-button"
                >
                  <FaTimes />
                </button>
              </span>
            )}
            {filters.maxPrice && (
              <span className="active-filter-tag price-tag">
                Max: ₦{filters.maxPrice}
                <button
                  onClick={() => handleFilterChange('maxPrice', '')}
                  className="remove-filter-button"
                >
                  <FaTimes />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="products-grid loading-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="product-card-skeleton">
              <div className="skeleton-image"></div>
              <div className="skeleton-title"></div>
              <div className="skeleton-price"></div>
            </div>
          ))}
        </div>
      ) : products?.length > 0 ? (
        <>
          <div className="products-count">
            Showing {products.length} products
          </div>
          <div className="products-grid">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      ) : (
        <div className="no-products-found">
          <div className="no-products-icon">🐾</div>
          <h3 className="no-products-title">No products found</h3>
          <p className="no-products-description">
            Try adjusting your search or filter criteria
          </p>
          <button
            onClick={clearFilters}
            className="clear-filters-cta"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
