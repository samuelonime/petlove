import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/formatters';
import { FaTrash, FaPlus, FaMinus, FaArrowRight } from 'react-icons/fa';

const CartPage = () => {
  const { cartItems, cartTotal, itemCount, updateQuantity, removeFromCart, clearCart } = useCart();

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="text-6xl mb-6">🛒</div>
        <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
        <p className="text-gray-600 mb-8">
          Looks like you haven't added any items to your cart yet.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Start Shopping
          <FaArrowRight className="ml-2" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart ({itemCount} items)</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <div className="space-y-6">
                {cartItems.map(item => (
                  <div key={item.id} className="flex items-center border-b pb-6">
                    <div className="w-24 h-24 flex-shrink-0">
                      <img
                        src={item.images?.[0] || '/placeholder.jpg'}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    
                    <div className="flex-1 ml-6">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-semibold text-lg hover:text-blue-600">
                            <Link to={`/products/${item.id}`}>{item.name}</Link>
                          </h3>
                          <p className="text-gray-600 text-sm mt-1">
                            Category: {item.category}
                          </p>
                          {item.stock <= 10 && item.stock > 0 && (
                            <p className="text-yellow-600 text-sm">
                              Only {item.stock} left in stock
                            </p>
                          )}
                        </div>
                        <p className="text-xl font-bold">{formatCurrency(item.price)}</p>
                      </div>
                      
                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className={`p-1 rounded ${
                              item.quantity <= 1
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            <FaMinus />
                          </button>
                          <span className="px-4 py-1 border rounded">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                            className={`p-1 rounded ${
                              item.quantity >= item.stock
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            <FaPlus />
                          </button>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <p className="text-lg font-semibold">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex justify-between">
                <button
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-700 flex items-center"
                >
                  <FaTrash className="mr-2" />
                  Clear Cart
                </button>
                <Link
                  to="/products"
                  className="text-blue-600 hover:text-blue-700"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal ({itemCount} items)</span>
                <span className="font-semibold">{formatCurrency(cartTotal)}</span>
              </div>
              
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  * VAT included where applicable
                </p>
              </div>
            </div>
            
            <div className="mt-6 space-y-4">
              <Link
                to="/checkout"
                className="block w-full py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 font-semibold"
              >
                Proceed to Checkout
              </Link>
              
              <div className="text-sm text-gray-600 space-y-2">
                <p className="flex items-center">
                  <span className="inline-block w-4 h-4 bg-green-500 rounded-full mr-2"></span>
                  Secure checkout with escrow protection
                </p>
                <p className="flex items-center">
                  <span className="inline-block w-4 h-4 bg-green-500 rounded-full mr-2"></span>
                  Multiple shipping options available
                </p>
                <p className="flex items-center">
                  <span className="inline-block w-4 h-4 bg-green-500 rounded-full mr-2"></span>
                  Payment released only after delivery confirmation
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;