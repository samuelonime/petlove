const axios = require('axios');

class PaymentService {
  constructor(provider = 'paystack') {
    this.provider = provider;
    this.config = {
      paystack: {
        secretKey: process.env.PAYSTACK_SECRET_KEY,
        baseUrl: 'https://api.paystack.co'
      },
      flutterwave: {
        secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
        baseUrl: 'https://api.flutterwave.com/v3'
      }
    };
  }

  async initializePayment(amount, email, reference, metadata = {}) {
    const providerConfig = this.config[this.provider];
    
    if (this.provider === 'paystack') {
      const response = await axios.post(
        `${providerConfig.baseUrl}/transaction/initialize`,
        {
          amount: amount * 100, // Convert to kobo
          email,
          reference,
          metadata,
          callback_url: `${process.env.FRONTEND_URL}/payment/callback`
        },
        {
          headers: {
            Authorization: `Bearer ${providerConfig.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } else if (this.provider === 'flutterwave') {
      const response = await axios.post(
        `${providerConfig.baseUrl}/payments`,
        {
          tx_ref: reference,
          amount,
          currency: 'NGN',
          redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
          customer: { email },
          meta: metadata
        },
        {
          headers: {
            Authorization: `Bearer ${providerConfig.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    }
  }

  async verifyPayment(reference) {
    const providerConfig = this.config[this.provider];
    
    if (this.provider === 'paystack') {
      const response = await axios.get(
        `${providerConfig.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${providerConfig.secretKey}`
          }
        }
      );
      return response.data;
    } else if (this.provider === 'flutterwave') {
      const response = await axios.get(
        `${providerConfig.baseUrl}/transactions/${reference}/verify`,
        {
          headers: {
            Authorization: `Bearer ${providerConfig.secretKey}`
          }
        }
      );
      return response.data;
    }
  }

  async transferToSeller(accountDetails, amount) {
    const providerConfig = this.config[this.provider];
    
    if (this.provider === 'paystack') {
      // Create transfer recipient first
      const recipientResponse = await axios.post(
        `${providerConfig.baseUrl}/transferrecipient`,
        {
          type: 'nuban',
          name: accountDetails.accountName,
          account_number: accountDetails.accountNumber,
          bank_code: accountDetails.bankCode,
          currency: 'NGN'
        },
        {
          headers: {
            Authorization: `Bearer ${providerConfig.secretKey}`
          }
        }
      );

      // Initiate transfer
      const transferResponse = await axios.post(
        `${providerConfig.baseUrl}/transfer`,
        {
          source: 'balance',
          amount: amount * 100,
          recipient: recipientResponse.data.data.recipient_code,
          reason: 'PetHub Order Payment'
        },
        {
          headers: {
            Authorization: `Bearer ${providerConfig.secretKey}`
          }
        }
      );
      return transferResponse.data;
    }
    // Similar implementation for Flutterwave
  }
}

module.exports = PaymentService;