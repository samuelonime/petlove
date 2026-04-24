import React, { useState } from "react";
import productService from "../../services/productService";
import { toast } from "react-toastify";
import { FaUpload, FaTimes, FaSpinner } from "react-icons/fa";
import "./ProductForm.css";

const CATEGORIES = [
  { value: "food",        label: "Food" },
  { value: "toys",        label: "Toys" },
  { value: "accessories", label: "Accessories" },
  { value: "medicine",    label: "Medicine" },
  { value: "grooming",    label: "Grooming" },
  { value: "bedding",     label: "Bedding" },
];

const MAX_IMAGES = 5;

const ProductForm = ({ product = null, onSuccess }) => {
  const [fields, setFields] = useState({
    name:        product?.name        || "",
    description: product?.description || "",
    category:    product?.category    || "food",
    price:       product?.price       || "",
    stock:       product?.stock       || "",
  });
  const [errors,        setErrors]        = useState({});
  const [images,        setImages]        = useState(product?.images || []);
  const [removedImages, setRemovedImages] = useState([]);
  const [newImages,     setNewImages]     = useState([]);
  const [loading,       setLoading]       = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!fields.name.trim())        errs.name        = "Product name is required";
    if (!fields.description.trim()) errs.description = "Description is required";
    if (!fields.category)           errs.category    = "Category is required";

    const price = parseFloat(fields.price);
    if (fields.price === "" || fields.price === null)
      errs.price = "Price is required";
    else if (isNaN(price) || price <= 0)
      errs.price = "Price must be a positive number";

    const stock = parseInt(fields.stock);
    if (fields.stock === "" || fields.stock === null)
      errs.stock = "Stock is required";
    else if (isNaN(stock) || stock < 0)
      errs.stock = "Stock must be 0 or more";

    return errs;
  };

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

  const removeExistingImage = (i) => {
    setRemovedImages((prev) => [...prev, images[i]]);
    setImages(images.filter((_, idx) => idx !== i));
  };

  const removeNewImage = (i) => {
    URL.revokeObjectURL(newImages[i].preview);
    setNewImages(newImages.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("name",        fields.name.trim());
      formData.append("description", fields.description.trim());
      formData.append("category",    fields.category);
      formData.append("price",       parseFloat(fields.price));
      formData.append("stock",       parseInt(fields.stock));
      formData.append("removedImages", JSON.stringify(removedImages));

      images.forEach((img) => formData.append("existingImages[]", img));
      newImages.forEach((img) => formData.append("images", img.file));

      let response;
      if (product) {
        response = await productService.updateProduct(product.id, formData);
        toast.success("Product updated!");
      } else {
        response = await productService.createProduct(formData);
        toast.success("Product created!");
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
      <form onSubmit={handleSubmit} className="product-form" noValidate>

        {/* Name */}
        <div className="form-group">
          <label className="form-label">Product Name *</label>
          <input
            type="text"
            name="name"
            value={fields.name}
            onChange={handleChange}
            placeholder="e.g. Royal Canin Dog Food"
            className={`form-input ${errors.name ? "form-input-error" : ""}`}
            disabled={loading}
          />
          {errors.name && <p className="form-error">{errors.name}</p>}
        </div>

        {/* Category */}
        <div className="form-group">
          <label className="form-label">Category *</label>
          <select
            name="category"
            value={fields.category}
            onChange={handleChange}
            className={`form-select ${errors.category ? "form-select-error" : ""}`}
            disabled={loading}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {errors.category && <p className="form-error">{errors.category}</p>}
        </div>

        {/* Price */}
        <div className="form-group">
          <label className="form-label">Price (₦) *</label>
          <input
            type="number"
            name="price"
            value={fields.price}
            onChange={handleChange}
            step="0.01"
            min="0"
            placeholder="e.g. 5000"
            className={`form-input ${errors.price ? "form-input-error" : ""}`}
            disabled={loading}
          />
          {errors.price && <p className="form-error">{errors.price}</p>}
        </div>

        {/* Stock */}
        <div className="form-group">
          <label className="form-label">Stock Quantity *</label>
          <input
            type="number"
            name="stock"
            value={fields.stock}
            onChange={handleChange}
            min="0"
            placeholder="e.g. 20"
            className={`form-input ${errors.stock ? "form-input-error" : ""}`}
            disabled={loading}
          />
          {errors.stock && <p className="form-error">{errors.stock}</p>}
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea
            name="description"
            value={fields.description}
            onChange={handleChange}
            placeholder="Describe your product — features, benefits, usage..."
            className={`form-textarea ${errors.description ? "form-textarea-error" : ""}`}
            rows={5}
            disabled={loading}
          />
          {errors.description && <p className="form-error">{errors.description}</p>}
        </div>

        {/* Images */}
        <div className="form-group">
          <label className="form-label">
            Product Images{" "}
            <span style={{ fontWeight: 400, textTransform: "none", color: "#94a3b8" }}>
              (optional, max 5)
            </span>
          </label>

          {images.length > 0 && (
            <div className="images-grid">
              {images.map((img, i) => (
                <div key={i} className="image-preview-container">
                  <img src={img} className="image-preview" alt="" />
                  <button type="button" className="image-remove-btn" onClick={() => removeExistingImage(i)}>
                    <FaTimes />
                  </button>
                </div>
              ))}
            </div>
          )}

          {newImages.length > 0 && (
            <div className="images-grid">
              {newImages.map((img, i) => (
                <div key={i} className="image-preview-container">
                  <img src={img.preview} className="image-preview" alt="" />
                  <button type="button" className="image-remove-btn" onClick={() => removeNewImage(i)}>
                    <FaTimes />
                  </button>
                </div>
              ))}
            </div>
          )}

          {images.length + newImages.length < MAX_IMAGES && (
            <label className="upload-area">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="upload-input"
              />
              <FaUpload className="upload-icon" />
              <p>Click or drag to upload images</p>
            </label>
          )}

          <p className="images-counter">
            {images.length + newImages.length} / {MAX_IMAGES} images
          </p>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.history.back()}
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading && <FaSpinner className="spinner-icon" />}
            {product ? "Update Product" : "Create Product"}
          </button>
        </div>

      </form>
    </div>
  );
};

export default ProductForm;
