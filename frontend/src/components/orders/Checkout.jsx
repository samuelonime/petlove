import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import orderService from '../../services/orderService';
import paymentService from '../../services/paymentService';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'react-toastify';
import { FaTruck, FaUser, FaCreditCard } from 'react-icons/fa';

const Checkout = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState('courier');

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      address: '',
      phone: user?.phone || '',
      delivery_option: 'courier',
      express_shipping: false,
    },
  });

  const calculateTotal = () => {
    let total = cartTotal;
    if (selectedShipping === 'express') {
      total += 2000; // Express shipping fee
    }
    return total;
  };

  const handlePayment = async (paymentData) => {
    try {
      setLoading(true);
      
      // Create order
      const orderData = {
        items: cartItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
        delivery_option: paymentData.delivery_option,
        express_shipping: paymentData.express_shipping,
      };

      const orderResponse = await orderService.createOrder(orderData);
      const { order, payment_url } = orderResponse;

      // Initialize payment with Paystack
      paymentService.initializePaystack(
        calculateTotal(),
        user.email,
        order.payment_reference,
        {
          order_id: order.id,
          buyer_id: user.id,
        }
      );

      // Clear cart after successful order creation
      clearCart();
      
      toast.success('Order created successfully! Redirecting to payment...');
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <button
          onClick={() => navigate('/products')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FaUser className="mr-2" /> Customer Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  defaultValue={user?.name}
                  disabled
                  className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  defaultValue={user?.email}
                  disabled
                  className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  {...register('phone', { required: 'Phone number is required' })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Address *
                </label>
                <textarea
                  {...register('address', { required: 'Address is required' })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter complete delivery address"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FaTruck className="mr-2" /> Shipping Options
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <input
                  type="radio"
                  id="courier"
                  value="courier"
                  {...register('delivery_option')}
                  onChange={(e) => setSelectedShipping(e.target.value)}
                  className="text-blue-600"
                />
                <label htmlFor="courier" className="flex-1 cursor-pointer">
                  <div className="p-4 border rounded-lg hover:border-blue-500">
                    <h3 className="font-semibold">Courier Delivery</h3>
                    <p className="text-sm text-gray-600">Delivered by GIG Logistics, DHL, etc.</p>
                    <p className="text-sm text-gray-600">3-5 business days</p>
                  </div>
                </label>
              </div>

              <div className="flex items-center space-x-4">
                <input
                  type="radio"
                  id="seller_local"
                  value="seller_local"
                  {...register('delivery_option')}
                  onChange={(e) => setSelectedShipping(e.target.value)}
                  className="text-blue-600"
                />
                <label htmlFor="seller_local" className="flex-1 cursor-pointer">
                  <div className="p-4 border rounded-lg hover:border-blue-500">
                    <h3 className="font-semibold">Seller Local Delivery</h3>
                    <p className="text-sm text-gray-600">Seller arranges local delivery</p>
                    <p className="text-sm text-gray-600">1-2 business days</p>
                  </div>
                </label>
              </div>

              <div className="flex items-center space-x-4">
                <input
                  type="radio"
                  id="express"
                  value="express"
                  {...register('delivery_option')}
                  onChange={(e) => setSelectedShipping(e.target.value)}
                  className="text-blue-600"
                />
                <label htmlFor="express" className="flex-1 cursor-pointer">
                  <div className="p-4 border rounded-lg hover:border-blue-500">
                    <h3 className="font-semibold">Express Delivery</h3>
                    <p className="text-sm text-gray-600">Priority courier delivery</p>
                    <p className="text-sm text-gray-600">1-2 business days</p>
                    <p className="text-sm font-semibold text-green-600">+ ₦2,000</p>
                  </div>
                </label>
              </div>

              {selectedShipping === 'express' && (
                <div className="mt-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register('express_shipping')}
                      className="text-blue-600"
                    />
                    <span>Add Express Delivery (+₦2,000)</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FaCreditCard className="mr-2" /> Order Summary
            </h2>
            
            <div className="space-y-4 mb-6">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
              {selectedShipping === 'express' && (
                <div className="flex justify-between">
                  <span>Express Shipping</span>
                  <span>+ ₦2,000</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <p className="text-sm text-gray-600">
                * Payment is held in escrow until delivery is confirmed
              </p>
              <p className="text-sm text-gray-600">
                * 10% commission fee will be deducted automatically
              </p>
              
              <button
                onClick={handleSubmit(handlePayment)}
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Proceed to Payment'
                )}
              </button>
              
              <button
                onClick={() => navigate('/cart')}
                className="w-full py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;