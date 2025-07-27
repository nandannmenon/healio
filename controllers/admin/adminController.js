const bcrypt = require('bcryptjs');
const { Admin, sequelize: db } = require('../../models');
const validate = require('../../helper/Validator');
const jwt = require('jsonwebtoken');
const { paginate } = require('../../helper/pagination');
const { Op } = require('sequelize');

// POST /admin/login - Authenticate admin user and return JWT token
const login = async (req, res) => {
  const t = await db.transaction();

  try {
    const u = req.token; // Get current user token
    const { phone, email, password } = req.body;
    const rules = {
      password: 'required|min:6'
    };
    if (phone) {
      rules.phone = 'required|string|min:10';
    } else {
      rules.email = 'required|email';
    }
    await validate({ phone, email, password }, rules, {});

    // if (!phone && !email) {
    //   return res.status(400).json({ error: 'Phone number or email is required' });
    // };
    // if (phone && email) {
    //   return res.status(400).json({ error: 'Please provide either phone number OR email, not both' });
    // };

    // Find admin by phone OR email (both regular and super admins)
    let admin;
    if (phone) {
      admin = await Admin.findOne({ where: { phone }, transaction: t });
    } else {
      admin = await Admin.findOne({ where: { email }, transaction: t });
    }

    if (!admin) {
      await t.rollback();
      return res.status(401).json({ error: 'Invalid credentials' });
    };

    // Check if admin is active
    if (admin.status !== 1) {
      await t.rollback();
      return res.status(401).json({ error: 'Account is deactivated' });
    };

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      await t.rollback();
      return res.status(401).json({ error: 'Invalid credentials' });
    };

    // Generate token with admin type
    const token = jwt.sign(
      { adminId: admin.id, type: admin.type },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await t.commit();
    res.status(200).json({
      message: 'Admin login successful',
       admin: { id: admin.id, name: admin.name, phone: admin.phone, email: admin.email, type: admin.type },
      token
    });
  } catch (error) {
    await t.rollback();
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// POST /admin/register - Create new admin account (Superadmin only)
const register = async (req, res) => {
  const t = await db.transaction();

  try {
    const u = req.token;
    const { email, password, name, phone, type = 'ADMIN' } = req.body;

    // Validation
    const rules = {
      email: 'required|email',
      password: 'required|min:6',
      name: 'required|string|min:2',
      phone: 'required|string|min:10',
      type: 'string|in:ADMIN,SUPER_ADMIN'
    };
    await validate({ email, password, name, phone, type }, rules);

    // Check if email or phone already exists (dynamic validation)
    const existingAdmin = await Admin.findOne({
      where: {
        [Op.or]: [
          { email },
          { phone }
        ]
      },
      transaction: t
    });

    if (existingAdmin) {
      let errorMsg = '';
      if (existingAdmin.email === email) {
        errorMsg = 'Email already registered';
      } else if (existingAdmin.phone === phone) {
        errorMsg = 'Phone number already registered';
      } else {
        errorMsg = 'Email or phone number already registered';
      }
      await t.rollback();
      return res.status(400).json({ error: errorMsg });
    }

    // Authorization: Only super admins can create new admins
    if (!u || u.type !== 'SUPER_ADMIN') {
      await t.rollback();
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only super admins can create new admin accounts'
      });
    }

    // Create admin
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ email, password: hashedPassword, name, phone, type, status: 1, createdBy: u?.adminId || null }, { transaction: t });
    await t.commit();
    res.status(201).json({
      message: 'Admin registered successfully',
      admin: { id: admin.id, email: admin.email, name: admin.name, phone: admin.phone, type: admin.type, status: admin.status, createdAt: admin.createdAt }
    });
  } catch (error) {
    await t.rollback();
    console.error('Admin registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// GET /admin - Get paginated list of all admin accounts
const list = async (req, res) => {
  const t = await db.transaction();

  try {
    const { page = 1, limit = 10, type, status } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    if (type) whereClause.type = type;
    if (status !== undefined) whereClause.status = status;

    const count = await Admin.count({ where: whereClause, transaction: t });
    const admins = await Admin.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      transaction: t
    });

    const pagination = paginate(count, page, limit);

    await t.commit();
    res.status(200).json({ message: 'Admins retrieved successfully', admins, pagination });
  } catch (error) {
    await t.rollback();
    console.error('List admins error:', error);
    res.status(500).json({ error: 'Failed to list admins' });
  }
};

// GET /admin/:id - Retrieve specific admin account details
const get = async (req, res) => {
  const t = await db.transaction();

  try {
    const { id } = req.params;

    const admin = await Admin.findOne({
      where: { id },
      attributes: { exclude: ['password'] },
      transaction: t
    });

    if (!admin) {
      await t.rollback();
      return res.status(404).json({ error: 'Admin not found' });
    }

    await t.commit();
    res.status(200).json({ message: 'Admin details: ', admin });
  } catch (error) {
    await t.rollback();
    console.error('Get admin error:', error);
    res.status(500).json({ error: 'Failed to get admin' });
  }
};

// PUT /admin/:id - Modify admin account details
const update = async (req, res) => {
  const t = await db.transaction();

  try {
    const u = req.token;
    const { id } = req.params;
    const { email, name, phone, type } = req.body;

    // Authorization: Only super admins can update admin types and sensitive information
    if (!u || u.type !== 'SUPER_ADMIN') {
      await t.rollback();
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only super admins can update admin accounts'
      });
    }

    // Validation
    const rules = {};
    if (email) rules.email = 'email';
    if (name) rules.name = 'string|min:2';
    if (phone) rules.phone = 'string|min:10';
    if (type) rules.type = 'string|in:ADMIN,SUPER_ADMIN';

    if (Object.keys(rules).length > 0) {
      await validate({ email, name, phone, type }, rules);
    }

    // Find admin
    const admin = await Admin.findOne({ where: { id }, transaction: t });
    if (!admin) {
      await t.rollback();
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Check for duplicate email
    if (email && email !== admin.email) {
      const existingAdmin = await Admin.findOne({ where: { email }, transaction: t });
      if (existingAdmin) {
        await t.rollback();
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    // Check for duplicate phone
    if (phone && phone !== admin.phone) {
      const existingAdmin = await Admin.findOne({ where: { phone }, transaction: t });
      if (existingAdmin) {
        await t.rollback();
        return res.status(400).json({ error: 'Phone number already registered' });
      }
    }

    // Prevent changing super admin type to regular admin
    if (admin.type === 'SUPER_ADMIN' && type === 'ADMIN') {
      await t.rollback();
      return res.status(403).json({
        error: 'Cannot downgrade super admin',
        message: 'Super admin accounts cannot be downgraded to regular admin'
      });
    }

    // Update admin
    await admin.update({ email: email || admin.email, name: name || admin.name, phone: phone || admin.phone, type: type || admin.type }, { transaction: t });

    await t.commit();
    res.status(200).json({ message: 'Admin updated successfully', admin: { id: admin.id, email: admin.email, name: admin.name, phone: admin.phone, type: admin.type, status: admin.status } });
  } catch (error) {
    await t.rollback();
    console.error('Update admin error:', error);
    res.status(500).json({ error: 'Failed to update admin' });
  }
};

// DELETE /admin/:id - Delete admin account
const remove = async (req, res) => {
  const t = await db.transaction();

  try {
    const u = req.token;
    const { id } = req.params;

    // Authorization: Only super admins can delete admin accounts
    if (!u || u.type !== 'SUPER_ADMIN') {
      await t.rollback();
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only super admins can delete admin accounts'
      });
    }

    const admin = await Admin.findOne({ where: { id }, transaction: t });
    if (!admin) {
      await t.rollback();
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Prevent deleting super admins (no one can delete super admins)
    if (admin.type === 'SUPER_ADMIN') {
      await t.rollback();
      return res.status(403).json({
        error: 'Cannot delete super admin',
        message: 'Super admin accounts cannot be deleted by any user'
      });
    }

    await admin.destroy({ transaction: t });
    await t.commit();
    res.status(200).json({ message: 'Admin deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Remove admin error:', error);
    res.status(500).json({ error: 'Failed to remove admin' });
  }
};

// PUT /admin/:id/status - Activate or deactivate admin account
const setStatus = async (req, res) => {
  const t = await db.transaction();

  try {
    const u = req.token;
    const { id } = req.params;
    const { status } = req.body;

    // Authorization: Only super admins can change admin status
    if (!u || u.type !== 'SUPER_ADMIN') {
      await t.rollback();
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only super admins can change admin status'
      });
    }

    // Validation
    const rules = {
      status: 'required|integer|in:0,1'
    };
    await validate({ status }, rules);

    const admin = await Admin.findOne({ where: { id }, transaction: t });
    if (!admin) {
      await t.rollback();
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Prevent deactivating super admins (no one can deactivate super admins)
    if (admin.type === 'SUPER_ADMIN' && status === 0) {
      await t.rollback();
      return res.status(403).json({
        error: 'Cannot deactivate super admin',
        message: 'Super admin accounts cannot be deactivated by any user'
      });
    }

    await admin.update({ status }, { transaction: t });
    await t.commit();
    res.status(200).json({
      message: 'Admin status updated successfully',
      admin: {
        id: admin.id,
        name: admin.name,
        status: admin.status
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Set admin status error:', error);
    res.status(500).json({ error: 'Failed to update admin status' });
  }
};

// GET /admin/profile - Retrieve current admin's profile
const getProfile = async (req, res) => {
  const t = await db.transaction();

  try {
    const u = req.token;
    const adminId = u.adminId;

    const admin = await Admin.findOne({
      where: { id: adminId },
      attributes: { exclude: ['password'] },
      transaction: t
    });

    if (!admin) {
      await t.rollback();
      return res.status(404).json({ error: 'Admin not found' });
    }

    await t.commit();
    res.status(200).json({ admin });
  } catch (error) {
    await t.rollback();
    console.error('Get admin profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// PUT /admin/profile - Modify current admin's profile
const updateProfile = async (req, res) => {
  const t = await db.transaction();

  try {
    const u = req.token;
    const adminId = u.adminId;
    const { name, phone } = req.body;

    // Validation
    const rules = {};
    if (name) rules.name = 'string|min:2';
    if (phone) rules.phone = 'string|min:10';

    if (Object.keys(rules).length > 0) {
      await validate({ name, phone }, rules);
    }

    const admin = await Admin.findOne({ where: { id: adminId }, transaction: t });
    if (!admin) {
      await t.rollback();
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Check for duplicate phone
    if (phone && phone !== admin.phone) {
      const existingAdmin = await Admin.findOne({ where: { phone }, transaction: t });
      if (existingAdmin) {
        await t.rollback();
        return res.status(400).json({ error: 'Phone number already registered' });
      }
    }

    await admin.update({
      name: name || admin.name,
      phone: phone || admin.phone
    }, { transaction: t });

    await t.commit();
    res.status(200).json({
      message: 'Profile updated successfully',
      admin: {
        id: admin.id,
        name: admin.name,
        phone: admin.phone,
        email: admin.email,
        type: admin.type
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Update admin profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

module.exports = {
  login,
  register,
  list,
  get,
  update,
  remove,
  setStatus,
  getProfile,
  updateProfile
};