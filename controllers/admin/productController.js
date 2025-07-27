const { Product, Cart, Order, OrderItem, Payment, User, sequelize: db } = require('../../models');
const validate = require('../../helper/Validator');
const { Op } = require('sequelize');
const { parsePaginationParams, createPaginatedResponse } = require('../../helper/pagination');

// POST /admin/products - Create a new product in the system
const add = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const { name, description, price, stock, image } = req.body;
    
    // Validation
    const rules = {
      name: 'required|string|min:2',
      description: 'required|string|min:10',
      price: 'required|numeric|min:0',
      stock: 'required|integer|min:0'
    };
    await validate({ name, description, price, stock }, rules);

    // Create product
    const product = await Product.create({
      name,
      description,
      price,
      stock,
      image: image || null
    }, { transaction: t });
    
    await t.commit();
    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      product
    });
  } catch (error) {
    await t.rollback();
    console.error('Add product error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// PUT /admin/products/:id - Modify existing product details
const update = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const { id } = req.params;
    const { name, description, price, stock, image } = req.body;
    console.log('Update product request body:', req.body);
    
    if (!req.body || Object.keys(req.body).length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Request body is missing' });
    }

    // Validate only the fields that are being updated
    const rules = {};
    if (name !== undefined) rules.name = 'string|min:2';
    if (description !== undefined) rules.description = 'string|min:10';
    if (price !== undefined) rules.price = 'numeric|min:0';
    if (stock !== undefined) rules.stock = 'integer|min:0';
    if (image !== undefined) rules.image = 'string';

    if (Object.keys(rules).length > 0) {
      await validate({ name, description, price, stock, image }, rules);
    }

    // Find product
    const product = await Product.findOne({ where: { id }, transaction: t });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Update the product
    const updatableFields = ['name', 'description', 'price', 'stock', 'image'];
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });
    
    await product.save({ transaction: t });
    await t.commit();
    res.status(200).json({ success: true, message: 'Product updated successfully', product });
  } catch (error) {
    await t.rollback();
    console.error('Update product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /admin/products/:id - Delete product from the system
const remove = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const { id } = req.params;
    
    const product = await Product.findOne({ where: { id }, transaction: t });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    await product.destroy({ transaction: t });
    await t.commit();
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Remove product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /admin/products/:id/stock - Modify product stock quantity
const updateStock = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const { id } = req.params;
    const { stock } = req.body;
    
    // Validation
    const rules = {
      stock: 'required|integer|min:0'
    };
    await validate({ stock }, rules);

    const product = await Product.findOne({ where: { id }, transaction: t });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    await product.update({ stock }, { transaction: t });
    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Product stock updated successfully',
      product: {
        id: product.id,
        name: product.name,
        stock: product.stock
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Update stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /admin/products - Get paginated list of all products for admin
const listAll = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const paginationParams = parsePaginationParams(req, { defaultLimit: 20, maxLimit: 50 });
    const { minPrice, maxPrice, minStock } = req.query;
    
    // Build where clause
    const whereClause = {};
    if (minPrice !== undefined) whereClause.price = { [Op.gte]: parseFloat(minPrice) };
    if (maxPrice !== undefined) {
      whereClause.price = whereClause.price || {};
      whereClause.price[Op.lte] = parseFloat(maxPrice);
    }
    if (minStock !== undefined) whereClause.stock = { [Op.gte]: parseInt(minStock) };
    
    const count = await Product.count({ where: whereClause, transaction: t });
    const products = await Product.findAll({
      where: whereClause,
      order: [['id', 'DESC']],
      limit: paginationParams.limit,
      offset: paginationParams.offset,
      transaction: t
    });
    
    const response = createPaginatedResponse(
      products,
      count,
      paginationParams,
      { message: 'Products retrieved successfully' }
    );
    
    await t.commit();
    res.status(200).json(response);
  } catch (error) {
    await t.rollback();
    console.error('List all products error:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /admin/products/:id - Get specific product details for admin
const getById = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const { id } = req.params;
    
    console.log('Getting product with ID:', id);
    if (!id || isNaN(id)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }
    
    const product = await Product.findOne({ where: { id }, transaction: t });
    console.log('Found product:', product);
    
    if (!product) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    await t.commit();
    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    await t.rollback();
    console.error('Get product by ID error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  add,
  update,
  remove,
  updateStock,
  listAll,
  getById
}; 