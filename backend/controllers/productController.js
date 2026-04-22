const Product  = require('../models/Product');
const Review   = require('../models/Review');

const MAX_IMAGES = 5;

// Load Cloudinary only if configured
function getCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return null;
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key:    CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

// Upload a single file — returns URL or null
async function uploadImage(file) {
  const cloudinary = getCloudinary();
  if (!cloudinary) {
    console.warn('⚠️  Cloudinary not configured — skipping image upload');
    return null;
  }
  try {
    if (file.tempFilePath) {
      const res = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: 'pethub/products',
        quality: 'auto:eco',
        fetch_format: 'auto',
        width: 1080,
        crop: 'limit',
      });
      return res.secure_url;
    } else {
      return await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'pethub/products', quality: 'auto:eco', fetch_format: 'auto', width: 1080, crop: 'limit' },
          (err, result) => err ? reject(err) : resolve(result.secure_url)
        );
        stream.end(file.data);
      });
    }
  } catch (err) {
    console.error('Image upload failed (skipping):', err.message);
    return null;
  }
}

class ProductController {

  // ── Create ─────────────────────────────────────────────────
  static async createProduct(req, res) {
    try {
      if (!['seller', 'admin'].includes(req.user.user_type)) {
        return res.status(403).json({ error: 'Only sellers can create products' });
      }

      // Safely extract fields — fall back to null so DB gets NULL not undefined
      const name        = req.body.name        || null;
      const description = req.body.description || null;
      const category    = req.body.category    || null;
      const price       = req.body.price       != null ? parseFloat(req.body.price) : null;
      const stock       = req.body.stock       != null ? parseInt(req.body.stock)   : null;

      if (!name || !description || !category || price == null || stock == null) {
        return res.status(400).json({
          error: 'Name, description, category, price and stock are all required',
        });
      }

      // Upload images
      let imageUrls = [];
      if (req.files?.images) {
        const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        if (files.length > MAX_IMAGES) {
          return res.status(400).json({ error: `Maximum ${MAX_IMAGES} images allowed` });
        }
        for (const file of files) {
          const url = await uploadImage(file);
          if (url) imageUrls.push(url);
        }
      }

      const productId = await Product.create({
        seller_id: req.user.id,
        name,
        description,
        category,
        price,
        stock,
        images: imageUrls,
      });

      const product = await Product.findById(productId);
      res.status(201).json({ message: 'Product created successfully', product });

    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: error.message || 'Failed to create product' });
    }
  }

  // ── Get all ────────────────────────────────────────────────
  static async getProducts(req, res) {
    try {
      const products = await Product.getAll({
        category: req.query.category,
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        search:   req.query.search,
      });
      res.json({ products });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to get products' });
    }
  }

  // ── Get one ────────────────────────────────────────────────
  static async getProduct(req, res) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const reviews = await Review.findByProduct(req.params.id);
      const rating  = await Review.getProductRating(req.params.id);
      res.json({ product, reviews, rating });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Failed to get product' });
    }
  }

  // ── Update ─────────────────────────────────────────────────
  static async updateProduct(req, res) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      if (product.seller_id !== req.user.id && req.user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const name        = req.body.name        || product.name;
      const description = req.body.description || product.description;
      const category    = req.body.category    || product.category;
      const price       = req.body.price       != null ? parseFloat(req.body.price) : product.price;
      const stock       = req.body.stock       != null ? parseInt(req.body.stock)   : product.stock;

      let images = [...(product.images || [])];

      // Remove selected images
      if (req.body.removedImages) {
        try {
          const removed = JSON.parse(req.body.removedImages);
          images = images.filter(img => !removed.includes(img));

          const cloudinary = getCloudinary();
          if (cloudinary) {
            for (const url of removed) {
              try {
                const publicId = url.split('/').slice(-2).join('/').split('.')[0];
                await cloudinary.uploader.destroy(publicId);
              } catch (e) { /* ignore */ }
            }
          }
        } catch (e) { /* ignore bad JSON */ }
      }

      // Add new images
      if (req.files?.images) {
        const newFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        if (images.length + newFiles.length > MAX_IMAGES) {
          return res.status(400).json({ error: `Maximum ${MAX_IMAGES} images allowed` });
        }
        for (const file of newFiles) {
          const url = await uploadImage(file);
          if (url) images.push(url);
        }
      }

      // Move main image to front
      if (req.body.mainImage && images.includes(req.body.mainImage)) {
        images = [req.body.mainImage, ...images.filter(img => img !== req.body.mainImage)];
      }

      await Product.update(req.params.id, { name, description, category, price, stock, images });
      const updatedProduct = await Product.findById(req.params.id);
      res.json({ message: 'Product updated successfully', product: updatedProduct });

    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: error.message || 'Failed to update product' });
    }
  }

  // ── Delete ─────────────────────────────────────────────────
  static async deleteProduct(req, res) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      if (product.seller_id !== req.user.id && req.user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const cloudinary = getCloudinary();
      if (cloudinary) {
        for (const url of product.images || []) {
          try {
            const publicId = url.split('/').slice(-2).join('/').split('.')[0];
            await cloudinary.uploader.destroy(publicId);
          } catch (e) { /* ignore */ }
        }
      }

      await Product.delete(req.params.id);
      res.json({ message: 'Product deleted successfully' });

    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }

  // ── Seller products ────────────────────────────────────────
  static async getSellerProducts(req, res) {
    try {
      const products = await Product.findBySeller(req.user.id);
      res.json({ products });
    } catch (error) {
      console.error('Get seller products error:', error);
      res.status(500).json({ error: 'Failed to get seller products' });
    }
  }
}

module.exports = ProductController;
        
