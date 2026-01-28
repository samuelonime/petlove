import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { FaStar, FaShoppingCart } from 'react-icons/fa';
import { formatCurrency } from '../../utils/formatters';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <Link to={`/products/${product.id}`}>
        <div className="h-48 overflow-hidden">
          <img
            src={product.images?.[0] || '/placeholder.jpg'}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform"
          />
        </div>
      </Link>
      
      <div className="p-4">
        <Link to={`/products/${product.id}`}>
          <h3 className="font-semibold text-lg mb-2 hover:text-blue-600 line-clamp-1">
            {product.name}
          </h3>
        </Link>
        
        <div className="flex items-center mb-2">
          <div className="flex text-yellow-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <FaStar
                key={star}
                className={star <= (product.rating || 3) ? 'fill-current' : 'fill-gray-300'}
                size={16}
              />
            ))}
          </div>
          <span className="ml-2 text-sm text-gray-600">
            ({product.review_count || 0})
          </span>
        </div>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {product.description}
        </p>
        
        <div className="flex justify-between items-center">
          <div>
            <span className="text-2xl font-bold text-blue-600">
              {formatCurrency(product.price)}
            </span>
            {product.stock > 0 ? (
              <p className="text-sm text-green-600">In Stock ({product.stock})</p>
            ) : (
              <p className="text-sm text-red-600">Out of Stock</p>
            )}
          </div>
          
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className={`flex items-center px-4 py-2 rounded-lg ${
              product.stock === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <FaShoppingCart className="mr-2" />
            Add
          </button>
        </div>
        
        {product.express_shipping && (
          <div className="mt-2 inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
            <span>🚚 Express Delivery Available</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;