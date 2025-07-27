const { Product, Cart, Order, OrderItem, Payment, User, sequelize: db } = require('../../models');
const validate = require('../../helper/Validator');
const { Op } = require('sequelize');
const { parsePaginationParams, createPaginatedResponse, } = require('../../helper/pagination');

// POST /user/products/:id/add-to-cart - Add product to user's shopping cart
const addToCart = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const u = req.token;
    const productId = req.params.id;
    const { quantity = 1 } = req.body;
    const userId = u.userId;
    
    // Validation
    const rules = {
      quantity: 'integer|min:1'
    };
    await validate({ quantity }, rules);
    
    // Check if product exists and has sufficient stock
    const product = await Product.findOne({ where: { id: productId }, transaction: t });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    if (product.stock < quantity) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Insufficient stock' });
    }
    
    // Check if item already exists in cart
    const existingItem = await Cart.findOne({
      where: { user_id: userId, product_id: productId },
      transaction: t
    });
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity) {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'Insufficient stock' });
      }
      await existingItem.update({ quantity: newQuantity }, { transaction: t });
    } else {
      await Cart.create({
        user_id: userId,
        product_id: productId,
        quantity
      }, { transaction: t });
    }
    
    await t.commit();
    res.status(201).json({
      success: true,
      message: 'Product added to cart successfully'
    });
  } catch (error) {
    await t.rollback();
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /user/cart - Retrieve user's shopping cart items
const getCart = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const u = req.token;
    const userId = u.userId;

    const cartItems = await Cart.findAll({
      where: { user_id: userId },
      include: [{
        model: Product,
        as: 'Product',
        attributes: ['id', 'name', 'price', 'stock', 'image']
      }],
      order: [['createdAt', 'DESC']],
      transaction: t
    });

    const total = cartItems.reduce((sum, item) => {
      return sum + (item.Product.price * item.quantity);
    }, 0);

    await t.commit();
    res.status(200).json({
      success: true,
      items: cartItems,
      total
    });
  } catch (error) {
    await t.rollback();
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, error: 'Failed to get cart' });
  }
};

// DELETE /user/cart/:id - Remove item from user's shopping cart
const removeCartItem = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const u = req.token;
    const userId = u.userId;
    const cartId = req.params.id;
    
    const cartItem = await Cart.findOne({
      where: { id: cartId, user_id: userId },
      transaction: t
    });
    
    if (!cartItem) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Cart item not found' });
    }
    
    await cartItem.destroy({ transaction: t });
    
    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully'
    });
  } catch (error) {
    await t.rollback();
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove item from cart' });
  }
};

// PUT /user/cart/:id - Update quantity of item in user's shopping cart
const updateCartItem = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const u = req.token;
    const userId = u.userId;
    const cartId = req.params.id;
    const { quantity } = req.body;
    
    // Validation
    const rules = {
      quantity: 'required|integer|min:1'
    };
    await validate({ quantity }, rules);
    
    const cartItem = await Cart.findOne({
      where: { id: cartId, user_id: userId },
      include: [{ model: Product, as: 'Product' }],
      transaction: t
    });
    
    if (!cartItem) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Cart item not found' });
    }
    
    // Check stock availability
    if (cartItem.Product.stock < quantity) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Insufficient stock' });
    }
    
    await cartItem.update({ quantity }, { transaction: t });
    
    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Cart item updated successfully',
      cartItem
    });
  } catch (error) {
    await t.rollback();
    console.error('Update cart item error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /user/cart/checkout - Process checkout and create order from cart items
const checkout = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const u = req.token;
    const userId = u.userId;
    const { addressId } = req.body;
    
    // Validation
    const rules = {
      addressId: 'required|integer|min:1'
    };
    await validate({ addressId }, rules);
    
    // Get cart items
    const cartItems = await Cart.findAll({
      where: { user_id: userId },
      include: [{ model: Product, as: 'Product' }],
      transaction: t
    });
    
    if (cartItems.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }
    
    // Verify address belongs to user
    const { Address } = require('../../models');
    const address = await Address.findOne({
      where: { id: addressId, userId },
      transaction: t
    });
    
    if (!address) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Address not found' });
    }
    
    let totalAmount = 0;
    const orderItems = [];
    
    // Validate products and calculate total
    for (const item of cartItems) {
      if (item.Product.stock < item.quantity) {
        await t.rollback();
        return res.status(400).json({ 
          success: false, 
          error: `Insufficient stock for product: ${item.Product.name}` 
        });
      }
      totalAmount += item.Product.price * item.quantity;
      orderItems.push({
        productId: item.Product.id,
        quantity: item.quantity,
        price: item.Product.price
      });
    }
    
    // Create order
    const order = await Order.create({
      userId,
      addressId,
      totalAmount,
      status: 'pending'
    }, { transaction: t });
    
    // Create order items and update stock
    for (const item of orderItems) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      }, { transaction: t });
      
      const product = await Product.findOne({ where: { id: item.productId }, transaction: t });
      product.stock -= item.quantity;
      await product.save({ transaction: t });
    }
    
    // Create payment record
    await Payment.create({
      order_id: order.id,
      amount: totalAmount,
      status: 'SUCCESS'
    }, { transaction: t });
    
    // Clear cart
    await Cart.destroy({ where: { user_id: userId }, transaction: t });
    
    await t.commit();
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: {
        id: order.id,
        totalAmount: order.totalAmount,
        status: order.status
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Checkout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /products - Get all products with pagination and filters
const getAllProducts = async (req, res) => {
    const t = await db.transaction();
    
    try {
        const { page = 1, limit = 10, category, search, minPrice, maxPrice, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
        const offset = (page - 1) * limit;

        // Build where clause
        const whereClause = { status: 1 }; // Only active products

        if (category) {
            whereClause.category_id = category;
        }

        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        if (minPrice || maxPrice) {
            whereClause.price = {};
            if (minPrice) whereClause.price[Op.gte] = parseFloat(minPrice);
            if (maxPrice) whereClause.price[Op.lte] = parseFloat(maxPrice);
        }

        // Validate sort parameters
        const allowedSortFields = ['name', 'price', 'createdAt', 'updatedAt'];
        const allowedSortOrders = ['ASC', 'DESC'];
        
        const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

        const count = await Product.count({ 
            where: whereClause, 
            transaction: t 
        });

        const products = await Product.findAll({
            where: whereClause,
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name']
                }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [[finalSortBy, finalSortOrder]],
            transaction: t
        });

        const pagination = paginate(count, page, limit);

        await t.commit();
        res.status(200).json({
            products,
            pagination
        });
    } catch (error) {
        await t.rollback();
        console.error('Get all products error:', error);
        res.status(500).json({ error: 'Failed to get products' });
    }
};

// GET /products/:id - Get single product by ID
const getProductById = async (req, res) => {
    const t = await db.transaction();
    
    try {
        const product = await Product.findOne({
            where: { 
                id: req.params.id,
                status: 1 
            },
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name']
                }
            ],
            transaction: t
        });

        if (!product) {
            await t.rollback();
            return res.status(404).json({ error: 'Product not found' });
        }

        await t.commit();
        res.status(200).json({ product });
    } catch (error) {
        await t.rollback();
        console.error('Get product by ID error:', error);
        res.status(500).json({ error: 'Failed to get product' });
    }
};

module.exports = {
  addToCart,
  getCart,
  removeCartItem,
  updateCartItem,
  checkout,
  getAllProducts,
  getProductById
}; 