import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import orderService from '../../services/orderService';
import { toast } from 'react-toastify';
import { FaTruck, FaCamera, FaSignature, FaReceipt } from 'react-icons/fa';

const ShippingForm = ({ order, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [proofType, setProofType] = useState('photo');
  const [proofData, setProofData] = useState(null);

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      courier_name: '',
      tracking_number: '',
      delivery_option: order?.delivery_option || 'courier',
    },
  });

  const deliveryOption = watch('delivery_option');

  const handleShippingUpdate = async (data) => {
    try {
      setLoading(true);
      await orderService.updateShipping(order.id, data);
      toast.success('Shipping information updated successfully');
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleProofUpload = async () => {
    try {
      setLoading(true);
      await orderService.uploadDeliveryProof(order.id, {
        proof_type: proofType,
        proof_data: proofData,
      });
      toast.success('Delivery proof uploaded successfully');
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofData({ url: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const renderProofForm = () => {
    switch (proofType) {
      case 'photo':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Delivery Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <p className="text-sm text-gray-500 mt-2">
              Upload a photo showing the delivered package
            </p>
          </div>
        );
      case 'signature':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Name
            </label>
            <input
              type="text"
              value={proofData?.recipientName || ''}
              onChange={(e) => setProofData({ ...proofData, recipientName: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Enter recipient name"
            />
            <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">
              Signature (Base64)
            </label>
            <textarea
              value={proofData?.signature || ''}
              onChange={(e) => setProofData({ ...proofData, signature: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
              placeholder="Paste signature data or use signature pad"
            />
          </div>
        );
      case 'receipt':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt Number
            </label>
            <input
              type="text"
              value={proofData?.receiptNumber || ''}
              onChange={(e) => setProofData({ ...proofData, receiptNumber: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Enter receipt number"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {order.status === 'paid' || order.status === 'processing' ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FaTruck className="mr-2" /> Update Shipping Information
          </h3>
          
          <form onSubmit={handleSubmit(handleShippingUpdate)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Method
              </label>
              <select
                {...register('delivery_option')}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="courier">Courier Delivery</option>
                <option value="seller_local">Seller Local Delivery</option>
                <option value="express">Express Delivery</option>
              </select>
            </div>

            {deliveryOption !== 'seller_local' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Courier Name
                  </label>
                  <input
                    type="text"
                    {...register('courier_name', {
                      required: deliveryOption !== 'seller_local' && 'Courier name is required',
                    })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="e.g., GIG Logistics, DHL"
                  />
                  {errors.courier_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.courier_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    {...register('tracking_number', {
                      required: deliveryOption !== 'seller_local' && 'Tracking number is required',
                    })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Enter tracking number"
                  />
                  {errors.tracking_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.tracking_number.message}</p>
                  )}
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Shipping'}
            </button>
          </form>
        </div>
      ) : null}

      {order.status === 'shipped' && order.delivery_option === 'seller_local' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FaCamera className="mr-2" /> Upload Delivery Proof
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proof Type
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setProofType('photo')}
                  className={`flex items-center px-4 py-2 rounded-lg ${
                    proofType === 'photo' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
                  }`}
                >
                  <FaCamera className="mr-2" /> Photo
                </button>
                <button
                  type="button"
                  onClick={() => setProofType('signature')}
                  className={`flex items-center px-4 py-2 rounded-lg ${
                    proofType === 'signature' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
                  }`}
                >
                  <FaSignature className="mr-2" /> Signature
                </button>
                <button
                  type="button"
                  onClick={() => setProofType('receipt')}
                  className={`flex items-center px-4 py-2 rounded-lg ${
                    proofType === 'receipt' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
                  }`}
                >
                  <FaReceipt className="mr-2" /> Receipt
                </button>
              </div>
            </div>

            {renderProofForm()}

            <button
              onClick={handleProofUpload}
              disabled={loading || !proofData}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload Proof'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingForm;