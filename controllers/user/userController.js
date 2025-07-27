const { User, Address, Otp, sequelize: db } = require('../../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validate = require('../../helper/Validator');

// GET /user/profile - Retrieve current user's profile information
const getProfile = async (req, res) => {
    const t = await db.transaction();
    
    try {
        const u = req.token;
        const userId = u.userId;
        
        const user = await User.findOne({
            where: { id: userId },
            attributes: { exclude: ['password'] },
            transaction: t
        });

        if (!user) {
            await t.rollback();
            return res.status(404).json({ error: 'User not found' });
        }

        await t.commit();
        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        await t.rollback();
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
};

// PUT /user/profile - Update current user's profile information
const updateProfile = async (req, res) => {
    const t = await db.transaction();
    
    try {
        const u = req.token;
        const userId = u.userId;
        const { name, phone, email } = req.body;
        
        // Validation
        const rules = {};
        if (name) rules.name = 'string|min:2';
        if (phone) rules.phone = 'regex:/^\\d{10}$/';
        if (email) rules.email = 'email';
        
        if (Object.keys(rules).length > 0) {
            await validate({ name, phone, email }, rules);
        }

        const user = await User.findOne({ where: { id: userId }, transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if email or phone already exists (only if provided)
        if (email || phone) {
            const whereConditions = [];
            if (email) whereConditions.push({ email });
            if (phone) whereConditions.push({ phone });
            
            const existingUser = await User.findOne({
                where: {
                    [Op.or]: whereConditions,
                    id: { [Op.ne]: userId } // Exclude current user
                },
                transaction: t
            });
            
            if (existingUser) {
                await t.rollback();
                let errorMsg = '';
                if (existingUser.email === email) {
                    errorMsg = 'Email already registered';
                } else if (existingUser.phone === phone) {
                    errorMsg = 'Phone number already registered';
                } else {
                    errorMsg = 'Email or phone number already registered';
                }
                return res.status(400).json({ error: errorMsg });
            }
        }

        // Update user
        await user.update({
            name: name || user.name,
            phone: phone || user.phone,
            email: email || user.email
        }, { transaction: t });

        await t.commit();
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        await t.rollback();
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

module.exports = {
    getProfile,
    updateProfile
}; 