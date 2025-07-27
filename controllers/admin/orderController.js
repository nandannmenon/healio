const { Order, OrderItem, Product, User, Address, Payment, sequelize: db } = require('../../models');
const validate = require('../../helper/Validator');
const { parsePaginationParams, createPaginatedResponse } = require('../../helper/pagination');

// GET /admin/orders - Get paginated list of all orders in the system
const listAll = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const paginationParams = parsePaginationParams(req, { defaultLimit: 20, maxLimit: 100 });
    const { status, userId } = req.query;
    
    // Build where clause
    const whereClause = {};
    if (status) whereClause.status = status;
    if (userId) whereClause.userId = userId;

    const count = await Order.count({ where: whereClause, transaction: t });
    const orders = await Order.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'User', attributes: ['id', 'name', 'email', 'phone', 'age', 'dob'] },
        { model: Address, as: 'address' },
        { model: OrderItem, as: 'OrderItems', include: [{ model: Product, as: 'Product' }] },
        { model: Payment, as: 'Payment' }
      ],
      order: [['createdAt', 'DESC']],
      limit: paginationParams.limit,
      offset: paginationParams.offset,
      transaction: t
    });
    
    const response = createPaginatedResponse(
      orders,
      count,
      paginationParams,
      { message: 'All orders retrieved successfully' }
    );
    
    await t.commit();
    res.status(200).json(response);
  } catch (error) {
    await t.rollback();
    console.error('Get all orders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /admin/orders/:id/status - Change order status (pending, processing, shipped, delivered, cancelled)
const setStatus = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validation
    const rules = {
      status: 'required|string|in:pending,processing,shipped,delivered,cancelled'
    };
    await validate({ status }, rules);

    const order = await Order.findOne({ where: { id }, transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // If cancelling order, restore product stock
    if (status === 'cancelled' && order.status !== 'cancelled') {
      const orderItems = await OrderItem.findAll({
        where: { orderId: order.id },
        include: [{ model: Product, as: 'Product' }],
        transaction: t
      });

      for (const item of orderItems) {
        const product = item.Product;
        product.stock += item.quantity;
        await product.save({ transaction: t });
      }
    }

    await order.update({ status }, { transaction: t });
    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order: {
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /admin/orders/payments - Get paginated list of all payment records
const listPayments = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) whereClause.status = status;

    const count = await Payment.count({ where: whereClause, transaction: t });
    const payments = await Payment.findAll({
      where: whereClause,
      include: [
        { model: Order, as: 'Order', include: [{ model: User, as: 'User', attributes: ['id', 'name', 'email', 'phone', 'age', 'dob'] }] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      transaction: t
    });

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / limit)
    };

    await t.commit();
    res.status(200).json({
      success: true,
      payments,
      pagination
    });
  } catch (error) {
    await t.rollback();
    console.error('List payments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /admin/orders/place-for-user - Create order on behalf of a user (admin only)
const placeForUser = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const { userId, addressId, items } = req.body;
    
    // Validation
    const rules = {
      userId: 'required|integer|min:1',
      addressId: 'required|integer|min:1',
      items: 'required|array|min:1'
    };
    
    await validate({ userId, addressId, items }, rules);
    
    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Order items are required' });
    }
    
    // Verify user exists
    const user = await User.findOne({ where: { id: userId }, transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Verify address exists and belongs to user
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
    for (const item of items) {
      const product = await Product.findOne({ where: { id: item.productId }, transaction: t });
      if (!product) {
        await t.rollback();
        return res.status(404).json({ success: false, error: `Product with ID ${item.productId} not found` });
      }
      if (product.stock < item.quantity) {
        await t.rollback();
        return res.status(400).json({ success: false, error: `Insufficient stock for product: ${product.name}` });
      }
      totalAmount += product.price * item.quantity;
      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price
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
    
    await t.commit();
    res.status(201).json({
      success: true,
      message: 'Order placed successfully for user',
      order: {
        id: order.id,
        userId: order.userId,
        totalAmount: order.totalAmount,
        status: order.status
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Place order for user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /admin/orders/:id - Get specific order details for admin
const getById = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const { id } = req.params;
    
    const order = await Order.findOne({
      where: { id },
      include: [
        { model: User, as: 'User', attributes: ['id', 'name', 'email', 'phone', 'age', 'dob'] },
        { model: Address, as: 'address' },
        { model: OrderItem, as: 'OrderItems', include: [{ model: Product, as: 'Product' }] },
        { model: Payment, as: 'Payment' }
      ],
      transaction: t
    });
    
    if (!order) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    await t.commit();
    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    await t.rollback();
    console.error('Get order by ID error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  listAll,
  setStatus,
  listPayments,
  placeForUser,
  getById
}; 