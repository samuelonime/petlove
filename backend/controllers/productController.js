const Product = require('../models/Product');
const Review = require('../models/Review');
const cloudinary = require('../config/cloudinary');

const MAX_IMAGES = 5;

class ProductController {

  // ───────────── IMAGE UPLOAD HELPER ─────────────
  static uploadImage(file) {
    return new Promise((resolve, reject) => {

      // PC upload
      if (file.tempFilePath) {
        cloudinary.uploader.upload(file.tempFilePath, {
          folder: 'pethub/products',
          quality: 'auto:eco',
          fetch_format: 'auto',
          width: 1080,
          crop: 'limit'
        })
        .then(res => resolve(res.secure_url))
        .catch(err => reject(err));

      } else {
        // Mobile upload
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'pethub/products',
            quality: 'auto:eco',
            fetch_format: 'auto',
            width: 1080,
            crop: 'limit'
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        );

        stream.end(file.data);
      }
    });
  }

  // ───────────── CREATE PRODUCT ─────────────
  static async createProduct(req, res) {
    try {
      if (!['seller', 'admin'].includes(req.user.user_type)) {
        return res.status(403).json({ error: 'Only sellers can create products' });
      }

      const { name, description, category, price, stock } = req.body;

      let files = [];
      if (req.files?.images) {
        files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      }

      if (files.length > MAX_IMAGES) {
        return res.status(400).json({ error: `Max ${MAX_IMAGES} images allowed` });
      }

      let imageUrls = [];

      for (const file of files) {
        const url = await this.uploadImage(file);
        if (url) imageUrls.push(url);
      }

      const productId = await Product.create({
        seller_id: req.user.id,
        name,
        description,
        category,
        price: parseFloat(price),
        stock: parseInt(stock),
        images: imageUrls
      });

      const product = await Product.findById(productId);

      res.status(201).json({
        message: 'Product created successfully',
        product
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }

  // ───────────── GET PRODUCTS ─────────────
  static async getProducts(req, res) {
    try {
      const filters = {
        category: req.query.category,
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        search: req.query.search
      };

      const products = await Product.getAll(filters);

      res.json({ products });

    } catch (error) {
      res.status(500).json({ error: 'Failed to get products' });
    }
  }

  // ───────────── GET SINGLE PRODUCT ─────────────
  static async getProduct(req, res) {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const reviews = await Review.findByProduct(req.params.id);
      const rating = await Review.getProductRating(req.params.id);

      res.json({ product, reviews, rating });

    } catch (error) {
      res.status(500).json({ error: 'Failed to get product' });
    }
  }

  // ───────────── UPDATE PRODUCT ─────────────
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      if (product.seller_id !== req.user.id && req.user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const { name, description, category, price, stock, mainImage } = req.body;

      let images = product.images || [];

      // 🧹 REMOVE SELECTED IMAGES
      if (req.body.removedImages) {
        const removed = JSON.parse(req.body.removedImages);

        images = images.filter(img => !removed.includes(img));

        // Optional: delete from Cloudinary
        for (const url of removed) {
          try {
            const publicId = url.split('/').slice(-2).join('/').split('.')[0];
            await cloudinary.uploader.destroy(publicId);
          } catch (e) {
            console.log('Cloudinary delete error:', e);
          }
        }
      }

      // 📤 ADD NEW IMAGES
      let newFiles = [];
      if (req.files?.images) {
        newFiles = Array.isArray(req.files.images)
          ? req.files.images
          : [req.files.images];
      }

      if (images.length + newFiles.length > MAX_IMAGES) {
        return res.status(400).json({
          error: `Max ${MAX_IMAGES} images allowed`
        });
      }

      for (const file of newFiles) {
        const url = await this.uploadImage(file);
        if (url) images.push(url);
      }

      // ⭐ SET MAIN IMAGE (move to front)
      if (mainImage && images.includes(mainImage)) {
        images = [
          mainImage,
          ...images.filter(img => img !== mainImage)
        ];
      }

      await Product.update(id, {
        name,
        description,
        category,
        price: parseFloat(price),
        stock: parseInt(stock),
        images
      });

      const updatedProduct = await Product.findById(id);

      res.json({
        message: 'Product updated successfully',
        product: updatedProduct
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }

  // ───────────── DELETE PRODUCT ─────────────
  static async deleteProduct(req, res) {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      if (product.seller_id !== req.user.id && req.user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Delete images from Cloudinary
      for (const url of product.images || []) {
        try {
          const publicId = url.split('/').slice(-2).join('/').split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (e) {
          console.log('Cloudinary delete error:', e);
        }
      }

      await Product.delete(req.params.id);

      res.json({ message: 'Product deleted successfully' });

    } catch (error) {
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }

  // ───────────── SELLER PRODUCTS ─────────────
  static async getSellerProducts(req, res) {
    try {
      const products = await Product.findBySeller(req.user.id);
      res.json({ products });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get seller products' });
    }
  }
}

module.exports = ProductController;
