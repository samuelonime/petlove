import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import productService from "../../services/productService";
import { toast } from "react-toastify";
import { FaUpload, FaTimes, FaSpinner } from "react-icons/fa";
import "./ProductForm.css";

const schema = yup.object({
  name: yup.string().required("Product name is required"),
  description: yup.string().required("Description is required"),
  category: yup.string().required("Category is required"),
  price: yup.number().positive().required("Price is required"),
  stock: yup.number().integer().min(0).required("Stock is required"),
});

const ProductForm = ({ product = null, onSuccess }) => {
  const [images, setImages] = useState(product?.images || []);
  const [removedImages, setRemovedImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const MAX_IMAGES = 5;

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: product || {
      name: "",
      description: "",
      category: "food",
      price: "",
      stock: "",
    },
  });

  // Upload new images
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);

    if (images.length + newImages.length + files.length > MAX_IMAGES) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    const mapped = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setNewImages((prev) => [...prev, ...mapped]);
  };

  // Remove existing image
  const removeExistingImage = (i) => {
    setRemovedImages((prev) => [...prev, images[i]]);
    setImages(images.filter((_, idx) => idx !== i));
  };

  // Remove newly uploaded image
  const removeNewImage = (i) => {
    URL.revokeObjectURL(newImages[i].preview);
    setNewImages(newImages.filter((_, idx) => idx !== i));
  };

  // Submit
  const onSubmit = async (data) => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("description", data.description);
      formData.append("category", data.category); // ← FIXED
      formData.append("price", data.price);
      formData.append("stock", data.stock);

      // removed images
      formData.append("removedImages", JSON.stringify(removedImages));

      // existing images
      images.forEach((img) => {
        formData.append("existingImages[]", img);
      });

      // new images
      newImages.forEach((img) => {
        formData.append("images", img.file);
      });

      let response;

      if (product) {
        response = await productService.updateProduct(product.id, formData);
        toast.success("Product updated successfully");
      } else {
        response = await productService.createProduct(formData);
        toast.success("Product created successfully");
      }

      if (onSuccess) onSuccess(response.product);

    } catch (error) {
      toast.error(error.response?.data?.error || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-form-container">
      <form onSubmit={handleSubmit(onSubmit)} className="product-form">

        {/* Name */}
        <div className="form-group">
          <label className="form-label">Product Name *</label>
          <input
            type="text"
            {...register("name")}
            className={`form-input ${errors.name ? "form-input-error" : ""}`}
          />
          {errors.name && <p className="form-error">{errors.name.message}</p>}
        </div>

        {/* Category */}
        <div className="form-group">
          <label className="form-label">Category *</label>
          <select
            {...register("category")}
            className={`form-select ${errors.category ? "form-select-error" : ""}`}
          >
            <option value="food">Food</option>
            <option value="toys">Toys</option>
            <option value="accessories">Accessories</option>
            <option value="medicine">Medicine</option>
            <option value="grooming">Grooming</option>
            <option value="bedding">Bedding</option>
          </select>
          {errors.category && <p className="form-error">{errors.category.message}</p>}
        </div>

        {/* Price */}
        <div className="form-group">
          <label className="form-label">Price (₦) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register("price")}
            className={`form-input ${errors.price ? "form-input-error" : ""}`}
          />
          {errors.price && <p className="form-error">{errors.price.message}</p>}
        </div>

        {/* Stock */}
        <div className="form-group">
          <label className="form-label">Stock *</label>
          <input
            type="number"
            min="0"
            {...register("stock")}
            className={`form-input ${errors.stock ? "form-input-error" : ""}`}
          />
          {errors.stock && <p className="form-error">{errors.stock.message}</p>}
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea
            {...register("description")}
            className={`form-textarea ${errors.description ? "form-textarea-error" : ""}`}
            rows={5}
          />
          {errors.description && <p className="form-error">{errors.description.message}</p>}
        </div>

        {/* Images */}
        <div className="form-group">
          <label className="form-label">Product Images</label>

          {/* existing */}
          {images.length > 0 && (
            <div className="images-grid">
              {images.map((img, i) => (
                <div key={i} className="image-preview-container">
                  <img src={img} className="image-preview" />
                  <button type="button" className="image-remove-btn" onClick={() => removeExistingImage(i)}>
                    <FaTimes />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* new */}
          {newImages.length > 0 && (
            <div className="images-grid">
              {newImages.map((img, i) => (
                <div key={i} className="image-preview-container">
                  <img src={img.preview} className="image-preview" />
                  <button type="button" className="image-remove-btn" onClick={() => removeNewImage(i)}>
                    <FaTimes />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* upload */}
          <label className="upload-area">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="upload-input"
            />
            <FaUpload className="upload-icon" />
            <p>Click or drag images (max 5)</p>
          </label>

          <p className="images-counter">{images.length + newImages.length} / 5 images</p>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? <FaSpinner className="spinner-icon" /> : null}
            {product ? "Update Product" : "Create Product"}
          </button>
        </div>

      </form>
    </div>
  );
};

export default ProductForm;
