const { Address, User, sequelize: db } = require('../../models');
const { Op } = require('sequelize');
const { paginate } = require('../../helper/pagination');
const validate = require('../../helper/Validator');

// GET /admin/addresses - Get paginated list of all addresses in the system
const listAll = async (req, res) => {
  const t = await db.transaction();

  try {
    const { page = 1, limit = 10, userId, search } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    if (userId) whereClause.userId = userId;
    if (search) {
      whereClause[Op.or] = [
        { area: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { district: { [Op.like]: `%${search}%` } },
        { state: { [Op.like]: `%${search}%` } }
      ];
    }

    const count = await Address.count({ where: whereClause, transaction: t });
    const addresses = await Address.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      transaction: t
    });

    const pagination = paginate(count, page, limit);

    await t.commit();
    res.status(200).json({ message: 'Addresses retrieved successfully', addresses, pagination });
  } catch (error) {
    await t.rollback();
    console.error('List all addresses error:', error);
    res.status(500).json({ error: 'Failed to list addresses' });
  }
};

// GET /admin/addresses/:id - Get all addresses for a specific user
const getByUserId = async (req, res) => {
  const t = await db.transaction();

  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Verify user exists
    const user = await User.findOne({
      where: { id },
      attributes: ['id', 'name', 'email', 'phone'],
      transaction: t
    });

    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const count = await Address.count({ where: { userId: id }, transaction: t });
    const addresses = await Address.findAll({
      where: { userId: id },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      transaction: t
    });

    const pagination = paginate(count, page, limit);

    await t.commit();
    res.status(200).json({ message: 'Addresses retrieved successfully for user', user, addresses, pagination });
  } catch (error) {
    await t.rollback();
    console.error('Get addresses by user ID error:', error);
    res.status(500).json({ error: 'Failed to get addresses for user' });
  }
};

// GET /admin/addresses/detail/:id - Get specific address details by address ID
const getById = async (req, res) => {
  const t = await db.transaction();

  try {
    const { id } = req.params;

    const address = await Address.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      transaction: t
    });

    if (!address) {
      await t.rollback();
      return res.status(404).json({ error: 'Address not found' });
    }

    await t.commit();
    res.status(200).json({ message: 'Address details', address });
  } catch (error) {
    await t.rollback();
    console.error('Get address by ID error:', error);
    res.status(500).json({ error: 'Failed to get address' });
  }
};

// DELETE /admin/addresses/:id - Delete address from the system (admin only)
const remove = async (req, res) => {
  const t = await db.transaction();

  try {
    const { id } = req.params;

    const address = await Address.findOne({ where: { id }, transaction: t });
    if (!address) {
      await t.rollback();
      return res.status(404).json({ error: 'Address not found' });
    }

    await address.destroy({ transaction: t });

    await t.commit();
    res.status(200).json({ message: 'Address removed successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Remove address error:', error);
    res.status(500).json({ error: 'Failed to remove address' });
  }
};

// POST /admin/addresses - Create a new address for a specific user (admin only)
const addForUser = async (req, res) => {
  const t = await db.transaction();

  try {
    const u = req.token;
    const { userId, area, division, city, district, state, pincode, country = 'India' } = req.body;

    // Validation
    const rules = {
      userId: 'required|integer|min:1',
      area: 'required|string|min:2',
      division: 'required|string|min:2',
      city: 'required|string|min:2',
      district: 'required|string|min:2',
      state: 'required|string|min:2',
      pincode: 'required|string|min:6|max:6',
      country: 'string|min:2'
    };
    await validate({ userId, area, division, city, district, state, pincode, country }, rules);

    // Verify user exists
    const user = await User.findOne({ where: { id: userId }, transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    // Create address
    const createParams = { userId, area, division, city, district, state, pincode, country };
    const address = await Address.create(createParams, { transaction: t });

    await t.commit();
    res.status(201).json({
      message: 'Address added successfully for user', address,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    await t.rollback();
    console.error('Add address for user error:', error);
    res.status(500).json({ error: 'Failed to add address for user' });
  }
};

// PUT /admin/addresses/:id - Update existing address details
const update = async (req, res) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;
    const { area, division, city, district, state, pincode, country } = req.body;

    // Validation
    const rules = {
      area: 'string|min:2',
      division: 'string|min:2',
      city: 'string|min:2',
      district: 'string|min:2',
      state: 'string|min:2',
      pincode: 'string|min:6|max:6',
      country: 'string|min:2'
    };
    await validate({ area, division, city, district, state, pincode, country }, rules);

    // Find address
    const address = await Address.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      transaction: t
    });

    if (!address) {
      await t.rollback();
      return res.status(404).json({ error: 'Address not found' });
    };

    const upData = { area, division, city, district, state, pincode, country };
    await Address.update(upData, { transaction: t });
    const updatedAddress = await Address.findOne({ where: { id }, transaction: t });
    await t.commit();
    res.status(200).json({ data: updatedAddress, message: 'Address updated successfully'});
  } catch (error) {
    await t.rollback();
    console.error('Update address error:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
};

module.exports = {
  listAll,
  getByUserId,
  getById,
  remove,
  addForUser,
  update
}; 