import api from './api';

const paymentService = {
  verifyPayment: async (reference) => {
    const response = await api.post('/api/payments/verify', { reference });
    return response.data;
  },

  initializePaystack: (amount, email, reference, metadata = {}) => {
    const handler = window.PaystackPop && new window.PaystackPop();
    if (!handler) throw new Error('Paystack not loaded');

    handler.newTransaction({
      key: import.meta.env.VITE_PAYSTACK_PK,
      email,
      amount: amount * 100,
      ref: reference,
      metadata,
      callback: (response) => response,
      onClose: () => console.log('Payment window closed'),
    });
  },

  initializeFlutterwave: (amount, email, reference, metadata = {}) => {
    return new Promise((resolve, reject) => {
      window.FlutterwaveCheckout({
        public_key: import.meta.env.VITE_FLUTTERWAVE_PK,
        tx_ref: reference,
        amount,
        currency: 'NGN',
        payment_options: 'card, banktransfer, ussd',
        customer: { email },
        meta: metadata,
        callback: (response) => resolve(response),
        onclose: () => reject(new Error('Payment closed')),
      });
    });
  },
};

export default paymentService;
