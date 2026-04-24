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

const ProductForm = ({ product = null, onSuccess }) => {
  const [name,        setName]        = useState(product?.name        ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category,    setCategory]    = useState(product?.category    ?? "food");
  const [price,       setPrice]       = useState(product?.price       ?? "");
  const [stock,       setStock]       = useState(product?.stock       ?? "");
  const [errors,      setErrors]      = useState({});
  const [images,        setImages]        = useState(product?.images || []);
  const [removedImages, setRemovedImages] = useState([]);
  const [newImages,     setNewImages]     = useState([]);
  const [loading,       setLoading]       = useState(false);

  const validate = () => {
    const e = {};
    if (!name.trim())        e.name        = "Product name is required";
    if (!description.trim()) e.description = "Description is required";
    if (!category)           e.category    = "Category is required";
    if (price === "" || price === null || price === undefined)
      e.price = "Price is required";
    else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0)
      e.price = "Price must be greater than 0";
    if (stock !== "" && stock !== null && stock !== undefined && (isNaN(parseInt(stock)) || parseInt(stock) < 0))
      e.stock = "Stock must be 0 or more";
    return e;
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + newImages.length + files.length > 5) {
      toast.error("Maximum 5 images allowed"); return;
    }
    setNewImages(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("name",        name.trim());
      fd.append("description", description.trim());
      fd.append("category",    category);
      fd.append("price",       String(parseFloat(price)));
      fd.append("stock", stock !== "" && stock !== null ? String(parseInt(stock)) : "0");
      fd.append("removedImages", JSON.stringify(removedImages));
      images.forEach(img => fd.append("existingImages[]", img));
      newImages.forEach(img => fd.append("images", img.file));

      const response = product
        ? await productService.updateProduct(product.id, fd)
        : await productService.createProduct(fd);

      toast.success(product ? "Product updated!" : "Product created!");
      if (onSuccess) onSuccess(response.product);
    } catch (err) {
      toast.error(err.response?.data?.error || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-form-container">
      <form onSubmit={handleSubmit} className="product-form" noValidate>

        <div className="form-group">
          <label className="form-label">Product Name *</label>
          <input type="text" value={name} onChange={e => { setName(e.target.value); setErrors(p => ({...p, name: ""})); }}
            placeholder="e.g. Royal Canin Dog Food"
            className={`form-input ${errors.name ? "form-input-error" : ""}`} disabled={loading} />
          {errors.name && <p className="form-error">{errors.name}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Category *</label>
          <select value={category} onChange={e => { setCategory(e.target.value); setErrors(p => ({...p, category: ""})); }}
            className={`form-select ${errors.category ? "form-select-error" : ""}`} disabled={loading}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {errors.category && <p className="form-error">{errors.category}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Price (₦) *</label>
          <input type="number" value={price} onChange={e => { setPrice(e.target.value); setErrors(p => ({...p, price: ""})); }}
            step="0.01" min="0" placeholder="e.g. 5000"
            className={`form-input ${errors.price ? "form-input-error" : ""}`} disabled={loading} />
          {errors.price && <p className="form-error">{errors.price}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Stock Quantity</label>
          <input type="number" value={stock} onChange={e => { setStock(e.target.value); setErrors(p => ({...p, stock: ""})); }}
            min="0" placeholder="e.g. 20"
            className={`form-input ${errors.stock ? "form-input-error" : ""}`} disabled={loading} />
          {errors.stock && <p className="form-error">{errors.stock}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea value={description} onChange={e => { setDescription(e.target.value); setErrors(p => ({...p, description: ""})); }}
            placeholder="Describe your product..." rows={5}
            className={`form-textarea ${errors.description ? "form-textarea-error" : ""}`} disabled={loading} />
          {errors.description && <p className="form-error">{errors.description}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">
            Product Images <span style={{fontWeight:400,textTransform:"none",color:"#94a3b8"}}>(optional, max 5)</span>
          </label>
          {images.length > 0 && (
            <div className="images-grid">
              {images.map((img, i) => (
                <div key={i} className="image-preview-container">
                  <img src={img} className="image-preview" alt="" />
                  <button type="button" className="image-remove-btn"
                    onClick={() => { setRemovedImages(p => [...p, images[i]]); setImages(images.filter((_,idx) => idx !== i)); }}>
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
                  <button type="button" className="image-remove-btn"
                    onClick={() => { URL.revokeObjectURL(img.preview); setNewImages(newImages.filter((_,idx) => idx !== i)); }}>
                    <FaTimes />
                  </button>
                </div>
              ))}
            </div>
          )}
          {images.length + newImages.length < 5 && (
            <label className="upload-area">
              <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="upload-input" />
              <FaUpload className="upload-icon" />
              <p>Click or drag to upload images</p>
            </label>
          )}
          <p className="images-counter">{images.length + newImages.length} / 5 images</p>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => window.history.back()} disabled={loading}>
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
