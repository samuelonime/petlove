const Product = require('../models/Product');
const Review = require('../models/Review');
const cloudinary = require('../config/cloudinary');

class ProductController {
  static async createProduct(req, res) {
    try {
      if (req.user.user_type !== 'seller' && req.user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Only sellers can create products' });
      }

      const { name, description, category, price, stock } = req.body;
      
      // Upload images to Cloudinary
      let imageUrls = [];
      if (req.files && req.files.images) {
        const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        
        for (const image of images) {
          const result = await cloudinary.uploader.upload(image.tempFilePath, {
            folder: 'pethub/products'
          });
          imageUrls.push(result.secure_url);
        }
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
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }

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
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to get products' });
    }
  }

  static async getProduct(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Get reviews and rating
      const reviews = await Review.findByProduct(id);
      const rating = await Review.getProductRating(id);

      res.json({
        product,
        reviews,
        rating
      });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Failed to get product' });
    }
  }

  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if user is the seller or admin
      if (product.seller_id !== req.user.id && req.user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to update this product' });
      }

      const { name, description, category, price, stock } = req.body;
      let images = product.images;

      // Upload new images if provided
      if (req.files && req.files.images) {
        const newImages = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        
        for (const image of newImages) {
          const result = await cloudinary.uploader.upload(image.tempFilePath, {
            folder: 'pethub/products'
          });
          images.push(result.secure_url);
        }
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
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }

  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if user is the seller or admin
      if (product.seller_id !== req.user.id && req.user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to delete this product' });
      }

      await Product.delete(id);
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }

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