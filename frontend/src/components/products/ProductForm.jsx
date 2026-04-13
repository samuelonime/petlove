import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import productService from '../../services/productService';
import { toast } from 'react-toastify';
import { FaUpload, FaTimes, FaSpinner } from 'react-icons/fa';
import './ProductForm.css'; // Import CSS file

const schema = yup.object({
  name: yup.string().required('Product name is required'),
  description: yup.string().required('Description is required'),
  category: yup.string().required('Category is required'),
  price: yup.number().positive('Price must be positive').required('Price is required'),
  stock: yup.number().integer('Stock must be integer').min(0, 'Stock cannot be negative').required('Stock is required'),
});

const ProductForm = ({ product = null, onSuccess }) => {
  const [images, setImages] = useState(product?.images || []);
  const [imageFiles, setImageFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: product || {
      name: '',
      description: '',
      category: 'food',
      price: '',
      stock: '',
    },
  });

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImageFiles([...imageFiles, ...newImages]);
  };

  const removeImage = (index) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      const formData = {
        ...data,
        price: parseFloat(data.price),
        stock: parseInt(data.stock),
        images: [
          ...images,
          ...imageFiles.map(img => img.file)
        ],
      };

      let response;
      if (product) {
        response = await productService.updateProduct(product.id, formData);
        toast.success('Product updated successfully');
      } else {
        response = await productService.createProduct(formData);
        toast.success('Product created successfully');
      }

      // Cleanup image previews
      imageFiles.forEach(img => URL.revokeObjectURL(img.preview));
      
      if (onSuccess) {
        onSuccess(response.product);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-form-container">
      <form onSubmit={handleSubmit(onSubmit)} className="product-form">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">
              Product Name *
            </label>
            <input
              type="text"
              {...register('name')}
              className={`form-input ${errors.name ? 'form-input-error' : ''}`}
              placeholder="Enter product name"
            />
            {errors.name && (
              <p className="form-error">{errors.name.message}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Category *
            </label>
            <select
              {...register('category')}
              className={`form-select ${errors.category ? 'form-select-error' : ''}`}
            >
              <option value="food">Food</option>
              <option value="toys">Toys</option>
              <option value="accessories">Accessories</option>
              <option value="medicine">Medicine</option>
              <option value="grooming">Grooming</option>
              <option value="bedding">Bedding</option>
            </select>
            {errors.category && (
              <p className="form-error">{errors.category.message}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Price (₦) *
            </label>
            <div className="price-input-container">
              <span className="price-prefix">₦</span>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('price')}
                className={`form-input price-input ${errors.price ? 'form-input-error' : ''}`}
                placeholder="0.00"
              />
            </div>
            {errors.price && (
              <p className="form-error">{errors.price.message}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Stock Quantity *
            </label>
            <input
              type="number"
              min="0"
              {...register('stock')}
              className={`form-input ${errors.stock ? 'form-input-error' : ''}`}
              placeholder="Enter quantity"
            />
            {errors.stock && (
              <p className="form-error">{errors.stock.message}</p>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Description *
          </label>
          <textarea
            {...register('description')}
            rows={5}
            className={`form-textarea ${errors.description ? 'form-textarea-error' : ''}`}
            placeholder="Describe your product in detail..."
          />
          {errors.description && (
            <p className="form-error">{errors.description.message}</p>
          )}
          <div className="description-hint">
            Include details about features, benefits, and usage instructions
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Product Images
          </label>
          <div className="images-section">
            {/* Existing Images */}
            {images.length > 0 && (
              <div className="existing-images">
                <h4 className="images-subtitle">Existing Images</h4>
                <div className="images-grid">
                  {images.map((img, index) => (
                    <div key={index} className="image-preview-container">
                      <img
                        src={img}
                        alt={`Product ${index + 1}`}
                        className="image-preview"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        className="image-remove-btn"
                        aria-label="Remove image"
                      >
                        <FaTimes className="remove-icon" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Image Previews */}
            {imageFiles.length > 0 && (
              <div className="new-images">
                <h4 className="images-subtitle">New Uploads</h4>
                <div className="images-grid">
                  {imageFiles.map((img, index) => (
                    <div key={index} className="image-preview-container">
                      <img
                        src={img.preview}
                        alt={`Upload ${index + 1}`}
                        className="image-preview"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="image-remove-btn"
                        aria-label="Remove image"
                      >
                        <FaTimes className="remove-icon" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Area */}
            <label className="upload-area">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="upload-input"
              />
              <div className="upload-content">
                <FaUpload className="upload-icon" />
                <div className="upload-text">
                  <p className="upload-title">Click to upload images</p>
                  <p className="upload-subtitle">or drag and drop</p>
                </div>
                <p className="upload-hint">PNG, JPG, GIF up to 5MB each</p>
              </div>
            </label>
            
            <div className="images-info">
              <p className="images-info-text">
                <span className="images-info-important">Important:</span> Upload up to 5 images. 
                The first image will be used as the main product display.
              </p>
              <div className="images-counter">
                {images.length + imageFiles.length} / 5 images
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
          >
            {loading ? (
              <>
                <FaSpinner className="spinner-icon" />
                {product ? 'Updating...' : 'Creating...'}
              </>
            ) : product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;