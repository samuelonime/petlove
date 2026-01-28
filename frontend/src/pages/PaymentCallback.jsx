import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import paymentService from '../services/paymentService';
import { toast } from 'react-toastify';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference') || searchParams.get('tx_ref');
      
      if (!reference) {
        setStatus('error');
        setMessage('No payment reference found');
        return;
      }

      try {
        const result = await paymentService.verifyPayment(reference);
        
        if (result.success) {
          setStatus('success');
          setMessage('Payment successful! Your order has been placed.');
          
          // Redirect to orders page after 3 seconds
          setTimeout(() => {
            navigate(`/orders/${result.orderId}`);
          }, 3000);
        } else {
          setStatus('error');
          setMessage('Payment verification failed. Please contact support.');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage('Payment verification failed. Please check your orders page.');
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  const renderContent = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="text-center">
            <FaSpinner className="animate-spin text-6xl text-blue-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Verifying Payment</h2>
            <p className="text-gray-600">Please wait while we confirm your payment...</p>
          </div>
        );
      case 'success':
        return (
          <div className="text-center">
            <FaCheckCircle className="text-6xl text-green-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Payment Successful! 🎉</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800">
                Your payment is now held securely in escrow. It will be released to the seller after you confirm delivery.
              </p>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => navigate('/orders')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View Orders
              </button>
              <button
                onClick={() => navigate('/products')}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="text-center">
            <FaTimesCircle className="text-6xl text-red-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Payment Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">
                If money was deducted from your account, it will be refunded automatically within 24 hours.
              </p>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => navigate('/cart')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Return Home
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="bg-white rounded-lg shadow-md p-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default PaymentCallback;