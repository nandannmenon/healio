const { Product, Cart, Order, OrderItem, Payment, User, sequelize: db } = require('../../models');
const validate = require('../../helper/Validator');
const { Op } = require('sequelize');
const { parsePaginationParams, createPaginatedResponse } = require('../../helper/pagination');

// GET /products - Get paginated list of all products (public)
const list = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const paginationParams = parsePaginationParams(req, { defaultLimit: 20, maxLimit: 50 });
    
    const count = await Product.count({ transaction: t });
    const products = await Product.findAll({
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
    console.error('List products error:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /products/:id - Get specific product details (public)
const get = async (req, res) => {
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
    console.error('Get product error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  list,
  get
}; 