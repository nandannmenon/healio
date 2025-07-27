const { User, Address, Otp, sequelize: db, Admin } = require('../../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateOTP, sendOTP, createAndStoreOTP } = require('../../helper/otp');
const validate = require('../../helper/Validator');
const { paginate } = require('../../helper/pagination');
const moment = require('moment');

// GET /admin/users - Get paginated list of all users in the system
const list = async (req, res) => {
  const t = await db.transaction();

  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    if (status !== undefined) whereClause.status = status;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const count = await User.count({ where: whereClause, transaction: t });
    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Admin,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false 
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      transaction: t
    });

    const pagination = paginate(count, page, limit);

    await t.commit();
    res.status(200).json({
      users,
      pagination
    });
  } catch (error) {
    await t.rollback();
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
};

// GET /admin/users/:id - Get specific user details for admin
const get = async (req, res) => {
  const t = await db.transaction();

  try {
    const { id } = req.params;

    const user = await User.findOne({
      where: { id },
      attributes: { exclude: ['password'] },
      include: [
        { model: Address, as: 'addresses' },
        {
          model: Admin,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false // Left join to include users with null createdBy
        }
      ],
      transaction: t
    });

    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    await t.commit();
    res.status(200).json({ user });
  } catch (error) {
    await t.rollback();
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// PUT /admin/users/:id/status - Change user status (active, inactive)
const setStatus = async (req, res) => {
  const t = await db.transaction();

  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validation
    const rules = {
      status: 'required|integer|in:0,1'
    };
    await validate({ status }, rules);

    const user = await User.findOne({ where: { id }, transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update({ status }, { transaction: t });
    await t.commit();
    res.status(200).json({
      message: 'User status updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Set user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

// POST /admin/users - Create a new user (admin only)
const addUser = async (req, res) => {
  const t = await db.transaction();

  try {
    const u = req.token;
    const { email, password, name, phone, age, dob } = req.body;

    // Validation
    const rules = {
      email: 'required|email',
      password: 'required|min:6',
      name: 'required|string|min:2',
      phone: 'required|string|min:10',
      age: 'required|integer|min:1',
      dob: 'required|date'
    };
    await validate({ email, password, name, phone, age, dob }, rules);

    // Check if email or phone already exists 
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { phone }
        ]
      },
      transaction: t
    });
    if (existingUser) {
      let errorMsg = '';
      if (existingUser.email === email) {
        errorMsg = 'Email already registered';
      } else if (existingUser.phone === phone) {
        errorMsg = 'Phone number already registered';
      } else {
        errorMsg = 'Email or phone number already registered';
      }
      await t.rollback();
      return res.status(400).json({ error: errorMsg });
    }

    // Create user with admin ID who created it
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      name,
      phone,
      password: hashedPassword,
      status: 1, // Default to active
      createdBy: u.adminId, // Set the admin ID who created this user
      age,
      dob
    }, { transaction: t });

    await t.commit();
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        age: user.age,
        dob: user.dob,
        status: user.status,
        createdBy: user.createdBy,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Add user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// PUT /admin/users/:id - Update existing user details
const updateUser = async (req, res) => {
  const t = await db.transaction();

  try {
    const { id } = req.params;
    const { email, name, phone, password, age, dob } = req.body;

    // Validation
    const rules = {};
    if (email) rules.email = 'email';
    if (name) rules.name = 'string|min:2';
    if (phone) rules.phone = 'string|min:10';
    if (password) rules.password = 'min:6';
    if (age) rules.age = 'integer|min:1';
    if (dob) rules.dob = 'date';

    if (Object.keys(rules).length > 0) {
      await validate({ email, name, phone, password, age, dob }, rules);
    }

    const user = await User.findOne({ where: { id }, transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for duplicate email
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email }, transaction: t });
      if (existingUser) {
        await t.rollback();
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    // Check for duplicate phone
    if (phone && phone !== user.phone) {
      const existingUser = await User.findOne({ where: { phone }, transaction: t });
      if (existingUser) {
        await t.rollback();
        return res.status(400).json({ error: 'Phone number already registered' });
      }
    }

    // Update user
    const updateData = {
      email: email || user.email,
      name: name || user.name,
      phone: phone || user.phone
    };

    if (age !== undefined) {
      updateData.age = age;
    }
    if (dob !== undefined) {
      updateData.dob = dob;
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await user.update(updateData, { transaction: t });

    await t.commit();
    res.status(200).json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        age: user.age,
        dob: user.dob,
        status: user.status
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// DELETE /admin/users/:id - Delete user from the system
const removeUser = async (req, res) => {
  const t = await db.transaction();

  try {
    const { id } = req.params;

    const user = await User.findOne({ where: { id }, transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete related data (addresses, OTPs, etc.)
    await Address.destroy({ where: { userId: id }, transaction: t });
    await Otp.destroy({ where: { user_id: id }, transaction: t });

    // Delete user
    await user.destroy({ transaction: t });

    await t.commit();
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Remove user error:', error);
    res.status(500).json({ error: 'Failed to remove user' });
  }
};

// GET /admin/users/:id/orders - Get all orders for a specific user
const getUserOrders = async (req, res) => {
  const t = await db.transaction();

  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Verify user exists
    const user = await User.findOne({ where: { id }, transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const { Order, OrderItem, Product, Address, Payment } = require('../../models');

    const count = await Order.count({ where: { userId: id }, transaction: t });
    const orders = await Order.findAll({
      where: { userId: id },
      include: [
        { model: Address, as: 'address' },
        { model: OrderItem, as: 'OrderItems', include: [{ model: Product, as: 'Product' }] },
        { model: Payment, as: 'Payment' }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      transaction: t
    });

    const pagination = paginate(count, page, limit);

    await t.commit();
    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        age: user.age,
        dob: user.dob
      },
      orders,
      pagination
    });
  } catch (error) {
    await t.rollback();
    console.error('Get user orders error:', error);
    res.status(500).json({ error: 'Failed to get user orders' });
  }
};

module.exports = {
  list,
  get,
  setStatus,
  addUser,
  updateUser,
  removeUser,
  getUserOrders
}; 