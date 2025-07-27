const { User, Address, Otp, sequelize: db } = require('../../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateOTP, sendOTP, createAndStoreOTP } = require('../../helper/otp');
const validate = require('../../helper/Validator');
const { paginate } = require('../../helper/pagination');
const moment = require('moment');
const express = require('express');
const user = require('../../models/user');

// POST /auth/register - Begin user registration process and send OTP
const register = async (req, res) => {
    const t = await db.transaction();
    try {
        const { email, name, phone, age, dob } = req.body;
        // Validation
        const rules = {
            email: 'required|email',
            name: 'required|string|min:2',
            phone: 'required|regex:/^\\d{10}$/',
            age: 'required|integer|min:1',
            dob: 'required|date'
        };
        await validate({ email, name, phone, age, dob }, rules);
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
        // Generate token
        const sessionToken = jwt.sign(
            { email, name, phone, age, dob },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        // Create user with temp_token = false, status = 1, and token
        const user = await User.create({
            email,
            name,
            phone,
            age,
            dob,
            temp_token: false,
            status: 1,
            token: sessionToken
        }, { transaction: t });
        // Generate and store OTP
        const otpCode = await createAndStoreOTP({ 
            phone, 
            email, 
            name,
            age, 
            dob,
            user_id: user.id,
            transaction: t 
        });
        await sendOTP(otpCode, email, 'registration');
        await t.commit();
        res.status(201).json({
            message: 'Registration successful. Please verify your email with the OTP sent.',
            otp: otpCode,
            phone: phone,
            token: sessionToken
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: 'Registration failed' });
    }
};

// POST /auth/verify_otp - Verify OTP sent during registration
const verifyRegistrationOtp = async (req, res) => {
    const t = await db.transaction();
    try {
        const { phone, otp } = req.body;
        // Validation
        const rules = {
            phone: 'required|regex:/^\\d{10}$/',
            otp: 'required|string|min:6|max:6'
        };
        await validate({ phone, otp }, rules);
        
        // Find user by phone
        const user = await User.findOne({ where: { phone }, transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(400).json({ error: 'User not found' });
        }
        // Get the OTP from the database
        const otpEntry = await Otp.findOne({ 
            where: { 
                phone, 
                otp,
                user_id: user.id,
                otp_verified: false,
                otp_expiry: { [Op.gt]: new Date() }
            },
            order: [['created_at', 'DESC']],
            transaction: t 
        });
        if (!otpEntry) {
            await t.rollback();
            return res.status(400).json({ error: 'Invalid OTP' });
        }
        // Mark OTP as verified
        await otpEntry.update({ otp_verified: true }, { transaction: t });
        // Generate new token
        const sessionToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        // Set temp_token to true and update token
        await user.update({ temp_token: true, token: sessionToken }, { transaction: t });
        await t.commit();
        res.status(200).json({ 
            success: true, 
            message: 'OTP verified succesfully. You can now set your password.',
            phone: phone,
            token: sessionToken
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
};

// POST /auth/set_password - Set password for verified user
const setPassword = async (req, res) => {
    const t = await db.transaction();
    try {
        const { phone, password } = req.body;
        // Validation
        const rules = {
            phone: 'required|regex:/^\\d{10}$/',
            password: 'required|min:6'
        };
        await validate({ phone, password }, rules);
        
        // Find user by phone
        const user = await User.findOne({ where: { phone }, transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(400).json({ error: 'User not found' });
        }
        // Check if user already has a password
        if (user.password) {
            await t.rollback();
            return res.status(400).json({ error: 'Password already set for this account' });
        }
        // Generate new token
        const sessionToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        // Set password, keep temp_token = true, update token
        const hashedPassword = await bcrypt.hash(password, 10);
        await user.update({
            password: hashedPassword,
            temp_token: true,
            token: sessionToken
        }, { transaction: t });
        await t.commit();
        res.status(200).json({
            message: 'Password set successfully. You are now logged in.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                age: user.age,
                dob: user.dob
            },
            token: sessionToken
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: 'Failed to set password' });
    }
};

// POST /auth/login - Authenticate user and return JWT token
const login = async (req, res) => {
    const t = await db.transaction();
    
    try {
        const { phone, email, password } = req.body;
        
        // Validation - require either phone OR email, and password
        if (!phone && !email) {
            return res.status(400).json({ error: 'Phone number or email is required' });
        }
        
        if (phone && email) {
            return res.status(400).json({ error: 'Please provide either phone number OR email, not both' });
        }
        
        const rules = {
            password: 'required|min:6'
        };
        
        if (phone) {
            rules.phone = 'required|regex:/^\\d{10}$/';
        } else {
            rules.email = 'required|email';
        }
        
        await validate({ phone, email, password }, rules);

        // Find user by phone OR email
        let user;
        if (phone) {
            user = await User.findOne({ where: { phone }, transaction: t });
        } else {
            user = await User.findOne({ where: { email }, transaction: t });
        }
        
        if (!user) {
            await t.rollback();
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user is active
        if (user.status !== 1) {
            await t.rollback();
            return res.status(401).json({ error: 'Account is deactivated by te admin' });
        }

        // Check if user has password set
        if (!user.password) {
            await t.rollback();
            return res.status(401).json({ error: 'Please set your password first' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            await t.rollback();
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate new session token
        const sessionToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Update user with new token (replaces any existing token)
        await user.update({ token: sessionToken }, { transaction: t });

        await t.commit();
        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                age: user.age,
                dob: user.dob
            },
            token: sessionToken
        });
    } catch (error) {
        await t.rollback();
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

// POST /auth/logout - User logout 
const logout = async (req, res) => {
    const t = await db.transaction();
    
    try {
        const u = req.token;
        
        if (!u || !u.userId) {
            await t.rollback();
            return res.status(401).json({ error: 'No active session' });
        }
        
        // Find user and clear token
        const user = await User.findOne({ 
            where: { id: u.userId },
            transaction: t 
        });
        
        if (!user) {
            await t.rollback();
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Clear token from database
        await user.update({ token: null }, { transaction: t });
        
        await t.commit();
        res.status(200).json({ message: 'Logout successsul' });
    } catch (error) {
        await t.rollback();
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
};

module.exports = {
    register,
    verifyRegistrationOtp,
    setPassword,
    login,
    logout
}; 
