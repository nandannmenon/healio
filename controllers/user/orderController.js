const { Order, OrderItem, Product, User, Address, Payment, sequelize: db } = require('../../models');
const validate = require('../../helper/Validator');
const { parsePaginationParams, createPaginatedResponse } = require('../../helper/pagination');

// GET /user/orders - List user orders with pagination
const list = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const u = req.token;
    const userId = u.userId;
    const paginationParams = parsePaginationParams(req, { defaultLimit: 20, maxLimit: 50 });
    
    const count = await Order.count({ where: { userId }, transaction: t });
    const orders = await Order.findAll({
      where: { userId },
      include: [
        { model: Address, as: 'address' },
        { model: OrderItem, as: 'OrderItems', include: [{ model: Product, as: 'Product' }] }
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
      { message: 'User orders retrieved successfully' }
    );
    
    await t.commit();
    res.status(200).json(response);
  } catch (error) {
    await t.rollback();
    console.error('Get user orders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /user/orders/:id - Get specific order details for authenticated user
const get = async (req, res) => {
  const t = await db.transaction();
  
  try {
    const u = req.token;
    const { orderId } = req.params;
    const userId = u.userId;
    
    const order = await Order.findOne({ 
      where: { id: orderId, userId }, 
      include: [
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
  list,
  get
}; 